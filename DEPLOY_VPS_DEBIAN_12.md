# 🚀 Guía de Despliegue en VPS Debian 12 (KVM 4) - WhaTicket

Esta guía describe el proceso paso a paso para desplegar **WhaTicket** de forma segura, profesional y optimizada en un servidor VPS con **Debian 12 Bookworm (KVM 4)** utilizando **Docker** y **Docker Compose**.

El uso de Docker es altamente recomendado porque aísla todas las dependencias complejas de Chrome/Puppeteer (usado por `whatsapp-web.js`) en su propio contenedor, evitando conflictos de librerías en el sistema operativo del host.

---

## 📋 Requisitos Previos

1. **VPS Debian 12** con acceso `root` o un usuario con privilegios `sudo`.
2. **Dos subdominios (Registros A)** apuntando a la dirección IP de tu VPS:
   - `chat.tudominio.com` (Para el Frontend)
   - `api.tudominio.com` (Para el Backend/API)
3. **Puertos abiertos** en el firewall (ufw o nftables):
   - `80` (HTTP) - Requerido para la validación de Let's Encrypt y redirección.
   - `443` (HTTPS) - Tráfico seguro de la app.
   - `22` (SSH) - Administración remota.

---

## 🛠️ Paso 1: Instalar Docker y Docker Compose en Debian 12

Debian 12 no incluye Docker por defecto en sus repositorios oficiales estables. Sigue estos comandos para instalar la versión oficial de Docker Engine:

```bash
# 1. Actualizar el sistema e instalar paquetes básicos
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg lsb-release

# 2. Agregar la clave GPG oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 3. Configurar el repositorio oficial de Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Instalar Docker y sus herramientas
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Iniciar y habilitar Docker
sudo systemctl enable --now docker

# 6. (Opcional) Agregar tu usuario al grupo docker para no usar 'sudo' constantemente
sudo usermod -aG docker $USER
```
> [!NOTE]
> Si agregaste tu usuario al grupo `docker`, cierra la sesión SSH y vuelve a entrar para aplicar los cambios, o ejecuta: `newgrp docker`.

---

## 📂 Paso 2: Preparar la Aplicación en el VPS

1. Sube tu código al VPS usando `git` o transfiérelo vía SFTP. Recomendamos colocarlo en `/var/www/whaticket` o `/home/deploy/whaticket`.
   ```bash
   git clone https://github.com/tu-usuario/whaticket-community.git /var/www/whaticket
   cd /var/www/whaticket
   ```

2. Crea el archivo de variables de entorno `.env` en la raíz de la carpeta copiada:
   ```bash
   cp .env.example .env
   nano .env
   ```

3. Modifica los siguientes valores con tu dominio y contraseñas seguras:
   ```ini
   # MYSQL
   MYSQL_ENGINE=mariadb
   MYSQL_VERSION=10.6
   MYSQL_ROOT_PASSWORD=MiContrasenaSuperSegura123! # ¡Cambia esto!
   MYSQL_DATABASE=whaticket
   MYSQL_PORT=3306
   TZ=America/Bogota                               # Ajusta a tu zona horaria (Ej: America/Bogota, Europe/Madrid)

   # BACKEND
   BACKEND_PORT=8080
   BACKEND_SERVER_NAME=api.tudominio.com           # Tu subdominio para la API
   BACKEND_URL=https://api.tudominio.com           # URL completa con HTTPS
   PROXY_PORT=443
   JWT_SECRET=unTokenMuyLargoYComplejoQueNadiePuedaAdivinar
   JWT_REFRESH_SECRET=otroTokenDiferenteYMuySeguroParaElRefresh

   # FRONTEND
   FRONTEND_PORT=80
   FRONTEND_SSL_PORT=443
   FRONTEND_SERVER_NAME=chat.tudominio.com         # Tu subdominio para la app
   FRONTEND_URL=https://chat.tudominio.com         # URL completa con HTTPS

   # BROWSERLESS (Si es necesario, por defecto se puede dejar vacío)
   MAX_CONCURRENT_SESSIONS=3
   ```

---

## 🚀 Paso 3: Levantar Contenedores por Primera Vez (Sin SSL)

Para poder generar los certificados SSL usando Let's Encrypt con el método de autenticación Webroot, necesitamos que el servidor Nginx de la aplicación esté corriendo en el puerto 80.

1. Construye e inicia los contenedores en segundo plano:
   ```bash
   docker compose up -d --build
   ```

2. Verifica que los servicios estén corriendo:
   ```bash
   docker compose ps
   ```
   *Deberías ver que `backend`, `frontend` y `mysql` están en estado `Up`.*

---

## 🔒 Paso 4: Generar Certificados SSL con Certbot (En el Servidor Host)

En lugar de instalar y ejecutar Certbot dentro de los contenedores Docker, lo instalaremos directamente en el host Debian 12. De esta forma, las renovaciones automáticas se gestionarán fácilmente desde el sistema operativo del VPS.

1. Instala Certbot en Debian 12:
   ```bash
   sudo apt install -y certbot
   ```

2. Genera los certificados SSL usando el directorio webroot que comparte Nginx en el contenedor frontend (mapeado en `./ssl/www/`):
   ```bash
   # Generar SSL para el Frontend
   sudo certbot certonly --webroot -w ./ssl/www -d chat.tudominio.com --email tuemail@tudominio.com --agree-tos --no-eff-email

   # Generar SSL para el Backend
   sudo certbot certonly --webroot -w ./ssl/www -d api.tudominio.com --email tuemail@tudominio.com --agree-tos --no-eff-email
   ```

Si todo es correcto, Certbot te mostrará un mensaje de éxito indicando que los certificados se han guardado en `/etc/letsencrypt/live/`.

---

## 🛠️ Paso 5: Enlazar los Certificados a Docker y Activar SSL

Nginx dentro del contenedor frontend busca los archivos de certificados en la carpeta `./ssl/certs/frontend/` y `./ssl/certs/backend/`.

Crearemos enlaces simbólicos (symlinks) desde la ruta oficial de Let's Encrypt en el host directamente hacia el directorio de nuestro proyecto:

```bash
# 1. Crear las carpetas de destino en el proyecto
mkdir -p ssl/certs/frontend ssl/certs/backend

# 2. Crear enlaces simbólicos para el Frontend
sudo ln -sf /etc/letsencrypt/live/chat.tudominio.com/fullchain.pem ./ssl/certs/frontend/fullchain.pem
sudo ln -sf /etc/letsencrypt/live/chat.tudominio.com/privkey.pem ./ssl/certs/frontend/privkey.pem

# 3. Crear enlaces simbólicos para el Backend
sudo ln -sf /etc/letsencrypt/live/api.tudominio.com/fullchain.pem ./ssl/certs/backend/fullchain.pem
sudo ln -sf /etc/letsencrypt/live/api.tudominio.com/privkey.pem ./ssl/certs/backend/privkey.pem
```

4. Reinicia el contenedor del Frontend para que aplique los certificados y active la escucha HTTPS (Puerto 443):
   ```bash
   docker compose restart frontend
   ```

A partir de este momento, Nginx detectará los certificados existentes y configurará de manera automática las redirecciones HTTP a HTTPS.

---

## 🗄️ Paso 6: Inicializar la Base de Datos (Migrations & Seeds)

El contenedor de backend ejecuta de manera automática las migraciones de Sequelize al iniciar, pero es necesario cargar los datos iniciales (semillas/seeds) la primera vez.

1. Ejecuta el comando de sembrado dentro del contenedor de backend:
   ```bash
   docker compose exec backend npx sequelize db:seed:all
   ```

2. Si necesitas verificar el estado de los contenedores o inspeccionar los logs del backend para asegurar que todo va bien:
   ```bash
   docker compose logs -f backend
   ```

---

## 🔑 Credenciales de Acceso por Defecto

Una vez desplegado y sembrado, ingresa a tu navegador web mediante la URL `https://chat.tudominio.com` y usa las siguientes credenciales:

- **Usuario:** `admin@whaticket.com`
- **Contraseña:** `admin`

> [!WARNING]
> Es sumamente importante que cambies la contraseña del administrador o crees un nuevo usuario administrador y borres el por defecto tan pronto como entres al panel.

---

## 🔄 Paso 7: Renovación Automática de Certificados

Certbot incluye un cron/timer en Debian 12 que comprueba la validez de los certificados dos veces al día y los renueva si les quedan menos de 30 días para expirar.

Para que Nginx (dentro de Docker) se entere de los nuevos certificados renovados, debemos reiniciar el contenedor del frontend después de cada renovación.

1. Abre/crea un script de renovación en la carpeta de ganchos de certbot:
   ```bash
   sudo nano /etc/letsencrypt/renewal-hooks/post/restart-whaticket.sh
   ```

2. Pega el siguiente código (asegúrate de colocar la ruta absoluta a tu carpeta de whaticket):
   ```bash
   #!/bin/bash
   # Recargar Nginx en el contenedor frontend de Docker
   docker compose -f /var/www/whaticket/docker-compose.yaml restart frontend
   ```

3. Dale permisos de ejecución al script:
   ```bash
   sudo chmod +x /etc/letsencrypt/renewal-hooks/post/restart-whaticket.sh
   ```

4. Puedes probar que la renovación funciona correctamente simulando el proceso:
   ```bash
   sudo certbot renew --dry-run
   ```

---

## 🚀 Comandos Útiles de Mantenimiento

* **Ver Logs en Tiempo Real**:
  ```bash
  docker compose logs -f
  ```
* **Detener la aplicación**:
  ```bash
  docker compose down
  ```
* **Iniciar la aplicación**:
  ```bash
  docker compose up -d
  ```
* **Ver consumo de recursos de los contenedores**:
  ```bash
  docker stats
  ```
* **Actualizar Whaticket**:
  ```bash
  git pull
  docker compose down
  docker compose up -d --build
  docker compose exec backend npx sequelize db:migrate
  ```

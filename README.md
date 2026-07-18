[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/donate?business=VWW3BHW4AWHUY&item_name=Desenvolvimento+de+Software&currency_code=BRL)
[![FOSSA Status](https://app.fossa.com/api/projects/custom%2B21084%2Fgithub.com%2Fcanove%2Fwhaticket.svg?type=shield)](https://app.fossa.com/projects/custom%2B21084%2Fgithub.com%2Fcanove%2Fwhaticket?ref=badge_shield)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=canove_whaticket&metric=alert_status)](https://sonarcloud.io/dashboard?id=canove_whaticket)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=canove_whaticket&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=canove_whaticket)
[![Discord Chat](https://img.shields.io/discord/784109818247774249.svg?logo=discord)](https://discord.gg/Dp2tTZRYHg)
[![Forum](https://img.shields.io/badge/forum-online-blue.svg?logo=discourse)](https://whaticket.online/)

# WhaTicket!

**NOTA**: La versión actual de `whatsapp-web.js` requiere Node 14 o superior. Por favor actualiza tu entorno para seguir utilizándolo sin problemas.

Un sistema de tickets _muy simple_ basado en mensajes de WhatsApp.

* **Backend**: Utiliza [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) para recibir y enviar mensajes de WhatsApp, crear tickets a partir de ellos y almacenar todo en una base de datos MariaDB/MySQL.
* **Frontend**: Una completa aplicación de chat multiusuario desarrollada con React y Material UI que se comunica con el backend mediante API REST y WebSockets. Te permite interactuar con contactos, gestionar tickets y enviar y recibir mensajes de WhatsApp en tiempo real.

**NOTA DE ADVERTENCIA**: No podemos garantizar que tu número de WhatsApp no sea bloqueado al usar este método. WhatsApp no permite bots ni clientes no oficiales en su plataforma, por lo que su uso no es 100% seguro y debe utilizarse bajo tu propia responsabilidad.

---

## ¿Cómo funciona?

1. Con cada nuevo mensaje recibido en una cuenta de WhatsApp asociada, se crea un nuevo **Ticket**.
2. Este ticket se añade a la cola en la página de *Tickets*, donde puedes asignártelo haciendo clic en *Aceptar*, responder los mensajes del chat y eventualmente marcarlo como *Resuelto*.
3. Los mensajes siguientes del mismo contacto se asociarán al primer ticket **abierto/pendiente** que se encuentre.
4. Si un contacto envía un nuevo mensaje en un intervalo menor a 2 horas y no existe un ticket pendiente o abierto, el ticket **cerrado** más reciente se reabrirá automáticamente en lugar de crear uno nuevo.

---

## Capturas de Pantalla

![](https://github.com/canove/whaticket/raw/master/images/whaticket-queues.gif)
<img src="https://raw.githubusercontent.com/canove/whaticket/master/images/chat2.png" width="350"> <img src="https://raw.githubusercontent.com/canove/whaticket/master/images/chat3.png" width="350"> <img src="https://raw.githubusercontent.com/canove/whaticket/master/images/multiple-whatsapps2.png" width="350"> <img src="https://raw.githubusercontent.com/canove/whaticket/master/images/contacts1.png" width="350">

---

## Características principales

- Permite tener múltiples usuarios chateando con el mismo número de WhatsApp. ✅
- Conexión a múltiples cuentas de WhatsApp y recepción de todos los mensajes en un único panel centralizado. ✅ 🆕
- Creación y chat con nuevos contactos sin necesidad de tocar tu teléfono móvil. ✅
- Envío y recepción de mensajes de texto en tiempo real. ✅
- Envío de archivos multimedia (imágenes, audios y documentos). ✅
- Recepción de archivos multimedia (imágenes, audios, videos y documentos). ✅

---

## Instalación y Uso (Linux Ubuntu - Desarrollo)

### 1. Crear la Base de Datos MariaDB/MySQL con Docker
*Nota: Recuerda cambiar las contraseñas y usuarios por defecto.*

```bash
docker run --name whaticketdb -e MYSQL_ROOT_PASSWORD=strongpassword -e MYSQL_DATABASE=whaticket -e MYSQL_USER=whaticket -e MYSQL_PASSWORD=whaticket --restart always -p 3306:3306 -d mariadb:latest --character-set-server=utf8mb4 --collation-server=utf8mb4_bin

# O ejecuta usando docker-compose:
# Primero copia .env.example a .env y ajusta las variables.
docker-compose up -d mysql

# Para administrar fácilmente esta base de datos usando phpmyadmin:
# Se ejecutará por defecto en el puerto 9000 (o el que definas en PMA_PORT en tu .env)
docker-compose -f docker-compose.phpmyadmin.yaml up -d
```

### 2. Instalar dependencias de Puppeteer en el Servidor

```bash
sudo apt-get install -y libxshmfence-dev libgbm-dev wget unzip fontconfig locales gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils
```

### 3. Configurar el Backend

1. Entra a la carpeta del backend y crea el archivo `.env`:
   ```bash
   cd backend
   cp .env.example .env
   nano .env
   ```
2. Rellena el archivo `.env` con tus variables:
   ```env
   NODE_ENV=DEVELOPMENT
   BACKEND_URL=http://localhost
   FRONTEND_URL=https://localhost:3000
   PROXY_PORT=8080
   PORT=8080

   DB_HOST=localhost
   DB_DIALECT=mysql
   DB_USER=whaticket
   DB_PASS=whaticket
   DB_NAME=whaticket

   JWT_SECRET=tu_secreto_jwt
   JWT_REFRESH_SECRET=tu_secreto_refresh_jwt
   ```
3. Instala dependencias, compila y ejecuta migraciones y seeds:
   ```bash
   npm install
   npm run build
   npx sequelize db:migrate
   npx sequelize db:seed:all
   ```
4. Inicia el backend:
   ```bash
   npm start
   ```

### 4. Configurar el Frontend

1. En una nueva terminal, entra a la carpeta del frontend y crea el archivo `.env`:
   ```bash
   cd frontend
   cp .env.example .env
   nano .env
   ```
2. Rellena el archivo con la URL de tu backend:
   ```env
   REACT_APP_BACKEND_URL = http://localhost:8080/
   ```
3. Inicia la aplicación de frontend:
   ```bash
   npm start
   ```

### 5. Primeros Pasos
- Abre tu navegador en `http://tu_servidor_ip:3000/signup`.
- Regístrate, crea un usuario e inicia sesión.
- En la barra lateral, ve a la sección de **Conexiones** y haz clic en agregar nueva conexión de WhatsApp.
- Espera a que aparezca el botón del código QR, haz clic, escanéalo con tu dispositivo móvil y ¡listo!

---

## Despliegue Básico en Producción (Ubuntu VPS)

Todas las instrucciones asumen que **NO** estás ejecutando el proceso como el usuario `root` directamente, ya que Puppeteer suele fallar bajo ese rol. Vamos a crear un usuario para desplegar:

```bash
adduser deploy
usermod -aG sudo deploy
su deploy
```

Necesitarás configurar dos subdominios apuntando a la IP de tu VPS. En este ejemplo utilizaremos `myapp.mydomain.com` para el frontend y `api.mydomain.com` para el backend.

### 1. Actualizar el sistema e instalar Node.js

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

### 2. Instalar Docker y Docker Compose

```bash
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu bionic stable"
sudo apt update
sudo apt install -y docker-ce
sudo systemctl status docker
sudo usermod -aG docker ${USER}
su - ${USER}
```

### 3. Levantar la base de datos

```bash
docker run --name whaticketdb -e MYSQL_ROOT_PASSWORD=strongpassword -e MYSQL_DATABASE=whaticket -e MYSQL_USER=whaticket -e MYSQL_PASSWORD=whaticket --restart always -p 3306:3306 -d mariadb:latest --character-set-server=utf8mb4 --collation-server=utf8mb4_bin
```

### 4. Configurar y Compilar el Backend

```bash
cd ~
git clone https://github.com/duvan51/andoticket.git whaticket
cp whaticket/backend/.env.example whaticket/backend/.env
nano whaticket/backend/.env
```

Configura tu archivo de la siguiente manera:
```env
NODE_ENV=production
BACKEND_URL=https://api.mydomain.com
FRONTEND_URL=https://myapp.mydomain.com
PROXY_PORT=443
PORT=8080

DB_HOST=localhost
DB_DIALECT=mysql
DB_USER=whaticket
DB_PASS=whaticket
DB_NAME=whaticket

JWT_SECRET=tu_secreto_seguro
JWT_REFRESH_SECRET=tu_secreto_refresh_seguro
```

Instala dependencias de Puppeteer y despliega la aplicación de backend:
```bash
sudo apt-get install -y libxshmfence-dev libgbm-dev wget unzip fontconfig locales gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils

cd whaticket/backend
npm install
npm run build
npx sequelize db:migrate
npx sequelize db:seed:all
```

Inicia el servicio en segundo plano usando **PM2**:
```bash
sudo npm install -g pm2
pm2 start dist/server.js --name whaticket-backend
pm2 startup ubuntu -u deploy
# Copia y ejecuta la línea generada por el comando anterior
pm2 save
```

### 5. Configurar y Compilar el Frontend

```bash
cd ../frontend
npm install
```

Crea el archivo `.env` del frontend indicando la URL de tu API:
```env
REACT_APP_BACKEND_URL = https://api.mydomain.com/
```

Compila la aplicación e iníciala con PM2:
```bash
npm run build
pm2 start server.js --name whaticket-frontend
pm2 save
```

---

## Despliegue con Docker y Docker-compose

Para ejecutar todo WhaTicket de manera empaquetada usando contenedores de Docker:

1. Copia y edita tu archivo `.env`:
   ```bash
   cp .env.example .env
   nano .env
   ```
2. Asegúrate de configurar las variables del archivo `.env` incluyendo los parámetros de MariaDB:
   ```env
   # MYSQL
   MYSQL_ENGINE=mariadb
   MYSQL_VERSION=10.6
   MYSQL_ROOT_PASSWORD=unacontraseñamuyfuerte
   MYSQL_DATABASE=whaticket
   MYSQL_PORT=3306
   TZ=America/Bogota

   # BACKEND
   BACKEND_PORT=8080
   BACKEND_SERVER_NAME=api.mydomain.com
   BACKEND_URL=https://api.mydomain.com
   PROXY_PORT=443
   JWT_SECRET=secreto_jwt
   JWT_REFRESH_SECRET=secreto_refresh_jwt

   # FRONTEND
   FRONTEND_PORT=80
   FRONTEND_SSL_PORT=443
   FRONTEND_SERVER_NAME=myapp.mydomain.com
   FRONTEND_URL=https://myapp.mydomain.com
   ```
3. Inicia la construcción y levantamiento de contenedores:
   ```bash
   docker-compose up -d --build
   ```
4. En el primer inicio, ejecuta las semillas (seeds) de base de datos dentro del contenedor:
   ```bash
   docker-compose exec backend npx sequelize db:seed:all
   ```

#### Estructura del Certificado SSL
Para desplegar certificados SSL válidos, móntalos en la carpeta `ssl/certs` en el host. La estructura interna debe coincidir con la siguiente:

```bash
.
└── certs
    ├── backend
    │   ├── fullchain.pem
    │   └── privkey.pem
    └── frontend
        ├── fullchain.pem
        └── privkey.pem
```

---

## Datos de Acceso por Defecto

* **Usuario:** `admin@whaticket.com`
* **Contraseña:** `admin`

---

## Actualizar la Aplicación

Para actualizar tu instalación a la última versión y mantener tu código base intacto con Git, puedes utilizar este script:

```bash
nano updateWhaticket.sh
```

```bash
#!/bin/bash
echo "Actualizando Whaticket, por favor espera..."

cd ~/whaticket
git pull
cd backend
npm install
rm -rf dist
npm run build
npx sequelize db:migrate
npx sequelize db:seed
cd ../frontend
npm install
rm -rf build
npm run build
pm2 restart all

echo "¡Actualización terminada con éxito!"
```

Dale permisos de ejecución e inícialo:
```bash
chmod +x updateWhaticket.sh
./updateWhaticket.sh
```

---

## Contribuir y Soporte

Si este proyecto te ha servido y deseas apoyar su desarrollo, puedes invitar al creador original a un café:

<a href="https://www.buymeacoffee.com/canove" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 61px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

Cualquier ayuda, reporte de fallos o sugerencias son bien recibidos.

---

## Descargo de Responsabilidad

Este proyecto no está afiliado, asociado, autorizado, respaldado ni conectado oficialmente de ninguna manera con WhatsApp ni con ninguna de sus subsidiarias o filiales. El sitio web oficial de WhatsApp se encuentra en [https://whatsapp.com](https://whatsapp.com). "WhatsApp", así como los nombres, marcas, emblemas e imágenes relacionados, son marcas registradas de sus respectivos propietarios.

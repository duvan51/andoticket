const mysql = require('mysql2/promise');
require("dotenv").config();

async function fixTestTicket() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'whaticket'
  });

  try {
    console.log("🔧 Iniciando reparación del ticket de prueba...\n");

    // Obtener la primera cola de la empresa (kpop)
    const [queues] = await connection.execute(`
      SELECT q.id, q.name 
      FROM Queues q
      JOIN Companies c ON q.companyId = c.id
      WHERE c.name = 'empresa kpop'
      LIMIT 1
    `);

    if (queues.length === 0) {
      console.log("⚠️  No hay colas para la empresa kpop. Creando una...");
      
      // Obtener companyId
      const [companies] = await connection.execute(`
        SELECT id FROM Companies WHERE name = 'empresa kpop'
      `);
      
      if (companies.length === 0) {
        console.error("❌ Empresa 'kpop' no encontrada");
        return;
      }
      
      const companyId = companies[0].id;
      
      // Crear queue
      await connection.execute(`
        INSERT INTO Queues (name, color, companyId, greetingMessage, createdAt, updatedAt)
        VALUES ('General', '#3F51B5', ?, '', NOW(), NOW())
      `, [companyId]);
      
      const [newQueues] = await connection.execute(`
        SELECT id FROM Queues 
        WHERE companyId = ? 
        ORDER BY id DESC 
        LIMIT 1
      `, [companyId]);
      
      const queueId = newQueues[0].id;
      console.log(`✅ Cola creada: ID ${queueId}`);
      
      // Asignar ticket a la cola
      await connection.execute(`
        UPDATE Tickets 
        SET queueId = ?
        WHERE id = 94
      `, [queueId]);
      
      console.log(`✅ Ticket 94 asignado a cola ${queueId}`);
    } else {
      const queueId = queues[0].id;
      console.log(`✅ Queue encontrada: ${queues[0].name} (ID: ${queueId})`);
      
      // Asignar ticket a la cola
      await connection.execute(`
        UPDATE Tickets 
        SET queueId = ?
        WHERE id = 94
      `, [queueId]);
      
      console.log(`✅ Ticket 94 asignado a cola ${queueId}`);
    }

    // Verificar el ticket actualizado
    const [tickets] = await connection.execute(`
      SELECT t.id, t.status, c.name as contactName, c.number, q.name as queueName, w.name as whatsappName
      FROM Tickets t
      LEFT JOIN Contacts c ON t.contactId = c.id
      LEFT JOIN Queues q ON t.queueId = q.id
      LEFT JOIN Whatsapps w ON t.whatsappId = w.id
      WHERE t.id = 94
    `);

    if (tickets.length > 0) {
      const ticket = tickets[0];
      console.log("\n📊 Ticket actualizado:");
      console.log(`   ID: ${ticket.id}`);
      console.log(`   Contacto: ${ticket.contactName} (${ticket.number})`);
      console.log(`   Status: ${ticket.status}`);
      console.log(`   Queue: ${ticket.queueName || "Sin cola"}`);
      console.log(`   WhatsApp: ${ticket.whatsappName || "Sin WhatsApp"}`);
      console.log("\n✅ ¡Ticket de prueba reparado! Recarga el dashboard para verlo.");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

fixTestTicket();

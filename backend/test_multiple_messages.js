const mysql = require('mysql2/promise');
require("dotenv").config();

async function testMultipleMessages() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'whaticket'
  });

  try {
    console.log("🧪 Test: Crear múltiples tickets/mensajes para la misma empresa\n");

    // Obtener la empresa
    const [companies] = await connection.execute(`
      SELECT id FROM Companies WHERE name = 'empresa kpop' LIMIT 1
    `);

    if (companies.length === 0) {
      console.error("❌ Empresa 'empresa kpop' no encontrada");
      return;
    }

    const companyId = companies[0].id;
    console.log(`✅ Empresa ID: ${companyId}`);

    // Obtener WhatsApp
    const [whatsapps] = await connection.execute(`
      SELECT id, status FROM Whatsapps WHERE companyId = ? LIMIT 1
    `, [companyId]);

    if (whatsapps.length === 0) {
      console.error("❌ WhatsApp no encontrado");
      return;
    }

    if (whatsapps[0].status !== 'CONNECTED') {
      console.warn(`⚠️  WhatsApp en estado: ${whatsapps[0].status} (no CONNECTED)`);
    }

    const whatsappId = whatsapps[0].id;
    console.log(`✅ WhatsApp ID: ${whatsappId}`);

    // Obtener Queue
    const [queues] = await connection.execute(`
      SELECT id FROM Queues WHERE companyId = ? LIMIT 1
    `, [companyId]);

    if (queues.length === 0) {
      console.error("❌ Queue no encontrada");
      return;
    }

    const queueId = queues[0].id;
    console.log(`✅ Queue ID: ${queueId}\n`);

    // Crear varios contactos de prueba
    const testNumbers = [
      { number: "573001234561", name: "Test User 1" },
      { number: "573001234562", name: "Test User 2" },
      { number: "573001234563", name: "Test User 3" }
    ];

    for (const testUser of testNumbers) {
      try {
        // Verificar si el contacto ya existe
        const [existingContacts] = await connection.execute(`
          SELECT id FROM Contacts WHERE number = ? AND companyId = ?
        `, [testUser.number, companyId]);

        let contactId;
        if (existingContacts.length > 0) {
          contactId = existingContacts[0].id;
          console.log(`ℹ️  Contacto ${testUser.number} ya existe (ID: ${contactId})`);
        } else {
          // Crear contacto
          const result = await connection.execute(`
            INSERT INTO Contacts (name, number, profilePicUrl, email, isGroup, companyId, createdAt, updatedAt)
            VALUES (?, ?, '', '', false, ?, NOW(), NOW())
          `, [testUser.name, testUser.number, companyId]);

          contactId = result[0].insertId;
          console.log(`✅ Contacto creado: ${testUser.name} (${testUser.number}) - ID: ${contactId}`);
        }

        // Crear ticket
        const ticketResult = await connection.execute(`
          INSERT INTO Tickets (
            contactId, status, isGroup, unreadMessages, companyId, whatsappId, queueId, 
            createdAt, updatedAt
          )
          VALUES (?, 'open', false, 0, ?, ?, ?, NOW(), NOW())
        `, [contactId, companyId, whatsappId, queueId]);

        const ticketId = ticketResult[0].insertId;
        console.log(`   ✅ Ticket creado: ID ${ticketId}`);

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
      }
    }

    console.log("🎉 Test completado!\n");

    // Verificar tickets creados
    const [tickets] = await connection.execute(`
      SELECT t.id, c.name, c.number, t.status, COUNT(m.id) as messageCount
      FROM Tickets t
      JOIN Contacts c ON t.contactId = c.id
      LEFT JOIN Messages m ON t.id = m.ticketId
      WHERE t.companyId = ?
      GROUP BY t.id
      ORDER BY t.id DESC
      LIMIT 5
    `, [companyId]);

    console.log("📋 Últimos 5 tickets:");
    tickets.forEach(t => {
      console.log(`   - ID ${t.id}: ${t.name} (${t.number}) - Status: ${t.status} - Mensajes: ${t.messageCount}`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

testMultipleMessages();

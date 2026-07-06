const { Sequelize, DataTypes, Op } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false
  }
);

async function createTestMessage() {
  try {
    // Get the company and whatsapp
    const [companies] = await sequelize.query(
      "SELECT id FROM Companies WHERE email = 'kpop@gmail.com' LIMIT 1"
    );
    
    if (companies.length === 0) {
      console.log("❌ Company not found");
      process.exit(1);
    }
    
    const companyId = companies[0].id;

    // Get the whatsapp
    const [whatsapps] = await sequelize.query(
      "SELECT id FROM Whatsapps WHERE companyId = ? AND number = '573138673363' LIMIT 1",
      { replacements: [companyId] }
    );
    
    if (whatsapps.length === 0) {
      console.log("❌ WhatsApp not found for this company");
      process.exit(1);
    }
    
    const whatsappId = whatsapps[0].id;

    // Create or get a test contact
    const [contacts] = await sequelize.query(
      "SELECT id FROM Contacts WHERE number = '573001234567' AND companyId = ? LIMIT 1",
      { replacements: [companyId] }
    );
    
    let contactId;
    if (contacts.length === 0) {
      // Create test contact
      await sequelize.query(
        "INSERT INTO Contacts (name, number, isGroup, companyId, createdAt, updatedAt) VALUES ('Test Contact', '573001234567', 0, ?, NOW(), NOW())",
        { replacements: [companyId] }
      );
      const [newContact] = await sequelize.query(
        "SELECT id FROM Contacts WHERE number = '573001234567' AND companyId = ? LIMIT 1",
        { replacements: [companyId] }
      );
      contactId = newContact[0].id;
    } else {
      contactId = contacts[0].id;
    }

    // Create a test ticket
    const [tickets] = await sequelize.query(
      "SELECT id FROM Tickets WHERE contactId = ? AND whatsappId = ? AND companyId = ? LIMIT 1",
      { replacements: [contactId, whatsappId, companyId] }
    );
    
    let ticketId;
    if (tickets.length === 0) {
      await sequelize.query(
        "INSERT INTO Tickets (status, contactId, whatsappId, companyId, isGroup, unreadMessages, createdAt, updatedAt) VALUES ('open', ?, ?, ?, 0, 1, NOW(), NOW())",
        { replacements: [contactId, whatsappId, companyId] }
      );
      const [newTicket] = await sequelize.query(
        "SELECT id FROM Tickets WHERE contactId = ? AND whatsappId = ? AND companyId = ? LIMIT 1",
        { replacements: [contactId, whatsappId, companyId] }
      );
      ticketId = newTicket[0].id;
    } else {
      ticketId = tickets[0].id;
    }

    // Create a test message
    await sequelize.query(
      'INSERT INTO Messages (id, ticketId, contactId, body, fromMe, `read`, mediaType, createdAt, updatedAt) VALUES (?, ?, ?, ?, 0, 0, "chat", NOW(), NOW())',
      { replacements: [Math.random().toString(36).substring(7), ticketId, contactId, "Test message from diagnose script"] }
    );

    console.log("✅ Test data created successfully!");
    console.log(`   Company ID: ${companyId}`);
    console.log(`   WhatsApp ID: ${whatsappId}`);
    console.log(`   Contact ID: ${contactId}`);
    console.log(`   Ticket ID: ${ticketId}`);
    console.log("\n📱 Go to the dashboard and refresh to see the test message");
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

createTestMessage();

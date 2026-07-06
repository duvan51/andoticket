const { Sequelize } = require("sequelize");
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

async function checkTestTicket() {
  try {
    const companyId = 5;
    
    // Check if ticket exists
    const [tickets] = await sequelize.query(
      "SELECT t.id, t.status, t.contactId, t.companyId, c.name, c.number FROM Tickets t JOIN Contacts c ON t.contactId = c.id WHERE t.companyId = ? ORDER BY t.updatedAt DESC LIMIT 10",
      { replacements: [companyId] }
    );

    console.log("\n=== TICKETS FOR COMPANY 5 ===");
    if (tickets.length === 0) {
      console.log("❌ No tickets found");
    } else {
      console.log(`✓ Found ${tickets.length} tickets`);
      tickets.forEach(t => {
        console.log(`  ID: ${t.id} | Contact: ${t.name} (${t.number}) | Status: ${t.status}`);
      });
    }

    // Check the contact directly
    const [contacts] = await sequelize.query(
      "SELECT id, name, number, companyId FROM Contacts WHERE companyId = ? ORDER BY createdAt DESC LIMIT 10",
      { replacements: [companyId] }
    );

    console.log("\n=== CONTACTS FOR COMPANY 5 ===");
    if (contacts.length === 0) {
      console.log("❌ No contacts found");
    } else {
      console.log(`✓ Found ${contacts.length} contacts`);
      contacts.forEach(c => {
        console.log(`  ID: ${c.id} | Name: ${c.name} | Number: ${c.number}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

checkTestTicket();

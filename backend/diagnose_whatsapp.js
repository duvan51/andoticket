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

async function diagnose() {
  try {
    // 1. Find the company
    const [companies] = await sequelize.query(
      "SELECT id, name, email FROM Companies WHERE email = 'kpop@gmail.com'"
    );
    console.log("\n=== COMPANY ===");
    if (companies.length === 0) {
      console.log("❌ No company found with email kpop@gmail.com");
      process.exit(1);
    }
    const company = companies[0];
    console.log(`✓ Company: ${company.name} (ID: ${company.id})`);

    // 2. Find the WhatsApp number
    const [whatsapps] = await sequelize.query(
      "SELECT id, name, number, companyId FROM Whatsapps WHERE number = '573138673363' OR number LIKE '%573138673363%'"
    );
    console.log("\n=== WHATSAPP ===");
    if (whatsapps.length === 0) {
      console.log("❌ No WhatsApp found with number 573138673363");
      process.exit(1);
    }
    whatsapps.forEach(wa => {
      console.log(`${wa.companyId === company.id ? "✓" : "❌"} WhatsApp: ${wa.name} | Number: ${wa.number} | Company ID: ${wa.companyId}`);
    });

    const whatsappId = whatsapps[0].id;

    // 3. Check tickets for this company
    const [tickets] = await sequelize.query(
      "SELECT id, contactId, status, companyId, whatsappId FROM Tickets WHERE companyId = ? LIMIT 10",
      { replacements: [company.id] }
    );
    console.log("\n=== TICKETS ===");
    if (tickets.length === 0) {
      console.log("❌ No tickets found for this company");
    } else {
      console.log(`✓ Found ${tickets.length} tickets`);
      tickets.forEach(t => {
        console.log(`  - ID: ${t.id} | Contact: ${t.contactId} | WhatsApp: ${t.whatsappId} | Status: ${t.status}`);
      });
    }

    // 4. Check tickets for this specific WhatsApp
    const [waTickets] = await sequelize.query(
      "SELECT id, contactId, status, companyId FROM Tickets WHERE whatsappId = ? AND companyId = ?",
      { replacements: [whatsappId, company.id] }
    );
    console.log("\n=== TICKETS FOR THIS WHATSAPP ===");
    if (waTickets.length === 0) {
      console.log("❌ No tickets found for this WhatsApp number in this company");
    } else {
      console.log(`✓ Found ${waTickets.length} tickets for this WhatsApp`);
    }

    // 5. Check contacts for this company
    const [contacts] = await sequelize.query(
      "SELECT id, number, name, companyId FROM Contacts WHERE companyId = ? LIMIT 10",
      { replacements: [company.id] }
    );
    console.log("\n=== CONTACTS ===");
    if (contacts.length === 0) {
      console.log("❌ No contacts found for this company");
    } else {
      console.log(`✓ Found ${contacts.length} contacts`);
      contacts.forEach(c => {
        console.log(`  - ID: ${c.id} | Number: ${c.number} | Name: ${c.name}`);
      });
    }

    // 6. Check messages for this company
    const [messages] = await sequelize.query(
      "SELECT m.id, m.body, m.fromMe, t.id as ticketId FROM Messages m JOIN Tickets t ON m.ticketId = t.id WHERE t.companyId = ? LIMIT 5",
      { replacements: [company.id] }
    );
    console.log("\n=== MESSAGES ===");
    if (messages.length === 0) {
      console.log("❌ No messages found for this company");
    } else {
      console.log(`✓ Found ${messages.length} messages`);
      messages.forEach(m => {
        console.log(`  - ID: ${m.id} | FromMe: ${m.fromMe} | Body: ${m.body.substring(0, 50)}...`);
      });
    }

    console.log("\n=== DIAGNOSIS ===");
    if (tickets.length === 0 || messages.length === 0) {
      console.log("⚠️  No tickets or messages. The WhatsApp may be connected but:");
      console.log("   1. Messages aren't being received/processed");
      console.log("   2. Or tickets aren't being created when messages arrive");
      console.log("\nCheck:");
      console.log("   - WhatsApp webhook/event listener is running");
      console.log("   - Browser console for errors");
      console.log("   - Backend logs for message processing errors");
    } else {
      console.log("✓ System appears to be working correctly");
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

diagnose();

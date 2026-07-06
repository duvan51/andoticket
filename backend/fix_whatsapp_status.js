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

async function fixWhatsAppStatus() {
  try {
    // Reset OPENING status to CLOSED so they can reconnect
    const result = await sequelize.query(
      "UPDATE Whatsapps SET status = 'CLOSED' WHERE status = 'OPENING'"
    );
    
    console.log("✅ Updated WhatsApps with OPENING status to CLOSED");
    console.log(`   This allows them to reconnect when the backend restarts`);
    
    // Show final status
    const [whatsapps] = await sequelize.query(
      "SELECT id, name, number, status, companyId FROM Whatsapps"
    );
    
    console.log("\n=== UPDATED WHATSAPP STATUS ===");
    whatsapps.forEach(wa => {
      const statusEmoji = wa.status === "CONNECTED" ? "✅" : wa.status === "qrcode" ? "📱" : "❌";
      console.log(`${statusEmoji} [${wa.id}] ${wa.name} | Number: ${wa.number} | Status: ${wa.status} | Company: ${wa.companyId}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

fixWhatsAppStatus();

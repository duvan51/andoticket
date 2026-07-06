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

async function checkWhatsAppStatus() {
  try {
    const [whatsapps] = await sequelize.query(
      "SELECT id, name, number, status, companyId FROM Whatsapps"
    );
    
    console.log("\n=== WHATSAPP STATUS ===");
    if (whatsapps.length === 0) {
      console.log("❌ No WhatsApps found");
    } else {
      whatsapps.forEach(wa => {
        const statusEmoji = wa.status === "CONNECTED" ? "✅" : wa.status === "qrcode" ? "📱" : "❌";
        console.log(`${statusEmoji} [${wa.id}] ${wa.name} | Number: ${wa.number} | Status: ${wa.status} | Company: ${wa.companyId}`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

checkWhatsAppStatus();

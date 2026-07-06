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

async function resetTokens() {
  try {
    // Reset tokenVersion to force all users to get new tokens
    const result = await sequelize.query(
      "UPDATE Users SET tokenVersion = tokenVersion + 1"
    );
    
    console.log("✅ All user tokens have been invalidated");
    console.log("   Users will need to log in again to get new tokens");
    console.log("\n⚠️  IMPORTANT: Restart the backend for this to take effect");
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

resetTokens();

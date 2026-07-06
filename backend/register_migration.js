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

async function registerMigration() {
  try {
    await sequelize.query('INSERT INTO SequelizeMeta (name) VALUES (?)' , {
      replacements: ['20260217000001-add-number-to-whatsapps.js']
    });
    console.log('Migration registered');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

registerMigration();

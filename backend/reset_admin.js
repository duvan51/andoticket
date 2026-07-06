
const { Sequelize } = require('sequelize');
const config = require('./dist/config/database');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize(config);

async function run() {
  try {
    await sequelize.authenticate();
    const hashedPassword = await bcrypt.hash('123456', 8);
    await sequelize.query(`UPDATE Users SET passwordHash = '${hashedPassword}' WHERE email = 'admin@whaticket.com'`);
    console.log('Password for admin@whaticket.com reset to 123456');
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

run();

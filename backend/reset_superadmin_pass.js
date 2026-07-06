
const { Sequelize } = require('sequelize');
const config = require('./dist/config/database');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize(config);

async function run() {
  try {
    await sequelize.authenticate();
    const passwordHash = await bcrypt.hash('123456', 8);
    
    await sequelize.query(`UPDATE Users SET passwordHash = '${passwordHash}' WHERE email = 'aponteramirezduvan@gmail.com'`);
    console.log('Password updated successfully for superadmin.');
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

run();

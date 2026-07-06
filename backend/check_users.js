
const { Sequelize } = require('sequelize');
const config = require('./dist/config/database');
const sequelize = new Sequelize(config);

async function run() {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query("SELECT id, name, email, profile, companyId FROM Users");
    console.log(JSON.stringify(results, null, 2));
    await sequelize.close();
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

run();

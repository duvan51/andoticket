
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('whaticket', 'root', 'strongpassword', {
  host: 'localhost',
  dialect: 'mysql'
});

async function run() {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query("DESCRIBE Settings");
    console.log(JSON.stringify(results, null, 2));
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

run();

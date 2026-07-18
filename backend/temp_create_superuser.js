const { Sequelize } = require('sequelize');
const config = require('./dist/config/database');
const bcrypt = require('bcryptjs');

const sequelize = new Sequelize(config);

async function run() {
  try {
    await sequelize.authenticate();

    const email = 'duvanaponteramirez@gmail.com';
    const password = '123456';
    const passwordHash = await bcrypt.hash(password, 8);

    const [companies] = await sequelize.query("SELECT id FROM Companies WHERE id = 1 LIMIT 1;");
    const companyId = companies && companies.length ? companies[0].id : null;
    const companyIdValue = companyId === null ? 'NULL' : companyId;

    await sequelize.query(`INSERT INTO Users (name, email, passwordHash, profile, companyId, createdAt, updatedAt) VALUES ('Super Admin', '${email}', '${passwordHash}', 'admin', ${companyIdValue}, NOW(), NOW()) ON DUPLICATE KEY UPDATE passwordHash='${passwordHash}', profile='admin', companyId=${companyIdValue}, updatedAt=NOW();`);

    console.log('Super user created or updated. Email:', email, 'Password:', password);
  } catch (error) {
    console.error('Error creating superuser:', error);
  } finally {
    await sequelize.close();
  }
}

run();

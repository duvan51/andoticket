
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('whaticket', 'root', 'strongpassword', {
  host: 'localhost',
  dialect: 'mysql'
});

async function run() {
  try {
    await sequelize.authenticate();
    
    // Check if user exists
    const [users] = await sequelize.query("SELECT id FROM Users WHERE email = 'duvanaponteramirez@gmail.com' OR email = 'aponteramirezduvan@gmail.com'");
    
    if (users.length > 0) {
      console.log('User found, updating profile and email...');
      await sequelize.query(`UPDATE Users SET profile = 'superadmin', email = 'aponteramirezduvan@gmail.com', companyId = 1 WHERE id = ${users[0].id}`);
      console.log('User updated successfully.');
    } else {
      console.log('User not found. You might need to sign up first or I can create it.');
      // Optionally create it here if needed, but let's see if we can update the existing one first.
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

run();

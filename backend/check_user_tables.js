const pool = require('./config/db');

async function checkUserTables() {
    try {
        console.log('=== Checking Users table (capitalized) ===');
        const usersCapital = await pool.query(`SELECT id, name, email, role FROM "Users" ORDER BY id DESC LIMIT 5`);
        console.log(usersCapital.rows);
        
        console.log('\n=== Checking users table (lowercase) ===');
        const usersLower = await pool.query(`SELECT user_id, name, email, role_id FROM users ORDER BY user_id DESC LIMIT 5`);
        console.log(usersLower.rows);
        
        console.log('\n=== Problem ===');
        console.log('Login checks "Users" table (capitalized)');
        console.log('Admin creates users in "users" table (lowercase)');
        console.log('These are TWO DIFFERENT TABLES!');
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

checkUserTables();

const pool = require('./config/db');

async function checkAzeemUser() {
    try {
        const email = 'azeem87@gmail.com';
        
        console.log('=== Checking azeem87@gmail.com ===\n');
        
        // Check lowercase users table
        console.log('In users table (lowercase):');
        const userLower = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
        console.log(userLower.rows);
        
        // Check capitalized Users table
        console.log('\nIn Users table (capitalized):');
        const userCap = await pool.query(`SELECT * FROM "Users" WHERE email = $1`, [email]);
        console.log(userCap.rows);
        
        console.log('\n=== Solution ===');
        console.log('If you want azeem87@gmail.com to be an admin:');
        console.log('1. Update the role_id in users table to 1');
        console.log('   Run: UPDATE users SET role_id = 1 WHERE email = \'azeem87@gmail.com\'');
        console.log('\nOR');
        console.log('2. Delete from users table and create in Users table as Admin');
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

checkAzeemUser();

const pool = require('./config/db');

async function checkPasswordFields() {
    try {
        console.log('=== Checking Users table (capitalized) columns ===');
        const usersCapitalCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Users'
            ORDER BY ordinal_position
        `);
        console.log(usersCapitalCols.rows);
        
        console.log('\n=== Checking users table (lowercase) columns ===');
        const usersLowerCols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);
        console.log(usersLowerCols.rows);
        
        console.log('\n=== Sample user from Users (capitalized) ===');
        const userCap = await pool.query(`SELECT id, email, password FROM "Users" LIMIT 1`);
        console.log(userCap.rows[0]);
        
        console.log('\n=== Sample user from users (lowercase) ===');
        const userLow = await pool.query(`SELECT user_id, email, password_hash FROM users WHERE user_id = 35`);
        console.log(userLow.rows[0]);
        
        console.log('\n=== THE PROBLEM ===');
        console.log('Login queries: "Users" table and checks "password" field');
        console.log('Admin creates in: users table and stores in "password_hash" field');
        console.log('THESE ARE TWO DIFFERENT TABLES!');
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

checkPasswordFields();

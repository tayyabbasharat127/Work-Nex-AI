const pool = require('./config/db');

async function checkUserOrg() {
    try {
        // Check users table
        console.log('=== Users table (capitalized) - Sample ===');
        const users = await pool.query(`
            SELECT id, name, email, role, organization_id, status
            FROM "Users"
            LIMIT 5
        `);
        console.log(users.rows);
        
        // Check users table (lowercase)
        console.log('\n=== users table (lowercase) - Sample ===');
        const usersLower = await pool.query(`
            SELECT user_id, name, email, role_id, organization_id, status
            FROM users
            LIMIT 5
        `);
        console.log(usersLower.rows);
        
        // Check which org table users reference
        console.log('\n=== Checking user foreign keys ===');
        const fk = await pool.query(`
            SELECT
                conname AS constraint_name,
                conrelid::regclass AS table_name,
                confrelid::regclass AS foreign_table,
                pg_get_constraintdef(oid) AS constraint_def
            FROM pg_constraint
            WHERE contype = 'f' AND conrelid::regclass::text IN ('users', 'Users')
        `);
        console.log(fk.rows);
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

checkUserOrg();

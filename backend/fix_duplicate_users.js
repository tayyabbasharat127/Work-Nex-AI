const pool = require('./config/db');

async function fixDuplicateUsers() {
    try {
        console.log('=== Fixing Duplicate Users ===\n');
        
        // Find all emails that exist in both tables
        const duplicates = await pool.query(`
            SELECT u.email, u.user_id, u.role_id, uc.id, uc.role
            FROM users u
            INNER JOIN "Users" uc ON u.email = uc.email
        `);
        
        console.log(`Found ${duplicates.rows.length} duplicate users:\n`);
        
        for (const dup of duplicates.rows) {
            console.log(`Email: ${dup.email}`);
            console.log(`  - users table: user_id=${dup.user_id}, role_id=${dup.role_id}`);
            console.log(`  - Users table: id=${dup.id}, role=${dup.role}`);
            
            // Delete from lowercase users table to keep the Users table version
            await pool.query(`DELETE FROM users WHERE email = $1`, [dup.email]);
            console.log(`  ✓ Deleted from users table (keeping Users table version)\n`);
        }
        
        console.log('✅ All duplicates fixed!');
        console.log('\nNow login will check Users table for these emails.');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        pool.end();
    }
}

fixDuplicateUsers();

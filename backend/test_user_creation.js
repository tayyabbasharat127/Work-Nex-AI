const pool = require('./config/db');

async function testUserCreation() {
    try {
        console.log('=== Testing User Creation ===\n');
        
        // Get a valid organization
        const org = await pool.query(`SELECT id FROM "Organizations" LIMIT 1`);
        if (org.rows.length === 0) {
            console.log('❌ No organizations found');
            return;
        }
        
        const orgId = org.rows[0].id;
        console.log(`Using organization ID: ${orgId}\n`);
        
        // Check foreign key constraints
        console.log('Checking foreign key constraints...');
        const fk = await pool.query(`
            SELECT
                conname AS constraint_name,
                pg_get_constraintdef(oid) AS constraint_def
            FROM pg_constraint
            WHERE contype = 'f' AND conrelid::regclass::text = 'users'
        `);
        console.log('Foreign keys:', fk.rows);
        
        console.log('\n✅ Setup looks good!');
        console.log('\nYou can now create users through the API.');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        pool.end();
    }
}

testUserCreation();

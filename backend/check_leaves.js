const pool = require('./config/db');

async function checkLeaves() {
    try {
        console.log('=== Checking Leaves Table ===\n');
        
        // Get all leaves
        const leaves = await pool.query(`SELECT * FROM "Leaves" ORDER BY "createdAt" DESC LIMIT 5`);
        console.log('All leaves:', leaves.rows);
        
        // Check which users exist
        console.log('\n=== Checking Users ===');
        for (const leave of leaves.rows) {
            console.log(`\nLeave ID ${leave.id} - employee_id: ${leave.employee_id}`);
            
            // Check in Users table (capitalized)
            const userCap = await pool.query(`SELECT id, name, email, organization_id FROM "Users" WHERE id = $1`, [leave.employee_id]);
            if (userCap.rows.length > 0) {
                console.log('  Found in Users table:', userCap.rows[0]);
            } else {
                console.log('  NOT found in Users table');
            }
            
            // Check in users table (lowercase)
            const userLow = await pool.query(`SELECT user_id, name, email, organization_id FROM users WHERE user_id = $1`, [leave.employee_id]);
            if (userLow.rows.length > 0) {
                console.log('  Found in users table:', userLow.rows[0]);
            } else {
                console.log('  NOT found in users table');
            }
        }
        
        // Check organizations
        console.log('\n=== Organizations ===');
        const orgs = await pool.query(`SELECT id, organization_name, admin_email FROM "Organizations" LIMIT 5`);
        console.log(orgs.rows);
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

checkLeaves();

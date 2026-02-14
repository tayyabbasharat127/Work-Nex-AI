const pool = require('./config/db');

async function checkExistingDepartments() {
    try {
        // Check existing departments
        console.log('=== Existing Departments ===');
        const depts = await pool.query(`SELECT * FROM departments`);
        console.log(depts.rows);
        
        // Check if those organization_ids exist in Organizations table
        if (depts.rows.length > 0) {
            console.log('\n=== Checking if organization_ids exist in Organizations ===');
            for (const dept of depts.rows) {
                const orgCheck = await pool.query(
                    `SELECT id, organization_name FROM "Organizations" WHERE id = $1`,
                    [dept.organization_id]
                );
                console.log(`Dept ${dept.name} (org_id: ${dept.organization_id}):`, 
                    orgCheck.rows.length > 0 ? '✓ EXISTS' : '✗ NOT FOUND');
                if (orgCheck.rows.length > 0) {
                    console.log('  Org:', orgCheck.rows[0]);
                }
            }
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

checkExistingDepartments();

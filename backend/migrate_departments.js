const pool = require('./config/db');

async function migrateDepartments() {
    try {
        console.log('=== Migrating Departments Data ===\n');
        
        // Get all departments
        const depts = await pool.query(`SELECT * FROM departments`);
        console.log(`Found ${depts.rows.length} departments to migrate`);
        
        // For each department, find the matching organization
        for (const dept of depts.rows) {
            console.log(`\nProcessing: ${dept.name} (org_id: ${dept.organization_id})`);
            
            // Check if org exists in lowercase organization table
            const oldOrg = await pool.query(
                `SELECT * FROM organization WHERE organization_id = $1`,
                [dept.organization_id]
            );
            
            if (oldOrg.rows.length === 0) {
                console.log(`  ⚠️  Organization ${dept.organization_id} not found in organization table`);
                console.log(`  → Deleting orphaned department`);
                await pool.query(`DELETE FROM departments WHERE department_id = $1`, [dept.department_id]);
                continue;
            }
            
            const org = oldOrg.rows[0];
            console.log(`  Found org: ${org.organization_name} (${org.admin_email})`);
            
            // Find matching organization in Organizations table by admin_email
            const newOrg = await pool.query(
                `SELECT id FROM "Organizations" WHERE admin_email = $1`,
                [org.admin_email]
            );
            
            if (newOrg.rows.length === 0) {
                console.log(`  ⚠️  No matching organization in Organizations table`);
                console.log(`  → Deleting orphaned department`);
                await pool.query(`DELETE FROM departments WHERE department_id = $1`, [dept.department_id]);
                continue;
            }
            
            const newOrgId = newOrg.rows[0].id;
            console.log(`  ✓ Found matching Organizations.id: ${newOrgId}`);
            
            // Update the department with new organization_id
            await pool.query(
                `UPDATE departments SET organization_id = $1 WHERE department_id = $2`,
                [newOrgId, dept.department_id]
            );
            console.log(`  ✓ Updated department organization_id to ${newOrgId}`);
        }
        
        console.log('\n✅ Migration complete!');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        pool.end();
    }
}

migrateDepartments();

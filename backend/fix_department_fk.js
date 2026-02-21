const pool = require('./config/db');

async function fixDepartmentFK() {
    try {
        console.log('Fixing departments foreign key constraint...');
        
        // Drop the old foreign key constraint
        await pool.query(`
            ALTER TABLE departments 
            DROP CONSTRAINT IF EXISTS departments_organization_id_fkey
        `);
        console.log('✓ Dropped old constraint');
        
        // Add new foreign key constraint pointing to Organizations table
        await pool.query(`
            ALTER TABLE departments 
            ADD CONSTRAINT departments_organization_id_fkey 
            FOREIGN KEY (organization_id) 
            REFERENCES "Organizations"(id)
            ON DELETE CASCADE
        `);
        console.log('✓ Added new constraint pointing to Organizations table');
        
        // Also fix the manager_id foreign key to point to Users table
        await pool.query(`
            ALTER TABLE departments 
            DROP CONSTRAINT IF EXISTS departments_manager_id_fkey
        `);
        console.log('✓ Dropped old manager constraint');
        
        await pool.query(`
            ALTER TABLE departments 
            ADD CONSTRAINT departments_manager_id_fkey 
            FOREIGN KEY (manager_id) 
            REFERENCES "Users"(id)
            ON DELETE SET NULL
        `);
        console.log('✓ Added new manager constraint pointing to Users table');
        
        console.log('\n✅ All constraints fixed successfully!');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        pool.end();
    }
}

fixDepartmentFK();

const pool = require('./config/db');

async function safeMigrateDepartments() {
    try {
        console.log('=== Safe Department Migration ===\n');
        
        // Step 1: Remove department_id from users temporarily
        console.log('Step 1: Clearing user department assignments...');
        await pool.query(`UPDATE users SET department_id = NULL WHERE department_id IS NOT NULL`);
        console.log('✓ Cleared all user department assignments\n');
        
        // Step 2: Delete all existing departments
        console.log('Step 2: Deleting all existing departments...');
        const deleteResult = await pool.query(`DELETE FROM departments RETURNING *`);
        console.log(`✓ Deleted ${deleteResult.rows.length} departments\n`);
        
        // Step 3: Now we can safely add the new foreign key constraint
        console.log('Step 3: Updating foreign key constraints...');
        
        // Drop old constraint
        await pool.query(`
            ALTER TABLE departments 
            DROP CONSTRAINT IF EXISTS departments_organization_id_fkey
        `);
        console.log('✓ Dropped old organization constraint');
        
        // Add new constraint to Organizations table
        await pool.query(`
            ALTER TABLE departments 
            ADD CONSTRAINT departments_organization_id_fkey 
            FOREIGN KEY (organization_id) 
            REFERENCES "Organizations"(id)
            ON DELETE CASCADE
        `);
        console.log('✓ Added new constraint pointing to Organizations table');
        
        // Fix manager_id constraint
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
        
        console.log('\n✅ Migration complete!');
        console.log('\nℹ️  Note: All departments have been deleted. Users can now create new departments.');
        console.log('ℹ️  User department assignments have been cleared and need to be reassigned.');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        pool.end();
    }
}

safeMigrateDepartments();

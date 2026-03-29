const pool = require('./config/db');

async function fixUsersForeignKeys() {
    try {
        console.log('=== Fixing users table foreign keys ===\n');
        
        // Step 1: Check current foreign keys
        console.log('Step 1: Checking current foreign keys...');
        const fkCheck = await pool.query(`
            SELECT
                conname AS constraint_name,
                pg_get_constraintdef(oid) AS constraint_def
            FROM pg_constraint
            WHERE contype = 'f' AND conrelid::regclass::text = 'users'
        `);
        console.log('Current constraints:', fkCheck.rows);
        
        // Step 2: Drop old organization foreign key
        console.log('\nStep 2: Dropping old organization foreign key...');
        await pool.query(`
            ALTER TABLE users 
            DROP CONSTRAINT IF EXISTS users_organization_id_fkey
        `);
        console.log('✓ Dropped old constraint');
        
        // Step 3: Add new foreign key to Organizations table
        console.log('\nStep 3: Adding new foreign key to Organizations table...');
        await pool.query(`
            ALTER TABLE users 
            ADD CONSTRAINT users_organization_id_fkey 
            FOREIGN KEY (organization_id) 
            REFERENCES "Organizations"(id)
            ON DELETE CASCADE
        `);
        console.log('✓ Added new constraint pointing to Organizations table');
        
        // Step 4: Fix department foreign key
        console.log('\nStep 4: Fixing department foreign key...');
        await pool.query(`
            ALTER TABLE users 
            DROP CONSTRAINT IF EXISTS users_department_id_fkey
        `);
        console.log('✓ Dropped old department constraint');
        
        await pool.query(`
            ALTER TABLE users 
            ADD CONSTRAINT users_department_id_fkey 
            FOREIGN KEY (department_id) 
            REFERENCES departments(department_id)
            ON DELETE SET NULL
        `);
        console.log('✓ Added new department constraint');
        
        // Step 5: Fix manager foreign key
        console.log('\nStep 5: Fixing manager foreign key...');
        await pool.query(`
            ALTER TABLE users 
            DROP CONSTRAINT IF EXISTS users_manager_id_fkey
        `);
        console.log('✓ Dropped old manager constraint');
        
        await pool.query(`
            ALTER TABLE users 
            ADD CONSTRAINT users_manager_id_fkey 
            FOREIGN KEY (manager_id) 
            REFERENCES "Users"(id)
            ON DELETE SET NULL
        `);
        console.log('✓ Added new manager constraint pointing to Users table');
        
        console.log('\n✅ All user foreign keys fixed successfully!');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        pool.end();
    }
}

fixUsersForeignKeys();

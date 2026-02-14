const pool = require('./config/db');

async function migrateUsersOrg() {
    try {
        console.log('=== Migrating users organization_id ===\n');
        
        // Get all users with organization_id
        const users = await pool.query(`
            SELECT user_id, name, email, organization_id 
            FROM users 
            WHERE organization_id IS NOT NULL
        `);
        
        console.log(`Found ${users.rows.length} users with organization_id\n`);
        
        for (const user of users.rows) {
            console.log(`Processing: ${user.name} (${user.email}) - org_id: ${user.organization_id}`);
            
            // Check if org exists in lowercase organization table
            const oldOrg = await pool.query(
                `SELECT * FROM organization WHERE organization_id = $1`,
                [user.organization_id]
            );
            
            if (oldOrg.rows.length === 0) {
                console.log(`  ⚠️  Organization ${user.organization_id} not found`);
                console.log(`  → Setting organization_id to NULL`);
                await pool.query(
                    `UPDATE users SET organization_id = NULL WHERE user_id = $1`,
                    [user.user_id]
                );
                continue;
            }
            
            const org = oldOrg.rows[0];
            console.log(`  Found org: ${org.organization_name} (${org.admin_email})`);
            
            // Find matching organization in Organizations table
            const newOrg = await pool.query(
                `SELECT id FROM "Organizations" WHERE admin_email = $1`,
                [org.admin_email]
            );
            
            if (newOrg.rows.length === 0) {
                console.log(`  ⚠️  No matching organization in Organizations table`);
                console.log(`  → Setting organization_id to NULL`);
                await pool.query(
                    `UPDATE users SET organization_id = NULL WHERE user_id = $1`,
                    [user.user_id]
                );
                continue;
            }
            
            const newOrgId = newOrg.rows[0].id;
            console.log(`  ✓ Found matching Organizations.id: ${newOrgId}`);
            
            // Update user with new organization_id
            await pool.query(
                `UPDATE users SET organization_id = $1 WHERE user_id = $2`,
                [newOrgId, user.user_id]
            );
            console.log(`  ✓ Updated user organization_id to ${newOrgId}\n`);
        }
        
        console.log('✅ User migration complete!');
        console.log('\nNow running foreign key fix...\n');
        
        // Now fix the foreign keys
        await pool.query(`
            ALTER TABLE users 
            DROP CONSTRAINT IF EXISTS users_organization_id_fkey
        `);
        console.log('✓ Dropped old organization constraint');
        
        await pool.query(`
            ALTER TABLE users 
            ADD CONSTRAINT users_organization_id_fkey 
            FOREIGN KEY (organization_id) 
            REFERENCES "Organizations"(id)
            ON DELETE CASCADE
        `);
        console.log('✓ Added new constraint pointing to Organizations table');
        
        console.log('\n✅ All done!');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        pool.end();
    }
}

migrateUsersOrg();

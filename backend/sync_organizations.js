const pool = require('./config/db');

async function syncOrganizations() {
  try {
    console.log('=== Syncing Organizations ===\n');

    // Get all organizations from Organizations table
    const orgsResult = await pool.query(`
      SELECT id, organization_name, admin_email, package, status, "createdAt", "updatedAt"
      FROM "Organizations"
      ORDER BY id
    `);

    console.log(`Found ${orgsResult.rows.length} organizations in Organizations table`);

    // Check lowercase organization table structure
    const structureResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'organization'
      ORDER BY ordinal_position
    `);

    console.log('\nLowercase organization table structure:');
    console.table(structureResult.rows);

    // Sync each organization
    for (const org of orgsResult.rows) {
      // Check if exists in lowercase table
      const existsResult = await pool.query(`
        SELECT organization_id FROM organization WHERE organization_id = $1
      `, [org.id]);

      if (existsResult.rows.length > 0) {
        console.log(`✓ Organization ${org.id} (${org.organization_name}) already exists`);
      } else {
        // Insert into lowercase table
        await pool.query(`
          INSERT INTO organization (
            organization_id, 
            organization_name, 
            organization_email,
            admin_email, 
            subscription_plan, 
            status, 
            is_verified, 
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          org.id, 
          org.organization_name, 
          org.admin_email || 'noreply@worknex.com', // Use admin_email as org_email
          org.admin_email, 
          org.package || 'Basic', 
          org.status || 'Active', 
          true, 
          org.createdAt
        ]);
        
        console.log(`✓ Created organization ${org.id} (${org.organization_name})`);
      }
    }

    // Verify
    const finalCount = await pool.query(`SELECT COUNT(*) FROM organization`);
    console.log(`\n✓ Total organizations in lowercase table: ${finalCount.rows[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

syncOrganizations();

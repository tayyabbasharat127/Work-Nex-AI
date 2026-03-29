const pool = require('./config/db');

async function fixNullOrgUsers() {
  try {
    console.log('=== Fixing Users with NULL organization_id ===\n');

    // Find users with null organization_id (excluding super admin)
    const nullOrgUsers = await pool.query(`
      SELECT user_id, name, email, role_id, organization_id
      FROM users
      WHERE organization_id IS NULL AND role_id != 0
      ORDER BY user_id
    `);

    if (nullOrgUsers.rows.length === 0) {
      console.log('✓ No users with NULL organization_id found (excluding super admin)');
      process.exit(0);
    }

    console.log('Users with NULL organization_id:');
    console.table(nullOrgUsers.rows);

    // Get the first active organization
    const activeOrg = await pool.query(`
      SELECT id, organization_name, admin_email
      FROM "Organizations"
      WHERE status = 'Active'
      ORDER BY id
      LIMIT 1
    `);

    if (activeOrg.rows.length === 0) {
      console.log('✗ No active organization found. Cannot fix users.');
      process.exit(1);
    }

    const orgId = activeOrg.rows[0].id;
    console.log(`\nWill assign users to organization: ${activeOrg.rows[0].organization_name} (ID: ${orgId})`);

    // Update users
    const updateResult = await pool.query(`
      UPDATE users
      SET organization_id = $1
      WHERE organization_id IS NULL AND role_id != 0
      RETURNING user_id, name, email, organization_id
    `, [orgId]);

    console.log('\n✓ Updated users:');
    console.table(updateResult.rows);

    console.log(`\n✓ Successfully assigned ${updateResult.rows.length} users to organization ${orgId}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixNullOrgUsers();

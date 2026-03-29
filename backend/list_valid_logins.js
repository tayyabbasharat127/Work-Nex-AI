const pool = require('./config/db');

async function listValidLogins() {
  try {
    console.log('=== Valid Admin Logins ===\n');

    // Get all admin users with their organizations
    const result = await pool.query(`
      SELECT 
        u.user_id,
        u.name,
        u.email,
        u.role_id,
        u.organization_id,
        o.organization_name,
        o.status as org_status
      FROM users u
      LEFT JOIN "Organizations" o ON u.organization_id = o.id
      WHERE u.role_id IN (1, 2) AND u.status = 'active'
      ORDER BY u.organization_id, u.role_id
    `);

    console.log('Admin/Manager users you can log in as:\n');
    
    const validUsers = result.rows.filter(u => u.organization_id && u.org_status === 'Active');
    const invalidUsers = result.rows.filter(u => !u.organization_id || u.org_status !== 'Active');

    if (validUsers.length > 0) {
      console.log('✓ VALID LOGINS (with active organization):');
      console.table(validUsers.map(u => ({
        email: u.email,
        name: u.name,
        role: u.role_id === 1 ? 'Admin' : 'Manager',
        organization: u.organization_name,
        org_id: u.organization_id
      })));
    }

    if (invalidUsers.length > 0) {
      console.log('\n⚠️  INVALID LOGINS (no organization or inactive):');
      console.table(invalidUsers.map(u => ({
        email: u.email,
        name: u.name,
        role: u.role_id === 1 ? 'Admin' : 'Manager',
        organization: u.organization_name || 'NULL',
        org_status: u.org_status || 'N/A'
      })));
    }

    console.log('\n💡 TIP: Use one of the valid logins above to create departments and users.');
    console.log('If you need to create a new admin user, use the signup page to create a new organization.');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listValidLogins();

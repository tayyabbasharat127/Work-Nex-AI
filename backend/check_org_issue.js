const pool = require('./config/db');

async function checkOrgIssue() {
  try {
    console.log('=== Checking Organization Issue ===\n');

    // Check users table
    const usersResult = await pool.query(`
      SELECT user_id, name, email, organization_id, role_id 
      FROM users 
      ORDER BY user_id 
      LIMIT 10
    `);
    console.log('Users in lowercase users table:');
    console.table(usersResult.rows);

    // Check Organizations table
    const orgsResult = await pool.query(`
      SELECT id, organization_name, admin_email, status 
      FROM "Organizations" 
      ORDER BY id
    `);
    console.log('\nOrganizations in Organizations table:');
    console.table(orgsResult.rows);

    // Check for users with invalid organization_id
    const invalidOrgs = await pool.query(`
      SELECT u.user_id, u.name, u.email, u.organization_id
      FROM users u
      LEFT JOIN "Organizations" o ON u.organization_id = o.id
      WHERE u.organization_id IS NOT NULL AND o.id IS NULL
    `);
    console.log('\nUsers with invalid organization_id:');
    console.table(invalidOrgs.rows);

    // Check departments table
    const deptsResult = await pool.query(`
      SELECT department_id, name, organization_id 
      FROM departments 
      ORDER BY department_id 
      LIMIT 10
    `);
    console.log('\nDepartments:');
    console.table(deptsResult.rows);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkOrgIssue();

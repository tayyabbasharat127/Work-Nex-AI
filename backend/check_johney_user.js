const pool = require('./config/db');

async function checkUser() {
  try {
    console.log('=== Checking johneypapa3006@gmail.com ===\n');

    // Check lowercase users table
    const lowercaseResult = await pool.query(`
      SELECT u.user_id, u.name, u.email, u.role_id, u.organization_id, u.status,
             o.id as org_exists, o.organization_name, o.status as org_status
      FROM users u
      LEFT JOIN "Organizations" o ON u.organization_id = o.id
      WHERE u.email = $1
    `, ['johneypapa3006@gmail.com']);

    // Check capitalized Users table
    const capitalResult = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.organization_id, u.status,
             o.id as org_exists, o.organization_name, o.status as org_status
      FROM "Users" u
      LEFT JOIN "Organizations" o ON u.organization_id = o.id
      WHERE u.email = $1
    `, ['johneypapa3006@gmail.com']);

    if (lowercaseResult.rows.length > 0) {
      console.log('Found in lowercase users table:');
      console.table(lowercaseResult.rows);
    }

    if (capitalResult.rows.length > 0) {
      console.log('Found in capitalized Users table:');
      console.table(capitalResult.rows);
    }

    if (lowercaseResult.rows.length === 0 && capitalResult.rows.length === 0) {
      console.log('❌ User not found in any table');
    }

    // Check what organization_id 24 is
    const org24 = await pool.query(`
      SELECT * FROM "Organizations" WHERE id = 24
    `);
    
    console.log('\nOrganization with ID 24:');
    if (org24.rows.length > 0) {
      console.table(org24.rows);
    } else {
      console.log('❌ Organization 24 does NOT exist!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUser();

const pool = require('./config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Get token from command line argument
const token = process.argv[2];

if (!token) {
  console.log('Usage: node debug_current_user.js <your_jwt_token>');
  console.log('\nTo get your token:');
  console.log('1. Open browser DevTools (F12)');
  console.log('2. Go to Application/Storage > Local Storage');
  console.log('3. Find the "user" key and copy the token value');
  console.log('4. Run: node debug_current_user.js YOUR_TOKEN');
  process.exit(1);
}

async function debugUser() {
  try {
    console.log('=== Debugging Current User ===\n');

    // Decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:');
    console.log(decoded);
    console.log('');

    // Get user from database
    const userResult = await pool.query(`
      SELECT user_id, name, email, role_id, organization_id, status
      FROM users
      WHERE user_id = $1
    `, [decoded.userId]);

    if (userResult.rows.length === 0) {
      console.log('❌ User not found in database');
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log('User in database:');
    console.table(user);

    // Check if organization exists
    if (user.organization_id) {
      const orgResult = await pool.query(`
        SELECT id, organization_name, admin_email, status
        FROM "Organizations"
        WHERE id = $1
      `, [user.organization_id]);

      if (orgResult.rows.length === 0) {
        console.log('\n❌ Organization NOT FOUND in database!');
        console.log(`User has organization_id ${user.organization_id} but it doesn't exist in Organizations table`);
      } else {
        console.log('\n✓ Organization exists:');
        console.table(orgResult.rows[0]);
      }
    } else {
      console.log('\n⚠️  User has NULL organization_id');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

debugUser();

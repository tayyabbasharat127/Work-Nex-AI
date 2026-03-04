const bcrypt = require('bcrypt');
const pool = require('./config/db');

async function testSuperAdminDirect() {
  console.log('🧪 Testing Super Admin Login (Direct DB Check)...\n');

  const email = 'admin@worknex.com';
  const password = 'Admin@123';

  try {
    console.log('1. Querying database for super admin...');
    const userResult = await pool.query(
      `SELECT * FROM "Users" WHERE email=$1 AND role='SuperAdmin' AND status='Active'`,
      [email]
    );

    console.log('   Query result rows:', userResult.rows.length);

    if (!userResult.rows.length) {
      console.log('❌ FAILED: Super admin not found or not active');
      console.log('\n💡 Checking all users with SuperAdmin role:');
      const allSuperAdmins = await pool.query(
        `SELECT id, email, role, status FROM "Users" WHERE role='SuperAdmin'`
      );
      console.log('   Found:', allSuperAdmins.rows);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log('✅ Super admin found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Status:', user.status);
    console.log('   Organization ID:', user.organization_id);

    console.log('\n2. Testing password...');
    const match = await bcrypt.compare(password, user.password);
    console.log('   Password match:', match);

    if (!match) {
      console.log('❌ FAILED: Password does not match');
      process.exit(1);
    }

    console.log('\n✅ All checks passed!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Super admin exists in database');
    console.log('   ✅ Status is Active');
    console.log('   ✅ Password matches');
    console.log('\n🔧 If login still fails, restart the backend server to pick up code changes:');
    console.log('   1. Stop the current server (Ctrl+C in the terminal running it)');
    console.log('   2. Start it again: cd backend && node Server.js');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testSuperAdminDirect();

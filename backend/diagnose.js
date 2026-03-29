const pool = require('./config/db');
const http = require('http');

console.log('🔍 Running System Diagnostics...\n');

async function diagnose() {
  const results = {
    database: false,
    tables: false,
    users: false,
    server: false
  };

  // 1. Check Database Connection
  console.log('1️⃣ Checking Database Connection...');
  try {
    await pool.query('SELECT NOW()');
    console.log('   ✅ Database connected\n');
    results.database = true;
  } catch (err) {
    console.log('   ❌ Database connection failed:', err.message);
    console.log('   💡 Make sure PostgreSQL is running\n');
    return results;
  }

  // 2. Check Tables Exist
  console.log('2️⃣ Checking Tables...');
  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tableNames = tables.rows.map(r => r.table_name);
    console.log(`   ✅ Found ${tableNames.length} tables:`);
    tableNames.forEach(name => console.log(`      - ${name}`));
    console.log('');
    results.tables = true;

    // Check for required tables
    const required = ['Users', 'users', 'Leaves', 'departments'];
    const missing = required.filter(t => !tableNames.includes(t));
    if (missing.length > 0) {
      console.log('   ⚠️  Missing tables:', missing.join(', '));
      console.log('   💡 Run: npx sequelize-cli db:migrate\n');
    }
  } catch (err) {
    console.log('   ❌ Failed to check tables:', err.message, '\n');
  }

  // 3. Check Users
  console.log('3️⃣ Checking Users...');
  try {
    // Check Users table
    const usersResult = await pool.query('SELECT COUNT(*) FROM "Users"');
    const usersCount = parseInt(usersResult.rows[0].count);
    
    // Check users table
    const usersLowerResult = await pool.query('SELECT COUNT(*) FROM users');
    const usersLowerCount = parseInt(usersLowerResult.rows[0].count);
    
    const totalUsers = usersCount + usersLowerCount;
    
    if (totalUsers > 0) {
      console.log(`   ✅ Found ${totalUsers} users`);
      console.log(`      - "Users" table: ${usersCount}`);
      console.log(`      - "users" table: ${usersLowerCount}\n`);
      results.users = true;
    } else {
      console.log('   ⚠️  No users found');
      console.log('   💡 Create admin: node create_super_admin.js\n');
    }
  } catch (err) {
    console.log('   ❌ Failed to check users:', err.message, '\n');
  }

  // 4. Check Server
  console.log('4️⃣ Checking Server...');
  try {
    await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:5000/api/health', (res) => {
        if (res.statusCode === 200) {
          console.log('   ✅ Server is running on port 5000\n');
          results.server = true;
          resolve();
        } else {
          console.log(`   ⚠️  Server returned status ${res.statusCode}\n`);
          resolve();
        }
      });
      
      req.on('error', (err) => {
        console.log('   ❌ Server not running on port 5000');
        console.log('   💡 Start server: node Server.js\n');
        resolve();
      });
      
      req.setTimeout(2000, () => {
        req.destroy();
        console.log('   ❌ Server timeout\n');
        resolve();
      });
    });
  } catch (err) {
    console.log('   ❌ Failed to check server:', err.message, '\n');
  }

  // Summary
  console.log('📊 Summary:');
  console.log('   Database:', results.database ? '✅' : '❌');
  console.log('   Tables:', results.tables ? '✅' : '❌');
  console.log('   Users:', results.users ? '✅' : '❌');
  console.log('   Server:', results.server ? '✅' : '❌');
  console.log('');

  const allGood = Object.values(results).every(v => v);
  
  if (allGood) {
    console.log('✅ All systems operational!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Go to: http://localhost:3000/login');
    console.log('   2. Login with: superadmin@worknex.com / SuperAdmin@123');
    console.log('   3. Start using the dashboard!');
  } else {
    console.log('⚠️  Some issues detected. Follow the suggestions above.');
  }

  process.exit(0);
}

diagnose().catch(err => {
  console.error('❌ Diagnostic failed:', err);
  process.exit(1);
});

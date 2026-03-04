const bcrypt = require('bcrypt');
const pool = require('./config/db');

async function createSuperAdmin() {
  try {
    console.log('🔧 Creating Super Admin User...\n');

    // Super admin credentials
    const superAdminData = {
      name: 'Super Admin',
      email: 'admin@worknex.com',
      password: 'Admin@123',  // Change this to a secure password!
      role: 'SuperAdmin',
      status: 'Active'
    };

    // Check if super admin already exists
    const existingUser = await pool.query(
      `SELECT id, email, role FROM "Users" WHERE email = $1`,
      [superAdminData.email]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️  Super Admin already exists:');
      console.log('   ID:', existingUser.rows[0].id);
      console.log('   Email:', existingUser.rows[0].email);
      console.log('   Role:', existingUser.rows[0].role);
      console.log('\n❓ Do you want to update the password? (Ctrl+C to cancel)');
      
      // Wait 3 seconds before updating
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update password
      const hashedPassword = await bcrypt.hash(superAdminData.password, 10);
      await pool.query(
        `UPDATE "Users" SET password = $1, role = $2, status = $3, organization_id = NULL WHERE email = $4`,
        [hashedPassword, superAdminData.role, superAdminData.status, superAdminData.email]
      );
      
      console.log('✅ Super Admin password updated successfully!\n');
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(superAdminData.password, 10);

      // Create super admin user
      const result = await pool.query(`
        INSERT INTO "Users" (
          name, email, password, role, status, organization_id, "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, NOW(), NOW()
        )
        RETURNING id, name, email, role, status, organization_id
      `, [
        superAdminData.name,
        superAdminData.email,
        hashedPassword,
        superAdminData.role,
        superAdminData.status,
        null  // Super admin has no organization
      ]);

      console.log('✅ Super Admin created successfully!\n');
      console.log('📋 User Details:');
      console.log('   ID:', result.rows[0].id);
      console.log('   Name:', result.rows[0].name);
      console.log('   Email:', result.rows[0].email);
      console.log('   Role:', result.rows[0].role);
      console.log('   Status:', result.rows[0].status);
      console.log('   Organization ID:', result.rows[0].organization_id);
    }

    console.log('\n🔑 Login Credentials:');
    console.log('   Email:', superAdminData.email);
    console.log('   Password:', superAdminData.password);
    console.log('\n🌐 Login Endpoint:');
    console.log('   POST http://localhost:5000/api/auth/superadmin/login');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log('\n📚 For testing guide, see: SUPER_ADMIN_TESTING_GUIDE.md');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating super admin:', err);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure PostgreSQL is running');
    console.error('   2. Check database connection in backend/config/db.js');
    console.error('   3. Verify "Users" table exists');
    console.error('   4. Check if bcrypt is installed: npm install bcrypt');
    process.exit(1);
  }
}

// Run the function
createSuperAdmin();

const pool = require('./config/db');
const bcrypt = require('bcrypt');

async function migrateUser() {
  try {
    console.log('=== Migrating johneypapa3006@gmail.com to lowercase users table ===\n');

    // Get user from Users table
    const userResult = await pool.query(`
      SELECT * FROM "Users" WHERE email = $1
    `, ['johneypapa3006@gmail.com']);

    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log('Found user in Users table:');
    console.table({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id
    });

    // Map role to role_id
    let roleId = 3; // Default Employee
    if (user.role === 'SuperAdmin') roleId = 0;
    else if (user.role === 'Admin') roleId = 1;
    else if (user.role === 'Manager') roleId = 2;
    else if (user.role === 'Employee') roleId = 3;

    // Check if already exists in lowercase users table
    const existingUser = await pool.query(`
      SELECT user_id FROM users WHERE email = $1
    `, [user.email]);

    if (existingUser.rows.length > 0) {
      console.log('\n✓ User already exists in lowercase users table');
      console.log('Updating organization_id...');
      
      await pool.query(`
        UPDATE users 
        SET organization_id = $1, role_id = $2, name = $3
        WHERE email = $4
      `, [user.organization_id, roleId, user.name, user.email]);
      
      console.log('✓ Updated existing user');
    } else {
      console.log('\nCreating user in lowercase users table...');
      
      const result = await pool.query(`
        INSERT INTO users (name, email, password_hash, role_id, organization_id, status, created_at)
        VALUES ($1, $2, $3, $4, $5, 'active', NOW())
        RETURNING user_id, name, email, role_id, organization_id
      `, [user.name, user.email, user.password, roleId, user.organization_id]);

      console.log('✓ Created user:');
      console.table(result.rows[0]);
    }

    console.log('\n✓ Migration complete! You can now log in with this account.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

migrateUser();

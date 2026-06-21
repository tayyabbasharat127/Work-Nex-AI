const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function createLeaveBalancesTable() {
  try {
    console.log('🔧 Creating leave_balances table...\n');

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'leave_balances'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('ℹ️  Table leave_balances already exists\n');
    } else {
      // Create table
      await pool.query(`
        CREATE TABLE leave_balances (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
          annual_balance INTEGER DEFAULT 20,
          used_annual INTEGER DEFAULT 0,
          sick_balance INTEGER DEFAULT 10,
          used_sick INTEGER DEFAULT 0,
          casual_balance INTEGER DEFAULT 7,
          used_casual INTEGER DEFAULT 0,
          year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT unique_user_year UNIQUE (user_id, year)
        );
      `);

      console.log('✅ Table leave_balances created successfully\n');

      // Create index
      await pool.query(`
        CREATE INDEX idx_leave_balances_user_year ON leave_balances(user_id, year);
      `);

      console.log('✅ Index created successfully\n');
    }

    // Initialize balances for existing users
    console.log('📊 Initializing leave balances for existing users...\n');

    const currentYear = new Date().getFullYear();
    
    const result = await pool.query(`
      INSERT INTO leave_balances (user_id, year, annual_balance, used_annual, sick_balance, used_sick, casual_balance, used_casual, "createdAt", "updatedAt")
      SELECT 
        user_id,
        $1 as year,
        20 as annual_balance,
        0 as used_annual,
        10 as sick_balance,
        0 as used_sick,
        7 as casual_balance,
        0 as used_casual,
        NOW() as "createdAt",
        NOW() as "updatedAt"
      FROM users
      WHERE NOT EXISTS (
        SELECT 1 FROM leave_balances 
        WHERE leave_balances.user_id = users.user_id 
        AND leave_balances.year = $1
      )
      RETURNING user_id;
    `, [currentYear]);

    console.log(`✅ Initialized balances for ${result.rows.length} users\n`);

    // Show sample data
    const sample = await pool.query(`
      SELECT 
        lb.*,
        u.name,
        u.email
      FROM leave_balances lb
      JOIN users u ON u.user_id = lb.user_id
      LIMIT 5;
    `);

    console.log('📋 Sample leave balances:');
    sample.rows.forEach(row => {
      console.log(`   ${row.name} (${row.email}):`);
      console.log(`      Annual: ${row.annual_balance - row.used_annual}/${row.annual_balance} remaining`);
      console.log(`      Sick: ${row.sick_balance - row.used_sick}/${row.sick_balance} remaining`);
      console.log(`      Casual: ${row.casual_balance - row.used_casual}/${row.casual_balance} remaining`);
      console.log('');
    });

    console.log('✅ Leave balances table setup complete!\n');
    console.log('🔄 Please restart your backend server for changes to take effect.');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

createLeaveBalancesTable();

const pool = require('./config/db');
const bcrypt = require('bcrypt');

async function testLogin() {
    try {
        // Test with a user created by admin
        const testEmail = 'tayyab456@gmail.com';
        const testPassword = 'password123'; // Replace with actual password you set
        
        console.log('=== Testing Login for:', testEmail, '===\n');
        
        // Step 1: Check lowercase users table
        console.log('Step 1: Checking users table (lowercase)...');
        const userLower = await pool.query(
            `SELECT user_id, name, email, password_hash, role_id, organization_id, status FROM users WHERE email=$1`,
            [testEmail]
        );
        
        if (userLower.rows.length > 0) {
            const user = userLower.rows[0];
            console.log('✓ Found user in lowercase table:');
            console.log('  user_id:', user.user_id);
            console.log('  name:', user.name);
            console.log('  email:', user.email);
            console.log('  role_id:', user.role_id);
            console.log('  status:', user.status);
            console.log('  password_hash:', user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'NULL');
            
            // Test password
            console.log('\nStep 2: Testing password...');
            console.log('  Entered password:', testPassword);
            
            if (!user.password_hash) {
                console.log('  ❌ ERROR: password_hash is NULL in database!');
            } else {
                const match = await bcrypt.compare(testPassword, user.password_hash);
                console.log('  Password match:', match ? '✓ YES' : '✗ NO');
                
                if (!match) {
                    console.log('\n  Trying to hash the password you entered:');
                    const testHash = await bcrypt.hash(testPassword, 10);
                    console.log('  New hash would be:', testHash.substring(0, 20) + '...');
                    console.log('  DB hash is:      ', user.password_hash.substring(0, 20) + '...');
                }
            }
        } else {
            console.log('✗ User NOT found in lowercase table');
        }
        
        // Step 2: Check capitalized Users table
        console.log('\n\nStep 3: Checking Users table (capitalized)...');
        const userCap = await pool.query(
            `SELECT id, name, email, password, role, organization_id, status FROM "Users" WHERE email=$1`,
            [testEmail]
        );
        
        if (userCap.rows.length > 0) {
            const user = userCap.rows[0];
            console.log('✓ Found user in capitalized table:');
            console.log('  id:', user.id);
            console.log('  name:', user.name);
            console.log('  email:', user.email);
            console.log('  role:', user.role);
            console.log('  status:', user.status);
            console.log('  password:', user.password ? user.password.substring(0, 20) + '...' : 'NULL');
        } else {
            console.log('✗ User NOT found in capitalized table');
        }
        
        console.log('\n=== INSTRUCTIONS ===');
        console.log('1. Replace testPassword variable with the actual password you set');
        console.log('2. Run this script again: node backend/test_login.js');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        pool.end();
    }
}

testLogin();

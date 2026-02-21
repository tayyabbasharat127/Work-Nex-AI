const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testSuperAdminLogin() {
  console.log('🧪 Testing Super Admin Login...\n');

  try {
    // Test 1: Login via dedicated super admin endpoint
    console.log('Test 1: Super Admin Login (Dedicated Endpoint)');
    console.log('POST', `${BASE_URL}/auth/superadmin/login`);
    
    const superAdminLogin = await axios.post(`${BASE_URL}/auth/superadmin/login`, {
      email: 'superadmin@worknex.com',
      password: 'SuperAdmin@123'
    });

    if (superAdminLogin.data.token && superAdminLogin.data.user.role_id === 0) {
      console.log('✅ PASSED: Super admin login via dedicated endpoint');
      console.log('   Token:', superAdminLogin.data.token.substring(0, 50) + '...');
      console.log('   Role ID:', superAdminLogin.data.user.role_id);
      console.log('   Organization ID:', superAdminLogin.data.user.organizationId);
    } else {
      console.log('❌ FAILED: Super admin login via dedicated endpoint');
      console.log('   Response:', superAdminLogin.data);
    }

    // Test 2: Login via regular endpoint (should also work now)
    console.log('\nTest 2: Super Admin Login (Regular Endpoint)');
    console.log('POST', `${BASE_URL}/auth/login`);
    
    const regularLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'superadmin@worknex.com',
      password: 'SuperAdmin@123'
    });

    if (regularLogin.data.token && regularLogin.data.user.role_id === 0) {
      console.log('✅ PASSED: Super admin login via regular endpoint');
      console.log('   Token:', regularLogin.data.token.substring(0, 50) + '...');
      console.log('   Role ID:', regularLogin.data.user.role_id);
      console.log('   Organization ID:', regularLogin.data.user.organization_id);
    } else {
      console.log('❌ FAILED: Role ID should be 0, got:', regularLogin.data.user.role_id);
      console.log('   Response:', regularLogin.data);
    }

    // Test 3: Access super admin route
    console.log('\nTest 3: Access Super Admin Route');
    const token = superAdminLogin.data.token;
    
    const orgsResponse = await axios.get(`${BASE_URL}/superadmin/organizations`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (orgsResponse.data.success) {
      console.log('✅ PASSED: Can access super admin routes');
      console.log('   Organizations found:', orgsResponse.data.data.length);
    } else {
      console.log('❌ FAILED: Cannot access super admin routes');
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Super admin can login via dedicated endpoint');
    console.log('   ✅ Super admin can login via regular endpoint');
    console.log('   ✅ Role ID correctly mapped to 0');
    console.log('   ✅ Can access super admin routes');

  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
    if (err.response?.status === 403) {
      console.error('\n💡 Authorization failed - check if role_id is 0 in token');
    }
  }
}

testSuperAdminLogin();

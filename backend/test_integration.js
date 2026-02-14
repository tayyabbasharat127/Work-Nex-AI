const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5432,
});

const BASE_URL = 'http://localhost:5000/api';
const EMAIL = `admin_${Date.now()}@test.com`; // Unique email
const PASSWORD = 'password123';

async function runTest() {
    try {
        console.log('--- STARTING INTEGRATION TEST ---');
        console.log(`Using email: ${EMAIL}`);

        // 1. Signup
        console.log('\n1. Testing Signup...');
        try {
            const signupRes = await axios.post(`${BASE_URL}/auth/signup`, {
                organization_name: 'TestOrg',
                admin_name: 'TestAdmin',
                admin_email: EMAIL,
                password: PASSWORD,
                subscription_plan: 'Basic'
            });
            console.log('Signup Response:', signupRes.data);
        } catch (e) {
            console.error('Signup Failed:', e.response?.data || e.message);
            process.exit(1);
        }

        // 2. Get OTP from DB
        console.log('\n2. Fetching OTP from DB...');
        const otpRes = await pool.query(`SELECT otp FROM "TempOtps" WHERE email = $1`, [EMAIL]);
        if (otpRes.rows.length === 0) {
            console.error('OTP not found in DB');
            process.exit(1);
        }
        const otp = otpRes.rows[0].otp;
        console.log(`OTP Fetched: ${otp}`);

        // 3. Verify OTP
        console.log('\n3. Verifying OTP...');
        try {
            const verifyRes = await axios.post(`${BASE_URL}/auth/verify-otp`, {
                email: EMAIL,
                otp: otp
            });
            console.log('OTP Verification Response:', verifyRes.data);
        } catch (e) {
            console.error('OTP Verification Failed:', e.response?.data || e.message);
            process.exit(1);
        }

        // 4. Login
        console.log('\n4. Testing Login...');
        let token;
        try {
            const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
                email: EMAIL,
                password: PASSWORD
            });
            console.log('Login Response:', loginRes.data);
            token = loginRes.data.token;
            if (!token) throw new Error('No token received');
        } catch (e) {
            console.error('Login Failed:', e.response?.data || e.message);
            process.exit(1);
        }

        // 5. Check In (Attendance)
        console.log('\n5. Testing Attendance Check-In...');
        try {
            const checkInRes = await axios.post(
                `${BASE_URL}/attendance/check-in`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('Check-In Response:', checkInRes.data);
        } catch (e) {
            console.error('Check-In Failed:', e.response?.data || e.message);
            // Don't exit, maybe already checked in or other issue, continue to leave
        }

        // 6. Create Leave
        console.log('\n6. Testing Leave Application...');
        try {
            const leaveRes = await axios.post(
                `${BASE_URL}/leaves`,
                {
                    leave_type: 'Annual',
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: new Date().toISOString().split('T')[0],
                    reason: 'Integration Test Leave'
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('Leave Response:', leaveRes.data);
        } catch (e) {
            console.error('Leave Failed:', e.response?.data || e.message);
        } // End of test

        console.log('\n--- TEST COMPLETED ---');

    } catch (err) {
        console.error('Unexpected Error:', err);
    } finally {
        await pool.end();
    }
}

runTest();

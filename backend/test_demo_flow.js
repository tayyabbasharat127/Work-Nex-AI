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
const TIMESTAMP = Date.now();
const ADMIN_EMAIL = `admin_${TIMESTAMP}@demo.com`;
const EMPLOYEE_EMAIL = `employee_${TIMESTAMP}@demo.com`;
const PASSWORD = 'password123';

async function runDemoTest() {
    try {
        console.log('--- STARTING DEMO FLOW TEST ---');
        console.log(`Admin Check: ${ADMIN_EMAIL}`);
        console.log(`Employee Check: ${EMPLOYEE_EMAIL}`);

        // 1. Signup Admin
        console.log('\n1. Signing up Admin...');
        await axios.post(`${BASE_URL}/auth/signup`, {
            organization_name: 'DemoOrg',
            admin_name: 'DemoAdmin',
            admin_email: ADMIN_EMAIL,
            password: PASSWORD,
            subscription_plan: 'Premium'
        });
        console.log('Admin Signup structure initiated.');

        // 2. Get OTP
        const otpRes = await pool.query(`SELECT otp FROM "TempOtps" WHERE email = $1`, [ADMIN_EMAIL]);
        if (otpRes.rows.length === 0) throw new Error('OTP not found');
        const otp = otpRes.rows[0].otp;
        console.log(`OTP Fetched: ${otp}`);

        // 3. Verify OTP
        await axios.post(`${BASE_URL}/auth/verify-otp`, { email: ADMIN_EMAIL, otp });
        console.log('Admin Verified.');

        // 4. Login Admin
        const adminLogin = await axios.post(`${BASE_URL}/auth/login`, { email: ADMIN_EMAIL, password: PASSWORD });
        const adminToken = adminLogin.data.token;
        console.log('Admin Logged In.');

        // 5. Create Employee User
        console.log('\n5. Creating Employee User...');
        const createRes = await axios.post(
            `${BASE_URL}/users/createuser`,
            {
                name: 'Demo Employee',
                email: EMPLOYEE_EMAIL,
                password: PASSWORD,
                role_id: 3, // Employee
                department_id: 'Engineering', // Sending string as column is string
                manager_id: null
            },
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        console.log('Employee Created:', createRes.data.data.email);

        // 6. Login Employee
        console.log('\n6. Logging in Employee...');
        const empLogin = await axios.post(`${BASE_URL}/auth/login`, { email: EMPLOYEE_EMAIL, password: PASSWORD });
        const empToken = empLogin.data.token;
        console.log('Employee Logged In.');

        // 7. Employee Check-In
        console.log('\n7. Employee Check-In...');
        const checkIn = await axios.post(
            `${BASE_URL}/attendance/check-in`,
            {},
            { headers: { Authorization: `Bearer ${empToken}` } }
        );
        console.log('Check-In Status:', checkIn.data.status);

        // 8. Employee Apply Leave
        console.log('\n8. Employee Applying Leave...');
        const leaveRes = await axios.post(
            `${BASE_URL}/leaves`,
            {
                leave_type: 'Sick',
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0],
                reason: 'Feeling sick'
            },
            { headers: { Authorization: `Bearer ${empToken}` } }
        );
        const leaveId = leaveRes.data.leave.id;
        console.log(`Leave Applied. ID: ${leaveId}`);

        // 9. Admin Approve Leave
        console.log('\n9. Admin Approving Leave...');
        const approveRes = await axios.put(
            `${BASE_URL}/leaves/${leaveId}/status`,
            { status: 'Approved' },
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        console.log('Leave Status:', approveRes.data.leave.status);

        console.log('\n--- DEMO FLOW SUCCESSFUL ---');

    } catch (err) {
        console.error('TEST FAILED:', err.response?.data || err.message);
        process.exit(1);
    } finally {
        pool.end();
    }
}

runDemoTest();

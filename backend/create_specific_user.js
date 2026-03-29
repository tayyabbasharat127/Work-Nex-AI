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
const EMAIL = 'ranatayyabcriclover147@gmail.com';
const PASSWORD = 'password123';

async function createAccount() {
    try {
        console.log(`Creating account for ${EMAIL}...`);

        // 1. Signup
        try {
            await axios.post(`${BASE_URL}/auth/signup`, {
                organization_name: 'Rana Org',
                admin_name: 'Rana Admin',
                admin_email: EMAIL,
                password: PASSWORD,
                subscription_plan: 'Basic'
            });
            console.log('Signup request sent.');
        } catch (e) {
            console.log('Signup error (maybe already exists?):', e.response?.data?.message || e.message);
        }

        // 2. Get OTP
        console.log('Fetching OTP...');
        const otpRes = await pool.query(`SELECT otp FROM "TempOtps" WHERE email = $1 ORDER BY "createdAt" DESC LIMIT 1`, [EMAIL]);

        if (otpRes.rows.length === 0) {
            // Check if already active
            const user = await pool.query(`SELECT status FROM "Users" WHERE email = $1`, [EMAIL]);
            if (user.rows.length > 0 && user.rows[0].status === 'Active') {
                console.log('User is ALREADY ACTIVE. Ready to login.');
                return;
            }
            throw new Error('No OTP found and user not active.');
        }

        const otp = otpRes.rows[0].otp;
        console.log(`OTP Found: ${otp}`);

        // 3. Verify
        console.log('Verifying OTP...');
        await axios.post(`${BASE_URL}/auth/verify-otp`, {
            email: EMAIL,
            otp: otp
        });
        console.log('Account VERIFIED successfully.');

    } catch (err) {
        console.error('FAILED:', err.message);
        if (err.response) console.error('API Response:', err.response.data);
    } finally {
        pool.end();
    }
}

createAccount();

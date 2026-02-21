require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function getOtp() {
    try {
        console.log('Fetching recent OTPs...');

        // Fetch last 5 OTPs regardless of email to debug
        const res = await pool.query(`SELECT email, otp, "createdAt" FROM "TempOtps" ORDER BY "createdAt" DESC LIMIT 5`);

        if (res.rows.length === 0) {
            console.log('No recent OTPs found.');
        } else {
            console.log('Recent OTPs:');
            res.rows.forEach(r => {
                console.log(`Email: ${r.email} | OTP: ${r.otp} | Time: ${r.createdAt}`);
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

getOtp();

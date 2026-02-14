require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function check() {
    try {
        const email = 'ranatayyabcriclover147@gmail.com';
        console.log(`Checking for ${email}...`);

        const org = await pool.query(`SELECT * FROM "Organizations" WHERE admin_email = $1`, [email]);
        console.log(`Organization Found: ${org.rows.length}`);

        const user = await pool.query(`SELECT * FROM "Users" WHERE email = $1`, [email]);
        console.log(`User Found: ${user.rows.length}`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

check();

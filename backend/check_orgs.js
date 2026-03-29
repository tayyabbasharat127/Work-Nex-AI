require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function checkOrgs() {
    try {
        console.log('Checking recent Organizations...');
        const res = await pool.query(`SELECT organization_name, admin_email, status, "createdAt" FROM "Organizations" ORDER BY "createdAt" DESC LIMIT 5`);

        if (res.rows.length === 0) {
            console.log('No organizations found.');
        } else {
            res.rows.forEach(r => {
                console.log(`Org: ${r.organization_name} | Admin: ${r.admin_email} | Status: ${r.status}`);
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkOrgs();

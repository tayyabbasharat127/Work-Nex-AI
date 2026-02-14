require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function activate() {
    try {
        console.log('Activating pending users/orgs...');

        const users = await pool.query(`UPDATE "Users" SET status='Active' WHERE status!='Active' RETURNING email`);
        console.log(`Activated Users: ${users.rowCount}`);
        users.rows.forEach(u => console.log(` - ${u.email}`));

        const orgs = await pool.query(`UPDATE "Organizations" SET status='Active' WHERE status!='Active' RETURNING admin_email`);
        console.log(`Activated Orgs: ${orgs.rowCount}`);
        orgs.rows.forEach(o => console.log(` - ${o.admin_email}`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

activate();

const pool = require('./config/db');

async function deleteDuplicate() {
    try {
        const result = await pool.query(
            `DELETE FROM users WHERE email = $1 AND role_id IS NULL`,
            ['azeem87@gmail.com']
        );
        console.log('✓ Deleted', result.rowCount, 'user from lowercase users table');
        console.log('Now azeem87@gmail.com will login as Admin from Users table');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

deleteDuplicate();

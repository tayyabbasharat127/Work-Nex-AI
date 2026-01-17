const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',          // or hr_admin (if you created that user)
  host: 'localhost',
  database: 'WORKNEX-AI',
  password: '123', // your PostgreSQL password
  port: 5432,
});

// Test connectioncd
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error(' PostgreSQL connection error:', err);
  } else {
    console.log(' PostgreSQL connected:', res.rows[0].now);
  }
});

module.exports = pool;

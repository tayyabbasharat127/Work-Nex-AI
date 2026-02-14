const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5432,
});

async function checkSchema() {
    try {
        console.log('--- Tables ---');
        const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        tables.rows.forEach(r => console.log(`Table: ${r.table_name}`));

        console.log('\n--- Columns for Users/users ---');
        const columns = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name ILIKE 'users'
    `);
        columns.rows.forEach(r => console.log(`${r.table_name}.${r.column_name} (${r.data_type})`));

        console.log('\n--- Columns for organization ---');
        const orgCols = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name ILIKE 'organization'
    `);
        orgCols.rows.forEach(r => console.log(`${r.table_name}.${r.column_name} (${r.data_type})`));

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSchema();

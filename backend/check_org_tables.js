const pool = require('./config/db');

async function checkOrgTables() {
    try {
        // Check organization table (lowercase)
        console.log('=== organization table (lowercase) ===');
        const org1 = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'organization'
            ORDER BY ordinal_position
        `);
        console.log(org1.rows);
        
        const org1Data = await pool.query(`SELECT * FROM organization LIMIT 3`);
        console.log('Sample data:', org1Data.rows);
        
        // Check Organizations table (capitalized)
        console.log('\n=== Organizations table (capitalized) ===');
        const org2 = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Organizations'
            ORDER BY ordinal_position
        `);
        console.log(org2.rows);
        
        const org2Data = await pool.query(`SELECT * FROM "Organizations" LIMIT 3`);
        console.log('Sample data:', org2Data.rows);
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

checkOrgTables();

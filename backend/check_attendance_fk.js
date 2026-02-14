const pool = require('./config/db');

async function checkAttendanceForeignKeys() {
    try {
        console.log('=== Checking Attendances table structure ===\n');
        
        // Check columns
        const cols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Attendances'
            ORDER BY ordinal_position
        `);
        console.log('Columns:', cols.rows);
        
        // Check foreign keys
        console.log('\n=== Foreign Key Constraints ===');
        const fk = await pool.query(`
            SELECT
                conname AS constraint_name,
                pg_get_constraintdef(oid) AS constraint_def
            FROM pg_constraint
            WHERE contype = 'f' AND conrelid::regclass::text = 'Attendances'
        `);
        console.log(fk.rows);
        
        // Check sample data
        console.log('\n=== Sample Attendance Records ===');
        const sample = await pool.query(`SELECT * FROM "Attendances" LIMIT 3`);
        console.log(sample.rows);
        
        // Check if employee_id references Users or users table
        console.log('\n=== Checking which user table is referenced ===');
        if (fk.rows.length > 0) {
            const fkDef = fk.rows[0].constraint_def;
            if (fkDef.includes('"Users"')) {
                console.log('✓ References "Users" table (capitalized)');
            } else if (fkDef.includes('users')) {
                console.log('✓ References users table (lowercase)');
            }
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

checkAttendanceForeignKeys();

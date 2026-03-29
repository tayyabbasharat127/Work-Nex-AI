const pool = require('./config/db');

async function checkDepartments() {
    try {
        // Check if departments table exists
        const tableCheck = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'departments'
            ORDER BY ordinal_position
        `);
        
        console.log('=== Departments Table Columns ===');
        console.log(tableCheck.rows);
        
        // Check foreign key constraints
        const fkCheck = await pool.query(`
            SELECT
                conname AS constraint_name,
                conrelid::regclass AS table_name,
                confrelid::regclass AS foreign_table,
                pg_get_constraintdef(oid) AS constraint_def
            FROM pg_constraint
            WHERE contype = 'f' AND conrelid::regclass::text = 'departments'
        `);
        
        console.log('\n=== Foreign Key Constraints ===');
        console.log(fkCheck.rows);
        
        // Check Organizations table
        const orgCheck = await pool.query(`
            SELECT id, organization_name, admin_email, status
            FROM "Organizations"
            LIMIT 5
        `);
        
        console.log('\n=== Organizations ===');
        console.log(orgCheck.rows);
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        pool.end();
    }
}

checkDepartments();

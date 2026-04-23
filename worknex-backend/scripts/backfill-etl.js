#!/usr/bin/env node

/**
 * ETL Backfill Script
 * Runs ETL for historical months
 * 
 * Usage:
 *   node scripts/backfill-etl.js --start 2024-01 --end 2025-04
 *   node scripts/backfill-etl.js --start 2024-01 --end 2025-04 --overwrite
 */

const etlOrchestrator = require('../src/modules/etl/etl.orchestrator');
const prisma = require('../src/config/db');
const logger = require('../src/config/logger');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 ? args[index + 1] : null;
};

const hasFlag = (name) => args.includes(`--${name}`);

const startDate = getArg('start');
const endDate = getArg('end');
const overwrite = hasFlag('overwrite');

// Validate arguments
if (!startDate || !endDate) {
  console.error('❌ Error: Missing required arguments');
  console.log('\nUsage:');
  console.log('  node scripts/backfill-etl.js --start YYYY-MM --end YYYY-MM [--overwrite]');
  console.log('\nExample:');
  console.log('  node scripts/backfill-etl.js --start 2024-01 --end 2025-04');
  console.log('  node scripts/backfill-etl.js --start 2024-01 --end 2025-04 --overwrite');
  process.exit(1);
}

// Parse dates
const parseDate = (dateStr) => {
  const [year, month] = dateStr.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error(`Invalid date format: ${dateStr}. Use YYYY-MM`);
  }
  return { year, month };
};

const start = parseDate(startDate);
const end = parseDate(endDate);

// Generate list of months to process
const getMonthsInRange = (start, end) => {
  const months = [];
  let current = { ...start };

  while (
    current.year < end.year ||
    (current.year === end.year && current.month <= end.month)
  ) {
    months.push({ ...current });
    
    current.month++;
    if (current.month > 12) {
      current.month = 1;
      current.year++;
    }
  }

  return months;
};

const months = getMonthsInRange(start, end);

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║         WorkNex AI - ETL Backfill Script              ║');
console.log('╚════════════════════════════════════════════════════════╝\n');
console.log(`📅 Date Range: ${startDate} to ${endDate}`);
console.log(`📊 Total Months: ${months.length}`);
console.log(`🔄 Overwrite Mode: ${overwrite ? 'YES' : 'NO'}`);
console.log('');

// Run backfill
const runBackfill = async () => {
  const results = {
    total: months.length,
    success: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  for (let i = 0; i < months.length; i++) {
    const { year, month } = months[i];
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    
    console.log(`\n[${i + 1}/${months.length}] Processing ${monthStr}...`);

    try {
      // Check if data already exists
      if (!overwrite) {
        const existing = await prisma.performanceRecord.count({
          where: { month, year }
        });

        if (existing > 0) {
          console.log(`⏭️  Skipped (${existing} records exist, use --overwrite to replace)`);
          results.skipped++;
          results.details.push({ month: monthStr, status: 'skipped', records: existing });
          continue;
        }
      }

      // Run ETL
      const result = await etlOrchestrator.runAll(month, year);

      if (result.success) {
        console.log(`✅ Success - ${result.totalRecords} records processed in ${result.duration}s`);
        results.success++;
        results.details.push({ 
          month: monthStr, 
          status: 'success', 
          records: result.totalRecords,
          duration: result.duration
        });
      } else {
        console.log(`❌ Failed - ${result.error || 'Unknown error'}`);
        results.failed++;
        results.details.push({ 
          month: monthStr, 
          status: 'failed', 
          error: result.error 
        });
      }

    } catch (error) {
      console.log(`❌ Error - ${error.message}`);
      logger.error(`Backfill error for ${monthStr}:`, error);
      results.failed++;
      results.details.push({ 
        month: monthStr, 
        status: 'error', 
        error: error.message 
      });
    }
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                   BACKFILL SUMMARY                     ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log(`📊 Total Months:    ${results.total}`);
  console.log(`✅ Successful:      ${results.success}`);
  console.log(`❌ Failed:          ${results.failed}`);
  console.log(`⏭️  Skipped:         ${results.skipped}`);
  console.log('');

  if (results.failed > 0) {
    console.log('❌ Failed Months:');
    results.details
      .filter(d => d.status === 'failed' || d.status === 'error')
      .forEach(d => {
        console.log(`   - ${d.month}: ${d.error}`);
      });
    console.log('');
  }

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
};

// Run the backfill
runBackfill().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  logger.error('Backfill fatal error:', error);
  process.exit(1);
});

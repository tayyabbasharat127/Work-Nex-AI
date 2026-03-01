/**
 * Auto Checkout Cron Job
 * 
 * This script should be run every 5 minutes to automatically checkout
 * employees who haven't pinged in the configured timeout period.
 * 
 * Setup:
 * 1. Using node-cron (recommended):
 *    - Install: npm install node-cron
 *    - Add to Server.js
 * 
 * 2. Using system cron:
 *    - Add to crontab: (star)/5 * * * * node /path/to/autoCheckoutJob.js
 * 
 * 3. Using PM2:
 *    - pm2 start autoCheckoutJob.js --cron "(star)/5 * * * *"
 */

require('dotenv').config();
const { autoCheckoutStale } = require('../controller/attendance');

async function runAutoCheckout() {
  console.log('\n===========================================');
  console.log('🕐 Auto Checkout Job Started:', new Date().toISOString());
  console.log('===========================================\n');

  try {
    const result = await autoCheckoutStale();
    
    if (result.success) {
      console.log(`\n✅ Auto checkout completed: ${result.count} employees checked out`);
    } else {
      console.error(`\n❌ Auto checkout failed: ${result.error}`);
    }
  } catch (error) {
    console.error('\n❌ Auto checkout job error:', error);
  }

  console.log('\n===========================================');
  console.log('🏁 Auto Checkout Job Finished:', new Date().toISOString());
  console.log('===========================================\n');
}

// If running as standalone script
if (require.main === module) {
  runAutoCheckout()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = runAutoCheckout;

const prisma = require('../config/db');
const logger = require('../config/logger');
const { runScheduledTask, tasks } = require('../jobs/scheduled.tasks');

const taskName = process.argv[2];

const main = async () => {
  if (!taskName || !tasks[taskName]) {
    throw new Error(`A valid task name is required. Available tasks: ${Object.keys(tasks).join(', ')}`);
  }
  await prisma.$connect();
  await runScheduledTask(taskName);
};

main()
  .catch((error) => {
    logger.error('Scheduled worker failed', { taskName, error: error.message, stack: error.stack });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const prisma = require('../../config/db');
const logger = require('../../config/logger');

/**
 * ETL Logger - Tracks ETL job execution
 */
class ETLLogger {
  constructor(jobName) {
    this.jobName = jobName;
    this.startTime = new Date();
    this.recordsProcessed = 0;
    this.errors = [];
  }

  log(message) {
    logger.info(`[${this.jobName}] ${message}`);
  }

  error(message, error) {
    const errorMsg = `${message}: ${error?.message || error}`;
    logger.error(`[${this.jobName}] ${errorMsg}`);
    this.errors.push(errorMsg);
  }

  incrementRecords(count = 1) {
    this.recordsProcessed += count;
  }

  async finish(status = 'success') {
    const endTime = new Date();
    const duration = (endTime - this.startTime) / 1000;

    this.log(`Finished in ${duration}s - ${this.recordsProcessed} records - Status: ${status}`);

    // Store ETL run log using Prisma AuditLog model
    try {
      await prisma.auditLog.create({
        data: {
          action: 'CREATE',
          entity: `ETL_${this.jobName}`,
          newValues: {
            status,
            duration_seconds: duration,
            records_processed: this.recordsProcessed,
            errors: this.errors,
            start_time: this.startTime,
            end_time: endTime
          }
        }
      });
    } catch (err) {
      logger.error('Failed to log ETL run:', err);
    }

    return {
      success: status === 'success',
      records: this.recordsProcessed,
      duration,
      errors: this.errors
    };
  }
}

module.exports = ETLLogger;

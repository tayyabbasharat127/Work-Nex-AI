const prisma = require('../../../config/db');
const ETLLogger = require('../etl.logger');

/**
 * Leave ETL Job
 * Aggregates leave data for analytics
 */
class LeaveETL {
  constructor() {
    this.logger = new ETLLogger('LEAVE_ETL');
  }

  /**
   * Run leave ETL for a specific month
   */
  async run(month, year) {
    this.logger.log(`Starting leave ETL for ${year}-${month}`);

    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Get all users
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, employeeId: true }
      });

      this.logger.log(`Processing leave data for ${users.length} users`);

      const results = [];

      for (const user of users) {
        const metrics = await this.calculateUserLeaveMetrics(user.id, startDate, endDate);
        results.push({ userId: user.id, ...metrics });
        this.logger.incrementRecords();
      }

      this.logger.log(`Calculated leave metrics for ${results.length} users`);
      return await this.logger.finish('success');

    } catch (error) {
      this.logger.error('ETL failed', error);
      return await this.logger.finish('failed');
    }
  }

  /**
   * Calculate leave metrics for a user
   */
  async calculateUserLeaveMetrics(userId, startDate, endDate) {
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: userId,
        status: 'APPROVED',
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } },
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: endDate } }
            ]
          }
        ]
      }
    });

    const metrics = {
      totalLeaves: leaves.length,
      totalDays: 0,
      annualLeaves: 0,
      sickLeaves: 0,
      casualLeaves: 0,
      maternityLeaves: 0,
      paternityLeaves: 0,
      unpaidLeaves: 0,
      otherLeaves: 0
    };

    leaves.forEach(leave => {
      metrics.totalDays += leave.totalDays;

      switch (leave.leaveType) {
        case 'ANNUAL':
          metrics.annualLeaves += leave.totalDays;
          break;
        case 'SICK':
          metrics.sickLeaves += leave.totalDays;
          break;
        case 'CASUAL':
          metrics.casualLeaves += leave.totalDays;
          break;
        case 'MATERNITY':
          metrics.maternityLeaves += leave.totalDays;
          break;
        case 'PATERNITY':
          metrics.paternityLeaves += leave.totalDays;
          break;
        case 'UNPAID':
          metrics.unpaidLeaves += leave.totalDays;
          break;
        case 'OTHER':
          metrics.otherLeaves += leave.totalDays;
          break;
      }
    });

    return metrics;
  }

  /**
   * Get leave trends by type
   */
  async getTrendsByType(year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const trends = await prisma.$queryRaw`
      SELECT 
        EXTRACT(MONTH FROM "startDate") as month,
        "leaveType" as type,
        COUNT(*) as count,
        SUM("totalDays") as total_days
      FROM "LeaveRequest"
      WHERE "startDate" >= ${startDate} 
        AND "startDate" <= ${endDate}
        AND status = 'APPROVED'
      GROUP BY month, "leaveType"
      ORDER BY month ASC
    `;

    return trends;
  }

  /**
   * Get leave utilization by department
   */
  async getUtilizationByDepartment(year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const utilization = await prisma.$queryRaw`
      SELECT 
        d.name as department,
        COUNT(DISTINCT lr."employeeId") as employees_on_leave,
        SUM(lr."totalDays") as total_leave_days,
        AVG(lr."totalDays") as avg_days_per_employee
      FROM "LeaveRequest" lr
      JOIN "User" u ON lr."employeeId" = u.id
      JOIN "Department" d ON u."departmentId" = d.id
      WHERE lr."startDate" >= ${startDate}
        AND lr."startDate" <= ${endDate}
        AND lr.status = 'APPROVED'
      GROUP BY d.name
      ORDER BY total_leave_days DESC
    `;

    return utilization;
  }
}

module.exports = new LeaveETL();

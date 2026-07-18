const prisma = require('../../../config/db');
const ETLLogger = require('../etl.logger');

/**
 * Attendance ETL Job
 * Aggregates attendance data for analytics
 */
class AttendanceETL {
  constructor() {
    this.logger = new ETLLogger('ATTENDANCE_ETL');
  }

  /**
   * Run attendance ETL for a specific month
   */
  async run(month, year, organizationId = null) {
    this.logger.organizationId = organizationId;
    this.logger.log(`Starting attendance ETL for ${year}-${month}`);

    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Get all users
      const users = await prisma.user.findMany({
        where: { isActive: true, ...(organizationId ? { organizationId } : {}) },
        select: { id: true, employeeId: true, firstName: true, lastName: true, organizationId: true }
      });

      this.logger.log(`Processing ${users.length} active users`);

      const results = [];

      for (const user of users) {
        const metrics = await this.calculateUserMetrics(user.id, startDate, endDate, user.organizationId);
        results.push({ userId: user.id, ...metrics });
        this.logger.incrementRecords();
      }

      this.logger.log(`Calculated metrics for ${results.length} users`);
      return await this.logger.finish('success');

    } catch (error) {
      this.logger.error('ETL failed', error);
      return await this.logger.finish('failed');
    }
  }

  /**
   * Calculate attendance metrics for a user
   */
  async calculateUserMetrics(userId, startDate, endDate, organizationId = null) {
    const attendance = await prisma.attendance.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        userId,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'asc' }
    });

    const metrics = {
      totalDays: attendance.length,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      halfDays: 0,
      onLeaveDays: 0,
      totalWorkingHours: 0,
      avgWorkingHours: 0,
      attendanceRate: 0
    };

    attendance.forEach(record => {
      switch (record.status) {
        case 'PRESENT':
          metrics.presentDays++;
          break;
        case 'ABSENT':
          metrics.absentDays++;
          break;
        case 'LATE':
          metrics.lateDays++;
          metrics.presentDays++;
          break;
        case 'HALF_DAY':
          metrics.halfDays++;
          break;
        case 'ON_LEAVE':
          metrics.onLeaveDays++;
          break;
      }

      if (record.workingHours) {
        metrics.totalWorkingHours += record.workingHours;
      }
    });

    // Calculate averages and rates
    if (metrics.totalDays > 0) {
      metrics.avgWorkingHours = metrics.totalWorkingHours / metrics.totalDays;
      metrics.attendanceRate = (metrics.presentDays / metrics.totalDays) * 100;
    }

    return metrics;
  }

  /**
   * Get attendance trends for dashboard
   */
  async getTrends(year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const trends = await prisma.$queryRaw`
      SELECT 
        DATE("date") as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'PRESENT') as present,
        COUNT(*) FILTER (WHERE status = 'ABSENT') as absent,
        COUNT(*) FILTER (WHERE status = 'LATE') as late,
        COUNT(*) FILTER (WHERE status = 'ON_LEAVE') as on_leave,
        AVG("workingHours") as avg_hours
      FROM "Attendance"
      WHERE "date" >= ${startDate} AND "date" <= ${endDate}
      GROUP BY DATE("date")
      ORDER BY date ASC
    `;

    return trends;
  }
}

module.exports = new AttendanceETL();

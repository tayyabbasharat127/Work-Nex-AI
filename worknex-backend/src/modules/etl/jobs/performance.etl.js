const prisma = require('../../../config/db');
const ETLLogger = require('../etl.logger');

/**
 * Performance ETL Job
 * Calculates and stores monthly performance records
 * This is the main ETL job that combines attendance and leave data
 */
class PerformanceETL {
  constructor() {
    this.logger = new ETLLogger('PERFORMANCE_ETL');
  }

  /**
   * Run performance ETL for a specific month
   * This creates/updates PerformanceRecord entries
   */
  async run(month, year) {
    this.logger.log(`Starting performance ETL for ${year}-${month}`);

    try {
      const m = parseInt(month);
      const y = parseInt(year);
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59);

      // Get all active users
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, employeeId: true, firstName: true, lastName: true }
      });

      this.logger.log(`Processing performance for ${users.length} users`);

      for (const user of users) {
        await this.calculateAndStorePerformance(user.id, m, y, startDate, endDate);
        this.logger.incrementRecords();
      }

      this.logger.log(`Performance records created/updated for ${users.length} users`);
      return await this.logger.finish('success');

    } catch (error) {
      this.logger.error('Performance ETL failed', error);
      return await this.logger.finish('failed');
    }
  }

  /**
   * Calculate performance metrics and store in PerformanceRecord table
   */
  async calculateAndStorePerformance(userId, month, year, startDate, endDate) {
    // Get attendance data
    const attendance = await prisma.attendance.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate }
      }
    });

    // Get approved leaves
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: userId,
        status: 'APPROVED',
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } }
        ]
      }
    });

    // Calculate metrics
    const metrics = {
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      leaveDays: 0,
      totalWorkingHours: 0
    };

    attendance.forEach(record => {
      if (record.status === 'PRESENT') metrics.presentDays++;
      if (record.status === 'ABSENT') metrics.absentDays++;
      if (record.status === 'LATE') {
        metrics.lateDays++;
        metrics.presentDays++;
      }
      if (record.status === 'ON_LEAVE') metrics.leaveDays++;
      if (record.workingHours) metrics.totalWorkingHours += record.workingHours;
    });

    // Add leave days
    leaves.forEach(leave => {
      metrics.leaveDays += leave.totalDays;
    });

    // Calculate average working hours
    const avgWorkingHours = metrics.presentDays > 0 
      ? metrics.totalWorkingHours / metrics.presentDays 
      : 0;

    // Calculate scores (0-100)
    const totalWorkingDays = new Date(year, month, 0).getDate(); // Days in month
    const attendanceScore = (metrics.presentDays / totalWorkingDays) * 100;
    const leaveScore = Math.max(0, 100 - (metrics.leaveDays * 5)); // -5 points per leave day
    const punctualityScore = Math.max(0, 100 - (metrics.lateDays * 10)); // -10 points per late day
    const overallScore = (attendanceScore * 0.5) + (leaveScore * 0.3) + (punctualityScore * 0.2);

    // Upsert performance record
    await prisma.performanceRecord.upsert({
      where: {
        userId_month_year: { userId, month, year }
      },
      update: {
        presentDays: metrics.presentDays,
        absentDays: metrics.absentDays,
        lateDays: metrics.lateDays,
        leaveDays: metrics.leaveDays,
        avgWorkingHours: parseFloat(avgWorkingHours.toFixed(2)),
        attendanceScore: parseFloat(attendanceScore.toFixed(2)),
        leaveScore: parseFloat(leaveScore.toFixed(2)),
        overallScore: parseFloat(overallScore.toFixed(2)),
        updatedAt: new Date()
      },
      create: {
        userId,
        month,
        year,
        presentDays: metrics.presentDays,
        absentDays: metrics.absentDays,
        lateDays: metrics.lateDays,
        leaveDays: metrics.leaveDays,
        avgWorkingHours: parseFloat(avgWorkingHours.toFixed(2)),
        attendanceScore: parseFloat(attendanceScore.toFixed(2)),
        leaveScore: parseFloat(leaveScore.toFixed(2)),
        overallScore: parseFloat(overallScore.toFixed(2))
      }
    });
  }

  /**
   * Get performance leaderboard
   */
  async getLeaderboard(month, year, limit = 10) {
    return prisma.performanceRecord.findMany({
      where: { month: parseInt(month), year: parseInt(year) },
      include: {
        user: {
          select: {
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } }
          }
        }
      },
      orderBy: { overallScore: 'desc' },
      take: limit
    });
  }

  /**
   * Get team performance summary
   */
  async getTeamPerformance(managerId, month, year) {
    const team = await prisma.user.findMany({
      where: { managerId },
      select: { id: true }
    });

    const teamIds = team.map(u => u.id);

    return prisma.performanceRecord.findMany({
      where: {
        userId: { in: teamIds },
        month: parseInt(month),
        year: parseInt(year)
      },
      include: {
        user: {
          select: {
            employeeId: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { overallScore: 'desc' }
    });
  }
}

module.exports = new PerformanceETL();

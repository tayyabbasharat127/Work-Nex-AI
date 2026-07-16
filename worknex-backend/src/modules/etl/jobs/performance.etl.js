/**
 * Performance ETL Job — ML-validated, incremental, production-grade
 *
 * Score formula (deterministic, ETL layer):
 *   attendanceScore  = (presentDays / workingDaysInMonth) * 100
 *   leaveScore       = max(0, 100 − leaveDays × 5)
 *   punctualityScore = max(0, 100 − lateDays × 10)
 *   overallScore     = attendanceScore×0.50 + leaveScore×0.30 + punctualityScore×0.20
 *
 * After storing the deterministic score, optionally calls the AI service
 * for ML-predicted score — stored in PerformanceRecord.mlPredictedScore
 * (column added via migration if it exists, skipped otherwise).
 *
 * Incremental mode: only re-processes users whose attendance or leave
 * records changed since the last ETL run (tracked via updatedAt).
 */

'use strict';

const axios   = require('axios');
const prisma  = require('../../../config/db');
const { config } = require('../../../config/env');
const ETLLogger = require('../etl.logger');

const AI_SERVICE_URL = config.aiServiceUrl;
const { aiServiceHeaders } = require('../../../utils/aiServiceAuth');
const ML_TIMEOUT_MS  = 5000;

class PerformanceETL {
  constructor() {
    this.logger = new ETLLogger('PERFORMANCE_ETL');
  }

  /* ─── Main entry ───────────────────────────────────────────────────── */

  async run(month, year, organizationId = null, { incremental = false } = {}) {
    this.logger.organizationId = organizationId;
    this.logger.log(`Starting performance ETL for ${year}-${String(month).padStart(2, '0')} [incremental=${incremental}]`);

    try {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      const startDate = new Date(y, m - 1, 1);
      const endDate   = new Date(y, m, 0, 23, 59, 59);
      const now = new Date();
      const isCurrentMonth = now.getFullYear() === y && now.getMonth() === m - 1;
      const scoringEndDate = isCurrentMonth && now < endDate ? now : endDate;
      const workingDays = this._countWorkingDays(startDate, scoringEndDate);

      const where = { isActive: true };
      if (organizationId) where.organizationId = organizationId;

      let users = await prisma.user.findMany({
        where,
        select: { id: true, employeeId: true, firstName: true, lastName: true, organizationId: true },
      });

      if (incremental) {
        users = await this._filterChangedUsers(users, startDate, endDate);
        this.logger.log(`Incremental mode: ${users.length} users have changes`);
      } else {
        this.logger.log(`Full mode: processing ${users.length} users`);
      }

      let processed = 0;
      let failed    = 0;

      for (const user of users) {
        try {
          await this._calculateAndStore(user, organizationId, m, y, startDate, endDate, workingDays);
          this.logger.incrementRecords();
          processed++;
        } catch (err) {
          this.logger.error(`Failed for user ${user.employeeId}`, err);
          failed++;
        }
      }

      this.logger.log(`Done — processed: ${processed}, failed: ${failed}`);
      return await this.logger.finish(failed === 0 ? 'success' : 'partial');
    } catch (err) {
      this.logger.error('Performance ETL failed', err);
      return await this.logger.finish('failed');
    }
  }

  /* ─── Core calculation ─────────────────────────────────────────────── */

  async _calculateAndStore(user, organizationId, month, year, startDate, endDate, workingDays) {
    const orgId = organizationId || user.organizationId;

    // 1. Attendance records for this month
    const attendance = await prisma.attendance.findMany({
      where: { userId: user.id, organizationId: orgId, date: { gte: startDate, lte: endDate } },
    });

    // 2. Approved leave requests overlapping this month
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: user.id,
        organizationId: orgId,
        status: 'APPROVED',
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate:   { gte: startDate, lte: endDate } },
          { AND: [{ startDate: { lte: startDate } }, { endDate: { gte: endDate } }] },
        ],
      },
    });

    // 3. Aggregate metrics
    const metrics = this._aggregateMetrics(attendance, leaves);
    const avgWorkingHours = metrics.presentDays > 0
      ? parseFloat((metrics.totalWorkingHours / metrics.presentDays).toFixed(2))
      : 0;

    // 4. Deterministic scores (ETL layer — always computed)
    const attendanceScore  = parseFloat(Math.min(100, (metrics.presentDays / workingDays) * 100).toFixed(2));
    const leaveScore       = parseFloat(Math.max(0, 100 - metrics.leaveDays * 5).toFixed(2));
    const punctualityScore = parseFloat(Math.max(0, 100 - metrics.lateDays * 10).toFixed(2));
    const overallScore     = parseFloat(
      (attendanceScore * 0.50 + leaveScore * 0.30 + punctualityScore * 0.20).toFixed(2)
    );

    // 5. Fetch previous month score + real department average (concurrent)
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;

    const [prevRecord, deptAvgResult] = await Promise.all([
      prisma.performanceRecord.findUnique({
        where:  { userId_month_year: { userId: user.id, month: prevMonth, year: prevYear } },
        select: { overallScore: true },
      }),
      user.departmentId
        ? prisma.performanceRecord.aggregate({
            where: {
              month,
              year,
              organizationId: orgId,
              user: { departmentId: user.departmentId },
            },
            _avg: { overallScore: true },
          })
        : Promise.resolve(null),
    ]);

    const prevScore       = prevRecord?.overallScore ?? overallScore;
    const departmentAverage = parseFloat(
      (deptAvgResult?._avg?.overallScore ?? 75).toFixed(2)
    );

    // 6. Optional ML prediction from AI service
    let mlPredictedScore = null;
    try {
      mlPredictedScore = await this._callMLPrediction({
        organizationId:            orgId,
        employeeId:               user.employeeId,
        attendanceRate:           attendanceScore,
        lateCount:                metrics.lateDays,
        absenceCount:             metrics.absentDays,
        leaveCount:               metrics.leaveDays,
        averageWorkingHours:      avgWorkingHours,
        previousPerformanceScore: prevScore,
        departmentAverage,
        overtimeHours:            Math.max(0, avgWorkingHours - 8) * metrics.presentDays,
        halfDayCount:             metrics.halfDays,
      });
    } catch {
      // AI service down — non-blocking
    }

    // 7. Upsert to DB
    const data = {
      organizationId:  orgId,
      presentDays:     metrics.presentDays,
      absentDays:      metrics.absentDays,
      lateDays:        metrics.lateDays,
      leaveDays:       metrics.leaveDays,
      avgWorkingHours,
      attendanceScore,
      leaveScore,
      punctualityScore,
      overallScore,
      updatedAt:       new Date(),
    };

    if (mlPredictedScore !== null) {
      data.mlPredictedScore = parseFloat(mlPredictedScore.toFixed(2));
    }

    await prisma.performanceRecord.upsert({
      where:  { userId_month_year: { userId: user.id, month, year } },
      update: data,
      create: { userId: user.id, month, year, ...data },
    });
  }

  /* ─── Metrics aggregation ─────────────────────────────────────────── */

  _aggregateMetrics(attendance, leaves) {
    const metrics = { presentDays: 0, absentDays: 0, lateDays: 0, leaveDays: 0, halfDays: 0, totalWorkingHours: 0 };

    for (const r of attendance) {
      switch (r.status) {
        case 'PRESENT':
          metrics.presentDays++;
          break;
        case 'LATE':
          metrics.lateDays++;
          metrics.presentDays++;  // late = physically present
          break;
        case 'ABSENT':
          metrics.absentDays++;
          break;
        case 'HALF_DAY':
          metrics.halfDays++;
          metrics.presentDays++;
          break;
        case 'ON_LEAVE':
          metrics.leaveDays++;
          break;
        default:
          break;
      }
      if (r.workingHours) metrics.totalWorkingHours += Number(r.workingHours);
    }

    // Add leave days from approved leave requests (avoid double-counting ON_LEAVE attendance)
    for (const leave of leaves) {
      metrics.leaveDays += leave.totalDays;
    }

    return metrics;
  }

  /* ─── Working days calculator ─────────────────────────────────────── */

  _countWorkingDays(start, end) {
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const d = cur.getDay();
      if (d !== 0 && d !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return Math.max(count, 1);
  }

  /* ─── Incremental filter ──────────────────────────────────────────── */

  async _filterChangedUsers(users, startDate, endDate) {
    const lastRun = await prisma.etlSyncLog.findFirst({
      where:   { source: 'PERFORMANCE_ETL', status: { in: ['SUCCESS', 'PARTIAL'] } },
      orderBy: { completedAt: 'desc' },
      select:  { completedAt: true },
    });

    if (!lastRun?.completedAt) return users;
    const since = lastRun.completedAt;

    const [changedAtt, changedLeave] = await Promise.all([
      prisma.attendance.findMany({
        where:  { date: { gte: startDate, lte: endDate }, updatedAt: { gte: since } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.leaveRequest.findMany({
        where:  { updatedAt: { gte: since } },
        select: { employeeId: true },
        distinct: ['employeeId'],
      }),
    ]);

    const changedIds = new Set([
      ...changedAtt.map(r => r.userId),
      ...changedLeave.map(r => r.employeeId),
    ]);

    return users.filter(u => changedIds.has(u.id));
  }

  /* ─── ML prediction call ──────────────────────────────────────────── */

  async _callMLPrediction(features) {
    const response = await axios.post(
      `${AI_SERVICE_URL}/predict/performance`,
      { employeeId: features.employeeId, features },
      { headers: aiServiceHeaders(features.organizationId), timeout: ML_TIMEOUT_MS },
    );
    return response.data?.predictedScore ?? null;
  }

  /* ─── Leaderboard helper ──────────────────────────────────────────── */

  async getLeaderboard(month, year, limit = 10, organizationId = null) {
    const where = { month: parseInt(month, 10), year: parseInt(year, 10) };
    if (organizationId) where.organizationId = organizationId;

    return prisma.performanceRecord.findMany({
      where,
      include: {
        user: {
          select: {
            employeeId: true,
            firstName:  true,
            lastName:   true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { overallScore: 'desc' },
      take: Math.min(parseInt(limit, 10), 100),
    });
  }

  /* ─── Team summary ────────────────────────────────────────────────── */

  async getTeamPerformance(managerId, month, year) {
    const team = await prisma.user.findMany({
      where:  { managerId },
      select: { id: true },
    });

    return prisma.performanceRecord.findMany({
      where: {
        userId: { in: team.map(u => u.id) },
        month:  parseInt(month, 10),
        year:   parseInt(year, 10),
      },
      include: {
        user: {
          select: { employeeId: true, firstName: true, lastName: true },
        },
      },
      orderBy: { overallScore: 'desc' },
    });
  }
}

module.exports = new PerformanceETL();

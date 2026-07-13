/**
 * Attrition ETL Job — Job 4 in the nightly pipeline
 *
 * Runs after Performance ETL.  For every active user:
 *  1. Reads latest PerformanceRecord from DB
 *  2. POSTs to AI service /predict/attrition
 *  3. Stores result in AttritionRecord (upsert)
 *
 * If AI service is unreachable the job falls back to a lightweight
 * deterministic formula so the pipeline never fails silently.
 *
 * Schema assumed:
 *   model AttritionRecord {
 *     id               String   @id @default(cuid())
 *     userId           String
 *     organizationId   String
 *     month            Int
 *     year             Int
 *     riskScore        Float
 *     riskLabel        String   // LOW | MEDIUM | HIGH | CRITICAL
 *     willLeaveProb    Float
 *     factors          Json
 *     modelVersion     String
 *     source           String   // ML | DETERMINISTIC
 *     createdAt        DateTime @default(now())
 *     updatedAt        DateTime @updatedAt
 *     @@unique([userId, month, year])
 *   }
 *
 * If the table doesn't exist yet the job degrades gracefully.
 */

'use strict';

const axios      = require('axios');
const prisma     = require('../../../config/db');
const { config } = require('../../../config/env');
const ETLLogger  = require('../etl.logger');

const AI_SERVICE_URL = config.aiServiceUrl;
const { aiServiceHeaders } = require('../../../utils/aiServiceAuth');
const AI_TIMEOUT_MS  = 8000;

const RISK_THRESHOLDS = { LOW: 30, MEDIUM: 55, HIGH: 75 };

function riskLabel(score) {
  if (score >= RISK_THRESHOLDS.HIGH)   return 'CRITICAL';
  if (score >= RISK_THRESHOLDS.MEDIUM) return 'HIGH';
  if (score >= RISK_THRESHOLDS.LOW)    return 'MEDIUM';
  return 'LOW';
}

function deterministicRisk(perf) {
  // Lightweight fallback — mirrors attrition_service.py weights
  const absScore  = Math.min(100, (perf.absentDays  ?? 0) * 8);
  const perfScore = Math.max(0, 100 - (perf.overallScore ?? 75));
  const leaveScore = Math.max(0, ((perf.leaveDays ?? 0) - 8) * 4);
  const lateScore  = Math.min(100, (perf.lateDays ?? 0) * 5);
  return parseFloat(
    Math.min(100, absScore * 0.30 + perfScore * 0.25 + leaveScore * 0.20 + lateScore * 0.25).toFixed(2)
  );
}

class AttritionETL {
  constructor() {
    this.logger = new ETLLogger('ATTRITION_ETL');
  }

  async run(month, year, organizationId = null) {
    this.logger.organizationId = organizationId;
    this.logger.log(`Starting attrition ETL for ${year}-${String(month).padStart(2, '0')}`);

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const where = { isActive: true };
    if (organizationId) where.organizationId = organizationId;

    const users = await prisma.user.findMany({
      where,
      select: { id: true, employeeId: true, organizationId: true },
    });

    let processed = 0;
    let failed    = 0;

    for (const user of users) {
      try {
        await this._processUser(user, m, y);
        this.logger.incrementRecords();
        processed++;
      } catch (err) {
        this.logger.error(`Failed for ${user.employeeId}`, err);
        failed++;
      }
    }

    this.logger.log(`Done — processed: ${processed}, failed: ${failed}`);
    return this.logger.finish(failed === 0 ? 'success' : 'partial');
  }

  async _processUser(user, month, year) {
    const orgId = user.organizationId;

    const perf = await prisma.performanceRecord.findUnique({
      where: { userId_month_year: { userId: user.id, month, year } },
    });

    let riskScore, willLeaveProb, factors, modelVersion, source;

    if (perf) {
      // Try ML inference
      try {
        const resp = await axios.post(
          `${AI_SERVICE_URL}/predict/attrition`,
          { employeeId: user.employeeId, performanceRecord: perf },
          { headers: aiServiceHeaders(orgId), timeout: AI_TIMEOUT_MS },
        );
        const d = resp.data;
        riskScore    = parseFloat((d.riskScore   ?? d.risk_score   ?? 50).toFixed(2));
        willLeaveProb = parseFloat((d.willLeaveProb ?? d.will_leave_prob ?? 0.5).toFixed(4));
        factors      = d.factors ?? [];
        modelVersion = d.modelVersion ?? 'unknown';
        source       = 'ML';
      } catch {
        // AI service down — deterministic fallback
        riskScore     = deterministicRisk(perf);
        willLeaveProb = parseFloat((riskScore / 100 * 0.7).toFixed(4));
        factors       = this._deterministicFactors(perf);
        modelVersion  = 'deterministic-v1';
        source        = 'DETERMINISTIC';
      }
    } else {
      // No performance record yet — low-confidence default
      riskScore     = 30;
      willLeaveProb = 0.21;
      factors       = [];
      modelVersion  = 'no-data';
      source        = 'DETERMINISTIC';
    }

    const label = riskLabel(riskScore);

    await prisma.attritionRecord.upsert({
      where:  { userId_month_year: { userId: user.id, month, year } },
      update: { riskScore, riskLabel: label, willLeaveProb, factors, modelVersion, source, updatedAt: new Date() },
      create: { userId: user.id, organizationId: orgId, month, year, riskScore, riskLabel: label, willLeaveProb, factors, modelVersion, source },
    });
  }

  _deterministicFactors(perf) {
    const factors = [];
    if ((perf.absentDays ?? 0)  > 3)   factors.push('HIGH_ABSENTEEISM');
    if ((perf.overallScore ?? 100) < 60) factors.push('LOW_PERFORMANCE');
    if ((perf.leaveDays ?? 0)   > 12)  factors.push('EXCESSIVE_LEAVE');
    if ((perf.lateDays ?? 0)    > 5)   factors.push('LATE_PATTERN');
    return factors;
  }
}

module.exports = new AttritionETL();

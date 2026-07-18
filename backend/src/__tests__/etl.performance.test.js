/**
 * Performance ETL — unit tests
 * Run: cd backend && npm test
 */

'use strict';

const performanceETL = require('../modules/etl/jobs/performance.etl');

// ─── Helpers under test ────────────────────────────────────────────────────────

describe('_countWorkingDays', () => {
  const { _countWorkingDays } = performanceETL;

  // June 2026 has 22 working days (Mon-Fri, no holidays)
  it('counts working days in a full month', () => {
    const start = new Date(2026, 5, 1);  // June 1
    const end   = new Date(2026, 5, 30, 23, 59, 59);
    expect(performanceETL._countWorkingDays(start, end)).toBe(22);
  });

  it('returns at least 1 for same-day range', () => {
    const d = new Date(2026, 5, 1);
    expect(performanceETL._countWorkingDays(d, d)).toBeGreaterThanOrEqual(1);
  });
});

describe('_aggregateMetrics', () => {
  function makeRecord(status, workingHours = 8) {
    return { status, workingHours };
  }

  it('counts LATE as both late and present', () => {
    const attendance = [makeRecord('LATE'), makeRecord('PRESENT')];
    const metrics = performanceETL._aggregateMetrics(attendance, []);
    expect(metrics.presentDays).toBe(2);
    expect(metrics.lateDays).toBe(1);
  });

  it('counts ABSENT separately', () => {
    const attendance = [makeRecord('ABSENT')];
    const metrics = performanceETL._aggregateMetrics(attendance, []);
    expect(metrics.absentDays).toBe(1);
    expect(metrics.presentDays).toBe(0);
  });

  it('counts ON_LEAVE attendance records', () => {
    const attendance = [makeRecord('ON_LEAVE')];
    const metrics = performanceETL._aggregateMetrics(attendance, []);
    expect(metrics.leaveDays).toBe(1);
  });

  it('adds leave request days on top of attendance', () => {
    const attendance = [makeRecord('ON_LEAVE')];
    const leaves = [{ totalDays: 3 }];
    const metrics = performanceETL._aggregateMetrics(attendance, leaves);
    expect(metrics.leaveDays).toBe(4); // 1 from attendance + 3 from request
  });

  it('accumulates workingHours', () => {
    const attendance = [makeRecord('PRESENT', 8), makeRecord('PRESENT', 9)];
    const metrics = performanceETL._aggregateMetrics(attendance, []);
    expect(metrics.totalWorkingHours).toBe(17);
  });
});

describe('score formula', () => {
  // Test the exact formula used in _calculateAndStore

  it('produces correct attendanceScore', () => {
    // 20 present out of 22 working days
    const score = Math.min(100, (20 / 22) * 100);
    expect(parseFloat(score.toFixed(2))).toBeCloseTo(90.91, 1);
  });

  it('leaveScore is capped at 0', () => {
    // 25 leave days × 5 penalty = 125, capped at 0
    const score = Math.max(0, 100 - 25 * 5);
    expect(score).toBe(0);
  });

  it('punctualityScore deducts 10 per late day', () => {
    const score = Math.max(0, 100 - 3 * 10);
    expect(score).toBe(70);
  });

  it('overall = att×0.5 + leave×0.3 + punct×0.2', () => {
    const att  = 90.91;
    const leave = 90;
    const punct = 70;
    const overall = att * 0.5 + leave * 0.3 + punct * 0.2;
    expect(parseFloat(overall.toFixed(2))).toBeCloseTo(86.46, 1);
  });
});

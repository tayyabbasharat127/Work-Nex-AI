/**
 * Leave Automation Engine — unit tests
 * Run: cd backend && npm test
 */

'use strict';

// ─── Pure logic extracted for testing ────────────────────────────────────────
// These replicate the decision rules in leave.automation.js

function evaluateLeave({ leaveType, totalDays, remainingBalance, teamOnLeave, teamSize }) {
  const reasons = [];
  let score = 0;

  if (remainingBalance >= totalDays) score += 30;
  else reasons.push('INSUFFICIENT_BALANCE');

  if (leaveType === 'SICK' && totalDays <= 2)          score += 40;
  else if (['CASUAL', 'ANNUAL'].includes(leaveType) && totalDays <= 3) score += 20;
  else if (leaveType !== 'SICK')                        reasons.push('EXCESSIVE_DURATION');

  const coverage = (teamSize - teamOnLeave) / Math.max(teamSize, 1);
  if (coverage >= 0.7) score += 30;
  else reasons.push('LOW_TEAM_COVERAGE');

  let decision;
  if (score >= 70 && reasons.length === 0) decision = 'AUTO_APPROVED';
  else if (reasons.some(r => r === 'INSUFFICIENT_BALANCE')) decision = 'AUTO_REJECTED';
  else decision = 'NEEDS_HUMAN_REVIEW';

  return { decision, score, reasons };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Leave automation rules', () => {
  it('AUTO_APPROVED for sick 1 day with balance and coverage', () => {
    const result = evaluateLeave({
      leaveType: 'SICK', totalDays: 1, remainingBalance: 5,
      teamOnLeave: 1, teamSize: 5,
    });
    expect(result.decision).toBe('AUTO_APPROVED');
    expect(result.score).toBe(100);
    expect(result.reasons).toHaveLength(0);
  });

  it('AUTO_REJECTED when balance is insufficient', () => {
    const result = evaluateLeave({
      leaveType: 'ANNUAL', totalDays: 5, remainingBalance: 2,
      teamOnLeave: 1, teamSize: 5,
    });
    expect(result.decision).toBe('AUTO_REJECTED');
    expect(result.reasons).toContain('INSUFFICIENT_BALANCE');
  });

  it('NEEDS_HUMAN_REVIEW when team coverage is low', () => {
    const result = evaluateLeave({
      leaveType: 'CASUAL', totalDays: 1, remainingBalance: 10,
      teamOnLeave: 4, teamSize: 5, // only 20% coverage
    });
    expect(result.decision).toBe('NEEDS_HUMAN_REVIEW');
    expect(result.reasons).toContain('LOW_TEAM_COVERAGE');
  });

  it('coverage exactly 70% passes', () => {
    const result = evaluateLeave({
      leaveType: 'SICK', totalDays: 1, remainingBalance: 5,
      teamOnLeave: 3, teamSize: 10, // 70% remaining
    });
    expect(result.score).toBe(100);
  });

  it('5-day casual leave triggers EXCESSIVE_DURATION', () => {
    const result = evaluateLeave({
      leaveType: 'CASUAL', totalDays: 5, remainingBalance: 10,
      teamOnLeave: 1, teamSize: 5,
    });
    expect(result.reasons).toContain('EXCESSIVE_DURATION');
    expect(result.decision).not.toBe('AUTO_APPROVED');
  });
});

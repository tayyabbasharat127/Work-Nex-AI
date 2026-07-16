const {
  PENDING_LEAVE_STATUSES,
  getInitialApprovalStage,
  getBalanceLeaveType,
  appliesStandardPolicyThresholds,
  getEffectivePendingStage,
  getApprovalAction,
  getManualApprovalStatus,
} = require('../modules/leave/leave.workflow');

describe('leave approval hierarchy', () => {
  test('employee with a manager starts at manager review', () => {
    expect(getInitialApprovalStage({ requesterTier: 'EMPLOYEE', managerId: 'manager-1' }))
      .toBe('PENDING_MANAGER');
  });

  test('employee without a manager and a manager applicant start at admin review', () => {
    expect(getInitialApprovalStage({ requesterTier: 'EMPLOYEE', managerId: null }))
      .toBe('PENDING_ADMIN');
    expect(getInitialApprovalStage({ requesterTier: 'MANAGER', managerId: 'senior-manager' }))
      .toBe('PENDING_ADMIN');
  });

  test('emergency leave bypasses manager and borrows from Casual Leave', () => {
    expect(getInitialApprovalStage({ requesterTier: 'EMPLOYEE', managerId: 'manager-1', leaveType: 'EMERGENCY' }))
      .toBe('PENDING_ADMIN');
    expect(getBalanceLeaveType('EMERGENCY')).toBe('CASUAL');
    expect(getBalanceLeaveType('OTHER')).toBe('CASUAL');
    expect(getBalanceLeaveType('SICK')).toBe('SICK');
    expect(appliesStandardPolicyThresholds('EMERGENCY')).toBe(false);
    expect(appliesStandardPolicyThresholds('CASUAL')).toBe(true);
  });

  test('manager approval forwards but is never final', () => {
    expect(getApprovalAction({ actorRole: 'MANAGER', status: 'PENDING_MANAGER', managerId: 'manager-1' }))
      .toBe('MANAGER_FORWARD');
    expect(getApprovalAction({ actorRole: 'MANAGER', status: 'PENDING_ADMIN', managerId: 'manager-1' }))
      .toBeNull();
  });

  test('admin cannot bypass manager review and can finalize admin review', () => {
    expect(getApprovalAction({ actorRole: 'ADMIN', status: 'PENDING_MANAGER', managerId: 'manager-1' }))
      .toBeNull();
    expect(getApprovalAction({ actorRole: 'ADMIN', status: 'PENDING_ADMIN', managerId: 'manager-1' }))
      .toBe('ADMIN_FINAL');
  });

  test('legacy pending records resolve to the correct stage', () => {
    expect(getEffectivePendingStage({ status: 'PENDING', managerId: 'manager-1' })).toBe('PENDING_MANAGER');
    expect(getEffectivePendingStage({ status: 'PENDING', managerId: null })).toBe('PENDING_ADMIN');
  });

  test('all staged pending states are recognized by overlap and cancellation rules', () => {
    expect(PENDING_LEAVE_STATUSES).toEqual(['PENDING', 'PENDING_MANAGER', 'PENDING_ADMIN']);
  });
});

describe('getManualApprovalStatus (leave automation disabled)', () => {
  test('routes to manager review when the employee has a manager', () => {
    expect(getManualApprovalStatus({ managerId: 'manager-1' })).toBe('PENDING_MANAGER');
  });

  test('routes straight to admin review when there is no manager', () => {
    expect(getManualApprovalStatus({ managerId: null })).toBe('PENDING_ADMIN');
    expect(getManualApprovalStatus({ managerId: undefined })).toBe('PENDING_ADMIN');
  });
});

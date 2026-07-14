const PENDING_LEAVE_STATUSES = ['PENDING', 'PENDING_MANAGER', 'PENDING_ADMIN'];

const getInitialApprovalStage = ({ requesterTier, managerId, leaveType }) => {
  if (requesterTier === 'ADMIN' || requesterTier === 'SUPER_ADMIN') return null;
  if (leaveType === 'EMERGENCY') return 'PENDING_ADMIN';
  if (requesterTier === 'MANAGER' || !managerId) return 'PENDING_ADMIN';
  return 'PENDING_MANAGER';
};

const getBalanceLeaveType = (leaveType) => (
  ['EMERGENCY', 'OTHER'].includes(leaveType) ? 'CASUAL' : leaveType
);

const appliesStandardPolicyThresholds = (leaveType) => leaveType !== 'EMERGENCY';

const getEffectivePendingStage = ({ status, managerId }) => {
  if (status !== 'PENDING') return status;
  return managerId ? 'PENDING_MANAGER' : 'PENDING_ADMIN';
};

const getApprovalAction = ({ actorRole, status, managerId }) => {
  const stage = getEffectivePendingStage({ status, managerId });
  if (actorRole === 'MANAGER' && stage === 'PENDING_MANAGER') return 'MANAGER_FORWARD';
  if (['ADMIN', 'SUPER_ADMIN'].includes(actorRole) && stage === 'PENDING_ADMIN') return 'ADMIN_FINAL';
  return null;
};

module.exports = {
  PENDING_LEAVE_STATUSES,
  getInitialApprovalStage,
  getBalanceLeaveType,
  appliesStandardPolicyThresholds,
  getEffectivePendingStage,
  getApprovalAction,
};

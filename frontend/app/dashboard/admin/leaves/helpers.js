export const emptyManualRule = () => ({
  leaveType: 'CASUAL',
  displayName: '',
  annualQuota: '',
  maxConsecutiveDays: '',
  minNoticeDays: '',
  applicableRoles: ['EMPLOYEE', 'MANAGER', 'ADMIN'],
  carryForwardAllowed: false,
  maxCarryForwardDays: '',
  requiresManagerApproval: true,
  autoApproveMaxDays: '',
  requiresAdminApproval: false,
  maxConcurrentLeavePercent: '',
});

export const toNullableNumber = (value) => (value === '' || value === null || value === undefined ? null : Number(value));
export const numToInput = (n) => (n === null || n === undefined ? '' : String(n));

export const ruleFromActive = (rule) => ({
  leaveType: rule.leaveType,
  displayName: rule.displayName || '',
  annualQuota: numToInput(rule.annualQuota),
  maxConsecutiveDays: numToInput(rule.maxConsecutiveDays),
  minNoticeDays: numToInput(rule.minNoticeDays),
  applicableRoles: Array.isArray(rule.applicableRoles) && rule.applicableRoles.length ? rule.applicableRoles : ['EMPLOYEE', 'MANAGER', 'ADMIN'],
  carryForwardAllowed: Boolean(rule.carryForwardAllowed),
  maxCarryForwardDays: numToInput(rule.maxCarryForwardDays),
  requiresManagerApproval: rule.requiresManagerApproval !== false,
  autoApproveMaxDays: numToInput(rule.autoApproveMaxDays),
  requiresAdminApproval: Boolean(rule.requiresAdminApproval),
  maxConcurrentLeavePercent: numToInput(rule.maxConcurrentLeavePercent),
});

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getInitials(firstName, lastName) {
  return `${(firstName || '?')[0]}${(lastName || '')[0] || ''}`.toUpperCase();
}

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Plain-English summary of a parsed/activated rule, instead of dumping raw JSON at admins.
export function formatRuleSummary(rule) {
  const parts = [];
  parts.push(rule.annualQuota != null ? `${rule.annualQuota} days/year` : 'no fixed quota set');
  if (rule.maxConsecutiveDays != null) parts.push(`max ${rule.maxConsecutiveDays} consecutive day(s)`);
  if (rule.minNoticeDays != null) parts.push(`${rule.minNoticeDays} day(s) notice required`);
  parts.push(rule.carryForwardAllowed ? `carries forward (up to ${rule.maxCarryForwardDays || 0} days)` : 'no carry forward');
  if (rule.autoApproveMaxDays != null) parts.push(`auto-approves requests up to ${rule.autoApproveMaxDays} day(s)`);
  if (rule.maxConcurrentLeavePercent != null) parts.push(`pauses auto-approval at ${rule.maxConcurrentLeavePercent}% department concurrency`);
  parts.push(rule.requiresAdminApproval ? 'needs manager + admin approval' : rule.requiresManagerApproval ? 'needs manager approval' : 'no manager approval required beyond the auto-approve window');
  if (rule.requiresMedicalCertificateAfterDays) parts.push(`medical certificate required after ${rule.requiresMedicalCertificateAfterDays} day(s)`);
  return parts.join(' · ');
}

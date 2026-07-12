const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const leaveController = require('./leave.controller');
const { authenticate, authorize, requirePermission } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { auditHrAccess } = require('../../middleware/audit.middleware');
const { auditLog } = require('../../middleware/audit.middleware');
fs.mkdirSync('storage/tmp', { recursive: true });
const upload = multer({ dest: 'storage/tmp' });

router.use(authenticate);

// Leave Requests — specific routes BEFORE parameterized /:id
router.get('/my',      leaveController.getMyLeaves);
router.get('/pending', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditHrAccess('LeaveRequest'), leaveController.getPendingLeaves);
router.post('/policy-documents/upload', requirePermission('leave:manage_policy'), upload.single('document'), leaveController.uploadPolicyDocument);
router.post('/policy-documents/:id/extract', requirePermission('leave:manage_policy'), leaveController.extractPolicyDocument);
router.post('/policy-documents/:id/ai-parse', requirePermission('leave:manage_policy'), leaveController.aiParsePolicyDocument);
router.put('/policy-documents/:id/approve-rules', requirePermission('leave:manage_policy'), leaveController.approvePolicyRules);
router.put('/policies/manual', requirePermission('leave:manage_policy'), leaveController.saveManualPolicyRules);

router.post(
  '/',
  [
    body('leaveType').isIn(['ANNUAL', 'SICK', 'CASUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER']),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('reason').notEmpty().isLength({ max: 500 }),
  ],
  validate,
  auditLog('LeaveRequest', 'CREATE'),
  leaveController.applyLeave
);

router.put(
  '/:id/approve',
  authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'),
  auditLog('LeaveRequest', 'APPROVE'),
  leaveController.approveLeave
);

router.put(
  '/:id/reject',
  authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'),
  auditLog('LeaveRequest', 'REJECT'),
  leaveController.rejectLeave
);

router.put('/:id/cancel', leaveController.cancelLeave);
router.post('/:id/evaluate', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), leaveController.evaluateLeave);
router.get('/:id/decision-explanation', leaveController.getDecisionExplanation);

// Leave Balances — /me BEFORE /:userId
router.get('/balances/me',       leaveController.getMyBalances);
router.get('/balances/:userId',  authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditHrAccess('LeaveBalance'), leaveController.getUserBalances);

// Leave Policies — /all and /active BEFORE /:id
router.get('/policies/all',    leaveController.getPolicies);
router.get('/policies/active', requirePermission('leave:manage_policy'), leaveController.getActivePolicyVersion);
// Every role needs display labels to render leave-type text — no admin-only gate here.
router.get('/type-labels', leaveController.getLeaveTypeLabels);
// Read by the AI service (leave-forecast baseline) using the requesting user's own token — same open-read pattern as /attendance/holidays.
router.get('/history/daily-counts', leaveController.getDailyLeaveCounts);
router.post('/policies',       requirePermission('leave:manage_policy'), leaveController.createPolicy);
router.put('/policies/:id',    requirePermission('leave:manage_policy'), leaveController.updatePolicy);

router.get('/',        leaveController.getLeaves);
router.get('/:id',     leaveController.getLeaveById);

module.exports = router;

const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const multer = require('multer');
const leaveController = require('./leave.controller');
const { authenticate, authorize, requirePermission } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { auditHrAccess } = require('../../middleware/audit.middleware');
const { auditLog } = require('../../middleware/audit.middleware');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

router.use(authenticate);

const leaveTypes = ['ANNUAL', 'SICK', 'CASUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'BEREAVEMENT', 'MARRIAGE', 'STUDY', 'HAJJ', 'COMPENSATORY', 'OTHER'];
const policyRules = (partial = false) => [
  partial ? body('leaveType').optional().isIn(leaveTypes) : body('leaveType').isIn(leaveTypes),
  partial ? body('totalDays').optional().isInt({ min: 0, max: 366 }) : body('totalDays').isInt({ min: 0, max: 366 }),
  body('carryForward').optional().isBoolean(),
  body('maxCarryForward').optional().isInt({ min: 0, max: 366 }),
  body('applicableRoleIds').optional().isArray({ max: 100 }),
  body('applicableRoleIds.*').optional().isUUID(),
  body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
];

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
    body('leaveType').isIn(leaveTypes),
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
  param('id').isUUID(),
  body('note').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  validate,
  auditLog('LeaveRequest', 'APPROVE'),
  leaveController.approveLeave
);

router.put(
  '/:id/reject',
  authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'),
  param('id').isUUID(),
  body('note').optional({ nullable: true }).isString().isLength({ max: 2000 }),
  validate,
  auditLog('LeaveRequest', 'REJECT'),
  leaveController.rejectLeave
);

router.put('/:id/cancel', param('id').isUUID(), validate, leaveController.cancelLeave);
router.post('/:id/evaluate', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), param('id').isUUID(), validate, leaveController.evaluateLeave);
router.get('/:id/decision-explanation', param('id').isUUID(), validate, leaveController.getDecisionExplanation);

// Leave Balances — /me BEFORE /:userId
router.get('/balances/me',       leaveController.getMyBalances);
router.get('/balances/:userId', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), param('userId').isUUID(), validate, auditHrAccess('LeaveBalance'), leaveController.getUserBalances);

// Leave Policies — /all and /active BEFORE /:id
router.get('/policies/all',    leaveController.getPolicies);
router.get('/policies/active', requirePermission('leave:manage_policy'), leaveController.getActivePolicyVersion);
// Every role needs display labels to render leave-type text — no admin-only gate here.
router.get('/type-labels', leaveController.getLeaveTypeLabels);
// Read by the AI service (leave-forecast baseline) using the requesting user's own token — same open-read pattern as /attendance/holidays.
router.get('/history/daily-counts', query('days').optional().isInt({ min: 1, max: 90 }), validate, leaveController.getDailyLeaveCounts);
router.post('/policies', requirePermission('leave:manage_policy'), policyRules(), validate, leaveController.createPolicy);
router.put('/policies/:id', requirePermission('leave:manage_policy'), param('id').isUUID(), policyRules(true), validate, leaveController.updatePolicy);

router.get('/',        leaveController.getLeaves);
router.get('/:id', param('id').isUUID(), validate, leaveController.getLeaveById);

module.exports = router;

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const leaveController = require('./leave.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { validate } = require('../../middleware/validate.middleware');
const { auditLog } = require('../../middleware/audit.middleware');
fs.mkdirSync('storage/tmp', { recursive: true });
const upload = multer({ dest: 'storage/tmp' });

router.use(authenticate);

// Leave Requests — specific routes BEFORE parameterized /:id
router.get('/my',      leaveController.getMyLeaves);
router.get('/pending', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), leaveController.getPendingLeaves);
router.post('/policy-documents/upload', authorize('SUPER_ADMIN', 'ADMIN'), upload.single('document'), leaveController.uploadPolicyDocument);
router.post('/policy-documents/:id/extract', authorize('SUPER_ADMIN', 'ADMIN'), leaveController.extractPolicyDocument);
router.post('/policy-documents/:id/ai-parse', authorize('SUPER_ADMIN', 'ADMIN'), leaveController.aiParsePolicyDocument);
router.put('/policy-documents/:id/approve-rules', authorize('SUPER_ADMIN', 'ADMIN'), leaveController.approvePolicyRules);

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
router.get('/balances/:userId',  authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), leaveController.getUserBalances);

// Leave Policies — /all BEFORE /:id
router.get('/policies/all',  leaveController.getPolicies);
router.post('/policies',     authorize('SUPER_ADMIN', 'ADMIN'), leaveController.createPolicy);
router.put('/policies/:id',  authorize('SUPER_ADMIN', 'ADMIN'), leaveController.updatePolicy);

router.get('/',        leaveController.getLeaves);
router.get('/:id',     leaveController.getLeaveById);

module.exports = router;

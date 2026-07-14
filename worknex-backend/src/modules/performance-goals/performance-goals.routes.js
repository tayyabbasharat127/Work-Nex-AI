const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const controller = require('./performance-goals.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { auditLog } = require('../../middleware/audit.middleware');
const { validate } = require('../../middleware/validate.middleware');

const id = (name = 'id') => param(name).isUUID();
const goalRules = [
  body('userId').optional().isUUID(),
  body('title').optional().isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 5000 }),
  body('metric').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('dueDate').optional({ nullable: true }).isISO8601(),
  body('progress').optional().isInt({ min: 0, max: 100 }),
  body('status').optional().isIn(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'MISSED']),
];
const reviewRules = [
  body('userId').optional().isUUID(),
  body('cycle').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('managerRating').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
  body('managerComments').optional({ nullable: true }).isString().isLength({ max: 10000 }),
];

router.use(authenticate);

// Goals — self-service endpoints have no role gate (the service layer
// enforces self-or-accessible-report scoping); the :userId lookup is
// manager/admin only since employees only ever need /goals/me.
router.get('/goals/me', controller.getMyGoals);
router.get('/goals/user/:userId', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), id('userId'), validate, controller.getUserGoals);
router.post('/goals', goalRules, body('title').exists(), validate, auditLog('Goal', 'CREATE'), controller.createGoal);
router.patch('/goals/:id', id(), goalRules, validate, auditLog('Goal', 'UPDATE'), controller.updateGoal);
router.delete('/goals/:id', id(), validate, auditLog('Goal', 'DELETE'), controller.deleteGoal);

// Reviews — creating/editing/submitting a review is always a manager/admin
// action (an employee never authors their own review); reading is open
// (self-or-accessible enforced in the service).
router.get('/reviews/me', controller.getMyReviews);
router.get('/reviews/team-status', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), controller.getTeamStatus);
router.get('/reviews/user/:userId', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), id('userId'), validate, controller.getUserReviews);
router.post('/reviews', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), reviewRules, body('userId').exists(), body('cycle').exists(), validate, auditLog('PerformanceReview', 'CREATE'), controller.createReview);
router.patch('/reviews/:id', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), id(), reviewRules, validate, auditLog('PerformanceReview', 'UPDATE'), controller.updateReview);
router.patch('/reviews/:id/submit', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), id(), validate, auditLog('PerformanceReview', 'UPDATE'), controller.submitReview);

// Summary — combines goals + reviews into overallPerformanceScore; self access
// always allowed, manager/admin access to a report enforced in the service.
router.get('/summary/:userId', id('userId'), validate, controller.getPerformanceSummary);

module.exports = router;

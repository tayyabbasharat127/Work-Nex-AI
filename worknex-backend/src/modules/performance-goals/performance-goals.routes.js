const express = require('express');
const router = express.Router();
const controller = require('./performance-goals.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { auditLog } = require('../../middleware/audit.middleware');

router.use(authenticate);

// Goals — self-service endpoints have no role gate (the service layer
// enforces self-or-accessible-report scoping); the :userId lookup is
// manager/admin only since employees only ever need /goals/me.
router.get('/goals/me', controller.getMyGoals);
router.get('/goals/user/:userId', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), controller.getUserGoals);
router.post('/goals', auditLog('Goal', 'CREATE'), controller.createGoal);
router.patch('/goals/:id', auditLog('Goal', 'UPDATE'), controller.updateGoal);
router.delete('/goals/:id', auditLog('Goal', 'DELETE'), controller.deleteGoal);

// Reviews — creating/editing/submitting a review is always a manager/admin
// action (an employee never authors their own review); reading is open
// (self-or-accessible enforced in the service).
router.get('/reviews/me', controller.getMyReviews);
router.get('/reviews/team-status', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), controller.getTeamStatus);
router.get('/reviews/user/:userId', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), controller.getUserReviews);
router.post('/reviews', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditLog('PerformanceReview', 'CREATE'), controller.createReview);
router.patch('/reviews/:id', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditLog('PerformanceReview', 'UPDATE'), controller.updateReview);
router.patch('/reviews/:id/submit', authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), auditLog('PerformanceReview', 'UPDATE'), controller.submitReview);

// Summary — combines goals + reviews into overallPerformanceScore; self access
// always allowed, manager/admin access to a report enforced in the service.
router.get('/summary/:userId', controller.getPerformanceSummary);

module.exports = router;

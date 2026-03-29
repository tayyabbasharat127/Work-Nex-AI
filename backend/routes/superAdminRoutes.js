const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authentication');
const authorizeRoles = require('../middleware/authorizeRoles');
const superAdminController = require('../controller/superAdmin');
const packageController = require('../controller/packageManagement');

// All routes require authentication and super admin role (0)
router.use(authenticate);
router.use(authorizeRoles(0));

// Organization management routes
router.get('/organizations', superAdminController.getAllOrganizations);
router.get('/organizations/:id', superAdminController.getOrganizationDetails);
router.patch('/organizations/:id/status', superAdminController.updateOrganizationStatus);
router.patch('/organizations/:id/package', superAdminController.updateOrganizationPackage);

// User management routes
router.get('/users', superAdminController.getAllUsers);

// Analytics routes
router.get('/analytics', superAdminController.getPlatformAnalytics);

// Package management routes
router.get('/packages', packageController.getAllPackages);
router.post('/packages', packageController.createPackage);
router.patch('/packages/:id', packageController.updatePackage);
router.delete('/packages/:id', packageController.deletePackage);
router.post('/packages/:id/features', packageController.addFeature);
router.delete('/packages/:id/features', packageController.removeFeature);

// Audit logs routes
router.get('/audit-logs', superAdminController.getAuditLogs);

module.exports = router;

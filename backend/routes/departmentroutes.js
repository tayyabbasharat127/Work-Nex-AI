const express = require('express');
const router = express.Router();
const { getAllDepartments, createDepartment, updateDepartment, deleteDepartment } = require('../controller/Department');
const authenticateToken = require('../middleware/authentication');
router.get('/', authenticateToken, getAllDepartments);
router.post('/', authenticateToken, createDepartment);
router.put('/:id', authenticateToken, updateDepartment);
router.delete('/:id', authenticateToken, deleteDepartment);
module.exports = router;

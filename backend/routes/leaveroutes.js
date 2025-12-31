 const express = require('express');
const router = express.Router();
 const authenticateToken = require('../middleware/authentication');
const pool = require("../config/db");
  const {createLeave,getAllLeaves, getMyLeaves, deleteLeave, updateLeaveStatus} = require('../controller/leave');
  
 router.post('/', authenticateToken, createLeave);
router.get('/my', authenticateToken, getMyLeaves);
router.delete('/:leave_id', authenticateToken, deleteLeave);

// Admin
router.get('/', authenticateToken, getAllLeaves);
router.put('/:leave_id/status', authenticateToken, updateLeaveStatus);
  module.exports = router;
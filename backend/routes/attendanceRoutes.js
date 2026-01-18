const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authentication");
const authorizeRoles = require("../middleware/authorizeRoles");
const {
  checkIn,
  checkOut,
  ping,
  todayStatus,
  history,
  autoCheckout,
  attendanceOverview
} = require("../controller/attendance");
router.post("/check-in", authenticateToken, checkIn);
router.post("/check-out", authenticateToken, checkOut);
router.post("/ping", authenticateToken, ping);
router.post("/auto-checkout", authenticateToken, autoCheckout);
router.get("/today-status", authenticateToken, todayStatus);
router.get("/history", authenticateToken, history);
router.get('/overview',authorizeRoles(1),attendanceOverview);
module.exports = router;

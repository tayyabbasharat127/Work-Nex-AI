const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authentication");
const {
  checkIn,
  checkOut,
  ping,
  todayStatus,
  history,
} = require("../controller/attendance");
router.post("/check-in", authenticateToken, checkIn);
router.post("/check-out", authenticateToken, checkOut);
router.post("/ping", authenticateToken, ping);
router.get("/today-status", authenticateToken, todayStatus);
router.get("/history", authenticateToken, history);
module.exports = router;

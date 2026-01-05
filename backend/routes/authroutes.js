const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/authentication");
const pool = require("../config/db");
const {
  signup,
  verifyOTP,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
} = require("../controller/auth");

router.post("/signup", signup);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/changePassword", authenticateToken,changePassword);
module.exports = router;

const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const {
  signup,
  verifyOTP,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
} = require("../controller/auth");

router.post("/signup", signup);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
module.exports = router;

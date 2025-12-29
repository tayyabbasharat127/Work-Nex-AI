
const bcrypt = require('bcrypt');
const transporter = require("../config/nodemailer");
const FREE_EMAIL_DOMAINS = [ "yahoo.com", "hotmail.com", "outlook.com"];
const pool = require("../config/db");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res) => {
  const {
    organization_name,
    organization_email,
    admin_name,
    admin_email,
    password,
    subscription_plan
  } = req.body;

  try {
    // 1. Check org exists
    const orgCheck = await pool.query(
      `SELECT * FROM organization WHERE organization_email=$1`,
      [organization_email]
    );
    if (orgCheck.rows.length)
      return res.status(400).json({ message: "Organization already exists" });

    // 2. Create organization
    const org = await pool.query(
      `INSERT INTO organization
      (organization_name, organization_email, admin_email, subscription_plan, is_verified)
      VALUES ($1,$2,$3,$4,false)
      RETURNING organization_id`,
      [organization_name, organization_email, admin_email, subscription_plan]
    );

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create admin user
    await pool.query(
      `INSERT INTO users
      (name, email, password_hash, role_id, organization_id, status)
      VALUES ($1,$2,$3,1,$4,'inactive')`,
      [admin_name, admin_email, passwordHash, org.rows[0].organization_id]
    );

    // 5. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    await pool.query(
      `INSERT INTO otps (email, otp, expires_at)
       VALUES ($1,$2,NOW() + interval '10 minutes')`,
      [admin_email, otp]
    );

    // 6. Send email
    await sendEmail(admin_email, "Verify OTP", `Your OTP is ${otp}`);

    res.json({ success: true, message: "OTP sent to email" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed" });
  }
};


exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  const record = await pool.query(
    `SELECT * FROM otps
     WHERE email=$1 AND otp=$2 AND expires_at > NOW()`,
    [email, otp]
  );

  if (!record.rows.length)
    return res.status(400).json({ message: "Invalid or expired OTP" });

  // Activate org & admin
  await pool.query(
    `UPDATE organization SET is_verified=true WHERE admin_email=$1`,
    [email]
  );

  await pool.query(
    `UPDATE users SET status='active' WHERE email=$1`,
    [email]
  );

  await pool.query(`DELETE FROM otps WHERE email=$1`, [email]);

  res.json({ success: true, message: "Email verified successfully" });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await pool.query(
    `SELECT * FROM users WHERE email=$1 AND status='active'`,
    [email]
  );

  if (!user.rows.length)
    return res.status(401).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.rows[0].password_hash);
  if (!match)
    return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    {
      user_id: user.rows[0].user_id,
      role_id: user.rows[0].role_id,
      organization_id: user.rows[0].organization_id
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  res.json({ token });
};
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newToken = jwt.sign(
      decoded,
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    res.json({ token: newToken });
  } catch {
    res.status(403).json({ message: "Invalid refresh token" });
  }
};
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await pool.query(`SELECT * FROM users WHERE email=$1`, [email]);
  if (!user.rows.length) return res.json({ message: "If exists, email sent" });

  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "10m" });

  await sendEmail(email, "Reset Password", `Token: ${token}`);

  res.json({ success: true });
};

exports.resetPassword = async (req, res) => {
  const { token, new_password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hash = await bcrypt.hash(new_password, 10);

    await pool.query(
      `UPDATE users SET password_hash=$1 WHERE email=$2`,
      [hash, decoded.email]
    );

    res.json({ success: true, message: "Password updated" });
  } catch {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;  // from JWT middleware
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword)
      return res.status(400).json({ success: false, message: "Old & new password required." });

    const user = await User.findByPk(userId);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    // Compare old password
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch)
      return res.status(400).json({ success: false, message: "Old password is incorrect." });

    // Update password (auto-hashed)
    await user.update({
      password_hash: newPassword,
      must_change_password: false
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully."
    });

  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

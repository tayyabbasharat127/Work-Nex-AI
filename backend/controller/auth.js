
const bcrypt = require('bcrypt');
const transporter = require("../config/nodemailer");
const FREE_EMAIL_DOMAINS = ["yahoo.com", "hotmail.com", "outlook.com"];
const pool = require("../config/db");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");

exports.signup = async (req, res) => {
  const {
    organization_name,
    organization_email, // Treating this as admin email/contact email since DB doesn't have org_email
    admin_name,
    admin_email,
    password,
    subscription_plan
  } = req.body;

  try {
    // 1. Check org exists (using admin_email as unique identifier for now, or check organization name)
    const orgCheck = await pool.query(
      `SELECT * FROM "Organizations" WHERE admin_email=$1`,
      [admin_email]
    );
    if (orgCheck.rows.length)
      return res.status(400).json({ message: "Organization already exists" });

    // 2. Create organization
    // Map subscription_plan to package column
    const org = await pool.query(
      `INSERT INTO "Organizations"
      (organization_name, admin_email, package, status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, 'Inactive', NOW(), NOW())
      RETURNING id`,
      [organization_name, admin_email, subscription_plan]
    );

    const orgId = org.rows[0].id;

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create admin user
    // Role 'Admin' mapped to role_id 1 logic later
    await pool.query(
      `INSERT INTO "Users"
      (name, email, password, role, organization_id, status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, 'Admin', $4, 'Inactive', NOW(), NOW())`,
      [admin_name, admin_email, passwordHash, orgId]
    );

    // 5. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    await pool.query(
      `INSERT INTO "TempOtps" (email, otp, expires_at, "createdAt", "updatedAt")
       VALUES ($1, $2, NOW() + interval '10 minutes', NOW(), NOW())`,
      [admin_email, otp]
    );

    // 6. Send email
    await sendEmail(admin_email, "Verify OTP", `Your OTP is ${otp}`);

    res.json({ success: true, message: "OTP sent to email" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed: " + err.message });
  }
};


exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  const record = await pool.query(
    `SELECT * FROM "TempOtps"
     WHERE email=$1 AND otp=$2 AND expires_at > NOW()`,
    [email, otp]
  );

  if (!record.rows.length)
    return res.status(400).json({ message: "Invalid or expired OTP" });

  // Activate org & admin
  await pool.query(
    `UPDATE "Organizations" SET status='Active' WHERE admin_email=$1`,
    [email]
  );

  await pool.query(
    `UPDATE "Users" SET status='Active' WHERE email=$1`,
    [email]
  );

  await pool.query(`DELETE FROM "TempOtps" WHERE email=$1`, [email]);

  res.json({ success: true, message: "Email verified successfully" });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  console.log('=== Login Attempt ===');
  console.log('Email:', email);
  console.log('Password length:', password?.length);

  // First check lowercase users table (where admin creates users)
  let userResult = await pool.query(
    `SELECT user_id as id, name, email, password_hash as password, role_id, organization_id, status FROM users WHERE email=$1`,
    [email]
  );

  let isLowercaseTable = true;

  // If not found, check capitalized Users table (for signup flow)
  if (!userResult.rows.length) {
    console.log('Not found in lowercase users table, checking Users table...');
    userResult = await pool.query(
      `SELECT * FROM "Users" WHERE email=$1`,
      [email]
    );
    isLowercaseTable = false;
  } else {
    console.log('Found in lowercase users table');
  }

  if (!userResult.rows.length) {
    console.log('User not found in any table');
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const user = userResult.rows[0];
  console.log('User found:', { id: user.id, email: user.email, status: user.status });
  console.log('Password hash exists:', !!user.password);
  console.log('Password hash preview:', user.password ? user.password.substring(0, 20) + '...' : 'NULL');

  // Check active status (both tables use different case)
  const userStatus = user.status.toLowerCase();
  if (userStatus !== 'active') {
    console.log('User status is not active:', user.status);
    return res.status(401).json({ message: "Account is not active" });
  }

  // Check password
  console.log('Comparing password...');
  const match = await bcrypt.compare(password, user.password);
  console.log('Password match:', match);
  
  if (!match)
    return res.status(401).json({ message: "Invalid credentials" });

  // Map roles to IDs for frontend compatibility
  let roleId = 3; // Default Employee
  if (isLowercaseTable) {
    // users table has role_id directly
    roleId = user.role_id || 3;
    console.log('Using lowercase table role_id:', roleId);
  } else {
    // Users table has role as string
    console.log('Using capitalized table role:', user.role);
    if (user.role === 'SuperAdmin') roleId = 0;
    else if (user.role === 'Admin') roleId = 1;
    else if (user.role === 'Manager') roleId = 2;
    else if (user.role === 'Employee') roleId = 3;
    console.log('Mapped to role_id:', roleId);
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      roleId: roleId,
      organizationId: user.organization_id
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  console.log('Login successful! Returning role_id:', roleId);

  res.json({
    token,
    user: {
      user_id: user.id,
      email: user.email,
      name: user.name,
      role_id: roleId,
      organization_id: user.organization_id
    }
  });
  // Device ID logic commented out as it requires schema columns not confirmed
  /*
    const { deviceId } = req.body; 
  if (deviceId) {
    await pool.query(
      `UPDATE "Users" SET device_id = $1 WHERE id = $2 AND device_id IS NULL`,
      [deviceId, user.id]
    );
  }
  */
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

  try {
    // Check both users tables
    let user = await pool.query(`SELECT * FROM users WHERE email=$1`, [email]);
    if (!user.rows.length) {
      user = await pool.query(`SELECT * FROM "Users" WHERE email=$1`, [email]);
    }
    
    if (!user.rows.length) {
      return res.json({ success: true, message: "If the email exists, an OTP has been sent." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    
    // Delete any existing OTP for this email first
    await pool.query(`DELETE FROM "TempOtps" WHERE email=$1`, [email]);
    
    // Store new OTP in TempOtps table
    await pool.query(
      `INSERT INTO "TempOtps" (email, otp, expires_at, "createdAt", "updatedAt")
       VALUES ($1, $2, NOW() + interval '10 minutes', NOW(), NOW())`,
      [email, otp]
    );

    // Send OTP via email
    await sendEmail(email, "Reset Password OTP", `Your password reset OTP is: ${otp}. Valid for 10 minutes.`);

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, new_password } = req.body;

  if (!email || !otp || !new_password) {
    return res.status(400).json({ message: "Email, OTP, and new password required" });
  }

  try {
    // Verify OTP
    const otpRecord = await pool.query(
      `SELECT * FROM "TempOtps" WHERE email=$1 AND otp=$2 AND expires_at > NOW()`,
      [email, otp]
    );

    if (!otpRecord.rows.length) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Hash new password
    const hash = await bcrypt.hash(new_password, 10);

    // Update password in both possible tables
    let updated = await pool.query(
      `UPDATE users SET password_hash=$1 WHERE email=$2`,
      [hash, email]
    );

    if (updated.rowCount === 0) {
      await pool.query(
        `UPDATE "Users" SET password=$1 WHERE email=$2`,
        [hash, email]
      );
    }

    // Delete used OTP
    await pool.query(`DELETE FROM "TempOtps" WHERE email=$1`, [email]);

    res.json({ success: true, message: "Password reset successfully" });

  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: "Failed to reset password" });
  }
};
exports.changePassword = async (req, res) => {
  try {
    const userEmail = req.user?.email || req.body.email; // Fallback for safety
    if (!userEmail) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Old & new password required." });
    }

    // Fetch user from DB
    const userResult = await pool.query(`SELECT * FROM "Users" WHERE email=$1`, [userEmail]);
    if (!userResult.rows.length) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const user = userResult.rows[0];

    // Compare old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Old password is incorrect." });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      `UPDATE "Users" SET password=$1 WHERE email=$2`,
      [hashedPassword, userEmail]
    );

    res.status(200).json({ success: true, message: "Password updated successfully." });

  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Super Admin Login
 * Separate login endpoint for super admin with role_id = 0
 */
exports.superAdminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate email is admin@worknex
    if (email !== 'admin@worknex') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Query super admin user
    const userResult = await pool.query(
      `SELECT * FROM "Users" WHERE email=$1 AND role='SuperAdmin' AND status='Active'`,
      [email]
    );

    if (!userResult.rows.length) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token with NULL organizationId
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        roleId: 0,
        organizationId: null
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({
      token,
      user: {
        user_id: user.id,
        email: user.email,
        name: user.name,
        role_id: 0
      }
    });

  } catch (err) {
    console.error('Super admin login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
};
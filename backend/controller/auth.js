const { Organization } = require("../models");
const {TempOtp} = require("../models");
const { User } = require('../models');
const bcrypt = require('bcrypt');
const transporter = require("../config/nodemailer");
const FREE_EMAIL_DOMAINS = [ "yahoo.com", "hotmail.com", "outlook.com"];
exports.signup = async (req, res) => {
  try {
    const {
      organization_name,
      Industry,
      address,
      city,
      country,
      package,
      status,
      admin_email,
      admin_name
    } = req.body;

    if (!organization_name || !admin_email) {
      return res.status(400).json({
        success: false,
        message: "organization_name & admin_email are required"
      });
    }

    const domain = admin_email.split("@")[1]?.toLowerCase();

    if (FREE_EMAIL_DOMAINS.includes(domain)) {
      return res.status(400).json({
        success: false,
        message: "Please use a corporate email address"
      });
    }

    const existingOrg = await Organization.findOne({
      where: { company_domain: domain }
    });

    if (existingOrg) {
      return res.status(400).json({
        success: false,
        message: "Organization already exists"
      });
    }

    const org = await Organization.create({
      organization_name,
      Industry,
      company_domain: domain,
      package,
      address,
      city,
      country,
      status: status || "pending",
      admin_email,
      is_verified: false
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
  await TempOtp.create({
      email: admin_email,
      otp: otp,
      expires_at: expiry,
    });

    

    await transporter.sendMail({
      to: admin_email,
      subject: "WorkNex AI - OTP Verification",
      html: `
        <h3>Hello ${admin_name || "Admin"},</h3>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      `
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent. Please verify.",
      organization_id: org.id,
      admin_email
    });

  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
exports.verifyOTP = async (req, res) => {
  try {
    const { admin_email, otp } = req.body;  // Destructure correctly

    if (!admin_email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Check if the organization exists with the given admin email
    const org = await Organization.findOne({ where: { admin_email } });

    if (!org) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Fetch OTP record from TempOtp table
    const otpRecord = await TempOtp.findOne({
      where: { email: admin_email, otp: otp },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check if the OTP has expired
    if (new Date() > otpRecord.expires_at) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    // OTP is valid, mark organization as verified and clear OTP
    await org.update({
      is_verified: true,
      otp_code: null,
      otp_expiry: null,
    });

    // Generate a temporary password for admin and create admin user
    const tempPassword = Math.random().toString(36).slice(-8);
    const adminUser = await User.create({
      name: org.admin_name,
      email: org.admin_email,
      role: "admin",
    organization_id: org.id,
      password: tempPassword, // Auto-hashed by Sequelize hook
      must_change_password: true,
    });

    // Send the credentials email to the admin
    await transporter.sendMail({
      to: org.admin_email,
      subject: "Your WorkNex AI Admin Credentials",
      html: `
        <h2>Welcome to WorkNex AI</h2>
        <p>Your organization has been successfully verified.</p>
        <p><b>Admin Login Credentials:</b></p>
        <p>Email: ${org.admin_email}</p>
        <p>Password: ${tempPassword}</p>
        <br/>
        <p>Please login and change your password immediately.</p>
      `,
    });

    // Success response
    return res.status(200).json({
      success: true,
      message: "OTP verified. Admin credentials have been emailed.",
    });
  } catch (error) {
    console.error("OTP Verify Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email & password are required"
      });
    }

    // Find user
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Ensure the user is associated with an organization
   

    // Find organization based on organization_id
    const org = await Organization.findOne({ where: { id: user.organization_id } });

   

    // Check organization verification status
   

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        organization_id: user.organization_id
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Dashboard redirection logic
    let dashboard = "";
    if (user.role === "admin") dashboard = "/admin/dashboard";
    if (user.role === "manager") dashboard = "/manager/dashboard";
    if (user.role === "employee") dashboard = "/employee/dashboard";

    // First login, force password change
    if (user.must_change_password) {
      return res.status(200).json({
        success: true,
        must_change_password: true,
        message: "Password change required",
        token,
        dashboard
      });
    }

    // Normal login response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role: user.role,
      dashboard
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ success: false, message: "Email is required." });

    // Check if user exists
    const user = await User.findOne({ where: { email } });

    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Delete old OTPs
    await TempOtp.destroy({ where: { email } });

    // Save new OTP
    await TempOtp.create({ email, otp, expires_at });

    // Send email
    await transporter.sendMail({
      to: email,
      subject: "WorkNex AI - Password Reset OTP",
      html: `
        <h2>Your OTP Code</h2>
        <h1>${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      `
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email."
    });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res.status(400).json({ success: false, message: "Email, OTP & new password are required." });

    // Find OTP record
    const otpRecord = await TempOtp.findOne({ where: { email, otp } });

    if (!otpRecord)
      return res.status(400).json({ success: false, message: "Invalid OTP." });

    if (new Date() > otpRecord.expires_at)
      return res.status(400).json({ success: false, message: "OTP has expired." });

    // Find user
    const user = await User.findOne({ where: { email } });

    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    // Update password (Sequelize will auto-hash)
    await user.update({
      password_hash: newPassword,
      must_change_password: false
    });

    // Clear OTP from DB
    await TempOtp.destroy({ where: { email } });

    return res.status(200).json({
      success: true,
      message: "Password reset successful."
    });

  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ success: false, message: error.message });
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

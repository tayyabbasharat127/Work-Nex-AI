const transporter = require("../config/nodemailer");

const sendEmail = async (to, subject, text) => {
  try {
<<<<<<< HEAD
    // Validate input parameters
    if (!to || typeof to !== 'string' || to.trim() === '') {
      throw new Error('Recipient email address is required and must be a valid string');
    }

    if (!subject || typeof subject !== 'string') {
      throw new Error('Email subject is required');
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Email text content is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to.trim())) {
      throw new Error(`Invalid email format: ${to}`);
    }

    console.log('📧 Attempting to send email...');
    console.log('   To:', to);
    console.log('   Subject:', subject);
    console.log('   From:', process.env.EMAIL_USER);

    const info = await transporter.sendMail({
      from: `"WorkNex AI" <${process.env.EMAIL_USER}>`,
      to: to.trim(),
=======
    const info = await transporter.sendMail({
      from: `"WorkNex AI" <${process.env.EMAIL_USER}>`,
      to,
>>>>>>> 0544562a1075bdc98c91d928eccf30541806636d
      subject,
      text,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">WorkNex AI</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Workforce Intelligence Platform</p>
          </div>
          <div style="background-color: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="white-space: pre-wrap; color: #333; line-height: 1.6; font-size: 16px;">
${text}
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              This is an automated message from WorkNex AI. Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    });

    console.log("✅ Email sent successfully to:", to);
    console.log("📧 Message ID:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);
<<<<<<< HEAD
    console.error("   Error details:", {
      to,
      subject,
      errorCode: error.code,
      errorCommand: error.command
    });
=======
>>>>>>> 0544562a1075bdc98c91d928eccf30541806636d
    throw error;
  }
};

module.exports = sendEmail;
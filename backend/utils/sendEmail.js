const nodemailer = require("nodemailer");

// Test-mode transporter (NO SMTP, NO LIMIT)
const transporter = nodemailer.createTransport({
  jsonTransport: true
});

const sendEmail = async (to, subject, text) => {
  await transporter.sendMail({
    from: "test@local.com",
    to,
    subject,
    text
  });

  console.log("📩 EMAIL (TEST MODE)");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log("Content:", text);
};

module.exports = sendEmail;
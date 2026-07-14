const nodemailer = require('nodemailer');
const { config } = require('./env');

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
  disableFileAccess: true,
  disableUrlAccess: true,
});

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 */
const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"WorkNex AI" <${config.email.from}>`,
    to,
    subject,
    html,
  });
};

module.exports = { sendEmail };

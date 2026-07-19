const nodemailer = require('nodemailer');
const axios = require('axios');
const { config } = require('./env');

const SMTP_TIMEOUT_MS = 10_000;

const transporter = config.email.provider === 'smtp'
  ? nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
    disableFileAccess: true,
    disableUrlAccess: true,
  })
  : null;

const sendViaBrevo = async (to, subject, html) => {
  await axios.post('https://api.brevo.com/v3/smtp/email', {
    sender: { name: 'WorkNex AI', email: config.email.from },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  }, {
    headers: {
      'api-key': config.email.brevoApiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    timeout: SMTP_TIMEOUT_MS,
  });
};

const sendViaSmtp = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"WorkNex AI" <${config.email.from}>`,
    to,
    subject,
    html,
  });
};

let cachedGmailAccessToken = null;
let cachedGmailAccessTokenExpiresAt = 0;

const getGmailAccessToken = async () => {
  if (cachedGmailAccessToken && Date.now() < cachedGmailAccessTokenExpiresAt) {
    return cachedGmailAccessToken;
  }
  const response = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: config.email.gmailOAuthClientId,
    client_secret: config.email.gmailOAuthClientSecret,
    refresh_token: config.email.gmailOAuthRefreshToken,
    grant_type: 'refresh_token',
  }, { timeout: SMTP_TIMEOUT_MS });
  cachedGmailAccessToken = response.data.access_token;
  cachedGmailAccessTokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
  return cachedGmailAccessToken;
};

const sendViaGmailApi = async (to, subject, html) => {
  const accessToken = await getGmailAccessToken();
  const message = [
    `From: ${config.email.from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ].join('\r\n');
  const raw = Buffer.from(message).toString('base64url');
  await axios.post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { raw }, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    timeout: SMTP_TIMEOUT_MS,
  });
};

const SENDERS = {
  brevo: sendViaBrevo,
  gmail_api: sendViaGmailApi,
  smtp: sendViaSmtp,
};

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 */
const sendEmail = async (to, subject, html) => SENDERS[config.email.provider](to, subject, html);

module.exports = { sendEmail };

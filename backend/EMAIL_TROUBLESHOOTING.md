# Email Troubleshooting Guide

## Common Email Errors and Solutions

### Error: "No recipients defined"

This error occurs when the email address is undefined, null, or empty.

**Causes:**
1. Missing email field in request body
2. Email field is undefined or null
3. Email field is an empty string

**Solutions:**
1. Check that the request body includes the email field
2. Validate email format before sending
3. Check console logs for the actual email value being passed

**Fixed in:**
- `backend/utils/sendEmail.js` - Added validation
- `backend/controller/auth.js` - Added logging and validation
- `frontend/app/register/page.jsx` - Fixed field names
- `frontend/lib/api.js` - Added field name mapping

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"

This means Gmail credentials are incorrect or app password is not set up.

**Solutions:**
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification
   - App passwords → Generate new
3. Update `.env` with the app password (not your regular password)

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password
```

### Error: "Connection timeout"

Gmail SMTP server is not reachable.

**Solutions:**
1. Check internet connection
2. Verify firewall settings allow SMTP (port 587 or 465)
3. Try using port 465 with secure: true

```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

### Error: "Daily sending quota exceeded"

Gmail has daily sending limits.

**Solutions:**
1. Wait 24 hours for quota to reset
2. Use a different email service (SendGrid, AWS SES, etc.)
3. Upgrade to Google Workspace for higher limits

**Gmail Limits:**
- Free Gmail: 500 emails/day
- Google Workspace: 2000 emails/day

## Testing Email Configuration

### 1. Test Email Sending

Create a test file `backend/test_email.js`:

```javascript
require('dotenv').config();
const sendEmail = require('./utils/sendEmail');

async function testEmail() {
  try {
    console.log('Testing email configuration...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***' : 'NOT SET');
    
    await sendEmail(
      'test@example.com', // Replace with your test email
      'Test Email',
      'This is a test email from WorkNex AI'
    );
    
    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
  }
}

testEmail();
```

Run: `node backend/test_email.js`

### 2. Verify Environment Variables

```bash
cd backend
node -e "require('dotenv').config(); console.log('EMAIL_USER:', process.env.EMAIL_USER); console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');"
```

### 3. Test SMTP Connection

```javascript
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.log('❌ SMTP connection failed:', error);
  } else {
    console.log('✅ SMTP server is ready to send emails');
  }
});
```

## Alternative Email Services

### SendGrid

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: 'recipient@example.com',
  from: 'sender@example.com',
  subject: 'Subject',
  text: 'Text content',
  html: '<strong>HTML content</strong>',
};

await sgMail.send(msg);
```

### AWS SES

```javascript
const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const ses = new AWS.SES({ apiVersion: '2010-12-01' });

const params = {
  Source: 'sender@example.com',
  Destination: {
    ToAddresses: ['recipient@example.com'],
  },
  Message: {
    Subject: { Data: 'Subject' },
    Body: {
      Text: { Data: 'Text content' },
      Html: { Data: '<strong>HTML content</strong>' },
    },
  },
};

await ses.sendEmail(params).promise();
```

### Mailgun

```javascript
const mailgun = require('mailgun-js');
const mg = mailgun({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
});

const data = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Subject',
  text: 'Text content',
  html: '<strong>HTML content</strong>',
};

await mg.messages().send(data);
```

## Debugging Checklist

- [ ] Environment variables are set correctly
- [ ] Gmail 2FA is enabled
- [ ] App password is generated and used (not regular password)
- [ ] Email address format is valid
- [ ] Internet connection is working
- [ ] Firewall allows SMTP connections
- [ ] Daily sending quota not exceeded
- [ ] Test email script works
- [ ] SMTP connection verification passes

## Production Recommendations

1. **Use a dedicated email service** (SendGrid, AWS SES, Mailgun)
   - More reliable
   - Higher sending limits
   - Better deliverability
   - Email analytics

2. **Implement email queue** (Bull, BullMQ)
   - Handle failures gracefully
   - Retry failed emails
   - Rate limiting

3. **Add email templates** (Handlebars, EJS)
   - Consistent branding
   - Easy to maintain
   - Localization support

4. **Monitor email delivery**
   - Track sent/failed emails
   - Bounce handling
   - Spam complaints

5. **Implement email verification**
   - Verify email exists before sending
   - Catch typos early
   - Reduce bounce rate

## Support

If issues persist:
1. Check Gmail account security settings
2. Review Google Account activity for blocked sign-in attempts
3. Try a different email service
4. Check server logs for detailed error messages
5. Verify database has correct email addresses

---

**Last Updated:** March 2024

require('dotenv').config();
const sendEmail = require('./utils/sendEmail');

async function testEmail() {
  console.log('🧪 Testing email configuration...\n');
  
  console.log('📧 Email User:', process.env.EMAIL_USER);
  console.log('🔑 Email Pass:', process.env.EMAIL_PASS ? '***' + process.env.EMAIL_PASS.slice(-4) : 'NOT SET');
  console.log('');

  try {
    const testOTP = Math.floor(100000 + Math.random() * 900000);
    
    await sendEmail(
      process.env.EMAIL_USER, // Send to yourself for testing
      'WorkNex AI - Test OTP',
      `Your test OTP is: ${testOTP}\n\nThis is a test email to verify Gmail integration is working correctly.\n\nValid for 10 minutes.`
    );
    
    console.log('\n✅ Email sent successfully!');
    console.log('📬 Check your inbox:', process.env.EMAIL_USER);
    
  } catch (error) {
    console.error('\n❌ Email sending failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.error('\n💡 Solution: Make sure you are using an App Password, not your regular Gmail password.');
      console.error('   Generate one at: https://myaccount.google.com/apppasswords');
    }
  }
}

testEmail();

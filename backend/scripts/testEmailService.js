require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sendEmail, sendPropertyOwnerCredentials } = require('../utils/emailService');

async function testEmailService() {
  console.log('🧪 Testing Email Service Configuration...\n');

  // Check environment variables
  console.log('📧 Email Configuration:');
  console.log('  EMAIL_HOST:', process.env.EMAIL_HOST || 'NOT SET');
  console.log('  EMAIL_PORT:', process.env.EMAIL_PORT || 'NOT SET');
  console.log('  EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
  console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***SET***' : 'NOT SET');
  console.log('  EMAIL_SECURE:', process.env.EMAIL_SECURE || 'NOT SET');

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('\n❌ Email configuration is incomplete!');
    console.log('\n📝 To configure email, update your .env file with:');
    console.log('EMAIL_HOST=smtp.gmail.com');
    console.log('EMAIL_PORT=587');
    console.log('EMAIL_USER=your-actual-email@gmail.com');
    console.log('EMAIL_PASSWORD=your-app-password');
    console.log('EMAIL_SECURE=false');
    console.log('\n💡 For Gmail:');
    console.log('1. Enable 2-factor authentication');
    console.log('2. Generate an App Password: https://myaccount.google.com/apppasswords');
    console.log('3. Use the App Password (not your regular password)');
    return;
  }

  // Test basic email sending
  console.log('\n🧪 Testing basic email functionality...');
  try {
    const result = await sendEmail({
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: 'GoRoomz Email Service Test',
      html: `
        <h2>Email Service Test</h2>
        <p>This is a test email from the GoRoomz email service.</p>
        <p>If you receive this, the email configuration is working correctly!</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `
    });

    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('   Message ID:', result.messageId);
    } else {
      console.log('❌ Test email failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Email test error:', error.message);
  }

  // Test property owner credentials email
  console.log('\n🧪 Testing property owner credentials email...');
  try {
    const result = await sendPropertyOwnerCredentials({
      to: process.env.EMAIL_USER, // Send to self for testing
      name: 'Test Property Owner',
      email: 'test@example.com',
      password: 'TestPassword123',
      propertyName: 'Test Property'
    });

    if (result.success) {
      console.log('✅ Property owner credentials email sent successfully!');
      console.log('   Message ID:', result.messageId);
    } else {
      console.log('❌ Property owner credentials email failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Property owner credentials email error:', error.message);
  }

  console.log('\n✅ Email service test completed!');
}

// Run the test
testEmailService().catch(console.error);
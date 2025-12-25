const nodemailer = require('nodemailer');

/**
 * Email Service for sending credentials and notifications
 * Requirements: 36.3
 */

// Create reusable transporter
const createTransporter = () => {
  // Check if email configuration is available
  const emailUser = process.env.EMAIL_USER || process.env.EMAIL_FROM;
  const emailPassword = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
  
  if (!process.env.EMAIL_HOST || !emailUser || !emailPassword) {
    console.warn('⚠️ Email configuration not found. Email sending will be disabled.');
    console.warn('Required: EMAIL_HOST, EMAIL_USER (or EMAIL_FROM), EMAIL_PASSWORD (or EMAIL_PASS)');
    console.warn('Current values:');
    console.warn('  EMAIL_HOST:', process.env.EMAIL_HOST || 'NOT SET');
    console.warn('  EMAIL_USER:', emailUser || 'NOT SET');
    console.warn('  EMAIL_PASSWORD:', emailPassword ? '***SET***' : 'NOT SET');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });
};

/**
 * Send property owner credentials via email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Property owner name
 * @param {string} options.email - Login email
 * @param {string} options.password - Generated password
 * @param {string} options.propertyName - Property name
 */
exports.sendPropertyOwnerCredentials = async ({ to, name, email, password, propertyName }) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email service not configured. Credentials would be sent to:', to);
    console.log('Email:', email, 'Password:', password);
    return {
      success: false,
      message: 'Email service not configured. Please configure email settings in environment variables.'
    };
  }

  const mailOptions = {
    from: `"GoRoomz Admin" <${process.env.EMAIL_USER || process.env.EMAIL_FROM}>`,
    to: to,
    subject: 'Welcome to GoRoomz - Your Property Owner Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to GoRoomz!</h2>
        <p>Dear ${name},</p>
        <p>Your property owner account has been created successfully. You can now manage your property "${propertyName}" through our internal management system.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Login Credentials</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        
        <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
        
        <p>To access the internal management system, please visit: <a href="${process.env.INTERNAL_MANAGEMENT_URL || 'http://localhost:3001'}">${process.env.INTERNAL_MANAGEMENT_URL || 'http://localhost:3001'}</a></p>
        
        <p>If you have any questions or need assistance, please contact our support team.</p>
        
        <p>Best regards,<br>The GoRoomz Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Send password reset email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - User name
 * @param {string} options.resetToken - Password reset token
 */
exports.sendPasswordResetEmail = async ({ to, name, resetToken }) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email service not configured. Reset token:', resetToken);
    return {
      success: false,
      message: 'Email service not configured.'
    };
  }

  const resetUrl = `${process.env.INTERNAL_MANAGEMENT_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"GoRoomz Admin" <${process.env.EMAIL_USER || process.env.EMAIL_FROM}>`,
    to: to,
    subject: 'Password Reset Request - GoRoomz',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Dear ${name},</p>
        <p>We received a request to reset your password. Click the button below to reset it:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
        
        <p><strong>Note:</strong> This link will expire in 1 hour.</p>
        
        <p>If you didn't request a password reset, please ignore this email.</p>
        
        <p>Best regards,<br>The GoRoomz Team</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Send notification email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 */
exports.sendNotificationEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email service not configured.');
    return {
      success: false,
      message: 'Email service not configured.'
    };
  }

  const mailOptions = {
    from: `"GoRoomz" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    html: html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Notification email sent:', info.messageId);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending notification email:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Generic send email function
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} options.text - Email text content (optional)
 */
exports.sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('📧 Email service not configured. Would send email to:', to);
    console.log('📧 Subject:', subject);
    return {
      success: false,
      message: 'Email service not configured. Please configure email settings in environment variables.'
    };
  }

  const emailUser = process.env.EMAIL_USER || process.env.EMAIL_FROM;
  const mailOptions = {
    from: `"GoRoomz" <${emailUser}>`,
    to: to,
    subject: subject,
    html: html,
    text: text
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

module.exports = exports;

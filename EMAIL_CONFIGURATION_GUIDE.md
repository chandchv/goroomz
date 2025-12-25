# Email Configuration Guide - GoRoomz

## Issue Summary
Email sending is not working after onboarding/lead approval. This guide provides step-by-step instructions to configure email functionality properly.

## Current Issues Fixed
1. ✅ **Missing Generic sendEmail Function**: Added generic `sendEmail` function that the leads route was trying to use
2. ✅ **Environment Variable Mismatch**: Fixed mismatch between `EMAIL_PASS` and `EMAIL_PASSWORD`
3. ✅ **Better Error Logging**: Enhanced error messages to help diagnose email configuration issues
4. ✅ **Fallback Support**: Added support for both `EMAIL_USER`/`EMAIL_FROM` and `EMAIL_PASSWORD`/`EMAIL_PASS`

## Email Configuration Steps

### Step 1: Update Environment Variables
Edit your `backend/.env` file with proper email configuration:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_SECURE=false
```

### Step 2: Gmail Configuration (Recommended)
If using Gmail, follow these steps:

1. **Enable 2-Factor Authentication**:
   - Go to your Google Account settings
   - Enable 2-factor authentication

2. **Generate App Password**:
   - Visit: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated 16-character password

3. **Update .env file**:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   EMAIL_SECURE=false
   ```

### Step 3: Alternative Email Providers

#### Outlook/Hotmail
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
EMAIL_SECURE=false
```

#### Yahoo Mail
```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
EMAIL_SECURE=false
```

#### Custom SMTP
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASSWORD=your-password
EMAIL_SECURE=false
```

### Step 4: Test Email Configuration
Run the email test script to verify configuration:

```bash
cd backend
node scripts/testEmailService.js
```

This will:
- Check if all required environment variables are set
- Send a test email to verify SMTP connection
- Test the property owner credentials email template

### Step 5: Restart Backend Server
After updating the .env file, restart the backend server:

```bash
cd backend
npm run dev
```

## Email Templates

### Property Owner Credentials Email
When a lead is approved, the system automatically sends:
- Welcome message
- Login credentials (email and generated password)
- Instructions to change password
- Link to internal management system

### Password Reset Email
For password reset functionality:
- Secure reset link with token
- Expiration notice (1 hour)
- Security instructions

## Troubleshooting

### Common Issues

1. **"Email service not configured"**
   - Check that all required environment variables are set
   - Verify EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD are not placeholder values

2. **"Authentication failed"**
   - For Gmail: Use App Password, not regular password
   - Verify 2-factor authentication is enabled
   - Check username/password are correct

3. **"Connection timeout"**
   - Check EMAIL_HOST and EMAIL_PORT are correct
   - Verify firewall/network allows SMTP connections
   - Try different port (465 for secure, 587 for TLS)

4. **"Invalid login"**
   - Verify email provider allows SMTP access
   - Check if "Less secure app access" needs to be enabled (not recommended)
   - Use App Passwords instead

### Debug Steps

1. **Check Environment Variables**:
   ```bash
   node -e "console.log('EMAIL_HOST:', process.env.EMAIL_HOST); console.log('EMAIL_USER:', process.env.EMAIL_USER); console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***SET***' : 'NOT SET');"
   ```

2. **Test SMTP Connection**:
   ```bash
   node scripts/testEmailService.js
   ```

3. **Check Backend Logs**:
   Look for email-related error messages in the backend console

## Files Modified
1. **backend/utils/emailService.js**
   - Added generic `sendEmail` function
   - Fixed environment variable handling
   - Enhanced error logging and debugging

2. **backend/.env**
   - Updated email configuration format
   - Changed EMAIL_PASS to EMAIL_PASSWORD for consistency

3. **backend/scripts/testEmailService.js** (New)
   - Email configuration testing script
   - SMTP connection verification
   - Template testing

## Security Best Practices
1. ✅ Use App Passwords instead of regular passwords
2. ✅ Enable 2-factor authentication
3. ✅ Keep email credentials in environment variables (not in code)
4. ✅ Use TLS/STARTTLS for secure connections
5. ✅ Regularly rotate email passwords

## Status: ✅ READY FOR CONFIGURATION
The email service has been fixed and is ready for configuration. Follow the steps above to set up email functionality for your GoRoomz installation.
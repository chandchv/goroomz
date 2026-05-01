/**
 * Base Email Template
 * 
 * Provides consistent branding and structure for all email notifications.
 * Includes header, footer, and unsubscribe links for marketing emails.
 */

const BASE_URL = process.env.APP_URL || 'https://goroomz.com';

/**
 * Generate the base email wrapper with consistent branding
 * @param {Object} options - Template options
 * @param {string} options.title - Email title
 * @param {string} options.content - Main email content (HTML)
 * @param {string} options.language - Language code ('en' or 'hi')
 * @param {boolean} options.includeUnsubscribe - Whether to include unsubscribe link
 * @param {string} options.unsubscribeUrl - Custom unsubscribe URL
 * @param {Object} options.actionButton - Optional action button { text, url }
 * @returns {string} Complete HTML email
 */
function generateBaseEmail(options) {
  const {
    title,
    content,
    language = 'en',
    includeUnsubscribe = false,
    unsubscribeUrl = `${BASE_URL}/unsubscribe`,
    actionButton = null
  } = options;

  const isHindi = language === 'hi';
  
  const footerText = isHindi 
    ? 'यह ईमेल GoRoomz द्वारा भेजा गया है।'
    : 'This email was sent by GoRoomz.';
  
  const unsubscribeText = isHindi
    ? 'सदस्यता समाप्त करें'
    : 'Unsubscribe';

  const actionButtonHtml = actionButton ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${actionButton.url}" 
         style="background-color: #4F46E5; color: white; padding: 14px 28px; 
                text-decoration: none; border-radius: 6px; font-weight: 600;
                display: inline-block;">
        ${actionButton.text}
      </a>
    </div>
  ` : '';

  const unsubscribeHtml = includeUnsubscribe ? `
    <p style="margin-top: 20px;">
      <a href="${unsubscribeUrl}" style="color: #6B7280; text-decoration: underline;">
        ${unsubscribeText}
      </a>
    </p>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1F2937;
      margin: 0;
      padding: 0;
      background-color: #F3F4F6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
    }
    .header {
      background-color: #4F46E5;
      padding: 24px;
      text-align: center;
    }
    .header img {
      max-height: 40px;
    }
    .header h1 {
      color: #FFFFFF;
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }
    .content {
      padding: 32px 24px;
    }
    .footer {
      background-color: #F9FAFB;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #6B7280;
      border-top: 1px solid #E5E7EB;
    }
    h2 {
      color: #1F2937;
      font-size: 20px;
      margin-top: 0;
    }
    p {
      margin: 16px 0;
    }
    .highlight {
      background-color: #EEF2FF;
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid #4F46E5;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .info-table td {
      padding: 8px 0;
      border-bottom: 1px solid #E5E7EB;
    }
    .info-table td:first-child {
      font-weight: 600;
      color: #6B7280;
      width: 40%;
    }
    .urgent {
      background-color: #FEF2F2;
      border-left-color: #EF4444;
    }
    .success {
      background-color: #ECFDF5;
      border-left-color: #10B981;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>GoRoomz</h1>
    </div>
    <div class="content">
      ${content}
      ${actionButtonHtml}
    </div>
    <div class="footer">
      <p>${footerText}</p>
      <p>© ${new Date().getFullYear()} GoRoomz. All rights reserved.</p>
      ${unsubscribeHtml}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Format currency for display
 */
function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Format date for display
 */
function formatDate(date, language = 'en') {
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Date(date).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format time for display
 */
function formatTime(date, language = 'en') {
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Date(date).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

module.exports = {
  generateBaseEmail,
  formatCurrency,
  formatDate,
  formatTime,
  BASE_URL
};

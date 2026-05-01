/**
 * Notification Templates Index
 * 
 * Exports all notification templates and the template engine
 */

const TemplateEngine = require('./TemplateEngine');
const { templateEngine, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } = require('./TemplateEngine');
const emailTemplates = require('./emailTemplates');
const smsTemplates = require('./smsTemplates');
const baseEmailTemplate = require('./baseEmailTemplate');

module.exports = {
  TemplateEngine,
  templateEngine,
  emailTemplates,
  smsTemplates,
  baseEmailTemplate,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE
};

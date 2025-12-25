const { AuditLog } = require('../models');

/**
 * Audit Logging Middleware
 * Logs all internal user actions for accountability and traceability
 * Requirements: 21.1, 21.3
 */

/**
 * Critical actions that should be flagged in audit logs
 */
const CRITICAL_ACTIONS = [
  'delete_user',
  'deactivate_user',
  'update_permissions',
  'update_role',
  'approve_onboarding',
  'reject_onboarding',
  'mark_commission_paid',
  'update_commission_rate',
  'delete_property',
  'update_system_settings',
  'create_api_key',
  'revoke_api_key',
  'bulk_payment',
  'delete_territory',
  'assign_territory'
];

/**
 * Audit log middleware
 * Captures user actions and logs them to the audit_logs table
 * @param {string} action - Action being performed (e.g., 'create_lead', 'approve_onboarding')
 * @param {string} resourceType - Type of resource (e.g., 'lead', 'property', 'user', 'commission')
 * @param {object} options - Additional options
 * @param {function} options.getResourceId - Function to extract resource ID from request (req => resourceId)
 * @param {function} options.getChanges - Function to extract changes from request (req => { before, after })
 */
exports.auditLog = (action, resourceType, options = {}) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = function(data) {
      // Only log if the request was successful (2xx status code)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Log asynchronously to not block the response
        setImmediate(async () => {
          try {
            // Extract resource ID
            let resourceId = null;
            if (options.getResourceId) {
              resourceId = options.getResourceId(req, data);
            } else if (req.params.id) {
              resourceId = req.params.id;
            } else if (data && data.data && data.data.id) {
              resourceId = data.data.id;
            }

            // Extract changes
            let changes = null;
            if (options.getChanges) {
              changes = options.getChanges(req, data);
            } else if (req.body) {
              changes = {
                before: req.originalData || null,
                after: req.body
              };
            }

            // Determine if action is critical
            const isCritical = CRITICAL_ACTIONS.includes(action);

            // Create audit log entry
            await AuditLog.create({
              userId: req.user ? req.user.id : null,
              action,
              resourceType,
              resourceId,
              changes,
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('user-agent'),
              isCritical
            });
          } catch (error) {
            console.error('Error creating audit log:', error);
            // Don't fail the request if audit logging fails
          }
        });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

/**
 * Middleware to capture original data before updates
 * Use this before update operations to capture the "before" state
 * @param {function} getDataFn - Function to fetch original data (req => Promise<data>)
 */
exports.captureOriginalData = (getDataFn) => {
  return async (req, res, next) => {
    try {
      req.originalData = await getDataFn(req);
      next();
    } catch (error) {
      console.error('Error capturing original data:', error);
      // Continue even if we can't capture original data
      next();
    }
  };
};

/**
 * Audit log for bulk operations
 * @param {string} action - Action being performed
 * @param {string} resourceType - Type of resource
 * @param {function} getResourceIds - Function to extract array of resource IDs from request
 */
exports.auditBulkLog = (action, resourceType, getResourceIds) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          try {
            const resourceIds = getResourceIds(req, data);
            const isCritical = CRITICAL_ACTIONS.includes(action);

            // Create audit log entries for each resource
            const auditPromises = resourceIds.map(resourceId =>
              AuditLog.create({
                userId: req.user ? req.user.id : null,
                action,
                resourceType,
                resourceId,
                changes: { bulk: true, count: resourceIds.length },
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('user-agent'),
                isCritical
              })
            );

            await Promise.all(auditPromises);
          } catch (error) {
            console.error('Error creating bulk audit logs:', error);
          }
        });
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Helper function to manually create audit log entry
 * Use this for complex scenarios where middleware doesn't fit
 * @param {object} logData - Audit log data
 */
exports.createAuditLog = async (logData) => {
  try {
    const isCritical = CRITICAL_ACTIONS.includes(logData.action);
    
    await AuditLog.create({
      userId: logData.userId,
      action: logData.action,
      resourceType: logData.resourceType,
      resourceId: logData.resourceId,
      changes: logData.changes,
      ipAddress: logData.ipAddress,
      userAgent: logData.userAgent,
      isCritical
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw error;
  }
};

module.exports = exports;

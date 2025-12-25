const express = require('express');
const router = express.Router();
const { APIKey, APIKeyUsage, User } = require('../../models');
const { protectInternal, requireInternalPermissions } = require('../../middleware/internalAuth');
const { auditLog } = require('../../middleware/auditLog');
const { Op } = require('sequelize');

// All routes require authentication and platform_admin or superuser role
router.use(protectInternal);
router.use(requireInternalPermissions(['canManageSystemSettings']));

/**
 * @route   POST /api/internal/api-keys
 * @desc    Create a new API key
 * @access  Platform Admin, Superuser
 */
router.post('/', auditLog('create_api_key'), async (req, res) => {
  try {
    const { name, permissions, expiresAt, metadata } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'API key name is required'
      });
    }

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Permissions object is required'
      });
    }

    // Generate a secure API key
    const rawKey = APIKey.generateKey();
    const hashedKey = APIKey.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 8);

    // Create the API key
    const apiKey = await APIKey.create({
      name,
      key: hashedKey,
      keyPrefix,
      permissions,
      createdBy: req.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      metadata: metadata || {}
    });

    // Return the raw key only once (it won't be stored)
    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Only returned once!
        keyPrefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        warning: 'Save this key securely. It will not be shown again.'
      }
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create API key',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/internal/api-keys
 * @desc    Get all API keys
 * @access  Platform Admin, Superuser
 */
router.get('/', async (req, res) => {
  try {
    const { isActive, search, page = 1, limit = 20 } = req.query;

    const where = {};

    // Filter by active status
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Search by name or key prefix
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { keyPrefix: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: apiKeys } = await APIKey.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'revoker',
          attributes: ['id', 'name', 'email']
        }
      ],
      attributes: { exclude: ['key'] }, // Never return the hashed key
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        apiKeys,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API keys',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/internal/api-keys/:id
 * @desc    Get API key details
 * @access  Platform Admin, Superuser
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const apiKey = await APIKey.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'revoker',
          attributes: ['id', 'name', 'email']
        }
      ],
      attributes: { exclude: ['key'] }
    });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    res.json({
      success: true,
      data: apiKey
    });
  } catch (error) {
    console.error('Error fetching API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API key',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/internal/api-keys/:id
 * @desc    Update API key (name, permissions, expiration)
 * @access  Platform Admin, Superuser
 */
router.put('/:id', auditLog('update_api_key'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, permissions, expiresAt, metadata } = req.body;

    const apiKey = await APIKey.findByPk(id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    // Update fields
    if (name) apiKey.name = name;
    if (permissions) apiKey.permissions = permissions;
    if (expiresAt !== undefined) apiKey.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (metadata) apiKey.metadata = { ...apiKey.metadata, ...metadata };

    await apiKey.save();

    res.json({
      success: true,
      message: 'API key updated successfully',
      data: apiKey
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update API key',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/internal/api-keys/:id
 * @desc    Revoke an API key
 * @access  Platform Admin, Superuser
 */
router.delete('/:id', auditLog('revoke_api_key'), async (req, res) => {
  try {
    const { id } = req.params;

    const apiKey = await APIKey.findByPk(id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    // Mark as revoked instead of deleting
    apiKey.isActive = false;
    apiKey.revokedAt = new Date();
    apiKey.revokedBy = req.user.id;
    await apiKey.save();

    res.json({
      success: true,
      message: 'API key revoked successfully',
      data: {
        id: apiKey.id,
        name: apiKey.name,
        revokedAt: apiKey.revokedAt
      }
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke API key',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/internal/api-keys/:id/usage
 * @desc    Get API key usage statistics
 * @access  Platform Admin, Superuser
 */
router.get('/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const apiKey = await APIKey.findByPk(id);

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }

    const where = { apiKeyId: id };

    // Filter by date range
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get usage logs
    const { count, rows: usageLogs } = await APIKeyUsage.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // Get usage statistics
    const stats = await APIKeyUsage.findAll({
      where: { apiKeyId: id },
      attributes: [
        [APIKeyUsage.sequelize.fn('COUNT', '*'), 'totalRequests'],
        [APIKeyUsage.sequelize.fn('COUNT', APIKeyUsage.sequelize.literal('CASE WHEN "statusCode" >= 200 AND "statusCode" < 300 THEN 1 END')), 'successfulRequests'],
        [APIKeyUsage.sequelize.fn('COUNT', APIKeyUsage.sequelize.literal('CASE WHEN "statusCode" >= 400 THEN 1 END')), 'failedRequests'],
        [APIKeyUsage.sequelize.fn('AVG', APIKeyUsage.sequelize.col('responseTime')), 'avgResponseTime']
      ],
      raw: true
    });

    // Get endpoint breakdown
    const endpointStats = await APIKeyUsage.findAll({
      where: { apiKeyId: id },
      attributes: [
        'endpoint',
        'method',
        [APIKeyUsage.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['endpoint', 'method'],
      order: [[APIKeyUsage.sequelize.literal('count'), 'DESC']],
      limit: 10,
      raw: true
    });

    res.json({
      success: true,
      data: {
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          usageCount: apiKey.usageCount,
          lastUsedAt: apiKey.lastUsedAt
        },
        statistics: stats[0] || {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          avgResponseTime: 0
        },
        endpointBreakdown: endpointStats,
        recentUsage: usageLogs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching API key usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch API key usage',
      error: error.message
    });
  }
});

module.exports = router;

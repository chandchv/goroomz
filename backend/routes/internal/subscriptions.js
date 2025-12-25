const express = require('express');
const router = express.Router();
const { User, Subscription, Discount, BillingHistory } = require('../../models');
const { protectInternal, requireInternalPermissions } = require('../../middleware/internalAuth');
const { auditLog } = require('../../middleware/auditLog');
const { Op } = require('sequelize');

// GET /api/internal/subscriptions - Get all subscriptions
router.get('/', 
  protectInternal,
  requireInternalPermissions(['canManageSystemSettings', 'canAccessAllProperties']),
  auditLog,
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        planType, 
        search,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Filter by status
      if (status) {
        where.status = status;
      }

      // Filter by plan type
      if (planType) {
        where.planType = planType;
      }

      // Search by property owner name or email
      let userWhere = {};
      if (search) {
        userWhere = {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { email: { [Op.iLike]: `%${search}%` } }
          ]
        };
      }

      const subscriptions = await Subscription.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'propertyOwner',
            attributes: ['id', 'name', 'email', 'phone'],
            where: Object.keys(userWhere).length > 0 ? userWhere : undefined
          },
          {
            model: Discount,
            as: 'discount',
            attributes: ['id', 'code', 'name', 'type', 'value'],
            required: false
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        distinct: true
      });

      res.json({
        success: true,
        data: {
          subscriptions: subscriptions.rows,
          pagination: {
            total: subscriptions.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(subscriptions.count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscriptions',
        error: error.message
      });
    }
  }
);

// GET /api/internal/subscriptions/:ownerId - Get owner subscription
router.get('/:ownerId',
  protectInternal,
  requireInternalPermissions(['canManageSystemSettings', 'canAccessAllProperties']),
  auditLog,
  async (req, res) => {
    try {
      const { ownerId } = req.params;

      // Verify property owner exists
      const propertyOwner = await User.findByPk(ownerId);
      if (!propertyOwner) {
        return res.status(404).json({
          success: false,
          message: 'Property owner not found'
        });
      }

      const subscription = await Subscription.findOne({
        where: { propertyOwnerId: ownerId },
        include: [
          {
            model: User,
            as: 'propertyOwner',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: Discount,
            as: 'discount',
            attributes: ['id', 'code', 'name', 'type', 'value'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']]
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'No subscription found for this property owner'
        });
      }

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      console.error('Error fetching owner subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch subscription',
        error: error.message
      });
    }
  }
);

// PUT /api/internal/subscriptions/:id/upgrade - Upgrade subscription
router.put('/:id/upgrade',
  protectInternal,
  requireInternalPermissions(['canManageSystemSettings']),
  auditLog,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        newPlanType, 
        newAmount, 
        newFeatures, 
        upgradeDate = new Date(),
        billingCycle 
      } = req.body;

      // Validate required fields
      if (!newPlanType || !newAmount) {
        return res.status(400).json({
          success: false,
          message: 'New plan type and amount are required'
        });
      }

      const subscription = await Subscription.findByPk(id, {
        include: [
          {
            model: User,
            as: 'propertyOwner',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      if (subscription.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Can only upgrade active subscriptions'
        });
      }

      // Calculate proration
      const proratedAmount = subscription.calculateProration(newAmount, new Date(upgradeDate));
      
      // Store old values for audit
      const oldValues = {
        planType: subscription.planType,
        amount: subscription.amount,
        features: subscription.features,
        billingCycle: subscription.billingCycle
      };

      // Update subscription
      await subscription.update({
        planType: newPlanType,
        amount: newAmount,
        features: newFeatures || subscription.features,
        billingCycle: billingCycle || subscription.billingCycle,
        updatedBy: req.user.id
      });

      // Create billing history entry for upgrade
      if (proratedAmount > 0) {
        await BillingHistory.create({
          subscriptionId: subscription.id,
          propertyOwnerId: subscription.propertyOwnerId,
          invoiceNumber: BillingHistory.generateInvoiceNumber(),
          type: 'invoice',
          description: `Subscription upgrade from ${oldValues.planType} to ${newPlanType} (prorated)`,
          amount: proratedAmount,
          currency: subscription.currency,
          status: 'pending',
          totalAmount: proratedAmount,
          billingPeriodStart: new Date(upgradeDate),
          billingPeriodEnd: subscription.endDate,
          processedBy: req.user.id
        });
      }

      // Reload subscription with associations
      const updatedSubscription = await Subscription.findByPk(id, {
        include: [
          {
            model: User,
            as: 'propertyOwner',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: Discount,
            as: 'discount',
            required: false
          }
        ]
      });

      res.json({
        success: true,
        message: 'Subscription upgraded successfully',
        data: {
          subscription: updatedSubscription,
          proratedAmount,
          oldValues
        }
      });
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upgrade subscription',
        error: error.message
      });
    }
  }
);

// PUT /api/internal/subscriptions/:id/discount - Apply discount
router.put('/:id/discount',
  protectInternal,
  requireInternalPermissions(['canManageSystemSettings']),
  auditLog,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { discountCode, discountId } = req.body;

      if (!discountCode && !discountId) {
        return res.status(400).json({
          success: false,
          message: 'Either discount code or discount ID is required'
        });
      }

      const subscription = await Subscription.findByPk(id);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      // Find discount
      let discount;
      if (discountId) {
        discount = await Discount.findByPk(discountId);
      } else {
        discount = await Discount.findOne({ where: { code: discountCode } });
      }

      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Discount not found'
        });
      }

      // Validate discount
      if (!discount.isValid()) {
        return res.status(400).json({
          success: false,
          message: 'Discount is not valid or has expired'
        });
      }

      // Calculate discount amount
      const discountAmount = discount.calculateDiscount(subscription.amount, subscription.planType);
      
      if (discountAmount === 0) {
        return res.status(400).json({
          success: false,
          message: 'Discount is not applicable to this subscription'
        });
      }

      // Update subscription
      await subscription.update({
        discountId: discount.id,
        discountAmount,
        updatedBy: req.user.id
      });

      // Update discount usage count
      await discount.increment('usageCount');

      // Create billing history entry
      await BillingHistory.create({
        subscriptionId: subscription.id,
        propertyOwnerId: subscription.propertyOwnerId,
        invoiceNumber: BillingHistory.generateInvoiceNumber(),
        type: 'adjustment',
        description: `Discount applied: ${discount.name} (${discount.code})`,
        amount: -discountAmount,
        currency: subscription.currency,
        status: 'paid',
        totalAmount: -discountAmount,
        processedBy: req.user.id
      });

      // Reload subscription with associations
      const updatedSubscription = await Subscription.findByPk(id, {
        include: [
          {
            model: User,
            as: 'propertyOwner',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: Discount,
            as: 'discount'
          }
        ]
      });

      res.json({
        success: true,
        message: 'Discount applied successfully',
        data: {
          subscription: updatedSubscription,
          discountAmount
        }
      });
    } catch (error) {
      console.error('Error applying discount:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply discount',
        error: error.message
      });
    }
  }
);

// GET /api/internal/subscriptions/:id/billing-history - Get billing history
router.get('/:id/billing-history',
  protectInternal,
  requireInternalPermissions(['canManageSystemSettings', 'canAccessAllProperties']),
  auditLog,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        page = 1, 
        limit = 20, 
        type, 
        status,
        startDate,
        endDate
      } = req.query;

      const offset = (page - 1) * limit;

      // Verify subscription exists
      const subscription = await Subscription.findByPk(id);
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      const where = { subscriptionId: id };

      // Filter by type
      if (type) {
        where.type = type;
      }

      // Filter by status
      if (status) {
        where.status = status;
      }

      // Filter by date range
      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) {
          where.created_at[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.created_at[Op.lte] = new Date(endDate);
        }
      }

      const billingHistory = await BillingHistory.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'processor',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        data: {
          billingHistory: billingHistory.rows,
          pagination: {
            total: billingHistory.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(billingHistory.count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching billing history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch billing history',
        error: error.message
      });
    }
  }
);

module.exports = router;

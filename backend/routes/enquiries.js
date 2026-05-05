const express = require('express');
const router = express.Router();
const { Enquiry, Property, User, Notification } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');

/**
 * POST /api/enquiries
 * Submit an enquiry (public, no auth required)
 */
router.post('/', async (req, res) => {
  try {
    const { propertyId, name, phone, email, message, preferredDate } = req.body;

    // Validate required fields
    if (!propertyId || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Property ID, name, and phone are required.'
      });
    }

    // Verify property exists
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found.'
      });
    }

    // Create enquiry
    const enquiry = await Enquiry.create({
      propertyId,
      name,
      phone,
      email: email || null,
      message: message || null,
      preferredDate: preferredDate || null,
      status: 'new'
    });

    // Send notification to property owner
    if (property.ownerId) {
      try {
        await Notification.create({
          userId: property.ownerId,
          type: 'enquiry_received',
          title: 'New Enquiry Received',
          message: `${name} is interested in ${property.name}. Phone: ${phone}${email ? ', Email: ' + email : ''}`,
          data: {
            enquiryId: enquiry.id,
            propertyId: property.id,
            propertyName: property.name,
            visitorName: name,
            visitorPhone: phone,
            visitorEmail: email
          },
          priority: 'high',
          status: 'pending'
        });
      } catch (notifErr) {
        console.warn('Failed to create enquiry notification:', notifErr.message);
      }
    }

    // Also notify admins/superusers
    try {
      const admins = await User.findAll({
        where: { role: { [Op.in]: ['admin', 'superuser'] }, is_active: true },
        attributes: ['id']
      });
      for (const admin of admins) {
        if (admin.id !== property.ownerId) {
          await Notification.create({
            userId: admin.id,
            type: 'enquiry_received',
            title: 'New Property Enquiry',
            message: `${name} enquired about ${property.name}. Phone: ${phone}`,
            data: { enquiryId: enquiry.id, propertyId: property.id, propertyName: property.name },
            priority: 'normal',
            status: 'pending'
          }).catch(() => {});
        }
      }
    } catch (adminNotifErr) {
      console.warn('Failed to notify admins:', adminNotifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully. We will get back to you shortly.',
      data: enquiry
    });
  } catch (error) {
    console.error('Error creating enquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit enquiry.'
    });
  }
});

/**
 * GET /api/enquiries/my
 * Get all enquiries for the logged-in owner's properties
 */
router.get('/my', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get all properties owned by this user
    const ownerProperties = await Property.findAll({
      where: { ownerId: req.user.id },
      attributes: ['id']
    });

    const propertyIds = ownerProperties.map(p => p.id);

    if (propertyIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 }
      });
    }

    // Build where clause
    const where = { propertyId: { [Op.in]: propertyIds } };
    if (status && status !== 'all') {
      where.status = status;
    }

    const { count, rows: enquiries } = await Enquiry.findAndCountAll({
      where,
      include: [{ model: Property, as: 'property', attributes: ['id', 'name', 'slug'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: enquiries,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching owner enquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enquiries.'
    });
  }
});

/**
 * GET /api/enquiries/property/:propertyId
 * Get enquiries for a specific property (auth required, owner/admin)
 */
router.get('/property/:propertyId', protect, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Verify property exists and user has access
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    // Check ownership or admin
    if (property.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Build where clause
    const where = { propertyId };
    if (status && status !== 'all') {
      where.status = status;
    }

    const { count, rows: enquiries } = await Enquiry.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: enquiries,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching property enquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enquiries.'
    });
  }
});

/**
 * PUT /api/enquiries/:id/status
 * Update enquiry status (auth required, owner/admin)
 */
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['new', 'contacted', 'visited', 'converted', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const enquiry = await Enquiry.findByPk(id, {
      include: [{ model: Property, as: 'property', attributes: ['id', 'ownerId'] }]
    });

    if (!enquiry) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    // Check ownership or admin
    if (enquiry.property.ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Update enquiry
    const updateData = { status };
    if (notes) updateData.notes = notes;
    if (status === 'contacted' && !enquiry.respondedAt) {
      updateData.respondedAt = new Date();
      updateData.respondedBy = req.user.id;
    }

    await enquiry.update(updateData);

    res.json({
      success: true,
      message: `Enquiry status updated to ${status}.`,
      data: enquiry
    });
  } catch (error) {
    console.error('Error updating enquiry status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update enquiry status.'
    });
  }
});

/**
 * GET /api/enquiries/all
 * Get all enquiries (admin/superuser only)
 */
router.get('/all', protect, async (req, res) => {
  try {
    if (!['admin', 'superuser'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { status, page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status && status !== 'all') where.status = status;

    const { count, rows: enquiries } = await Enquiry.findAndCountAll({
      where,
      include: [{ model: Property, as: 'property', attributes: ['id', 'name', 'slug', 'type', 'location'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: enquiries,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all enquiries:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch enquiries.' });
  }
});

module.exports = router;

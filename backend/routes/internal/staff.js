const express = require('express');
const { authenticateUser, requireRoles } = require('../utils/authMiddleware');
const { Staff, User } = require('../../models');
const router = express.Router();

// @desc    Get all staff users
// @route   GET /api/internal/staff
// @access  Private
router.get('/internal/staff', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const { propertyId, role, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    try {
      const whereClause = { isActive: true };
      if (propertyId) whereClause.propertyId = propertyId;
      if (role) whereClause.role = role;

      const { count, rows: staffMembers } = await Staff.findAndCountAll({
        where: whereClause,
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: staffMembers,
        count: staffMembers.length,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      });
    } catch (dbError) {
      console.error('Database error fetching staff:', dbError);
      res.json({ success: true, data: [], count: 0, total: 0, page: 1, pages: 1 });
    }
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ success: false, message: 'Error fetching staff' });
  }
});

// @desc    Create a new staff user
// @route   POST /api/internal/staff
// @access  Private
router.post('/internal/staff', authenticateUser, requireRoles(['admin', 'category_owner', 'superuser', 'owner']), async (req, res) => {
  try {
    const { propertyId, role, permissions, salary, contactInfo } = req.body;

    try {
      const staffMember = await Staff.create({
        propertyId: propertyId || null,
        role: role || 'staff',
        permissions: permissions || {},
        salary: salary || null,
        contactInfo: contactInfo || {},
        isActive: true,
        joinedAt: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Staff member created successfully',
        data: staffMember
      });
    } catch (dbError) {
      console.error('Database error creating staff:', dbError);
      res.status(500).json({ success: false, message: 'Error creating staff member' });
    }
  } catch (error) {
    console.error('Error creating staff user:', error);
    res.status(500).json({ success: false, message: 'Error creating staff user' });
  }
});

module.exports = router;

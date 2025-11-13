const express = require('express');
const { User } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const { 
  validateObjectId, 
  validatePagination,
  handleValidationErrors 
} = require('../middleware/validation');
const { Op } = require('sequelize');
const { updateProfile, firebaseSignIn } = require('../controllers/userController');

const router = express.Router();

// @desc    Handle Firebase Sign-In (Google, Phone, Email)
// @route   POST /api/users/firebase-signin
// @access  Public
router.post('/firebase-signin', firebaseSignIn);

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, updateProfile);

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), validatePagination, handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let whereClause = {};
    
    if (req.query.role) {
      whereClause.role = req.query.role;
    }
    
    if (req.query.search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { email: { [Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password', 'verificationToken', 'passwordResetToken', 'passwordResetExpires'] },
          order: [['created_at', 'DESC']],
      offset,
      limit
    });

    res.json({
      success: true,
      count: users.length,
      total: count,
      page,
      pages: Math.ceil(count / limit),
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    let user;
    let attributes;

    // Users can view their own profile, admins can view any profile
    if (req.params.id === req.user.id || req.user.role === 'admin') {
      attributes = { exclude: ['password', 'verificationToken', 'passwordResetToken', 'passwordResetExpires'] };
    } else {
      // For other users, only show basic info
      attributes = ['id', 'name', 'email', 'avatar', 'role'];
    }

    user = await User.findByPk(req.params.id, { attributes });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

// @desc    Update user role (Admin only)
// @route   PUT /api/users/:id/role
// @access  Private (Admin)
router.put('/:id/role', protect, authorize('admin'), validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const { role } = req.body;

    const validRoles = ['user', 'owner', 'category_owner', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // Prevent admin from changing their own role
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ role });

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user role'
    });
  }
});

// @desc    Deactivate user (Admin only)
// @route   PUT /api/users/:id/deactivate
// @access  Private (Admin)
router.put('/:id/deactivate', protect, authorize('admin'), validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    // Prevent admin from deactivating themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ isActive: false });

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: user
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating user'
    });
  }
});

// @desc    Activate user (Admin only)
// @route   PUT /api/users/:id/activate
// @access  Private (Admin)
router.put('/:id/activate', protect, authorize('admin'), validateObjectId('id'), handleValidationErrors, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ isActive: true });

    res.json({
      success: true,
      message: 'User activated successfully',
      data: user
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating user'
    });
  }
});

// @desc    Get user statistics (Admin only)
// @route   GET /api/users/stats/overview
// @access  Private (Admin)
router.get('/stats/overview', protect, authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalOwners = await User.count({ where: { role: 'owner' } });
    const totalCategoryOwners = await User.count({ where: { role: 'category_owner' } });
    const totalAdmins = await User.count({ where: { role: 'admin' } });
    const verifiedUsers = await User.count({ where: { isVerified: true } });
    const recentUsers = await User.count({
      where: {
            created_at: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      }
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalOwners,
        totalCategoryOwners,
        totalAdmins,
        verifiedUsers,
        recentUsers
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user statistics'
    });
  }
});

// @desc    Category owner signup
// @route   POST /api/users/category-owner-signup
// @access  Public
router.post('/category-owner-signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create category owner user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'category_owner',
      isVerified: false // Can be auto-verified later if needed
    });

    res.status(201).json({
      success: true,
      message: 'Category owner account created successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Category owner signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating category owner account'
    });
  }
});

module.exports = router;

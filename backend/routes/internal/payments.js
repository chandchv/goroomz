/**
 * Payment and Deposit Routes for Internal Management System
 * 
 * This module handles all payment and security deposit related endpoints
 * for the internal management system.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticateUser, requireRoles } = require('../utils/authMiddleware');
const User = require('../../models/User');
const Booking = require('../../models/Booking');
const { Payment, Deposit } = require('../../models');
const { Op } = require('sequelize');

const router = express.Router();

// ============================================
// PAYMENT ROUTES
// ============================================

// @desc    Get all payments with filters
// @route   GET /api/internal/payments
// @access  Private
router.get('/internal/payments', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { status, paymentType, startDate, endDate, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    try {
      const whereClause = {};
      if (status) whereClause.status = status;
      if (paymentType) whereClause.paymentType = paymentType;
      if (startDate) whereClause.paymentDate = { [Op.gte]: new Date(startDate) };
      if (endDate) {
        whereClause.paymentDate = whereClause.paymentDate || {};
        whereClause.paymentDate[Op.lte] = new Date(endDate);
      }

      const { count, rows: payments } = await Payment.findAndCountAll({
        where: whereClause,
        include: [
          { model: Booking, as: 'booking', attributes: ['id', 'checkIn', 'checkOut'], required: false }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: payments,
        count: payments.length,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      });
    } catch (dbError) {
      console.error('Database error fetching payments:', dbError);
      res.json({ success: true, data: [], count: 0, total: 0, page: 1, pages: 1 });
    }
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: 'Error fetching payments' });
  }
});

// @desc    Get overdue payments
// @route   GET /api/internal/payments/overdue
// @access  Private
router.get('/internal/payments/overdue', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { propertyId } = req.query;

    try {
      const whereClause = {
        status: 'overdue',
        dueDate: { [Op.lt]: new Date() }
      };
      if (propertyId) whereClause.propertyId = propertyId;

      const overduePayments = await Payment.findAll({
        where: whereClause,
        include: [
          { model: Booking, as: 'booking', attributes: ['id', 'checkIn', 'checkOut'] },
          { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
        ],
        order: [['dueDate', 'ASC']]
      });

      res.json({
        success: true,
        data: overduePayments,
        count: overduePayments.length
      });
    } catch (dbError) {
      console.error('Database error fetching overdue payments:', dbError);
      res.json({ success: true, data: [], count: 0 });
    }
  } catch (error) {
    console.error('Error fetching overdue payments:', error);
    res.status(500).json({ success: false, message: 'Error fetching overdue payments' });
  }
});

// @desc    Record a new payment
// @route   POST /api/internal/payments
// @access  Private
router.post('/internal/payments', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { bookingId, amount, paymentMethod, transactionReference, paymentType, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    // Map frontend payment types to database enum values
    const validPaymentTypes = ['booking', 'monthly_rent', 'security_deposit'];
    const mappedPaymentType = paymentType === 'rent' ? 'monthly_rent' : 
                              validPaymentTypes.includes(paymentType) ? paymentType : 'booking';

    try {
      const payment = await Payment.create({
        bookingId: bookingId || null,
        amount,
        paymentMethod: paymentMethod || 'cash',
        transactionReference,
        paymentType: mappedPaymentType,
        status: 'completed',
        paymentDate: new Date(),
        recordedBy: user.id,
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        data: payment
      });
    } catch (dbError) {
      console.error('Database error recording payment:', dbError);
      res.status(500).json({ success: false, message: 'Error recording payment' });
    }
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ success: false, message: 'Error recording payment' });
  }
});

// ============================================
// DEPOSIT ROUTES
// ============================================

// @desc    Get all security deposits
// @route   GET /api/internal/deposits
// @access  Private
router.get('/internal/deposits', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const allowedRoles = ['admin', 'category_owner', 'superuser', 'owner'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    try {
      const whereClause = {};
      if (status) whereClause.status = status;

      const { count, rows: deposits } = await Deposit.findAndCountAll({
        where: whereClause,
        include: [
          { model: Booking, as: 'booking', attributes: ['id', 'checkIn', 'checkOut'], required: false }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: deposits,
        count: deposits.length,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      });
    } catch (dbError) {
      console.error('Database error fetching deposits:', dbError);
      res.json({ success: true, data: [], count: 0, total: 0, page: 1, pages: 1 });
    }
  } catch (error) {
    console.error('Error fetching deposits:', error);
    res.status(500).json({ success: false, message: 'Error fetching deposits' });
  }
});

// @desc    Record a security deposit
// @route   POST /api/internal/deposits
// @access  Private
router.post('/internal/deposits', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { bookingId, amount, paymentMethod, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    try {
      const deposit = await Deposit.create({
        bookingId: bookingId || null,
        amount,
        paymentMethod: paymentMethod || 'cash',
        status: 'held',
        collectedDate: new Date(),
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Security deposit recorded successfully',
        data: deposit
      });
    } catch (dbError) {
      console.error('Database error recording deposit:', dbError);
      res.status(500).json({ success: false, message: 'Error recording deposit' });
    }
  } catch (error) {
    console.error('Error recording deposit:', error);
    res.status(500).json({ success: false, message: 'Error recording deposit' });
  }
});

// @desc    Get deposit by booking ID
// @route   GET /api/internal/deposits/:bookingId
// @access  Private
router.get('/internal/deposits/:bookingId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { bookingId } = req.params;

    try {
      const deposit = await Deposit.findOne({
        where: { bookingId },
        include: [
          { model: Booking, as: 'booking', attributes: ['id', 'checkIn', 'checkOut'] },
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
        ]
      });

      res.json({
        success: true,
        data: deposit
      });
    } catch (dbError) {
      console.error('Database error fetching deposit:', dbError);
      res.json({ success: true, data: null });
    }
  } catch (error) {
    console.error('Error fetching deposit:', error);
    res.status(500).json({ success: false, message: 'Error fetching deposit' });
  }
});

module.exports = router;

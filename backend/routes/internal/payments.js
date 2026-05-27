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
const { Payment, Deposit, sequelize } = require('../../models');
const Room = require('../../models/Room');
const { Op } = require('sequelize');
const { listDeposits, getDepositByBookingId: fetchDepositByBookingId } = require('../utils/depositUtils');

const router = express.Router();

async function ensurePaymentsAndSchedulesBackfilled(sequelize) {
  try {
    // 1. Find all bookings that have paidAmount > 0 or are PG/monthly
    const [bookings] = await sequelize.query(`
      SELECT b.id, b.paid_amount, b.total_amount, b.check_in, b.check_out, b.actual_check_in_time, b.created_at, b.booking_type, b.contact_info, b.owner_id, b.room_id
      FROM bookings b
    `);

    for (const b of bookings) {
      try {
        const contactInfo = typeof b.contact_info === 'string' ? JSON.parse(b.contact_info) : b.contact_info || {};
        const paidVal = parseFloat(b.paid_amount) || 0;
        const totalVal = parseFloat(b.total_amount) || 0;
        const bookingType = b.booking_type || contactInfo.bookingType || 'daily';

        // A. Backfill completed Payment row if paidAmount > 0 and none exists
        if (paidVal > 0) {
          const [existing] = await sequelize.query(
            `SELECT id FROM payments WHERE booking_id = :bookingId AND status = 'completed' LIMIT 1`,
            { replacements: { bookingId: b.id }, type: sequelize.QueryTypes.SELECT }
          );

          if (!existing) {
            const payId = require('uuid').v4();
            await sequelize.query(`
              INSERT INTO payments (id, booking_id, amount, payment_method, status, payment_date, payment_type, recorded_by, created_at, updated_at)
              VALUES (:id, :bookingId, :amount, :paymentMethod, 'completed', :paymentDate, :paymentType, :recordedBy, :createdAt, NOW())
            `, {
              replacements: {
                id: payId,
                bookingId: b.id,
                amount: paidVal,
                paymentMethod: contactInfo.depositPaymentMethod || 'cash',
                paymentDate: b.actual_check_in_time || b.created_at,
                paymentType: bookingType === 'monthly' ? 'monthly_rent' : 'booking',
                recordedBy: b.owner_id || '15dc79c0-4629-4622-ae10-b771e1b6d706',
                createdAt: b.created_at
              }
            });
            console.log(`Backfilled payment of ₹${paidVal} for booking ${b.id}`);
          }
        }

        // B. Backfill Payment Schedule entries if booking is monthly/PG and none exist
        if (bookingType === 'monthly') {
          const [existingSchedules] = await sequelize.query(
            `SELECT id FROM payment_schedules WHERE booking_id = :bookingId LIMIT 1`,
            { replacements: { bookingId: b.id }, type: sequelize.QueryTypes.SELECT }
          );

          if (!existingSchedules) {
            // Generate monthly schedule entries
            const monthlyRate = totalVal || 9000;
            const checkInDate = new Date(b.check_in || b.created_at);
            const checkOutDate = new Date(b.check_out || new Date(checkInDate).setMonth(checkInDate.getMonth() + 3));
            
            let monthsCount = (checkOutDate.getFullYear() - checkInDate.getFullYear()) * 12 + (checkOutDate.getMonth() - checkInDate.getMonth());
            if (monthsCount <= 0) monthsCount = 1;
            if (monthsCount > 12) monthsCount = 12;
            
            let remainingPaid = paidVal;

            for (let i = 0; i < monthsCount; i++) {
              const dueDate = new Date(checkInDate);
              dueDate.setMonth(checkInDate.getMonth() + i);

              const scheduleId = require('uuid').v4();
              const schedAmount = monthlyRate;
              
              let schedStatus = 'pending';
              let schedPaidDate = null;
              let schedPaymentId = null;

              if (remainingPaid >= schedAmount) {
                schedStatus = 'paid';
                schedPaidDate = b.actual_check_in_time || b.created_at;
                remainingPaid -= schedAmount;
                
                const [completedPay] = await sequelize.query(
                  `SELECT id FROM payments WHERE booking_id = :bookingId AND status = 'completed' LIMIT 1`,
                  { replacements: { bookingId: b.id }, type: sequelize.QueryTypes.SELECT }
                );
                if (completedPay) {
                  schedPaymentId = completedPay.id;
                }
              } else if (dueDate < new Date()) {
                schedStatus = 'overdue';
              }

              await sequelize.query(`
                INSERT INTO payment_schedules (id, booking_id, due_date, amount, status, paid_date, payment_id, created_at, updated_at)
                VALUES (:id, :bookingId, :dueDate, :amount, :status, :paidDate, :paymentId, NOW(), NOW())
              `, {
                replacements: {
                  id: scheduleId,
                  bookingId: b.id,
                  dueDate: dueDate.toISOString().split('T')[0],
                  amount: schedAmount,
                  status: schedStatus,
                  paidDate: schedPaidDate,
                  paymentId: schedPaymentId
                }
              });
            }
            console.log(`Backfilled ${monthsCount} monthly payment schedules for booking ${b.id}`);
          }
        }
      } catch (err) {
        console.error(`Error backfilling payment/schedule for booking ${b.id}:`, err);
      }
    }
  } catch (err) {
    console.error('Error auto-backfilling payments and schedules:', err);
  }
}

// ============================================
// PAYMENT ROUTES
// ============================================

// @desc    Get all payments with filters
// @route   GET /api/internal/payments
// @access  Private
router.get('/internal/payments', async (req, res) => {
  try {
    await ensurePaymentsAndSchedulesBackfilled(sequelize);
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

    await ensurePaymentsAndSchedulesBackfilled(sequelize);

    try {
      let scopeSql = '';
      const replacements = {};
      if (propertyId) {
        scopeSql = `AND (
          b.property_id = :propertyId::uuid
          OR b.room_id IN (
            SELECT id FROM rooms
            WHERE property_details->>'propertyId' = :propertyId
               OR property_id::text = :propertyId
          )
        )`;
        replacements.propertyId = propertyId;
      }

      const rows = await sequelize.query(`
        SELECT 
          ps.id,
          ps.booking_id AS "bookingId",
          ps.bed_id AS "bedId",
          ps.due_date AS "dueDate",
          ps.amount,
          ps.status,
          EXTRACT(DAY FROM NOW() - ps.due_date::timestamp)::int AS "daysOverdue",
          b.check_in AS "checkIn",
          b.check_out AS "checkOut",
          b.total_amount AS "totalAmount",
          b.booking_source AS "bookingSource",
          b.contact_info AS "contactInfo",
          r.id AS "roomId",
          r.title AS "roomTitle",
          r.room_number AS "roomNumber",
          u.id AS "userId",
          u.name AS "userName",
          u.email AS "userEmail",
          u.phone AS "userPhone"
        FROM payment_schedules ps
        INNER JOIN bookings b ON ps.booking_id = b.id
        LEFT JOIN rooms r ON b.room_id = r.id
        LEFT JOIN users u ON b.user_id = u.id
        WHERE (ps.status = 'overdue' OR (ps.status = 'pending' AND ps.due_date < CURRENT_DATE))
        ${scopeSql}
        ORDER BY ps.due_date ASC
      `, { replacements, type: sequelize.QueryTypes.SELECT });

      const overdueData = rows.map(row => {
        let contactInfo = row.contactInfo || {};
        if (typeof contactInfo === 'string') {
          try {
            contactInfo = JSON.parse(contactInfo);
          } catch (e) {
            contactInfo = {};
          }
        }

        const roomNumber = row.roomNumber || (row.roomTitle || '').replace('Room ', '') || 'N/A';
        const floorNumber = Math.floor(parseInt(roomNumber) / 100) || 1;
        
        return {
          id: row.id,
          bookingId: row.bookingId,
          bedId: row.bedId,
          dueDate: row.dueDate,
          amount: parseFloat(row.amount) || 0,
          status: row.status,
          daysOverdue: Math.max(0, row.daysOverdue || 0),
          booking: {
            id: row.bookingId,
            checkIn: row.checkIn,
            checkOut: row.checkOut,
            totalAmount: parseFloat(row.totalAmount) || 0,
            bookingSource: row.bookingSource || 'offline',
            room: {
              id: row.roomId,
              title: row.roomTitle,
              roomNumber,
              floorNumber,
            },
            user: {
              id: row.userId,
              name: contactInfo.name || row.userName || 'Guest',
              email: contactInfo.email || row.userEmail || '',
              phone: contactInfo.phone || row.userPhone || '',
            }
          }
        };
      });

      res.json({
        success: true,
        data: overdueData,
        count: overdueData.length
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

      // Update Booking paid amount and payment status
      if (bookingId) {
        const booking = await Booking.findByPk(bookingId);
        if (booking) {
          const newPaidAmount = (parseFloat(booking.paidAmount) || 0) + parseFloat(amount);
          booking.paidAmount = newPaidAmount;
          
          if (newPaidAmount >= parseFloat(booking.totalAmount)) {
            booking.paymentStatus = 'paid';
          } else {
            booking.paymentStatus = 'pending';
          }
          await booking.save();

          // If booking is monthly/PG or payment is monthly rent, update the schedules
          if (booking.bookingType === 'monthly' || mappedPaymentType === 'monthly_rent') {
            const schedules = await sequelize.query(`
              SELECT id, amount, status FROM payment_schedules
              WHERE booking_id = :bookingId AND status IN ('pending', 'overdue')
              ORDER BY due_date ASC
            `, {
              replacements: { bookingId: booking.id },
              type: sequelize.QueryTypes.SELECT
            });

            let remainingAmount = parseFloat(amount);
            for (const sched of schedules) {
              if (remainingAmount <= 0) break;
              const schedAmount = parseFloat(sched.amount) || 0;
              
              await sequelize.query(`
                UPDATE payment_schedules
                SET status = 'paid', paid_date = NOW(), payment_id = :paymentId, updated_at = NOW()
                WHERE id = :scheduleId
              `, {
                replacements: { paymentId: payment.id, scheduleId: sched.id }
              });
              remainingAmount -= schedAmount;
            }
          }
        }
      }

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

// @desc    Get payment schedule for a booking
// @route   GET /api/internal/payments/schedule/:bookingId
// @access  Private
router.get('/internal/payments/schedule/:bookingId', async (req, res) => {
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

    const { bookingId } = req.params;
    
    await ensurePaymentsAndSchedulesBackfilled(sequelize);

    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Room, as: 'room', attributes: ['id', 'title', 'roomNumber'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const roomNumber = booking.room?.roomNumber || booking.room?.title?.replace('Room ', '') || 'N/A';
    const floorNumber = Math.floor(parseInt(roomNumber) / 100) || 1;

    const schedules = await sequelize.query(`
      SELECT 
        ps.id,
        ps.booking_id AS "bookingId",
        ps.bed_id AS "bedId",
        ps.due_date AS "dueDate",
        ps.amount,
        ps.status,
        ps.paid_date AS "paidDate",
        ps.payment_id AS "paymentId",
        p.payment_method AS "paymentMethod",
        p.transaction_reference AS "transactionReference"
      FROM payment_schedules ps
      LEFT JOIN payments p ON ps.payment_id = p.id
      WHERE ps.booking_id = :bookingId
      ORDER BY ps.due_date ASC
    `, {
      replacements: { bookingId },
      type: sequelize.QueryTypes.SELECT
    });

    const transformedSchedules = schedules.map(s => ({
      id: s.id,
      bookingId: s.bookingId,
      bedId: s.bedId,
      dueDate: s.dueDate,
      amount: parseFloat(s.amount) || 0,
      status: s.status,
      paidDate: s.paidDate,
      paymentId: s.paymentId,
      payment: s.paymentId ? {
        id: s.paymentId,
        amount: parseFloat(s.amount) || 0,
        paymentDate: s.paidDate,
        paymentMethod: s.paymentMethod || 'cash',
        transactionReference: s.transactionReference || undefined
      } : null
    }));

    res.json({
      success: true,
      booking: {
        id: booking.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalAmount: parseFloat(booking.totalAmount) || 0,
        room: {
          id: booking.roomId,
          title: booking.room?.title || '',
          roomNumber,
          floorNumber
        },
        user: {
          id: booking.userId,
          name: booking.user?.name || 'Guest',
          email: booking.user?.email || '',
          phone: booking.user?.phone || ''
        }
      },
      count: transformedSchedules.length,
      data: transformedSchedules
    });
  } catch (error) {
    console.error('Error fetching payment schedule:', error);
    res.status(500).json({ success: false, message: 'Error fetching payment schedule' });
  }
});

// @desc    Create payment schedule on check-in (for PG)
// @route   POST /api/internal/payments/schedule
// @access  Private
router.post('/internal/payments/schedule', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const { bookingId, monthlyAmount, numberOfMonths, startDate } = req.body;
    
    if (!bookingId || !monthlyAmount || !numberOfMonths) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    const start = startDate ? new Date(startDate) : new Date();

    const schedulesCreated = [];
    for (let i = 0; i < numberOfMonths; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(start.getMonth() + i);

      const id = require('uuid').v4();
      const status = dueDate < new Date() ? 'overdue' : 'pending';

      await sequelize.query(`
        INSERT INTO payment_schedules (id, booking_id, due_date, amount, status, created_at, updated_at)
        VALUES (:id, :bookingId, :dueDate, :amount, :status, NOW(), NOW())
      `, {
        replacements: {
          id,
          bookingId,
          dueDate: dueDate.toISOString().split('T')[0],
          amount: parseFloat(monthlyAmount),
          status
        }
      });
      
      schedulesCreated.push({
        id,
        bookingId,
        dueDate: dueDate.toISOString().split('T')[0],
        amount: parseFloat(monthlyAmount),
        status
      });
    }

    res.status(201).json({
      success: true,
      message: 'Payment schedule created successfully',
      data: schedulesCreated
    });
  } catch (error) {
    console.error('Error creating payment schedule:', error);
    res.status(500).json({ success: false, message: 'Error creating payment schedule' });
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

    const { status, paymentMethod, search, propertyId, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    if (propertyId && user.role === 'owner') {
      const [propCheck] = await sequelize.query(
        `SELECT id FROM properties WHERE id = :propertyId AND owner_id = :ownerId`,
        {
          replacements: { propertyId, ownerId: user.id },
          type: sequelize.QueryTypes.SELECT,
        }
      );
      if (!propCheck) {
        return res.status(403).json({ success: false, message: 'Access denied to this property' });
      }
    }

    try {
      const { rows, total, tableName } = await listDeposits(sequelize, {
        propertyId: propertyId || undefined,
        ownerId: !propertyId && user.role === 'owner' ? user.id : undefined,
        status: status || undefined,
        paymentMethod: paymentMethod || undefined,
        search: search || undefined,
        limit: limitNum,
        offset,
      });

      if (!tableName) {
        return res.json({
          success: true,
          data: [],
          count: 0,
          total: 0,
          page: pageNum,
          pages: 0,
          message: 'Deposits table not found',
        });
      }

      res.json({
        success: true,
        data: rows,
        count: rows.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 0,
      });
    } catch (dbError) {
      console.error('Database error fetching deposits:', dbError);
      res.status(500).json({
        success: false,
        message: dbError.message || 'Error fetching deposits',
        data: [],
        count: 0,
        total: 0,
        page: pageNum,
        pages: 0,
      });
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
      const deposit = await fetchDepositByBookingId(sequelize, bookingId);

      res.json({
        success: true,
        data: deposit,
      });
    } catch (dbError) {
      console.error('Database error fetching deposit:', dbError);
      res.status(500).json({ success: false, message: dbError.message || 'Error fetching deposit', data: null });
    }
  } catch (error) {
    console.error('Error fetching deposit:', error);
    res.status(500).json({ success: false, message: 'Error fetching deposit' });
  }
});

module.exports = router;

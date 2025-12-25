const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`, req.headers.authorization ? 'with auth' : 'no auth');
  next();
});

// Mock authentication endpoints
app.post('/api/internal/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('🔐 Login attempt:', email);
  
  // Mock successful login for any credentials
  const mockUser = {
    id: 'user-admin-123',
    name: 'Test Admin',
    email: email,
    role: 'admin',
    internalRole: 'property_manager',
    internalPermissions: {
      canManageBookings: true,
      canCheckIn: true,
      canCheckOut: true,
      canRecordPayments: true,
      canManageRooms: true,
      canViewReports: true
    }
  };
  
  const mockToken = 'mock-jwt-token-' + Date.now();
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: mockUser,
      token: mockToken
    }
  });
});

app.post('/api/internal/auth/logout', (req, res) => {
  console.log('🚪 Logout request');
  
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

app.get('/api/internal/auth/me', (req, res) => {
  console.log('👤 Get current user request');
  
  // Return mock user data
  const mockUser = {
    id: 'user-admin-123',
    name: 'Test Admin',
    email: 'admin@test.com',
    role: 'admin',
    internalRole: 'property_manager',
    internalPermissions: {
      canManageBookings: true,
      canCheckIn: true,
      canCheckOut: true,
      canRecordPayments: true,
      canManageRooms: true,
      canViewReports: true
    }
  };
  
  res.json({
    success: true,
    data: mockUser
  });
});

// Mock occupied bookings for the checkout page
const mockOccupiedBookings = [
  {
    id: '17acc13e-94a8-47ab-9fbc-ba7db058d065',
    status: 'confirmed',
    checkIn: '2025-12-20',
    checkOut: '2025-12-25',
    totalAmount: 9000,
    actualCheckInTime: '2025-12-20T14:30:00.000Z',
    actualCheckOutTime: null,
    user: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+91 9876543210'
    },
    room: {
      id: 'room-123',
      roomNumber: '208',
      floorNumber: 2,
      currentStatus: 'occupied'
    },
    securityDeposit: {
      id: 'deposit-123',
      amount: 4500,
      status: 'collected',
      paymentMethod: 'cash',
      collectedDate: '2025-12-20',
      notes: 'Security deposit collected at booking'
    }
  },
  {
    id: '22bcc13e-94a8-47ab-9fbc-ba7db058d066',
    status: 'confirmed',
    checkIn: '2025-12-21',
    checkOut: '2025-12-26',
    totalAmount: 12000,
    actualCheckInTime: '2025-12-21T16:00:00.000Z',
    actualCheckOutTime: null,
    user: {
      id: 'user-124',
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+91 9876543211'
    },
    room: {
      id: 'room-124',
      roomNumber: '301',
      floorNumber: 3,
      currentStatus: 'occupied'
    },
    securityDeposit: {
      id: 'deposit-124',
      amount: 5000,
      status: 'collected',
      paymentMethod: 'card',
      collectedDate: '2025-12-21',
      notes: 'Security deposit collected via card'
    }
  },
  {
    id: '33ccc13e-94a8-47ab-9fbc-ba7db058d067',
    status: 'confirmed',
    checkIn: '2025-12-22',
    checkOut: '2025-12-27',
    totalAmount: 8500,
    actualCheckInTime: '2025-12-22T10:15:00.000Z',
    actualCheckOutTime: null,
    user: {
      id: 'user-125',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      phone: '+91 9876543212'
    },
    room: {
      id: 'room-125',
      roomNumber: '105',
      floorNumber: 1,
      currentStatus: 'occupied'
    }
  }
];

// Mock bookings endpoint - return occupied bookings
app.get('/api/internal/bookings', (req, res) => {
  const { status, limit } = req.query;
  
  console.log('📋 Get bookings request:', { status, limit });
  
  // Always return our predefined mock bookings for consistency
  let filteredBookings = mockOccupiedBookings;
  
  if (status === 'confirmed') {
    filteredBookings = mockOccupiedBookings.filter(booking => 
      booking.status === 'confirmed' && 
      booking.actualCheckInTime && 
      !booking.actualCheckOutTime
    );
  }
  
  console.log('📋 Returning', filteredBookings.length, 'occupied bookings');
  
  res.json({
    success: true,
    count: filteredBookings.length,
    total: filteredBookings.length,
    page: 1,
    pages: 1,
    data: filteredBookings
  });
});

// Mock booking by ID endpoint - handle any booking ID dynamically
app.get('/api/internal/bookings/:id', (req, res) => {
  const { id } = req.params;
  
  console.log('🔍 Get booking by ID:', id);
  console.log('🔍 Request headers:', req.headers);
  
  // First check if it's one of our predefined bookings
  let booking = mockOccupiedBookings.find(b => b.id === id);
  
  if (!booking) {
    // Generate a dynamic booking for any ID
    const roomNumbers = ['101', '102', '103', '201', '202', '203', '301', '302', '303'];
    const guestNames = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'David Brown', 'Lisa Davis'];
    const phones = ['+91 9876543210', '+91 9876543211', '+91 9876543212', '+91 9876543213', '+91 9876543214', '+91 9876543215'];
    
    const randomIndex = Math.floor(Math.random() * 6);
    const roomNumber = roomNumbers[Math.floor(Math.random() * roomNumbers.length)];
    const floorNumber = Math.ceil(parseInt(roomNumber) / 100);
    
    booking = {
      id: id,
      status: 'confirmed',
      checkIn: '2025-12-20',
      checkOut: '2025-12-25',
      totalAmount: 8000 + Math.floor(Math.random() * 4000), // Random amount between 8000-12000
      actualCheckInTime: '2025-12-20T14:30:00.000Z',
      actualCheckOutTime: null,
      user: {
        id: `user-${randomIndex}`,
        name: guestNames[randomIndex],
        email: `${guestNames[randomIndex].toLowerCase().replace(' ', '.')}@example.com`,
        phone: phones[randomIndex]
      },
      room: {
        id: `room-${randomIndex}`,
        roomNumber: roomNumber,
        floorNumber: floorNumber,
        currentStatus: 'occupied'
      },
      securityDeposit: Math.random() > 0.3 ? {
        id: `deposit-${randomIndex}`,
        amount: 4000 + Math.floor(Math.random() * 2000), // Random deposit 4000-6000
        status: 'collected',
        paymentMethod: Math.random() > 0.5 ? 'cash' : 'card',
        collectedDate: '2025-12-20',
        notes: 'Security deposit collected at booking'
      } : null
    };
    
    console.log('🎲 Generated dynamic booking for ID:', id, 'Room:', roomNumber, 'Guest:', booking.user.name);
  }
  
  console.log('✅ Sending booking response:', { success: true, data: booking });
  
  res.json({
    success: true,
    data: booking
  });
});

// Mock check-out endpoint
app.post('/api/internal/bookings/:id/checkout', (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  
  console.log('🚪 Check-out request:', { id, notes });
  
  // Find the booking
  const booking = mockOccupiedBookings.find(b => b.id === id);
  
  if (!booking) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }
  
  // Simulate successful check-out
  const updatedBooking = {
    ...booking,
    status: 'completed',
    actualCheckOutTime: new Date().toISOString()
  };
  
  res.json({
    success: true,
    message: 'Check-out completed successfully',
    data: updatedBooking
  });
});

// Mock deposit endpoints
app.get('/api/internal/deposits/:bookingId', (req, res) => {
  const { bookingId } = req.params;
  
  console.log('💰 Get deposit for booking:', bookingId);
  
  // Find the booking and return its deposit
  const booking = mockOccupiedBookings.find(b => b.id === bookingId);
  
  if (!booking || !booking.securityDeposit) {
    return res.status(404).json({
      success: false,
      message: 'Security deposit not found for this booking'
    });
  }
  
  res.json({
    success: true,
    data: booking.securityDeposit
  });
});

app.put('/api/internal/deposits/:id/refund', (req, res) => {
  const { id } = req.params;
  const { deductions, notes } = req.body;
  
  console.log('💸 Refund deposit:', { id, deductions, notes });
  
  // Simulate successful refund
  res.json({
    success: true,
    message: 'Security deposit refund processed successfully',
    data: {
      id: id,
      status: 'refunded',
      refundAmount: 4000, // Example refund amount
      refundDate: new Date().toISOString()
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📱 Environment: test`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Mock occupied bookings: ${mockOccupiedBookings.length} available`);
});
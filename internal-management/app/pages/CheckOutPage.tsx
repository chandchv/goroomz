import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { bookingService, type Booking } from '../services/bookingService';
import { depositService, type SecurityDeposit } from '../services/depositService';

// Receipt data interface for type safety
interface ReceiptData {
  receiptNumber: string;
  generatedAt: string;
  propertyName: string;
  propertyAddress: string;
  booking: {
    bookingNumber: string;
    checkIn: string;
    checkOut: string;
    actualCheckInTime?: string;
    actualCheckOutTime: string;
    duration: number;
  };
  guest: {
    name: string;
    phone: string;
    email?: string;
  };
  room: {
    roomNumber: string;
    floorNumber: number;
    type?: string;
  };
  charges: {
    roomCharges: number;
    additionalCharges: number;
    totalCharges: number;
    paidAmount: number;
    outstandingBalance: number;
  };
  deposit: {
    originalAmount: number;
    totalDeductions: number;
    deductions: Array<{ reason: string; amount: number }>;
    refundAmount: number;
    refundMethod: string;
  } | null;
  notes?: string;
}

export default function CheckOutPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'id' | 'name'>('id');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [deposit, setDeposit] = useState<SecurityDeposit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Occupied rooms list
  const [occupiedRooms, setOccupiedRooms] = useState<Booking[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [showOccupiedRooms, setShowOccupiedRooms] = useState(true);

  // Form state - Room Inspection (Task 12.1)
  const [roomInspected, setRoomInspected] = useState(false);
  const [inspectionItems, setInspectionItems] = useState({
    furnitureCondition: false,
    noDamage: false,
    keysReturned: false,
    roomReady: false,
  });
  
  // Deductions state (Task 12.2)
  const [deductions, setDeductions] = useState<Array<{ reason: string; amount: string }>>([]);
  const [notes, setNotes] = useState('');

  // Calculated values
  const [finalCharges, setFinalCharges] = useState(0);
  const [depositRefundAmount, setDepositRefundAmount] = useState(0);
  const [totalDeductions, setTotalDeductions] = useState(0);

  // Popup state for inspection reminder
  const [showInspectionReminder, setShowInspectionReminder] = useState(false);
  
  // Receipt modal state (Task 12.3)
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  
  // Ref for inspection section
  const inspectionRef = useRef<HTMLDivElement>(null);

  // Update roomInspected when all inspection items are checked
  useEffect(() => {
    const allChecked = Object.values(inspectionItems).every(item => item);
    setRoomInspected(allChecked);
  }, [inspectionItems]);

  useEffect(() => {
    if (booking) {
      setFinalCharges(booking.totalAmount);
    }
  }, [booking]);

  useEffect(() => {
    if (deposit) {
      const total = deductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
      setTotalDeductions(total);
      setDepositRefundAmount(Math.max(0, deposit.amount - total));
    }
  }, [deposit, deductions]);

  useEffect(() => {
    loadOccupiedRooms();
  }, []);

  const loadOccupiedRooms = async () => {
    setLoadingRooms(true);
    try {
      const response = await bookingService.getBookings({
        status: 'confirmed',
        limit: 100,
      });

      const occupied = response.data.filter(booking => 
        booking.actualCheckInTime && !booking.actualCheckOutTime
      );

      setOccupiedRooms(occupied);
    } catch (err) {
      console.error('Failed to load occupied rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSelectOccupiedRoom = async (selectedBooking: Booking) => {
    setLoading(true);
    setError(null);
    
    try {
      const fullBooking = await bookingService.getBookingById(selectedBooking.id);
      setBooking(fullBooking);

      if (fullBooking.securityDepositId) {
        try {
          const depositData = await depositService.getDepositByBookingId(fullBooking.id);
          if (depositData) {
            setDeposit(depositData);
          }
        } catch (err) {
          console.error('Failed to fetch deposit:', err);
        }
      }

      setShowOccupiedRooms(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a booking ID or guest name');
      return;
    }

    setLoading(true);
    setError(null);
    setBooking(null);
    setDeposit(null);

    try {
      let foundBooking: Booking | null = null;

      if (searchType === 'id') {
        foundBooking = await bookingService.getBookingById(searchQuery.trim());
      } else {
        const response = await bookingService.getBookings({
          search: searchQuery.trim(),
          status: 'confirmed',
          limit: 10,
        });

        if (response.data.length === 0) {
          setError('No active bookings found for this guest name');
        } else if (response.data.length === 1) {
          foundBooking = response.data[0];
        } else {
          setError(`Found ${response.data.length} bookings. Please use booking ID for specific selection.`);
        }
      }

      if (foundBooking) {
        setBooking(foundBooking);

        if (foundBooking.securityDepositId) {
          try {
            const depositData = await depositService.getDepositByBookingId(foundBooking.id);
            if (depositData) {
              setDeposit(depositData);
            }
          } catch (err) {
            console.error('Failed to fetch deposit:', err);
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to find booking');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeduction = () => {
    setDeductions([...deductions, { reason: '', amount: '' }]);
  };

  const handleRemoveDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const handleDeductionChange = (index: number, field: 'reason' | 'amount', value: string) => {
    const updated = [...deductions];
    updated[index][field] = value;
    setDeductions(updated);
  };

  // Handle inspection item toggle
  const handleInspectionItemChange = (item: keyof typeof inspectionItems) => {
    setInspectionItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const handleCheckOut = async () => {
    if (!booking) return;

    if (!roomInspected) {
      setShowInspectionReminder(true);
      return;
    }

    // Validate deductions
    for (const deduction of deductions) {
      if (deduction.reason && !deduction.amount) {
        setError('Please enter amount for all deductions');
        return;
      }
      if (deduction.amount && !deduction.reason) {
        setError('Please enter reason for all deductions');
        return;
      }
    }

    setProcessing(true);
    setError(null);

    try {
      let refundResult = null;
      
      // Process deposit refund if exists
      if (deposit && deposit.status === 'collected') {
        const validDeductions = deductions.filter(d => d.reason && d.amount);
        if (validDeductions.length > 0 || depositRefundAmount < deposit.amount) {
          refundResult = await depositService.refundDeposit(deposit.id, {
            deductions: validDeductions.map(d => ({
              reason: d.reason,
              amount: parseFloat(d.amount),
            })),
            notes: notes,
          });
        } else {
          refundResult = await depositService.refundDeposit(deposit.id, {
            notes: notes,
          });
        }
      }

      // Process check-out
      await bookingService.checkOut(booking.id, {
        notes,
      });

      // Prepare receipt data (Task 12.3)
      const receipt: ReceiptData = {
        receiptNumber: `RCP-${booking.id.substring(0, 8).toUpperCase()}`,
        generatedAt: new Date().toISOString(),
        propertyName: 'GoRoomz Property',
        propertyAddress: 'Property Address',
        booking: {
          bookingNumber: booking.id,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          actualCheckInTime: booking.actualCheckInTime,
          actualCheckOutTime: new Date().toISOString(),
          duration: Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)),
        },
        guest: {
          name: booking.user?.name || booking.contactInfo?.name || 'Guest',
          phone: booking.user?.phone || booking.contactInfo?.phone || 'N/A',
          email: booking.user?.email || booking.contactInfo?.email,
        },
        room: {
          roomNumber: booking.room?.roomNumber || 'N/A',
          floorNumber: booking.room?.floorNumber || 0,
          type: booking.room?.title,
        },
        charges: {
          roomCharges: booking.totalAmount,
          additionalCharges: 0,
          totalCharges: finalCharges,
          paidAmount: booking.paymentStatus === 'paid' ? booking.totalAmount : 0,
          outstandingBalance: booking.paymentStatus === 'paid' ? 0 : finalCharges,
        },
        deposit: deposit ? {
          originalAmount: deposit.amount,
          totalDeductions: totalDeductions,
          deductions: deductions.filter(d => d.reason && d.amount).map(d => ({
            reason: d.reason,
            amount: parseFloat(d.amount),
          })),
          refundAmount: depositRefundAmount,
          refundMethod: deposit.paymentMethod,
        } : null,
        notes: notes || undefined,
      };

      setReceiptData(receipt);
      setShowReceiptModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete check-out');
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckOutAttempt = () => {
    if (!roomInspected) {
      setShowInspectionReminder(true);
    } else {
      handleCheckOut();
    }
  };

  // Generate and print receipt (Task 12.3)
  const generateReceipt = (data: ReceiptData) => {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Check-Out Receipt - ${data.receiptNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            max-width: 400px; 
            margin: 0 auto; 
            padding: 20px;
            background: #fff;
            color: #333;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #2563eb; 
            padding-bottom: 15px; 
            margin-bottom: 20px; 
          }
          .header h1 { color: #2563eb; font-size: 24px; margin-bottom: 5px; }
          .header h2 { font-size: 16px; color: #666; font-weight: normal; }
          .receipt-number { 
            background: #f3f4f6; 
            padding: 8px 12px; 
            border-radius: 4px; 
            font-size: 12px; 
            margin-top: 10px;
            display: inline-block;
          }
          .section { 
            margin-bottom: 20px; 
            padding-bottom: 15px;
            border-bottom: 1px dashed #ddd;
          }
          .section:last-child { border-bottom: none; }
          .section-title { 
            font-weight: bold; 
            color: #2563eb; 
            margin-bottom: 10px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 6px 0; font-size: 13px; }
          td:first-child { color: #666; }
          td:last-child { text-align: right; font-weight: 500; }
          .total-row { 
            border-top: 2px solid #333; 
            font-weight: bold; 
            font-size: 16px;
          }
          .total-row td { padding-top: 12px; }
          .refund-amount { 
            background: #dcfce7; 
            padding: 12px; 
            border-radius: 8px; 
            text-align: center;
            margin-top: 10px;
          }
          .refund-amount .label { color: #166534; font-size: 12px; }
          .refund-amount .amount { color: #166534; font-size: 24px; font-weight: bold; }
          .deduction { color: #dc2626; }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            padding-top: 20px;
            border-top: 2px solid #2563eb;
          }
          .footer p { font-size: 12px; color: #666; margin-bottom: 5px; }
          .footer .thank-you { font-size: 16px; color: #2563eb; font-weight: bold; }
          .notes { 
            background: #fef3c7; 
            padding: 10px; 
            border-radius: 4px; 
            font-size: 12px;
            margin-top: 10px;
          }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>GoRoomz</h1>
          <h2>Check-Out Receipt</h2>
          <div class="receipt-number">Receipt #: ${data.receiptNumber}</div>
        </div>

        <div class="section">
          <div class="section-title">Guest Information</div>
          <table>
            <tr><td>Guest Name</td><td>${data.guest.name}</td></tr>
            <tr><td>Phone</td><td>${data.guest.phone}</td></tr>
            ${data.guest.email ? `<tr><td>Email</td><td>${data.guest.email}</td></tr>` : ''}
          </table>
        </div>

        <div class="section">
          <div class="section-title">Stay Details</div>
          <table>
            <tr><td>Room Number</td><td>${data.room.roomNumber}</td></tr>
            <tr><td>Floor</td><td>${data.room.floorNumber}</td></tr>
            ${data.room.type ? `<tr><td>Room Type</td><td>${data.room.type}</td></tr>` : ''}
            <tr><td>Check-In</td><td>${new Date(data.booking.checkIn).toLocaleDateString()}</td></tr>
            <tr><td>Check-Out</td><td>${new Date(data.booking.actualCheckOutTime).toLocaleDateString()}</td></tr>
            <tr><td>Duration</td><td>${data.booking.duration} night(s)</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Charges Summary</div>
          <table>
            <tr><td>Room Charges</td><td>₹${data.charges.roomCharges.toLocaleString()}</td></tr>
            ${data.charges.additionalCharges > 0 ? `<tr><td>Additional Charges</td><td>₹${data.charges.additionalCharges.toLocaleString()}</td></tr>` : ''}
            <tr class="total-row"><td>Total Charges</td><td>₹${data.charges.totalCharges.toLocaleString()}</td></tr>
            <tr><td>Amount Paid</td><td>₹${data.charges.paidAmount.toLocaleString()}</td></tr>
            ${data.charges.outstandingBalance > 0 ? `<tr><td>Outstanding Balance</td><td class="deduction">₹${data.charges.outstandingBalance.toLocaleString()}</td></tr>` : ''}
          </table>
        </div>

        ${data.deposit ? `
        <div class="section">
          <div class="section-title">Security Deposit</div>
          <table>
            <tr><td>Deposit Collected</td><td>₹${data.deposit.originalAmount.toLocaleString()}</td></tr>
            ${data.deposit.deductions.length > 0 ? `
              <tr><td colspan="2" style="padding-top: 10px; font-weight: bold;">Deductions:</td></tr>
              ${data.deposit.deductions.map(d => `<tr><td style="padding-left: 15px;">• ${d.reason}</td><td class="deduction">-₹${d.amount.toLocaleString()}</td></tr>`).join('')}
              <tr><td>Total Deductions</td><td class="deduction">-₹${data.deposit.totalDeductions.toLocaleString()}</td></tr>
            ` : '<tr><td>Deductions</td><td>None</td></tr>'}
          </table>
          <div class="refund-amount">
            <div class="label">REFUND AMOUNT</div>
            <div class="amount">₹${data.deposit.refundAmount.toLocaleString()}</div>
            <div class="label">via ${data.deposit.refundMethod.toUpperCase()}</div>
          </div>
        </div>
        ` : ''}

        ${data.notes ? `
        <div class="notes">
          <strong>Notes:</strong> ${data.notes}
        </div>
        ` : ''}

        <div class="footer">
          <p class="thank-you">Thank you for staying with us!</p>
          <p>Generated on ${new Date(data.generatedAt).toLocaleString()}</p>
          <p>For queries, contact support@goroomz.com</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
  };

  const handleReset = () => {
    setSearchQuery('');
    setBooking(null);
    setDeposit(null);
    setError(null);
    setRoomInspected(false);
    setInspectionItems({
      furnitureCondition: false,
      noDamage: false,
      keysReturned: false,
      roomReady: false,
    });
    setDeductions([]);
    setNotes('');
    setShowOccupiedRooms(true);
    setReceiptData(null);
    loadOccupiedRooms();
  };

  const handleReceiptClose = () => {
    setShowReceiptModal(false);
    navigate('/bookings');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Guest Check-Out</h1>
        <p className="text-gray-600 mt-2">Process guest departure and room handover</p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Find Booking</h2>
        
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search By
            </label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'id' | 'name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            >
              <option value="id">Booking ID</option>
              <option value="name">Guest Name</option>
            </select>
          </div>

          <div className="flex-[2]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {searchType === 'id' ? 'Booking ID' : 'Guest Name'}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={searchType === 'id' ? 'Enter booking ID' : 'Enter guest name'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {error && !booking && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Occupied Rooms List */}
      {showOccupiedRooms && !booking && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Currently Occupied Rooms</h2>
            <button
              onClick={loadOccupiedRooms}
              disabled={loadingRooms}
              className="text-sm text-primary-600 hover:text-primary-700 disabled:text-gray-400"
            >
              {loadingRooms ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>

          {loadingRooms ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="text-gray-600 mt-2">Loading occupied rooms...</p>
            </div>
          ) : occupiedRooms.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <p className="text-gray-600 mt-2">No occupied rooms found</p>
              <p className="text-sm text-gray-500 mt-1">All rooms are currently vacant</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-3">
                Click on a room to start the check-out process ({occupiedRooms.length} occupied {occupiedRooms.length === 1 ? 'room' : 'rooms'})
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {occupiedRooms.map((occupiedBooking) => (
                  <button
                    key={occupiedBooking.id}
                    onClick={() => handleSelectOccupiedRoom(occupiedBooking)}
                    className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-gray-900 group-hover:text-primary-700">
                            Room {occupiedBooking.room?.roomNumber || 'N/A'}
                          </span>
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                            Occupied
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Floor {occupiedBooking.room?.floorNumber || 'N/A'}</p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">{occupiedBooking.user?.name || 'Guest'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="text-sm text-gray-600">{occupiedBooking.user?.phone || occupiedBooking.contactInfo?.phone || 'N/A'}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-gray-600">
                          Check-in: {new Date(occupiedBooking.actualCheckInTime!).toLocaleDateString()}
                        </span>
                      </div>

                      {occupiedBooking.checkOut && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-gray-600">
                            Expected: {new Date(occupiedBooking.checkOut).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">₹{occupiedBooking.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Booking Details & Check-out Form */}
      {booking && (
        <div className="space-y-6">
          {/* Booking Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Booking Details</h2>
              <button
                onClick={() => setShowOccupiedRooms(true)}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Room Selection
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Booking ID</p>
                <p className="font-medium text-gray-900">{booking.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                  booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {booking.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Guest Name</p>
                <p className="font-medium text-gray-900">{booking.user?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact</p>
                <p className="font-medium text-gray-900">{booking.user?.phone || booking.contactInfo?.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Room</p>
                <p className="font-medium text-gray-900">
                  {booking.room?.roomNumber || 'N/A'} (Floor {booking.room?.floorNumber || 'N/A'})
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-in Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(booking.checkIn).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-out Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(booking.checkOut).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-medium text-gray-900">₹{booking.totalAmount.toLocaleString()}</p>
              </div>
            </div>

            {booking.actualCheckInTime && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Actual Check-in:</p>
                <p className="text-sm text-blue-800 mt-1">
                  {new Date(booking.actualCheckInTime).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Final Charges */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Final Charges</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Room Charges</span>
                <span className="font-medium text-gray-900">₹{booking.totalAmount.toLocaleString()}</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                  <span className="text-lg font-bold text-gray-900">₹{finalCharges.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Payment Status</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                    booking.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {booking.paymentStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Deposit Refund Section - Task 12.2 Enhanced */}
          {deposit && deposit.status === 'collected' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Deposit Refund</h2>
              
              <div className="space-y-4">
                {/* Original Deposit Display */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Original Deposit</span>
                      <p className="text-2xl font-bold text-blue-900">₹{deposit.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Payment Method</span>
                      <p className="text-sm font-medium text-blue-800 capitalize mt-1">{deposit.paymentMethod}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Collected Date</span>
                      <p className="text-sm font-medium text-blue-800 mt-1">{new Date(deposit.collectedDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Status</span>
                      <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                        {deposit.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deductions Section */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Deductions</h3>
                    <button
                      onClick={handleAddDeduction}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Deduction
                    </button>
                  </div>

                  {deductions.length === 0 ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>No deductions - Full refund of <strong>₹{deposit.amount.toLocaleString()}</strong> will be processed</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deductions.map((deduction, index) => (
                        <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
                            <input
                              type="text"
                              value={deduction.reason}
                              onChange={(e) => handleDeductionChange(index, 'reason', e.target.value)}
                              placeholder="e.g., Damaged furniture, Extra cleaning"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-gray-900"
                            />
                          </div>
                          <div className="w-36">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Amount (₹)</label>
                            <input
                              type="number"
                              value={deduction.amount}
                              onChange={(e) => handleDeductionChange(index, 'amount', e.target.value)}
                              placeholder="0"
                              min="0"
                              step="10"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-gray-900"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              onClick={() => handleRemoveDeduction(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove deduction"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Real-time Refund Calculation Display */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Original Deposit:</span>
                        <span className="font-medium text-gray-900">₹{deposit.amount.toLocaleString()}</span>
                      </div>
                      {totalDeductions > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-red-600">Total Deductions:</span>
                          <span className="font-medium text-red-600">- ₹{totalDeductions.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="border-t border-green-300 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-900">Refund Amount:</span>
                          <span className="text-2xl font-bold text-green-600">₹{depositRefundAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    {depositRefundAmount !== deposit.amount && (
                      <p className="text-xs text-gray-500 mt-2 text-right">
                        {((depositRefundAmount / deposit.amount) * 100).toFixed(0)}% of original deposit
                      </p>
                    )}
                  </div>
                </div>

                {/* Refund Processing Info */}
                {depositRefundAmount > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-amber-900">Refund via {deposit.paymentMethod.toUpperCase()}</p>
                        <p className="text-sm text-amber-800 mt-1">
                          {deposit.paymentMethod === 'cash' 
                            ? 'Please ensure you have sufficient cash available for the refund.' 
                            : 'The refund will be processed within 3-5 business days.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Room Inspection Checklist - Task 12.1 Enhanced */}
          <div ref={inspectionRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Room Inspection Checklist</h2>
              {roomInspected ? (
                <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Inspection Complete
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-amber-600 font-medium">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Pending
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Please verify each item before completing the check-out. All items must be checked to proceed.
            </p>
            
            <div className="space-y-3">
              <label className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
                inspectionItems.furnitureCondition 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="checkbox"
                  checked={inspectionItems.furnitureCondition}
                  onChange={() => handleInspectionItemChange('furnitureCondition')}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-0.5"
                />
                <div className="ml-3">
                  <span className="font-medium text-gray-900">Furniture & Fixtures Condition</span>
                  <p className="text-sm text-gray-600 mt-0.5">All furniture and fixtures are in acceptable condition</p>
                </div>
              </label>

              <label className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
                inspectionItems.noDamage 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="checkbox"
                  checked={inspectionItems.noDamage}
                  onChange={() => handleInspectionItemChange('noDamage')}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-0.5"
                />
                <div className="ml-3">
                  <span className="font-medium text-gray-900">No Damage Beyond Normal Wear</span>
                  <p className="text-sm text-gray-600 mt-0.5">No significant damage found beyond normal wear and tear</p>
                </div>
              </label>

              <label className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
                inspectionItems.keysReturned 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="checkbox"
                  checked={inspectionItems.keysReturned}
                  onChange={() => handleInspectionItemChange('keysReturned')}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-0.5"
                />
                <div className="ml-3">
                  <span className="font-medium text-gray-900">Keys/Access Cards Returned</span>
                  <p className="text-sm text-gray-600 mt-0.5">All room keys and access cards have been collected</p>
                </div>
              </label>

              <label className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
                inspectionItems.roomReady 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="checkbox"
                  checked={inspectionItems.roomReady}
                  onChange={() => handleInspectionItemChange('roomReady')}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-0.5"
                />
                <div className="ml-3">
                  <span className="font-medium text-gray-900">Room Ready for Housekeeping</span>
                  <p className="text-sm text-gray-600 mt-0.5">Room is ready to be marked as vacant/dirty for cleaning</p>
                </div>
              </label>
            </div>

            {/* Progress indicator */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Inspection Progress</span>
                <span className="font-medium text-gray-900">
                  {Object.values(inspectionItems).filter(Boolean).length} of 4 items checked
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    roomInspected ? 'bg-green-500' : 'bg-primary-500'
                  }`}
                  style={{ width: `${(Object.values(inspectionItems).filter(Boolean).length / 4) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
            
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about the check-out (optional)..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <button
              onClick={handleReset}
              disabled={processing}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleCheckOutAttempt}
              disabled={processing || !roomInspected}
              className={`px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                roomInspected
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {processing ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete Check-Out
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Inspection Reminder Modal */}
      {showInspectionReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Room Inspection Required
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Please complete all items in the room inspection checklist before proceeding with check-out.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900 font-medium mb-2">
                      Items remaining:
                    </p>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {!inspectionItems.furnitureCondition && <li>• Furniture & Fixtures Condition</li>}
                      {!inspectionItems.noDamage && <li>• No Damage Beyond Normal Wear</li>}
                      {!inspectionItems.keysReturned && <li>• Keys/Access Cards Returned</li>}
                      {!inspectionItems.roomReady && <li>• Room Ready for Housekeeping</li>}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowInspectionReminder(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowInspectionReminder(false);
                    inspectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Go to Checklist
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal - Task 12.3 */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Check-Out Complete</h3>
                <button
                  onClick={handleReceiptClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">Check-out completed successfully!</p>
                    <p className="text-sm text-green-700">Room {receiptData.room.roomNumber} is now available for housekeeping.</p>
                  </div>
                </div>
              </div>

              {/* Receipt Summary */}
              <div className="space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Guest</h4>
                  <p className="font-medium text-gray-900">{receiptData.guest.name}</p>
                  <p className="text-sm text-gray-600">{receiptData.guest.phone}</p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Stay Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Room:</span>
                      <span className="ml-2 font-medium text-gray-900">{receiptData.room.roomNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <span className="ml-2 font-medium text-gray-900">{receiptData.booking.duration} night(s)</span>
                    </div>
                  </div>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Charges</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Charges:</span>
                    <span className="font-medium text-gray-900">₹{receiptData.charges.totalCharges.toLocaleString()}</span>
                  </div>
                </div>

                {receiptData.deposit && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-800 uppercase tracking-wide mb-2">Deposit Refund</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Refund Amount:</span>
                      <span className="text-xl font-bold text-green-600">₹{receiptData.deposit.refundAmount.toLocaleString()}</span>
                    </div>
                    {receiptData.deposit.totalDeductions > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        (Original: ₹{receiptData.deposit.originalAmount.toLocaleString()} - Deductions: ₹{receiptData.deposit.totalDeductions.toLocaleString()})
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => generateReceipt(receiptData)}
                  className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Receipt
                </button>
                <button
                  onClick={handleReceiptClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

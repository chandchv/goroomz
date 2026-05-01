import { api } from './api';

export interface Booking {
  id: string;
  roomId: string;
  bedId?: string;
  userId: string;
  ownerId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  paidAmount?: number;
  bookingType?: 'daily' | 'monthly';
  contactInfo: {
    name?: string;
    phone: string;
    email: string;
  };
  specialRequests?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  bookingSource: 'online' | 'offline' | 'walk_in';
  actualCheckInTime?: string;
  actualCheckOutTime?: string;
  securityDepositId?: string;
  checkedInBy?: string;
  checkedOutBy?: string;
  createdAt: string;
  updatedAt: string;
  room?: {
    id: string;
    title: string;
    roomNumber: string;
    floorNumber: number;
    currentStatus: string;
    sharingType?: string;
    totalBeds?: number;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  bed?: {
    id: string;
    bedNumber: number;
  };
  checkedInByUser?: {
    id: string;
    name: string;
  };
  checkedOutByUser?: {
    id: string;
    name: string;
  };
  securityDeposit?: {
    id: string;
    amount: number;
    status: string;
    paymentMethod: string;
    collectedDate: string;
    notes?: string;
  };
}

export interface BookingFilters {
  status?: string;
  bookingSource?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  propertyId?: string;
}

export interface BookingListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Booking[];
}

export interface CreateBookingData {
  roomId: string;
  bedId?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut?: string;
  guests: number;
  totalAmount?: number;
  specialRequests?: string;
  paymentStatus?: string;
  depositAmount?: number;
}

export interface CheckInData {
  securityDepositAmount?: number;
  securityDepositMethod?: string;
  notes?: string;
  paidAmount?: number;
  paymentStatus?: string;
}

export interface CheckOutData {
  notes?: string;
  damageCharges?: number;
  cleaningCharges?: number;
  otherCharges?: number;
  refundSecurityDeposit?: boolean;
}

export interface RoomChangeData {
  newRoomId: string;
  newBedId?: string;
  reason: string;
  changedBy: string;
}

export interface InstantCheckInData {
  roomId: string;
  bedId?: string;
  propertyId: string;
  ownerId: string;
  guestInfo: {
    name: string;
    phone: string;
    email?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
    };
    idType?: string;
    idNumber?: string;
  };
  checkOut: string;
  guests?: number;
  specialRequests?: string;
  deposit?: {
    amount: number;
    method: 'cash' | 'card' | 'upi' | 'bank_transfer';
    notes?: string;
  };
  notes?: string;
}

export interface InstantCheckInResponse {
  booking: Booking;
  room: {
    id: string;
    title: string;
    roomNumber: string;
    currentStatus: string;
  };
  guestProfile: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  deposit?: {
    id: string;
    amount: number;
    status: string;
    paymentMethod: string;
  };
}

class BookingService {
  /**
   * Get all bookings with filters
   */
  async getBookings(filters: BookingFilters = {}): Promise<BookingListResponse> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.bookingSource) params.append('bookingSource', filters.bookingSource);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.propertyId) params.append('propertyId', filters.propertyId);

    const response = await api.get(`/api/internal/bookings?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a single booking by ID
   */
  async getBookingById(bookingId: string): Promise<Booking> {
    const response = await api.get(`/api/internal/bookings/${bookingId}`);
    return response.data.data;
  }

  /**
   * Create a new offline booking
   */
  async createBooking(data: CreateBookingData): Promise<Booking> {
    const response = await api.post('/api/internal/bookings', data);
    return response.data.data;
  }

  /**
   * Process check-in for a booking
   */
  async checkIn(bookingId: string, data: CheckInData): Promise<Booking> {
    const response = await api.post(`/api/internal/bookings/${bookingId}/checkin`, data);
    return response.data.data;
  }

  /**
   * Update booking details
   */
  async updateBooking(bookingId: string, data: Partial<CreateBookingData> & { paidAmount?: number }): Promise<Booking> {
    const response = await api.put(`/api/internal/bookings/${bookingId}`, data);
    return response.data.data;
  }

  /**
   * Process check-out for a booking
   */
  async checkOut(bookingId: string, data: CheckOutData): Promise<Booking> {
    const response = await api.post(`/api/internal/bookings/${bookingId}/checkout`, data);
    return response.data.data;
  }

  /**
   * Get today's pending check-ins
   */
  async getPendingCheckIns(): Promise<Booking[]> {
    const response = await api.get('/api/internal/bookings/pending-checkin');
    return response.data.data;
  }

  /**
   * Get today's pending check-outs
   */
  async getPendingCheckOuts(): Promise<Booking[]> {
    const response = await api.get('/api/internal/bookings/pending-checkout');
    return response.data.data;
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(bookingId: string, status: string): Promise<Booking> {
    const response = await api.put(`/api/internal/bookings/${bookingId}/status`, { status });
    return response.data.data;
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
    const response = await api.post(`/api/internal/bookings/${bookingId}/cancel`, { reason });
    return response.data.data;
  }

  /**
   * Change room assignment for a booking
   */
  async changeRoom(bookingId: string, data: RoomChangeData): Promise<Booking> {
    const response = await api.post(`/api/internal/bookings/${bookingId}/change-room`, data);
    return response.data.data;
  }

  /**
   * Collect payment for a booking (partial or full)
   */
  async collectPayment(bookingId: string, data: { paidAmount: number; paymentStatus: string; notes?: string }): Promise<Booking> {
    const response = await api.put(`/api/internal/bookings/${bookingId}`, data);
    return response.data.data;
  }

  /**
   * Instant check-in for walk-in guests
   * Creates booking + check-in in a single transaction
   */
  async instantCheckIn(data: InstantCheckInData): Promise<InstantCheckInResponse> {
    const response = await api.post('/api/bookings/instant-checkin', data);
    return response.data.data;
  }

  async getAvailableBedsForRoom(roomId: string): Promise<{
    totalBeds: number;
    availableBeds: number;
    occupiedBedIds: string[];
  }> {
    const response = await api.get(`/api/internal/rooms/${roomId}/beds`);
    const beds = response.data.data || [];
    return {
      totalBeds: beds.length,
      availableBeds: beds.filter((b: any) => b.status === 'vacant').length,
      occupiedBedIds: beds.filter((b: any) => b.status === 'occupied').map((b: any) => b.id)
    };
  }
}

export const bookingService = new BookingService();

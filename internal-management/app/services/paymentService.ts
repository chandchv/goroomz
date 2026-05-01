import { api } from './api';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer';
  transactionReference?: string;
  paymentType: 'booking' | 'monthly_rent' | 'security_deposit';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  recordedBy: string;
  notes?: string;
  booking?: {
    id: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    paymentStatus: string;
    bookingSource: string;
    room: {
      id: string;
      title: string;
      roomNumber: string;
      floorNumber: number;
    };
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
  recorder?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface OverduePayment {
  id: string;
  bookingId: string;
  bedId?: string;
  dueDate: string;
  amount: number;
  status: string;
  daysOverdue: number;
  booking: {
    id: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    bookingSource: string;
    room: {
      id: string;
      title: string;
      roomNumber: string;
      floorNumber: number;
    };
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
  bed?: {
    id: string;
    bedNumber: number;
  };
}

export interface PaymentSummary {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectedCount: number;
  pendingCount: number;
  overdueCount: number;
}

// Get all payments with filters
export const getPayments = async (filters?: {
  bookingId?: string;
  paymentType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  
  if (filters?.bookingId) params.append('bookingId', filters.bookingId);
  if (filters?.paymentType) params.append('paymentType', filters.paymentType);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const response = await api.get(`/api/internal/payments?${params.toString()}`);
  return response.data;
};

// Record a new payment
export const recordPayment = async (paymentData: {
  bookingId: string;
  amount: number;
  paymentMethod: string;
  transactionReference?: string;
  paymentType?: string;
  notes?: string;
}) => {
  const response = await api.post('/api/internal/payments', paymentData);
  return response.data;
};

// Update a payment
export const updatePayment = async (
  paymentId: string,
  updateData: {
    amount?: number;
    paymentMethod?: string;
    transactionReference?: string;
    status?: string;
    notes?: string;
  }
) => {
  const response = await api.put(`/api/internal/payments/${paymentId}`, updateData);
  return response.data;
};

// Get overdue payments
export const getOverduePayments = async (filters?: {
  floor?: number;
  roomNumber?: string;
}) => {
  const params = new URLSearchParams();
  
  if (filters?.floor) params.append('floor', filters.floor.toString());
  if (filters?.roomNumber) params.append('roomNumber', filters.roomNumber);

  const response = await api.get(`/api/internal/payments/overdue?${params.toString()}`);
  return response.data;
};

// Get payment summary statistics
export const getPaymentSummary = async (): Promise<PaymentSummary> => {
  try {
    // Get all completed payments
    const completedResponse = await api.get('/api/internal/payments?status=completed&limit=1000');
    const totalCollected = completedResponse.data.data.reduce(
      (sum: number, payment: Payment) => sum + parseFloat(payment.amount.toString()),
      0
    );
    const collectedCount = completedResponse.data.count;

    // Get all pending payments
    const pendingResponse = await api.get('/api/internal/payments?status=pending&limit=1000');
    const totalPending = pendingResponse.data.data.reduce(
      (sum: number, payment: Payment) => sum + parseFloat(payment.amount.toString()),
      0
    );
    const pendingCount = pendingResponse.data.count;

    // Get overdue payments
    const overdueResponse = await api.get('/api/internal/payments/overdue');
    const totalOverdue = overdueResponse.data.data.reduce(
      (sum: number, payment: OverduePayment) => sum + parseFloat(payment.amount.toString()),
      0
    );
    const overdueCount = overdueResponse.data.count;

    return {
      totalCollected,
      totalPending,
      totalOverdue,
      collectedCount,
      pendingCount,
      overdueCount,
    };
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    throw error;
  }
};

export interface PaymentSchedule {
  id: string;
  bookingId: string;
  bedId?: string;
  dueDate: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: string;
  paymentId?: string;
  payment?: {
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    transactionReference?: string;
  };
  bed?: {
    id: string;
    bedNumber: number;
  };
}

export interface PaymentScheduleResponse {
  booking: {
    id: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    room: {
      id: string;
      title: string;
      roomNumber: string;
      floorNumber: number;
    };
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
  count: number;
  data: PaymentSchedule[];
}

// Get payment schedule for a booking
export const getPaymentSchedule = async (bookingId: string): Promise<PaymentScheduleResponse> => {
  const response = await api.get(`/api/internal/payments/schedule/${bookingId}`);
  return response.data;
};

// Create payment schedule on check-in (for PG)
export const createPaymentSchedule = async (scheduleData: {
  bookingId: string;
  monthlyAmount: number;
  numberOfMonths: number;
  startDate?: string;
}) => {
  const response = await api.post('/api/internal/payments/schedule', scheduleData);
  return response.data;
};

export default {
  getPayments,
  recordPayment,
  updatePayment,
  getOverduePayments,
  getPaymentSummary,
  getPaymentSchedule,
  createPaymentSchedule,
};

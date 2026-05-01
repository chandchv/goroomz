import { api } from './api';

export interface SecurityDeposit {
  id: string;
  bookingId: string;
  amount: number;
  collectedDate: string;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer';
  status: 'collected' | 'refunded' | 'partially_refunded';
  refundAmount?: number;
  refundDate?: string;
  deductions?: Array<{
    reason: string;
    amount: number;
  }>;
  refundedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  booking?: {
    id: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    status: string;
    guests: number;
    room?: {
      id: string;
      title: string;
      roomNumber: string;
      floorNumber: number;
    };
    user?: {
      id: string;
      name: string;
      email: string;
      phone: string;
    };
  };
  refunder?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface DepositFilters {
  status?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DepositListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: SecurityDeposit[];
}

export interface RecordDepositData {
  bookingId: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer';
  notes?: string;
}

export interface RefundDepositData {
  deductions?: Array<{
    reason: string;
    amount: number;
  }>;
  notes?: string;
}

class DepositService {
  /**
   * Get all security deposits with filters
   */
  async getAllDeposits(filters: DepositFilters = {}): Promise<DepositListResponse> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/api/internal/deposits?${params.toString()}`);
    return response.data;
  }

  /**
   * Record a security deposit
   */
  async recordDeposit(data: RecordDepositData): Promise<SecurityDeposit> {
    const response = await api.post('/api/internal/deposits', data);
    return response.data.data;
  }

  /**
   * Process security deposit refund
   */
  async refundDeposit(depositId: string, data: RefundDepositData): Promise<SecurityDeposit> {
    const response = await api.put(`/api/internal/deposits/${depositId}/refund`, data);
    return response.data.data;
  }

  /**
   * Get security deposit by booking ID
   */
  async getDepositByBookingId(bookingId: string): Promise<SecurityDeposit | null> {
    const response = await api.get(`/api/internal/deposits/${bookingId}`);
    return response.data.data;
  }
}

export const depositService = new DepositService();

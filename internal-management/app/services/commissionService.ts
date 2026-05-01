import { api } from './api';

export interface Commission {
  id: string;
  agentId: string;
  leadId: string;
  propertyId?: string;
  amount: number;
  rate: number;
  status: 'earned' | 'pending_payment' | 'paid' | 'cancelled';
  earnedDate: string;
  paymentDate?: string;
  paymentMethod?: string;
  transactionReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  agent?: {
    id: string;
    name: string;
    email: string;
  };
  lead?: {
    id: string;
    propertyOwnerName: string;
    businessName: string;
  };
  property?: {
    id: string;
    name: string;
  };
}

export interface CommissionFilters {
  status?: string;
  agentId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CommissionListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Commission[];
}

export interface CommissionSummary {
  totalEarned: number;
  totalPending: number;
  totalPaid: number;
  commissionCount: number;
  averageCommission: number;
}

export interface UpdateCommissionData {
  amount?: number;
  rate?: number;
  status?: 'earned' | 'pending_payment' | 'paid' | 'cancelled';
  notes?: string;
}

export interface MarkPaidData {
  paymentDate: string;
  paymentMethod: string;
  transactionReference?: string;
  notes?: string;
}

class CommissionService {
  /**
   * Get all commissions with filters
   */
  async getCommissions(filters: CommissionFilters = {}): Promise<CommissionListResponse> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.agentId) params.append('agentId', filters.agentId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/internal/commissions?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a single commission by ID
   */
  async getCommissionById(commissionId: string): Promise<Commission> {
    const response = await api.get(`/internal/commissions/${commissionId}`);
    return response.data.data;
  }

  /**
   * Get commissions for a specific agent
   */
  async getAgentCommissions(agentId: string, filters: CommissionFilters = {}): Promise<CommissionListResponse> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/internal/commissions/agent/${agentId}?${params.toString()}`);
    return response.data;
  }

  /**
   * Get commission summary for an agent
   */
  async getAgentCommissionSummary(agentId: string, startDate?: string, endDate?: string): Promise<CommissionSummary> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get(`/internal/commissions/agent/${agentId}/summary?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Update a commission
   */
  async updateCommission(commissionId: string, data: UpdateCommissionData): Promise<Commission> {
    const response = await api.put(`/internal/commissions/${commissionId}`, data);
    return response.data.data;
  }

  /**
   * Mark commission as paid
   */
  async markAsPaid(commissionId: string, data: MarkPaidData): Promise<Commission> {
    const response = await api.post(`/internal/commissions/${commissionId}/mark-paid`, data);
    return response.data.data;
  }

  /**
   * Get pending commissions
   */
  async getPendingCommissions(filters: CommissionFilters = {}): Promise<CommissionListResponse> {
    const params = new URLSearchParams();
    
    if (filters.agentId) params.append('agentId', filters.agentId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/internal/commissions/pending?${params.toString()}`);
    return response.data;
  }
}

export const commissionService = new CommissionService();

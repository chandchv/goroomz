import { api } from './api';

export interface Lead {
  id: string;
  propertyOwnerName: string;
  email: string;
  phone: string;
  businessName: string;
  propertyType: 'hotel' | 'pg';
  address: string;
  city: string;
  state: string;
  country: string;
  estimatedRooms: number;
  status: 'contacted' | 'in_progress' | 'pending_approval' | 'approved' | 'rejected' | 'lost';
  source: string;
  agentId: string;
  territoryId?: string;
  expectedCloseDate?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  agent?: {
    id: string;
    name: string;
    email: string;
  };
  territory?: {
    id: string;
    name: string;
  };
  approver?: {
    id: string;
    name: string;
  };
}

export interface LeadCommunication {
  id: string;
  leadId: string;
  userId: string;
  type: 'call' | 'email' | 'meeting' | 'note';
  subject: string;
  content: string;
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
  };
}

export interface LeadFilters {
  status?: string;
  source?: string;
  territoryId?: string;
  agentId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface LeadListResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Lead[];
}

export interface CreateLeadData {
  propertyOwnerName: string;
  email: string;
  phone: string;
  businessName: string;
  propertyType: 'hotel' | 'pg';
  address: string;
  city: string;
  state: string;
  country: string;
  estimatedRooms: number;
  source: string;
  expectedCloseDate?: string;
  notes?: string;
}

export interface UpdateLeadData {
  propertyOwnerName?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  propertyType?: 'hotel' | 'pg';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  estimatedRooms?: number;
  source?: string;
  expectedCloseDate?: string;
  notes?: string;
}

export interface UpdateLeadStatusData {
  status: 'contacted' | 'in_progress' | 'pending_approval' | 'approved' | 'rejected' | 'lost';
  notes?: string;
}

export interface AddCommunicationData {
  type: 'call' | 'email' | 'meeting' | 'note';
  subject: string;
  content: string;
  scheduledAt?: string;
  completedAt?: string;
}

export interface ApproveLeadData {
  notes?: string;
}

export interface RejectLeadData {
  rejectionReason: string;
  notes?: string;
}

class LeadService {
  /**
   * Get all leads with filters
   */
  async getLeads(filters: LeadFilters = {}): Promise<LeadListResponse> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.source) params.append('source', filters.source);
    if (filters.territoryId) params.append('territoryId', filters.territoryId);
    if (filters.agentId) params.append('agentId', filters.agentId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/api/internal/leads?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a single lead by ID
   */
  async getLeadById(leadId: string): Promise<Lead> {
    const response = await api.get(`/api/internal/leads/${leadId}`);
    return response.data.data;
  }

  /**
   * Create a new lead
   */
  async createLead(data: CreateLeadData): Promise<Lead> {
    const response = await api.post('/api/internal/leads', data);
    return response.data.data;
  }

  /**
   * Update a lead
   */
  async updateLead(leadId: string, data: UpdateLeadData): Promise<Lead> {
    const response = await api.put(`/api/internal/leads/${leadId}`, data);
    return response.data.data;
  }

  /**
   * Delete a lead
   */
  async deleteLead(leadId: string): Promise<void> {
    await api.delete(`/api/internal/leads/${leadId}`);
  }

  /**
   * Update lead status
   */
  async updateLeadStatus(leadId: string, data: UpdateLeadStatusData): Promise<Lead> {
    const response = await api.put(`/api/internal/leads/${leadId}/status`, data);
    return response.data.data;
  }

  /**
   * Add communication to a lead
   */
  async addCommunication(leadId: string, data: AddCommunicationData): Promise<LeadCommunication> {
    const response = await api.post(`/api/internal/leads/${leadId}/communications`, data);
    return response.data.data;
  }

  /**
   * Get communication history for a lead
   */
  async getCommunications(leadId: string): Promise<LeadCommunication[]> {
    const response = await api.get(`/api/internal/leads/${leadId}/communications`);
    return response.data.data;
  }

  /**
   * Submit lead for approval
   */
  async submitForApproval(leadId: string): Promise<Lead> {
    const response = await api.post(`/api/internal/leads/${leadId}/submit-approval`);
    return response.data.data;
  }

  /**
   * Approve a lead (Regional Manager)
   */
  async approveLead(leadId: string, data: ApproveLeadData = {}): Promise<Lead> {
    const response = await api.post(`/api/internal/leads/${leadId}/approve`, data);
    return response.data.data;
  }

  /**
   * Reject a lead (Regional Manager)
   */
  async rejectLead(leadId: string, data: RejectLeadData): Promise<Lead> {
    const response = await api.post(`/api/internal/leads/${leadId}/reject`, data);
    return response.data.data;
  }

  /**
   * Get bulk upload template
   */
  async getBulkUploadTemplate(): Promise<BulkUploadTemplate> {
    const response = await api.get('/api/internal/leads/bulk/template');
    return response.data.data;
  }

  /**
   * Validate bulk upload data
   */
  async validateBulkUpload(leads: BulkLeadData[]): Promise<BulkValidationResult> {
    const response = await api.post('/api/internal/leads/bulk/validate', { leads });
    return response.data.data;
  }

  /**
   * Bulk upload leads
   */
  async bulkUploadLeads(leads: BulkLeadData[], skipDuplicates: boolean = true): Promise<BulkUploadResult> {
    const response = await api.post('/api/internal/leads/bulk', { leads, skipDuplicates });
    return response.data.data;
  }
}

// Bulk upload types
export interface BulkLeadData {
  propertyOwnerName: string;
  email: string;
  phone: string;
  propertyType: string;
  address: string;
  city: string;
  state: string;
  businessName?: string;
  estimatedRooms?: number;
  country?: string;
  pincode?: string;
  landmark?: string;
  amenities?: string[];
  notes?: string;
  priority?: string;
  source?: string;
  description?: string;
}

export interface BulkUploadTemplate {
  description: string;
  requiredFields: { field: string; type: string; description: string }[];
  optionalFields: { field: string; type: string; description: string }[];
  sampleData: BulkLeadData[];
}

export interface BulkValidationResult {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  errors: { row: number; email: string; errors: string[] }[];
}

export interface BulkUploadResult {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: { row: number; email: string; error: string }[];
  createdLeads: { id: string; email: string; propertyOwnerName: string; city: string }[];
}

export const leadService = new LeadService();

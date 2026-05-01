import { api } from './api';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  propertyOwnerId: string;
  propertyId?: string;
  title: string;
  description: string;
  category: 'technical' | 'billing' | 'operations' | 'feature_request' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdByName?: string;
  propertyOwnerName?: string;
  propertyName?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketResponse {
  id: string;
  ticketId: string;
  userId: string;
  userName?: string;
  message: string;
  isInternal: boolean;
  attachments?: string[];
  createdAt: string;
}

export interface CreateTicketData {
  propertyOwnerId: string;
  propertyId?: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  assignedTo?: string;
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  assignedTo?: string;
}

export interface AddResponseData {
  message: string;
  isInternal: boolean;
  attachments?: string[];
}

export interface TicketFilters {
  status?: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
  propertyOwnerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TicketStatistics {
  total: number;
  new: number;
  inProgress: number;
  waitingResponse: number;
  resolved: number;
  closed: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  averageResolutionTime: number;
}

class TicketService {
  /**
   * Get all tickets with optional filters
   */
  async getTickets(filters?: TicketFilters): Promise<{ data: SupportTicket[]; total: number; page: number; limit: number }> {
    const response = await api.get('/api/internal/tickets', { params: filters });
    return response.data;
  }

  /**
   * Get a specific ticket by ID
   */
  async getTicket(ticketId: string): Promise<SupportTicket> {
    const response = await api.get(`/internal/tickets/${ticketId}`);
    return response.data.data;
  }

  /**
   * Create a new support ticket
   */
  async createTicket(data: CreateTicketData): Promise<SupportTicket> {
    const response = await api.post('/api/internal/tickets', data);
    return response.data.data;
  }

  /**
   * Update a ticket
   */
  async updateTicket(ticketId: string, data: UpdateTicketData): Promise<SupportTicket> {
    const response = await api.put(`/internal/tickets/${ticketId}`, data);
    return response.data.data;
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId: string, status: string): Promise<SupportTicket> {
    const response = await api.put(`/internal/tickets/${ticketId}/status`, { status });
    return response.data.data;
  }

  /**
   * Assign ticket to a user
   */
  async assignTicket(ticketId: string, userId: string): Promise<SupportTicket> {
    const response = await api.put(`/internal/tickets/${ticketId}/assign`, { userId });
    return response.data.data;
  }

  /**
   * Add a response to a ticket
   */
  async addResponse(ticketId: string, data: AddResponseData): Promise<TicketResponse> {
    const response = await api.post(`/internal/tickets/${ticketId}/responses`, data);
    return response.data.data;
  }

  /**
   * Get all responses for a ticket
   */
  async getResponses(ticketId: string): Promise<TicketResponse[]> {
    const response = await api.get(`/internal/tickets/${ticketId}/responses`);
    return response.data.data;
  }

  /**
   * Resolve a ticket
   */
  async resolveTicket(ticketId: string, resolution: string): Promise<SupportTicket> {
    const response = await api.post(`/internal/tickets/${ticketId}/resolve`, { resolution });
    return response.data.data;
  }

  /**
   * Close a ticket
   */
  async closeTicket(ticketId: string): Promise<SupportTicket> {
    const response = await api.post(`/internal/tickets/${ticketId}/close`);
    return response.data.data;
  }

  /**
   * Get ticket statistics
   */
  async getStatistics(filters?: { startDate?: string; endDate?: string }): Promise<TicketStatistics> {
    const response = await api.get('/api/internal/tickets/statistics', { params: filters });
    return response.data.data;
  }
}

export const ticketService = new TicketService();

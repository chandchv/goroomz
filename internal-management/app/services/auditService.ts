import { api } from './api';

export interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes: {
    before?: any;
    after?: any;
  };
  ipAddress: string;
  userAgent: string;
  isCritical: boolean;
  createdAt: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  isCritical?: boolean;
  page?: number;
  limit?: number;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserActivity {
  userId: string;
  userName: string;
  userEmail: string;
  actions: AuditLog[];
  totalActions: number;
}

class AuditService {
  /**
   * Get audit logs with optional filters
   */
  async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
    const response = await api.get('/api/internal/audit', { params: filters });
    return response.data.data;
  }

  /**
   * Get a specific audit log entry
   */
  async getAuditLog(id: string): Promise<AuditLog> {
    const response = await api.get(`/api/internal/audit/${id}`);
    return response.data.data;
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserActivity(userId: string, filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
    const response = await api.get(`/api/internal/audit/user/${userId}`, { params: filters });
    return response.data.data;
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceHistory(
    resourceType: string,
    resourceId: string,
    filters: AuditLogFilters = {}
  ): Promise<AuditLogResponse> {
    const response = await api.get(
      `/internal/audit/resource/${resourceType}/${resourceId}`,
      { params: filters }
    );
    return response.data.data;
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(filters: AuditLogFilters = {}): Promise<Blob> {
    const response = await api.post(
      '/api/internal/audit/export',
      filters,
      { responseType: 'blob' }
    );
    return response.data;
  }

  /**
   * Get critical actions summary
   */
  async getCriticalActions(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
    const response = await api.get('/api/internal/audit', {
      params: { ...filters, isCritical: true },
    });
    return response.data.data;
  }
}

export default new AuditService();

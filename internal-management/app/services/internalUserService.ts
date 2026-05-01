import api from './api';

export interface InternalUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  internalRole: 'agent' | 'regional_manager' | 'operations_manager' | 'platform_admin' | 'superuser';
  internalPermissions: {
    canOnboardProperties: boolean;
    canApproveOnboardings: boolean;
    canManageAgents: boolean;
    canAccessAllProperties: boolean;
    canManageSystemSettings: boolean;
    canViewAuditLogs: boolean;
    canManageCommissions: boolean;
    canManageTerritories: boolean;
    canManageTickets: boolean;
    canBroadcastAnnouncements: boolean;
  };
  territoryId?: string;
  managerId?: string;
  commissionRate?: number;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceMetrics {
  propertiesOnboarded: number;
  conversionRate: number;
  averageTimeToClose: number;
  commissionEarned: number;
  leadsInPipeline: number;
}

export interface GetUsersFilters {
  role?: string;
  isActive?: boolean;
  territoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetUsersResponse {
  success: boolean;
  count: number;
  page: number;
  totalPages: number;
  data: InternalUser[];
}

export interface CreateUserRequest {
  name: string;
  email: string;
  phone?: string;
  internalRole: string;
  territoryId?: string;
  managerId?: string;
  commissionRate?: number;
  customPermissions?: Partial<InternalUser['internalPermissions']>;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  internalRole?: string;
  territoryId?: string;
  managerId?: string;
  commissionRate?: number;
}

export interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
}

export interface CSVUserRow {
  name: string;
  email: string;
  phone?: string;
  role: string;
  territory?: string;
  commissionRate?: string;
  supervisorEmail?: string;
}

const internalUserService = {
  /**
   * Get all internal users with filtering and pagination
   * Requirements: 1.3, 1.4, 1.5
   */
  getUsers: async (filters?: GetUsersFilters): Promise<GetUsersResponse> => {
    const response = await api.get('/api/internal/users', { params: filters });
    return response.data;
  },

  /**
   * Get user by ID for detail view
   * Requirements: 6.1
   */
  getUserById: async (id: string): Promise<InternalUser> => {
    const response = await api.get(`/api/internal/users/${id}`);
    return response.data.data;
  },

  /**
   * Create new internal user
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
   */
  createUser: async (data: CreateUserRequest): Promise<{ user: InternalUser; tempPassword: string }> => {
    const response = await api.post('/api/internal/users', data);
    return response.data.data;
  },

  /**
   * Update existing internal user
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
   */
  updateUser: async (id: string, data: UpdateUserRequest): Promise<InternalUser> => {
    const response = await api.put(`/api/internal/users/${id}`, data);
    return response.data.data;
  },

  /**
   * Deactivate user (soft delete)
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  deactivateUser: async (id: string): Promise<void> => {
    await api.delete(`/api/internal/users/${id}`);
  },

  /**
   * Reactivate previously deactivated user
   * Requirements: 4.6
   */
  reactivateUser: async (id: string): Promise<InternalUser> => {
    const response = await api.put(`/api/internal/users/${id}`, { isActive: true });
    return response.data.data;
  },

  /**
   * Update user permissions (Superuser only)
   * Requirements: 5.4
   */
  updatePermissions: async (
    id: string,
    permissions: Partial<InternalUser['internalPermissions']>
  ): Promise<InternalUser> => {
    const response = await api.put(`/api/internal/users/${id}/permissions`, { permissions });
    return response.data.data;
  },

  /**
   * Reset user password
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  resetPassword: async (id: string): Promise<{ tempPassword: string }> => {
    const response = await api.post(`/api/internal/users/${id}/reset-password`);
    return response.data.data;
  },

  /**
   * Get user performance metrics
   * Requirements: 6.2, 6.3, 6.4
   */
  getUserPerformance: async (
    id: string,
    filters?: { startDate?: string; endDate?: string }
  ): Promise<PerformanceMetrics> => {
    const response = await api.get(`/api/internal/users/${id}/performance`, { params: filters });
    return response.data.data;
  },

  /**
   * Assign territory to user
   * Requirements: 2.4
   */
  assignTerritory: async (id: string, territoryId: string | null): Promise<InternalUser> => {
    const response = await api.put(`/api/internal/users/${id}/territory`, { territoryId });
    return response.data.data;
  },

  // Legacy methods for backward compatibility
  getInternalUsers: async (filters?: {
    role?: string;
    isActive?: boolean;
    territoryId?: string;
  }): Promise<InternalUser[]> => {
    const response = await api.get('/api/internal/users', { params: filters });
    return response.data.data || response.data;
  },

  getInternalUser: async (id: string): Promise<InternalUser> => {
    const response = await api.get(`/api/internal/users/${id}`);
    return response.data.data || response.data;
  },

  createInternalUser: async (data: CreateUserRequest): Promise<InternalUser> => {
    const response = await api.post('/api/internal/users', data);
    return response.data.data?.user || response.data.data || response.data;
  },

  updateInternalUser: async (id: string, data: Partial<InternalUser>): Promise<InternalUser> => {
    const response = await api.put(`/api/internal/users/${id}`, data);
    return response.data.data || response.data;
  },

  deactivateInternalUser: async (id: string): Promise<void> => {
    await api.delete(`/api/internal/users/${id}`);
  },

  getPerformanceMetrics: async (id: string): Promise<PerformanceMetrics> => {
    const response = await api.get(`/api/internal/users/${id}/performance`);
    return response.data.data || response.data;
  },

  /**
   * Parse CSV file and validate user data
   * Requirements: 11.3, 11.4
   */
  parseCSV: (file: File): Promise<CSVUserRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            reject(new Error('CSV file is empty or has no data rows'));
            return;
          }

          // Parse header
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          // Validate required headers
          const requiredHeaders = ['name', 'email', 'role'];
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
          
          if (missingHeaders.length > 0) {
            reject(new Error(`Missing required columns: ${missingHeaders.join(', ')}`));
            return;
          }

          // Parse data rows
          const users: CSVUserRow[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            
            if (values.length !== headers.length) {
              continue; // Skip malformed rows
            }

            const user: any = {};
            headers.forEach((header, index) => {
              user[header] = values[index];
            });

            users.push({
              name: user.name,
              email: user.email,
              phone: user.phone,
              role: user.role,
              territory: user.territory || user.territoryid,
              commissionRate: user.commissionrate || user.commission_rate,
              supervisorEmail: user.supervisoremail || user.supervisor_email || user.manageremail
            });
          }

          resolve(users);
        } catch (error) {
          reject(new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  },

  /**
   * Validate CSV user data
   * Requirements: 11.3, 11.4
   */
  validateCSVUsers: (users: CSVUserRow[]): Array<{ row: number; errors: string[] }> => {
    const validationErrors: Array<{ row: number; errors: string[] }> = [];
    const validRoles = ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser'];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    users.forEach((user, index) => {
      const errors: string[] = [];
      const rowNumber = index + 2; // +2 because index starts at 0 and we skip header

      // Validate name
      if (!user.name || user.name.trim().length === 0) {
        errors.push('Name is required');
      }

      // Validate email
      if (!user.email || user.email.trim().length === 0) {
        errors.push('Email is required');
      } else if (!emailRegex.test(user.email)) {
        errors.push('Invalid email format');
      }

      // Validate role
      if (!user.role || user.role.trim().length === 0) {
        errors.push('Role is required');
      } else if (!validRoles.includes(user.role.toLowerCase())) {
        errors.push(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // Validate commission rate if provided
      if (user.commissionRate) {
        const rate = parseFloat(user.commissionRate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
          errors.push('Commission rate must be between 0 and 100');
        }
      }

      if (errors.length > 0) {
        validationErrors.push({ row: rowNumber, errors });
      }
    });

    return validationErrors;
  },

  /**
   * Bulk import users from CSV
   * Requirements: 11.1, 11.5, 11.6
   */
  bulkImport: async (users: CSVUserRow[]): Promise<BulkImportResult> => {
    const result: BulkImportResult = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process users sequentially to avoid overwhelming the server
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const rowNumber = i + 2; // +2 because index starts at 0 and we skip header

      try {
        const createData: CreateUserRequest = {
          name: user.name,
          email: user.email.toLowerCase(),
          phone: user.phone,
          internalRole: user.role.toLowerCase(),
          commissionRate: user.commissionRate ? parseFloat(user.commissionRate) : undefined
        };

        // Note: Territory and supervisor lookup would need additional API calls
        // For now, we'll skip these fields in bulk import
        // They can be assigned later through the UI

        await api.post('/api/internal/users', createData);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          email: user.email,
          error: error.response?.data?.message || error.message || 'Unknown error'
        });
      }
    }

    return result;
  },

  /**
   * Export users to CSV
   * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
   */
  exportUsers: async (filters?: GetUsersFilters, format: 'csv' | 'pdf' = 'csv'): Promise<Blob> => {
    if (format === 'pdf') {
      throw new Error('PDF export not yet implemented');
    }

    // Fetch all users with current filters (no pagination)
    const response = await api.get('/api/internal/users', {
      params: { ...filters, limit: 10000 }
    });

    const users: InternalUser[] = response.data.data || [];

    // Generate CSV content
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Territory', 'Commission Rate', 'Last Login'];
    const csvRows = [headers.join(',')];

    users.forEach(user => {
      const row = [
        user.name,
        user.email,
        user.phone || '',
        user.internalRole.replace('_', ' ').toUpperCase(),
        user.isActive ? 'Active' : 'Inactive',
        user.territoryId || '',
        user.commissionRate ? `${user.commissionRate}%` : '',
        user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'
      ];
      
      // Escape commas and quotes in values
      const escapedRow = row.map(value => {
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      
      csvRows.push(escapedRow.join(','));
    });

    const csvContent = csvRows.join('\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  },

  /**
   * Download CSV template for bulk import
   * Requirements: 11.2
   */
  downloadCSVTemplate: (): Blob => {
    const headers = ['name', 'email', 'phone', 'role', 'territory', 'commissionRate', 'supervisorEmail'];
    const exampleRow = [
      'John Doe',
      'john.doe@example.com',
      '+911234567890',
      'agent',
      'territory-id',
      '5.0',
      'manager@example.com'
    ];
    
    const csvContent = [
      headers.join(','),
      exampleRow.join(',')
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }
};

export default internalUserService;

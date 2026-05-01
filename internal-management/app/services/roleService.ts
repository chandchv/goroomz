import { api } from './api';

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  defaultPermissions: {
    canOnboardProperties?: boolean;
    canApproveOnboardings?: boolean;
    canManageAgents?: boolean;
    canAccessAllProperties?: boolean;
    canManageSystemSettings?: boolean;
    canViewAuditLogs?: boolean;
    canManageCommissions?: boolean;
    canManageTerritories?: boolean;
    canManageTickets?: boolean;
    canBroadcastAnnouncements?: boolean;
  };
  isCustom: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleData {
  name: string;
  displayName: string;
  description: string;
  defaultPermissions: Record<string, boolean>;
}

export interface UpdateRoleData {
  displayName?: string;
  description?: string;
  defaultPermissions?: Record<string, boolean>;
}

export interface RoleUser {
  id: string;
  name: string;
  email: string;
  internalRole: string;
  isActive: boolean;
  lastLoginAt?: string;
}

class RoleService {
  /**
   * Get all roles
   */
  async getRoles(): Promise<Role[]> {
    const response = await api.get('/api/internal/roles');
    return response.data.data;
  }

  /**
   * Get a specific role by ID
   */
  async getRole(id: string): Promise<Role> {
    const response = await api.get(`/api/internal/roles/${id}`);
    return response.data.data;
  }

  /**
   * Create a custom role (superuser only)
   */
  async createRole(data: CreateRoleData): Promise<Role> {
    const response = await api.post('/api/internal/roles', data);
    return response.data.data;
  }

  /**
   * Update role permissions
   */
  async updateRole(id: string, data: UpdateRoleData): Promise<Role> {
    const response = await api.put(`/api/internal/roles/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete a custom role
   */
  async deleteRole(id: string): Promise<void> {
    await api.delete(`/api/internal/roles/${id}`);
  }

  /**
   * Get users with a specific role
   */
  async getRoleUsers(id: string): Promise<RoleUser[]> {
    const response = await api.get(`/api/internal/roles/${id}/users`);
    return response.data.data;
  }
}

export default new RoleService();

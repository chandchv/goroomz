import { api } from './api';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    staffRole?: 'front_desk' | 'housekeeping' | 'maintenance' | 'manager' | null;
    internalRole?: 'agent' | 'regional_manager' | 'operations_manager' | 'platform_admin' | 'superuser' | null;
    permissions?: {
      canCheckIn?: boolean;
      canCheckOut?: boolean;
      canManageRooms?: boolean;
      canRecordPayments?: boolean;
      canViewReports?: boolean;
      canManageStaff?: boolean;
      canUpdateRoomStatus?: boolean;
      canManageMaintenance?: boolean;
    };
    internalPermissions?: {
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
    territoryId?: string | null;
    managerId?: string | null;
    commissionRate?: number | null;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  staffRole?: 'front_desk' | 'housekeeping' | 'maintenance' | 'manager' | null;
  internalRole?: 'agent' | 'regional_manager' | 'operations_manager' | 'platform_admin' | 'superuser' | null;
  permissions?: {
    canCheckIn?: boolean;
    canCheckOut?: boolean;
    canManageRooms?: boolean;
    canRecordPayments?: boolean;
    canViewReports?: boolean;
    canManageStaff?: boolean;
    canUpdateRoomStatus?: boolean;
    canManageMaintenance?: boolean;
  };
  internalPermissions?: {
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
  territoryId?: string | null;
  managerId?: string | null;
  commissionRate?: number | null;
}

class AuthService {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/api/internal/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await api.post('/api/internal/auth/logout');
    } catch (error) {
      // Ignore errors on logout
      console.error('Logout error:', error);
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/api/internal/auth/me');
    // Backend returns { success: true, user: {...} }
    return response.data.user || response.data;
  }
}

export const authService = new AuthService();

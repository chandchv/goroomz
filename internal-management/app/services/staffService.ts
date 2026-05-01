import api from './api';

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  staffRole: 'front_desk' | 'housekeeping' | 'maintenance' | 'manager';
  permissions: {
    canCheckIn: boolean;
    canCheckOut: boolean;
    canManageRooms: boolean;
    canRecordPayments: boolean;
    canViewReports: boolean;
    canManageStaff: boolean;
    canUpdateRoomStatus: boolean;
    canManageMaintenance: boolean;
  };
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffUserData {
  name: string;
  email: string;
  phone?: string;
  staffRole: 'front_desk' | 'housekeeping' | 'maintenance' | 'manager';
  permissions?: StaffUser['permissions'];
  password?: string;
  generatePasswordFlag?: boolean;
}

export interface UpdateStaffUserData {
  name?: string;
  email?: string;
  phone?: string;
  staffRole?: 'front_desk' | 'housekeeping' | 'maintenance' | 'manager';
  permissions?: StaffUser['permissions'];
}

export interface StaffListResponse {
  success: boolean;
  count: number;
  data: StaffUser[];
}

export interface StaffResponse {
  success: boolean;
  message: string;
  data: StaffUser;
  generatedPassword?: string;
}

const staffService = {
  /**
   * Get all staff users
   */
  async getStaffUsers(filters?: { role?: string; active?: boolean }): Promise<StaffUser[]> {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.active !== undefined) params.append('active', String(filters.active));

    const response = await api.get<StaffListResponse>(
      `/api/internal/staff${params.toString() ? `?${params.toString()}` : ''}`
    );
    return response.data.data;
  },

  /**
   * Create a new staff user
   */
  async createStaffUser(data: CreateStaffUserData): Promise<StaffResponse> {
    const response = await api.post<StaffResponse>('/api/internal/staff', data);
    return response.data;
  },

  /**
   * Update a staff user
   */
  async updateStaffUser(id: string, data: UpdateStaffUserData): Promise<StaffResponse> {
    const response = await api.put<StaffResponse>(`/api/internal/staff/${id}`, data);
    return response.data;
  },

  /**
   * Delete a staff user
   */
  async deleteStaffUser(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/api/internal/staff/${id}`
    );
    return response.data;
  },

  /**
   * Update staff user permissions
   */
  async updateStaffPermissions(
    id: string,
    permissions: Partial<StaffUser['permissions']>
  ): Promise<StaffResponse> {
    const response = await api.put<StaffResponse>(`/api/internal/staff/${id}/permissions`, {
      permissions,
    });
    return response.data;
  },
};

export default staffService;

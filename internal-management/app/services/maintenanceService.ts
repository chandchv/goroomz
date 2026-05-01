import { api } from './api';

export interface MaintenanceRequest {
  id: string;
  roomId: string;
  roomNumber?: string;
  floorNumber?: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  reportedBy: string;
  reportedByName?: string;
  assignedTo?: string;
  assignedToName?: string;
  reportedDate: string;
  expectedCompletionDate?: string;
  completedDate?: string;
  workPerformed?: string;
  costIncurred?: number;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaintenanceRequest {
  roomId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  expectedCompletionDate?: string;
  images?: string[];
}

export interface UpdateMaintenanceRequest {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  expectedCompletionDate?: string;
  workPerformed?: string;
  costIncurred?: number;
}

export interface MaintenanceFilters {
  status?: string;
  priority?: string;
  roomId?: string;
  floor?: number;
}

const maintenanceService = {
  // Get all maintenance requests with optional filters
  getRequests: async (filters?: MaintenanceFilters): Promise<MaintenanceRequest[]> => {
    const response = await api.get('/api/internal/maintenance/requests', { params: filters });
    return response.data;
  },

  // Create a new maintenance request
  createRequest: async (data: CreateMaintenanceRequest): Promise<MaintenanceRequest> => {
    const response = await api.post('/api/internal/maintenance/requests', data);
    return response.data;
  },

  // Update a maintenance request
  updateRequest: async (id: string, data: UpdateMaintenanceRequest): Promise<MaintenanceRequest> => {
    const response = await api.put(`/internal/maintenance/requests/${id}`, data);
    return response.data;
  },

  // Get maintenance history for a room
  getHistory: async (roomId: string): Promise<MaintenanceRequest[]> => {
    const response = await api.get(`/internal/maintenance/requests/${roomId}/history`);
    return response.data;
  },
};

export default maintenanceService;

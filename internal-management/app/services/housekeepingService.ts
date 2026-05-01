import { api } from './api';

export interface HousekeepingTask {
  id: string;
  roomId?: string;
  roomNumber: string;
  floorNumber: number;
  status: string;
  taskType?: string;
  checkoutTime?: string;
  timeSinceCheckout?: number; // in hours
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string | null;
  description?: string;
  estimatedDuration?: number;
  createdAt?: string;
  updatedAt?: string;
  dueDate?: string;
}

export interface HousekeepingLog {
  id: string;
  roomId: string;
  cleanedBy: string;
  cleanedByName?: string;
  cleanedAt: string;
  timeTaken: number; // in minutes
  checklistCompleted: Array<{ item: string; completed: boolean }>;
  issuesFound?: string;
  notes?: string;
}

export interface CompleteCleaningRequest {
  roomId: string;
  timeTaken: number;
  checklistCompleted: Array<{ item: string; completed: boolean }>;
  issuesFound?: string;
  notes?: string;
}

const housekeepingService = {
  // Get pending housekeeping tasks (vacant/dirty rooms)
  getTasks: async (floorNumber?: number): Promise<HousekeepingTask[]> => {
    const params = floorNumber ? { floor: floorNumber } : {};
    const response = await api.get('/api/internal/housekeeping/tasks', { params });
    // Handle both array and object response formats
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },

  // Mark room as clean
  completeTask: async (roomId: string, data: CompleteCleaningRequest): Promise<void> => {
    await api.post(`/api/internal/housekeeping/tasks/${roomId}/complete`, data);
  },

  // Get cleaning history for a room
  getHistory: async (roomId: string): Promise<HousekeepingLog[]> => {
    const response = await api.get(`/api/internal/housekeeping/history/${roomId}`);
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },
};

export default housekeepingService;

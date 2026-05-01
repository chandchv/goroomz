import api from './api';

export interface Territory {
  id: string;
  name: string;
  description: string;
  regionalManagerId: string;
  boundaries: {
    type: string;
    coordinates: number[][][];
  };
  cities: string[];
  states: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TerritoryStatistics {
  totalProperties: number;
  totalAgents: number;
  totalLeads: number;
  averageOccupancy: number;
  totalRevenue: number;
}

export interface TerritoryAgent {
  id: string;
  name: string;
  email: string;
  phone: string;
  commissionRate: number;
  totalLeads: number;
  approvedLeads: number;
  totalCommission: number;
}

const territoryService = {
  // Get all territories
  getTerritories: async () => {
    const response = await api.get('/api/internal/territories');
    return response.data;
  },

  // Get territory by ID
  getTerritory: async (id: string) => {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Territory ID is required and cannot be undefined');
    }
    const response = await api.get(`/api/internal/territories/${id}`);
    return response.data;
  },

  // Create territory
  createTerritory: async (data: Partial<Territory>) => {
    const response = await api.post('/api/internal/territories', data);
    return response.data;
  },

  // Update territory
  updateTerritory: async (id: string, data: Partial<Territory>) => {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Territory ID is required and cannot be undefined');
    }
    const response = await api.put(`/api/internal/territories/${id}`, data);
    return response.data;
  },

  // Delete territory
  deleteTerritory: async (id: string) => {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Territory ID is required and cannot be undefined');
    }
    const response = await api.delete(`/api/internal/territories/${id}`);
    return response.data;
  },

  // Get agents in territory
  getTerritoryAgents: async (id: string): Promise<TerritoryAgent[]> => {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Territory ID is required and cannot be undefined');
    }
    const response = await api.get(`/api/internal/territories/${id}/agents`);
    return response.data;
  },

  // Assign agent to territory
  assignAgent: async (territoryId: string, agentId: string) => {
    if (!territoryId || territoryId === 'undefined' || territoryId === 'null') {
      throw new Error('Territory ID is required and cannot be undefined');
    }
    if (!agentId || agentId === 'undefined' || agentId === 'null') {
      throw new Error('Agent ID is required and cannot be undefined');
    }
    const response = await api.post(`/api/internal/territories/${territoryId}/assign-agent`, {
      agentId,
    });
    return response.data;
  },

  // Get properties in territory
  getTerritoryProperties: async (id: string) => {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Territory ID is required and cannot be undefined');
    }
    const response = await api.get(`/api/internal/territories/${id}/properties`);
    return response.data;
  },

  // Get territory statistics
  getTerritoryStatistics: async (id: string): Promise<TerritoryStatistics> => {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Territory ID is required and cannot be undefined');
    }
    const response = await api.get(`/api/internal/territories/${id}/statistics`);
    return response.data;
  },
};

export default territoryService;

import api from './api';

export interface AgentTarget {
  id: string;
  agentId: string;
  territoryId: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  targetProperties: number;
  targetRevenue: number;
  actualProperties: number;
  actualRevenue: number;
  setBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TargetProgress {
  targetId: string;
  agentName: string;
  targetProperties: number;
  actualProperties: number;
  propertiesProgress: number;
  targetRevenue: number;
  actualRevenue: number;
  revenueProgress: number;
}

const targetService = {
  // Get all targets (filtered by role)
  getTargets: async (filters?: {
    agentId?: string;
    territoryId?: string;
    period?: string;
  }) => {
    const response = await api.get('/api/internal/targets', { params: filters });
    return response.data;
  },

  // Get target by ID
  getTarget: async (id: string) => {
    const response = await api.get(`/internal/targets/${id}`);
    return response.data;
  },

  // Create target for agent
  createTarget: async (data: Partial<AgentTarget>) => {
    const response = await api.post('/api/internal/targets', data);
    return response.data;
  },

  // Update target
  updateTarget: async (id: string, data: Partial<AgentTarget>) => {
    const response = await api.put(`/internal/targets/${id}`, data);
    return response.data;
  },

  // Delete target
  deleteTarget: async (id: string) => {
    const response = await api.delete(`/internal/targets/${id}`);
    return response.data;
  },

  // Get agent targets
  getAgentTargets: async (agentId: string): Promise<AgentTarget[]> => {
    const response = await api.get(`/internal/targets/agent/${agentId}`);
    return response.data;
  },

  // Get target progress for multiple agents
  getTeamTargetProgress: async (territoryId: string): Promise<TargetProgress[]> => {
    const response = await api.get('/api/internal/targets', {
      params: { territoryId },
    });
    
    // Transform the data to include progress calculations
    const targets = response.data;
    return targets.map((target: AgentTarget) => ({
      targetId: target.id,
      agentName: '', // Will be populated from agent data
      targetProperties: target.targetProperties,
      actualProperties: target.actualProperties,
      propertiesProgress: target.targetProperties > 0 
        ? (target.actualProperties / target.targetProperties) * 100 
        : 0,
      targetRevenue: target.targetRevenue,
      actualRevenue: target.actualRevenue,
      revenueProgress: target.targetRevenue > 0 
        ? (target.actualRevenue / target.targetRevenue) * 100 
        : 0,
    }));
  },
};

export default targetService;

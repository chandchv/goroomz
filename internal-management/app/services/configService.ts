import api from './api';

export interface CommissionRateConfig {
  defaultRate: number;
  rateByPropertyType?: {
    hotel?: number;
    pg?: number;
  };
  minimumRate: number;
  maximumRate: number;
}

export interface RegionalSettings {
  id: string;
  name: string;
  description: string;
  cities: string[];
  states: string[];
  isActive: boolean;
}

export interface PlatformPolicies {
  paymentTerms: {
    dueDate: number; // days
    lateFeePercentage: number;
    gracePeriod: number; // days
  };
  cancellationPolicy: {
    fullRefundDays: number;
    partialRefundDays: number;
    partialRefundPercentage: number;
  };
  serviceFees: {
    bookingFeePercentage: number;
    platformFeePercentage: number;
  };
  subscriptionPlans: {
    basic: {
      monthlyPrice: number;
      maxProperties: number;
      maxRooms: number;
    };
    premium: {
      monthlyPrice: number;
      maxProperties: number;
      maxRooms: number;
    };
    enterprise: {
      monthlyPrice: number;
      maxProperties: number;
      maxRooms: number;
    };
  };
}

const configService = {
  // Commission Rate Configuration
  getCommissionRates: async (): Promise<CommissionRateConfig> => {
    const response = await api.get('/api/internal/config/commission-rates');
    return response.data;
  },

  updateCommissionRates: async (config: CommissionRateConfig): Promise<CommissionRateConfig> => {
    const response = await api.put('/api/internal/config/commission-rates', config);
    return response.data;
  },

  // Regional Settings
  getRegionalSettings: async (): Promise<RegionalSettings[]> => {
    const response = await api.get('/api/internal/config/regions');
    return response.data;
  },

  createRegionalSetting: async (data: Partial<RegionalSettings>): Promise<RegionalSettings> => {
    const response = await api.post('/api/internal/config/regions', data);
    return response.data;
  },

  updateRegionalSetting: async (
    id: string,
    data: Partial<RegionalSettings>
  ): Promise<RegionalSettings> => {
    const response = await api.put(`/internal/config/regions/${id}`, data);
    return response.data;
  },

  deleteRegionalSetting: async (id: string): Promise<void> => {
    await api.delete(`/internal/config/regions/${id}`);
  },

  // Platform Policies
  getPlatformPolicies: async (): Promise<PlatformPolicies> => {
    const response = await api.get('/api/internal/config/policies');
    return response.data;
  },

  updatePlatformPolicies: async (policies: Partial<PlatformPolicies>): Promise<PlatformPolicies> => {
    const response = await api.put('/api/internal/config/policies', policies);
    return response.data;
  },

  // Get all configuration
  getAllConfig: async () => {
    const [commissionRates, regionalSettings, platformPolicies] = await Promise.all([
      configService.getCommissionRates(),
      configService.getRegionalSettings(),
      configService.getPlatformPolicies(),
    ]);

    return {
      commissionRates,
      regionalSettings,
      platformPolicies,
    };
  },
};

export default configService;

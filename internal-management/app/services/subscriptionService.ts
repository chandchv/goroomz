import api from './api';

export interface Subscription {
  id: string;
  propertyOwnerId: string;
  plan: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  billingCycle: 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  paymentStatus: 'paid' | 'pending' | 'failed';
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingHistory {
  id: string;
  subscriptionId: string;
  propertyOwnerId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId?: string;
  billingDate: string;
  dueDate: string;
  paidDate?: string;
  createdAt: string;
}

export interface Discount {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  maxUses?: number;
  currentUses: number;
}

export interface SubscriptionUpgrade {
  currentPlan: string;
  newPlan: string;
  proratedCharge: number;
  effectiveDate: string;
}

const subscriptionService = {
  // Get all subscriptions
  getSubscriptions: async (filters?: {
    status?: string;
    plan?: string;
    ownerId?: string;
  }): Promise<Subscription[]> => {
    const response = await api.get('/api/internal/subscriptions', { params: filters });
    return response.data;
  },

  // Get subscription by owner ID
  getOwnerSubscription: async (ownerId: string): Promise<Subscription> => {
    const response = await api.get(`/internal/subscriptions/${ownerId}`);
    return response.data;
  },

  // Upgrade subscription
  upgradeSubscription: async (
    subscriptionId: string,
    newPlan: string
  ): Promise<SubscriptionUpgrade> => {
    const response = await api.put(`/internal/subscriptions/${subscriptionId}/upgrade`, {
      newPlan,
    });
    return response.data;
  },

  // Apply discount to subscription
  applyDiscount: async (subscriptionId: string, discountCode: string): Promise<Subscription> => {
    const response = await api.put(`/internal/subscriptions/${subscriptionId}/discount`, {
      discountCode,
    });
    return response.data;
  },

  // Get billing history
  getBillingHistory: async (subscriptionId: string): Promise<BillingHistory[]> => {
    const response = await api.get(`/internal/subscriptions/${subscriptionId}/billing-history`);
    return response.data;
  },

  // Get all discounts
  getDiscounts: async (filters?: { isActive?: boolean }): Promise<Discount[]> => {
    const response = await api.get('/api/internal/discounts', { params: filters });
    return response.data;
  },

  // Create discount
  createDiscount: async (data: Partial<Discount>): Promise<Discount> => {
    const response = await api.post('/api/internal/discounts', data);
    return response.data;
  },

  // Update discount
  updateDiscount: async (id: string, data: Partial<Discount>): Promise<Discount> => {
    const response = await api.put(`/internal/discounts/${id}`, data);
    return response.data;
  },

  // Delete discount
  deleteDiscount: async (id: string): Promise<void> => {
    await api.delete(`/internal/discounts/${id}`);
  },

  // Cancel subscription
  cancelSubscription: async (subscriptionId: string, reason?: string): Promise<Subscription> => {
    const response = await api.put(`/internal/subscriptions/${subscriptionId}/cancel`, {
      reason,
    });
    return response.data;
  },

  // Reactivate subscription
  reactivateSubscription: async (subscriptionId: string): Promise<Subscription> => {
    const response = await api.put(`/internal/subscriptions/${subscriptionId}/reactivate`);
    return response.data;
  },
};

export default subscriptionService;

/**
 * Notification Service
 * 
 * Handles all notification-related API calls
 * Requirements: 26.1, 28.2
 */

import api from './api';

export interface Notification {
  id: string;
  userId: string;
  type: 'alert' | 'lead_assignment' | 'approval_request' | 'commission_payment' | 'ticket_assignment' | 'system_announcement' | 'announcement' | 'reminder';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'dismissed';
  deliveryMethod: ('in_app' | 'email' | 'sms')[];
  metadata?: Record<string, any>;
  readAt?: string;
  dismissedAt?: string;
  scheduledFor?: string;
  sentAt?: string;
  emailSent: boolean;
  smsSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  notifications: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  alertTypes: {
    zero_occupancy: boolean;
    payment_failure: boolean;
    high_priority_ticket: boolean;
    system_error: boolean;
    lead_assignment: boolean;
    approval_request: boolean;
    commission_payment: boolean;
  };
  deliveryTiming: {
    immediate: string[];
    daily_digest: string[];
    weekly_summary: string[];
  };
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const notificationService = {
  /**
   * Get user notifications with optional filters
   * Requirements: 26.3, 26.4
   */
  async getNotifications(params?: {
    status?: 'unread' | 'read' | 'dismissed';
    type?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationListResponse> {
    const response = await api.get('/api/notifications', { params });
    return response.data.data;
  },

  /**
   * Get unread notification count
   * Requirements: 26.4
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get('/api/notifications/unread-count');
    return response.data.data.unreadCount;
  },

  /**
   * Get specific notification by ID
   * Requirements: 26.4
   */
  async getNotification(id: string): Promise<Notification> {
    const response = await api.get(`/api/notifications/${id}`);
    return response.data.data;
  },

  /**
   * Mark notification as read
   * Requirements: 26.5
   */
  async markAsRead(id: string): Promise<Notification> {
    const response = await api.put(`/api/notifications/${id}/read`);
    return response.data.data;
  },

  /**
   * Dismiss notification
   * Requirements: 26.5
   */
  async dismissNotification(id: string): Promise<Notification> {
    const response = await api.put(`/api/notifications/${id}/dismiss`);
    return response.data.data;
  },

  /**
   * Mark all notifications as read
   * Requirements: 26.5
   */
  async markAllAsRead(): Promise<{ updatedCount: number }> {
    const response = await api.put('/api/notifications/mark-all-read');
    return response.data.data;
  },

  /**
   * Delete notification
   * Requirements: 26.5
   */
  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/api/notifications/${id}`);
  },

  /**
   * Get notification preferences
   * Requirements: 26.1, 26.2
   */
  async getPreferences(): Promise<NotificationPreferences> {
    const response = await api.get('/api/notifications/preferences');
    return response.data.data;
  },

  /**
   * Update notification preferences
   * Requirements: 26.1, 26.2
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const response = await api.put('/api/notifications/preferences', preferences);
    return response.data.data;
  },

  /**
   * Send test notification (admin only)
   * Requirements: 26.2
   */
  async sendTestNotification(data: {
    userId: string;
    type?: string;
    title: string;
    message: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<Notification> {
    const response = await api.post('/api/notifications/test', data);
    return response.data.data;
  },

  /**
   * Get active alerts (operations managers)
   * Requirements: 14.5
   */
  async getActiveAlerts(params?: {
    type?: string;
    severity?: string;
    limit?: number;
  }): Promise<any[]> {
    const response = await api.get('/api/notifications/alerts/active', { params });
    return response.data.data;
  },

  /**
   * Get pending property claims count (for admin badge)
   * Requirements: 1.5
   */
  async getPendingClaimsCount(): Promise<number> {
    const response = await api.get('/api/notifications/pending-claims-count');
    return response.data.data.pendingClaimsCount;
  },
};

export default notificationService;

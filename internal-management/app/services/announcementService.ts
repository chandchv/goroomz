import { api } from './api';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetAudience: 'all_property_owners' | 'specific_region' | 'specific_property_type';
  targetFilters?: {
    regions?: string[];
    propertyTypes?: string[];
  };
  createdBy: string;
  createdByName?: string;
  scheduledAt?: string;
  sentAt?: string;
  deliveryMethod: ('email' | 'in_app' | 'sms')[];
  readCount: number;
  totalRecipients: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  targetAudience: string;
  targetFilters?: {
    regions?: string[];
    propertyTypes?: string[];
  };
  scheduledAt?: string;
  deliveryMethod: string[];
}

export interface UpdateAnnouncementData {
  title?: string;
  content?: string;
  targetAudience?: string;
  targetFilters?: {
    regions?: string[];
    propertyTypes?: string[];
  };
  scheduledAt?: string;
  deliveryMethod?: string[];
}

export interface AnnouncementStatistics {
  id: string;
  totalRecipients: number;
  readCount: number;
  readPercentage: number;
  deliveryStatus: {
    email?: { sent: number; failed: number };
    inApp?: { delivered: number };
    sms?: { sent: number; failed: number };
  };
}

export interface AnnouncementFilters {
  targetAudience?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

class AnnouncementService {
  /**
   * Get all announcements with optional filters
   */
  async getAnnouncements(filters?: AnnouncementFilters): Promise<{ data: Announcement[]; total: number; page: number; limit: number }> {
    const response = await api.get('/api/internal/announcements', { params: filters });
    return response.data;
  }

  /**
   * Get a specific announcement by ID
   */
  async getAnnouncement(announcementId: string): Promise<Announcement> {
    const response = await api.get(`/internal/announcements/${announcementId}`);
    return response.data.data;
  }

  /**
   * Create a new announcement
   */
  async createAnnouncement(data: CreateAnnouncementData): Promise<Announcement> {
    const response = await api.post('/api/internal/announcements', data);
    return response.data.data;
  }

  /**
   * Update an announcement
   */
  async updateAnnouncement(announcementId: string, data: UpdateAnnouncementData): Promise<Announcement> {
    const response = await api.put(`/internal/announcements/${announcementId}`, data);
    return response.data.data;
  }

  /**
   * Delete an announcement
   */
  async deleteAnnouncement(announcementId: string): Promise<void> {
    await api.delete(`/internal/announcements/${announcementId}`);
  }

  /**
   * Send an announcement immediately
   */
  async sendAnnouncement(announcementId: string): Promise<Announcement> {
    const response = await api.post(`/internal/announcements/${announcementId}/send`);
    return response.data.data;
  }

  /**
   * Get announcement delivery statistics
   */
  async getStatistics(announcementId: string): Promise<AnnouncementStatistics> {
    const response = await api.get(`/internal/announcements/${announcementId}/statistics`);
    return response.data.data;
  }
}

export const announcementService = new AnnouncementService();

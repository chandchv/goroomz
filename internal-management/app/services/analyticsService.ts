import { api } from './api';

export interface PlatformMetrics {
  totalProperties: number;
  totalBookings: number;
  totalRevenue: number;
  averageOccupancy: number;
  activePropertyOwners: number;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
}

export interface PropertyHealthMetric {
  propertyId: string;
  propertyName: string;
  ownerName: string;
  ownerEmail: string;
  occupancyRate: number;
  lastBookingDate?: string;
  daysSinceLastBooking: number;
  pendingPayments: number;
  maintenanceIssues: number;
  healthScore: number;
  issues: string[];
}

export interface BookingTrend {
  date: string;
  bookings: number;
  revenue: number;
  occupancy: number;
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  bookings: number;
}

export interface RegionalBreakdown {
  region: string;
  properties: number;
  bookings: number;
  revenue: number;
  occupancy: number;
}

export interface PropertyTypeBreakdown {
  propertyType: string;
  count: number;
  bookings: number;
  revenue: number;
  occupancy: number;
}

export interface PlatformAnalytics {
  metrics: PlatformMetrics;
  bookingTrends: BookingTrend[];
  revenueTrends: RevenueTrend[];
  regionalBreakdown: RegionalBreakdown[];
  propertyTypeBreakdown: PropertyTypeBreakdown[];
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  region?: string;
  propertyType?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface PropertyHealthFilters {
  minOccupancy?: number;
  maxOccupancy?: number;
  minHealthScore?: number;
  maxHealthScore?: number;
  hasIssues?: boolean;
  region?: string;
  page?: number;
  limit?: number;
}

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'excel';
  startDate?: string;
  endDate?: string;
  includeCharts?: boolean;
}

class AnalyticsService {
  /**
   * Get platform-wide analytics
   */
  async getPlatformAnalytics(filters?: AnalyticsFilters): Promise<PlatformAnalytics> {
    const response = await api.get('/api/internal/analytics/platform', { params: filters });
    return response.data.data;
  }

  /**
   * Get property health metrics
   */
  async getPropertyHealth(filters?: PropertyHealthFilters): Promise<{ data: PropertyHealthMetric[]; total: number }> {
    const response = await api.get('/api/internal/analytics/property-health', { params: filters });
    return response.data;
  }

  /**
   * Get booking trends
   */
  async getBookingTrends(filters?: AnalyticsFilters): Promise<BookingTrend[]> {
    const response = await api.get('/api/internal/analytics/booking-trends', { params: filters });
    return response.data.data;
  }

  /**
   * Get revenue trends
   */
  async getRevenueTrends(filters?: AnalyticsFilters): Promise<RevenueTrend[]> {
    const response = await api.get('/api/internal/analytics/revenue-trends', { params: filters });
    return response.data.data;
  }

  /**
   * Get regional breakdown
   */
  async getRegionalBreakdown(filters?: AnalyticsFilters): Promise<RegionalBreakdown[]> {
    const response = await api.get('/api/internal/analytics/regional', { params: filters });
    return response.data.data;
  }

  /**
   * Export analytics report
   */
  async exportReport(options: ExportOptions): Promise<Blob> {
    const response = await api.post('/api/internal/analytics/export', options, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Get real-time platform metrics
   */
  async getRealTimeMetrics(): Promise<PlatformMetrics> {
    const response = await api.get('/api/internal/analytics/realtime');
    return response.data.data;
  }
}

export const analyticsService = new AnalyticsService();

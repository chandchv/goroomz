import { api } from './api';

// Report types
export type ReportType = 'occupancy' | 'revenue' | 'bookings' | 'housekeeping' | 'payments';
export type ExportFormat = 'csv' | 'pdf';

// Occupancy Report Types
export interface OccupancyByCategory {
  category: string;
  totalRooms: number;
  occupancyPercentage: number;
}

export interface OccupancyByFloor {
  floor: number;
  totalRooms: number;
  occupancyPercentage: number;
}

export interface OccupancyReportData {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
  occupancyPercentage: number;
  byCategory: OccupancyByCategory[];
  byFloor: OccupancyByFloor[];
}

// Revenue Report Types
export interface RevenueByCategory {
  category: string;
  revenue: number;
  percentage: number;
}

export interface RevenueBySource {
  source: string;
  revenue: number;
  percentage: number;
}

export interface RevenueByFloor {
  floor: number;
  revenue: number;
}

export interface PaymentStatus {
  paid: number;
  pending: number;
  overdue: number;
}

export interface RevenueComparison {
  previousPeriod: {
    startDate: string;
    endDate: string;
    revenue: number;
  };
  change: number;
  percentageChange: number;
}

export interface RevenueReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  totalRevenue: number;
  totalPayments: number;
  byCategory: RevenueByCategory[];
  bySource: RevenueBySource[];
  byFloor: RevenueByFloor[];
  paymentStatus: PaymentStatus;
  comparison?: RevenueComparison;
}

// Booking Report Types
export interface StatusBreakdown {
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  completionRate: number;
  cancellationRate: number;
}

export interface SourceDistribution {
  online: number;
  offline: number;
  onlinePercentage: number;
  offlinePercentage: number;
}

export interface GuestStatistics {
  totalGuests: number;
  repeatGuests: number;
  averageStayDuration: number;
}

export interface PopularRoomType {
  category: string;
  count: number;
}

export interface BookingTrend {
  date: string;
  count: number;
}

export interface BookingReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  totalBookings: number;
  statusBreakdown: StatusBreakdown;
  sourceDistribution: SourceDistribution;
  guestStatistics: GuestStatistics;
  popularRoomTypes: PopularRoomType[];
  trends: BookingTrend[];
}

// Housekeeping Report Types
export interface StatusDistribution {
  date: string;
  occupied: number;
  vacant_clean: number;
  vacant_dirty: number;
}

export interface CleanerPerformance {
  name: string;
  roomsCleaned: number;
  averageTime: number;
}

export interface HousekeepingReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  totalRoomsCleaned: number;
  pendingTasks: number;
  averageCleaningTime: number;
  averageTurnoverTime: number;
  roomsCleanedPerDay: number;
  statusDistribution: StatusDistribution[];
  cleanerPerformance: CleanerPerformance[];
}

// Payment Collection Report Types
export interface PaymentSummary {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionEfficiency: number;
}

export interface PaymentTiming {
  onTimePayments: number;
  latePayments: number;
  onTimePercentage: number;
  latePercentage: number;
}

export interface PaymentTrend {
  month: string;
  collected: number;
  count: number;
}

export interface Defaulter {
  name: string;
  email: string;
  roomNumber: string;
  totalOverdue: number;
  latePayments: number;
  totalPayments: number;
  latePaymentRate: number;
}

export interface PaymentCollectionReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: PaymentSummary;
  paymentTiming: PaymentTiming;
  trends: PaymentTrend[];
  defaulters: Defaulter[];
}

// Report Parameters
export interface ReportParams {
  startDate: string;
  endDate: string;
  propertyId?: string;
  compareWithPrevious?: boolean;
}

export interface ExportParams {
  reportType: ReportType;
  format: ExportFormat;
  startDate: string;
  endDate: string;
  propertyId?: string;
}

class ReportService {
  /**
   * Generate occupancy report
   */
  async getOccupancyReport(params: ReportParams): Promise<OccupancyReportData> {
    const response = await api.get('/api/internal/reports/occupancy', { params });
    return response.data.data;
  }

  /**
   * Generate revenue report
   */
  async getRevenueReport(params: ReportParams): Promise<RevenueReportData> {
    const response = await api.get('/api/internal/reports/revenue', { params });
    return response.data.data;
  }

  /**
   * Generate booking report
   */
  async getBookingReport(params: ReportParams): Promise<BookingReportData> {
    const response = await api.get('/api/internal/reports/bookings', { params });
    return response.data.data;
  }

  /**
   * Generate housekeeping report
   */
  async getHousekeepingReport(params: ReportParams): Promise<HousekeepingReportData> {
    const response = await api.get('/api/internal/reports/housekeeping', { params });
    return response.data.data;
  }

  /**
   * Generate payment collection report (PG-specific)
   */
  async getPaymentCollectionReport(params: ReportParams): Promise<PaymentCollectionReportData> {
    const response = await api.get('/api/internal/reports/payments', { params });
    return response.data.data;
  }

  /**
   * Export report to CSV or PDF
   */
  async exportReport(params: ExportParams): Promise<Blob> {
    const response = await api.post('/api/internal/reports/export', params, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Download exported report
   */
  downloadReport(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const reportService = new ReportService();

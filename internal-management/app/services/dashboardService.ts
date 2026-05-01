import { api } from './api';

export interface OccupancyData {
  rate: number;
  totalRooms: number;
  occupiedRooms: number;
  vacantRooms: number;
}

export interface RevenueData {
  currentMonth: number;
  currency: string;
}

export interface PaymentsData {
  pendingCount: number;
  pendingAmount: number;
}

export interface RoomStatusData {
  occupied: number;
  vacant_clean: number;
  vacant_dirty: number;
}

export interface KPIData {
  occupancy: OccupancyData;
  revenue: RevenueData;
  payments: PaymentsData;
  roomStatus: RoomStatusData;
}

export interface CheckInActivity {
  id: string;
  guestName: string;
  guestPhone: string;
  roomNumber: string;
  floorNumber: number;
  checkInTime: string;
  guests: number;
  status: string;
}

export interface CheckOutActivity {
  id: string;
  guestName: string;
  guestPhone: string;
  roomNumber: string;
  floorNumber: number;
  checkOutTime: string;
  guests: number;
  status: string;
}

export interface PaymentDueActivity {
  id: string;
  bookingId: string;
  guestName: string;
  roomNumber: string;
  amount: number;
  dueDate: string;
  status: string;
}

export interface ActivitiesData {
  checkIns: CheckInActivity[];
  checkOuts: CheckOutActivity[];
  paymentsDue: PaymentDueActivity[];
}

export interface OverduePaymentAlert {
  id: string;
  bookingId: string;
  guestName: string;
  guestPhone: string;
  roomNumber: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

export interface MaintenanceAlert {
  id: string;
  roomNumber: string;
  floorNumber: number;
  title: string;
  priority: string;
  status: string;
  reportedDate: string;
}

export interface DirtyRoomAlert {
  id: string;
  roomNumber: string;
  floorNumber: number;
  title: string;
  hoursDirty: number;
  lastCleanedAt: string | null;
}

export interface AlertsData {
  overduePayments: OverduePaymentAlert[];
  pendingMaintenance: MaintenanceAlert[];
  dirtyRooms: DirtyRoomAlert[];
}

class DashboardService {
  /**
   * Get key performance indicators for the dashboard
   */
  async getKPIs(propertyId?: string): Promise<KPIData> {
    const params = propertyId ? { propertyId } : {};
    const response = await api.get('/api/internal/dashboard/kpis', { params });
    return response.data.data;
  }

  /**
   * Get today's activities (check-ins, check-outs, payments due)
   */
  async getActivities(propertyId?: string): Promise<ActivitiesData> {
    const params = propertyId ? { propertyId } : {};
    const response = await api.get('/api/internal/dashboard/activities', { params });
    return response.data.data;
  }

  /**
   * Get alerts (overdue payments, maintenance, dirty rooms)
   */
  async getAlerts(propertyId?: string): Promise<AlertsData> {
    const params = propertyId ? { propertyId } : {};
    const response = await api.get('/api/internal/dashboard/alerts', { params });
    return response.data.data;
  }
}

export const dashboardService = new DashboardService();

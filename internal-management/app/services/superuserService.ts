import api from './api';

export interface PropertyOwner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  propertiesCount?: number;
  properties?: Property[];
}

export interface Property {
  id: string;
  name: string;
  description?: string;
  type: 'Hotel' | 'PG';
  address?: string;
  location?: {
    address: string;
    city: string;
    state: string;
    pincode?: string;
    country: string;
  };
  ownerId: string;
  totalRooms?: number;
  occupancyRate?: number;
  monthlyRevenue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyOwnerFormData {
  name: string;
  email: string;
  phone?: string;
  role?: 'owner' | 'category_owner';
  sendCredentials?: boolean;
  propertyName?: string;
  propertyType?: 'Hotel' | 'PG';
  propertyAddress?: string;
}

export interface PropertyFormData {
  ownerId: string;
  name: string;
  description: string;
  propertyType: 'Hotel' | 'PG';
  categoryId?: string;
  location: {
    address: string;
    city: string;
    state: string;
    pincode?: string;
    country: string;
  };
  amenities?: string[];
  rules?: string[];
}

export interface BulkRoomCreationData {
  propertyId: string;
  floorType?: 'regular' | 'ground' | 'basement';
  floorNumber: number;
  startRoom: number;
  endRoom: number;
  categoryId?: string;
  sharingType?: 'single' | '2_sharing' | '3_sharing' | 'quad' | 'dormitory';
  dailyRate?: number;
  monthlyRate?: number;
}

export interface PropertyStatistics {
  totalRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  monthlyRevenue: number;
  totalRevenue: number;
  recentBookings: any[];
}

export interface GeneratedCredentials {
  email: string;
  password: string;
  loginUrl: string;
}

class SuperuserService {
  // Property Owner Management
  async getPropertyOwners(filters?: { search?: string; status?: string }): Promise<PropertyOwner[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    
    const response = await api.get(`/api/internal/superuser/property-owners?${params.toString()}`);
    // Backend returns { success: true, data: { propertyOwners: [...] } }
    return response.data?.data?.propertyOwners || response.data || [];
  }

  async getPropertyOwner(id: string): Promise<PropertyOwner> {
    const response = await api.get(`/api/internal/superuser/property-owners/${id}`);
    // Backend returns { success: true, data: { propertyOwner: {...} } }
    return response.data?.data?.propertyOwner || response.data;
  }

  async createPropertyOwner(data: PropertyOwnerFormData): Promise<{ owner: PropertyOwner; credentials: GeneratedCredentials }> {
    const response = await api.post('/api/internal/superuser/property-owners', data);
    // Backend returns { success: true, data: { propertyOwner: {...}, credentials: {...} } }
    const responseData = response.data?.data || response.data;
    return {
      owner: responseData.propertyOwner || responseData.owner,
      credentials: responseData.credentials
    };
  }

  async updatePropertyOwner(id: string, data: Partial<PropertyOwnerFormData>): Promise<PropertyOwner> {
    const response = await api.put(`/api/internal/superuser/property-owners/${id}`, data);
    // Backend returns { success: true, data: { propertyOwner: {...} } }
    return response.data?.data?.propertyOwner || response.data;
  }

  async deactivatePropertyOwner(id: string): Promise<void> {
    await api.put(`/api/internal/superuser/property-owners/${id}/deactivate`);
  }

  async sendCredentialsEmail(ownerId: string, credentials: GeneratedCredentials): Promise<void> {
    await api.post(`/api/internal/superuser/property-owners/${ownerId}/send-credentials`, credentials);
  }

  // Property Management
  async createProperty(data: PropertyFormData): Promise<Property> {
    const response = await api.post('/api/internal/superuser/properties', data);
    return response.data?.data?.property || response.data;
  }

  async updateProperty(id: string, data: Partial<PropertyFormData>): Promise<Property> {
    const response = await api.put(`/api/internal/superuser/properties/${id}`, data);
    return response.data?.data?.property || response.data;
  }

  async bulkCreateRooms(data: BulkRoomCreationData): Promise<{ created: number; rooms: any[]; warnings?: string[] }> {
    const response = await api.post('/api/internal/rooms/bulk-create', data);
    const responseData = response.data?.data || response.data;
    return {
      created: responseData.created || 0,
      rooms: responseData.rooms || [],
      warnings: responseData.warnings
    };
  }

  async transferPropertyOwnership(propertyId: string, newOwnerId: string): Promise<Property> {
    const response = await api.put(`/api/internal/superuser/properties/${propertyId}/transfer-ownership`, {
      newOwnerId,
    });
    return response.data?.data?.property || response.data;
  }

  async getPropertyStatistics(propertyId: string): Promise<PropertyStatistics> {
    const response = await api.get(`/api/internal/superuser/properties/${propertyId}/statistics`);
    const stats = response.data?.data?.statistics || response.data;
    return {
      totalRooms: stats.totalRooms || 0,
      occupiedRooms: stats.occupiedRooms || 0,
      occupancyRate: stats.currentOccupancy || 0,
      monthlyRevenue: stats.totalRevenue || 0,
      totalRevenue: stats.totalRevenue || 0,
      recentBookings: []
    };
  }
}

export default new SuperuserService();

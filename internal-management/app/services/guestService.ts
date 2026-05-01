import { api } from './api';

export interface GuestAddress {
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface GuestProfile {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  phone: string;
  address?: GuestAddress;
  idType?: 'aadhaar' | 'pan' | 'passport' | 'driving_license' | 'voter_id';
  idNumber?: string;
  idVerified: boolean;
  idVerifiedAt?: string;
  idVerifiedBy?: string;
  totalStays: number;
  lastStayDate?: string;
  createdAt: string;
  updatedAt: string;
  documents?: GuestDocument[];
}

export interface GuestDocument {
  id: string;
  guestProfileId: string;
  bookingId?: string;
  documentType: 'id_front' | 'id_back' | 'other';
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: string;
  uploadedAt: string;
}

export interface GuestSearchResponse {
  success: boolean;
  count: number;
  total: number;
  page?: number;
  pages?: number;
  data: GuestProfile[];
}

export interface GuestLookupResponse {
  success: boolean;
  found: boolean;
  message?: string;
  data?: {
    id: string;
    name: string;
    email?: string;
    phone: string;
    address?: GuestAddress;
    idType?: string;
    idVerified: boolean;
    totalStays: number;
    lastStayDate?: string;
  };
}

export interface CreateGuestData {
  name: string;
  phone: string;
  email?: string;
  address?: GuestAddress;
  idType?: 'aadhaar' | 'pan' | 'passport' | 'driving_license' | 'voter_id';
  idNumber?: string;
  userId?: string;
}

export interface UpdateGuestData {
  name?: string;
  phone?: string;
  email?: string;
  address?: GuestAddress;
  idType?: 'aadhaar' | 'pan' | 'passport' | 'driving_license' | 'voter_id';
  idNumber?: string;
  idVerified?: boolean;
}

export interface UploadGuestDocumentData {
  file: File;
  documentType: 'id_front' | 'id_back' | 'other';
  bookingId?: string;
}

class GuestService {
  /**
   * Search guests by name, phone, email, or ID number
   */
  async searchGuests(params: {
    q?: string;
    phone?: string;
    email?: string;
    idNumber?: string;
    page?: number;
    limit?: number;
  }): Promise<GuestSearchResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.q) searchParams.append('q', params.q);
    if (params.phone) searchParams.append('phone', params.phone);
    if (params.email) searchParams.append('email', params.email);
    if (params.idNumber) searchParams.append('idNumber', params.idNumber);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const response = await api.get(`/api/guests?${searchParams.toString()}`);
    return response.data;
  }

  /**
   * Lookup guest by phone number (for returning guest check)
   */
  async lookupByPhone(phone: string): Promise<GuestLookupResponse> {
    // Clean phone number - remove non-digits and take last 10 digits
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const response = await api.get(`/api/guests/lookup/phone/${cleanPhone}`);
    return response.data;
  }

  /**
   * Get guest profile by ID
   */
  async getGuestById(guestId: string): Promise<GuestProfile> {
    const response = await api.get(`/api/guests/${guestId}`);
    return response.data.data.profile;
  }

  /**
   * Get guest profile with stay history
   */
  async getGuestWithHistory(guestId: string): Promise<{
    profile: GuestProfile;
    stayHistory: any[];
    totalStays: number;
    lastStayDate?: string;
  }> {
    const response = await api.get(`/api/guests/${guestId}`);
    return response.data.data;
  }

  /**
   * Create a new guest profile
   */
  async createGuest(data: CreateGuestData): Promise<GuestProfile> {
    const response = await api.post('/api/guests', data);
    return response.data.data;
  }

  /**
   * Update guest profile
   */
  async updateGuest(guestId: string, data: UpdateGuestData): Promise<GuestProfile> {
    const response = await api.put(`/api/guests/${guestId}`, data);
    return response.data.data;
  }

  /**
   * Upload ID document for a guest
   */
  async uploadDocument(guestId: string, data: UploadGuestDocumentData): Promise<GuestDocument> {
    const formData = new FormData();
    formData.append('document', data.file);
    formData.append('documentType', data.documentType);
    
    if (data.bookingId) {
      formData.append('bookingId', data.bookingId);
    }

    const response = await api.post(`/api/guests/${guestId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data;
  }

  /**
   * Get documents for a guest
   */
  async getGuestDocuments(guestId: string): Promise<GuestDocument[]> {
    const response = await api.get(`/api/guests/${guestId}/documents`);
    return response.data.data;
  }

  /**
   * Get ID document status for a guest
   */
  async getIdStatus(guestId: string): Promise<{
    guestId: string;
    idVerified: boolean;
    idType?: string;
    idNumber?: string;
    documents: {
      hasFront: boolean;
      hasBack: boolean;
      frontDocument?: GuestDocument;
      backDocument?: GuestDocument;
    };
  }> {
    const response = await api.get(`/api/guests/${guestId}/id-status`);
    return response.data.data;
  }

  /**
   * Download a guest document
   */
  async downloadDocument(guestId: string, documentId: string): Promise<Blob> {
    const response = await api.get(`/api/guests/${guestId}/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Get document download URL
   */
  getDocumentUrl(guestId: string, documentId: string): string {
    return `${api.defaults.baseURL}/api/guests/${guestId}/documents/${documentId}/download`;
  }

  /**
   * Validate ID number format based on ID type
   */
  validateIdNumber(idType: string, idNumber: string): { valid: boolean; error?: string } {
    if (!idNumber || !idType) {
      return { valid: false, error: 'ID type and number are required' };
    }

    const cleanNumber = idNumber.trim().toUpperCase();

    switch (idType) {
      case 'aadhaar':
        // Aadhaar: 12 digits
        if (!/^\d{12}$/.test(cleanNumber)) {
          return { valid: false, error: 'Aadhaar must be 12 digits' };
        }
        break;
      case 'pan':
        // PAN: 10 alphanumeric (format: AAAAA9999A)
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cleanNumber)) {
          return { valid: false, error: 'PAN must be in format AAAAA9999A' };
        }
        break;
      case 'passport':
        // Passport: alphanumeric, 6-9 characters
        if (!/^[A-Z0-9]{6,9}$/.test(cleanNumber)) {
          return { valid: false, error: 'Passport must be 6-9 alphanumeric characters' };
        }
        break;
      case 'driving_license':
        // Driving License: alphanumeric, varies by state
        if (!/^[A-Z0-9]{10,20}$/.test(cleanNumber)) {
          return { valid: false, error: 'Driving License must be 10-20 alphanumeric characters' };
        }
        break;
      case 'voter_id':
        // Voter ID: 10 alphanumeric (format: AAA9999999)
        if (!/^[A-Z]{3}[0-9]{7}$/.test(cleanNumber)) {
          return { valid: false, error: 'Voter ID must be in format AAA9999999' };
        }
        break;
      default:
        return { valid: false, error: 'Invalid ID type' };
    }

    return { valid: true };
  }

  /**
   * Get ID type label for display
   */
  getIdTypeLabel(idType: string): string {
    const labels: Record<string, string> = {
      aadhaar: 'Aadhaar Card',
      pan: 'PAN Card',
      passport: 'Passport',
      driving_license: 'Driving License',
      voter_id: 'Voter ID',
    };
    return labels[idType] || idType;
  }

  /**
   * Validate file for ID document upload
   */
  validateIdDocument(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Only image files (JPEG, PNG, GIF, WebP) are allowed',
      };
    }

    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit`,
      };
    }

    return { valid: true };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

export const guestService = new GuestService();

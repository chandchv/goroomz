import { api } from './api';

export interface Document {
  id: string;
  leadId?: string;
  propertyOwnerId?: string;
  documentType: 'business_license' | 'property_photos' | 'owner_id' | 'tax_certificate' | 'other';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  status: 'pending_review' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  uploader?: {
    id: string;
    name: string;
    email: string;
  };
  reviewer?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface DocumentListResponse {
  success: boolean;
  count: number;
  data: Document[];
}

export interface DocumentResponse {
  success: boolean;
  data: Document;
}

export interface UploadDocumentData {
  file: File;
  documentType: 'business_license' | 'property_photos' | 'owner_id' | 'tax_certificate' | 'other';
  leadId?: string;
  propertyOwnerId?: string;
}

export interface ReviewDocumentData {
  status: 'approved' | 'rejected';
  reviewNotes?: string;
}

class DocumentService {
  /**
   * Upload a document
   */
  async uploadDocument(data: UploadDocumentData): Promise<Document> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('documentType', data.documentType);
    
    if (data.leadId) {
      formData.append('leadId', data.leadId);
    }
    
    if (data.propertyOwnerId) {
      formData.append('propertyOwnerId', data.propertyOwnerId);
    }

    const response = await api.post('/api/internal/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.data;
  }

  /**
   * Get a single document by ID
   */
  async getDocumentById(documentId: string): Promise<Document> {
    const response = await api.get(`/api/internal/documents/${documentId}`);
    return response.data.data;
  }

  /**
   * Get all documents for a lead
   */
  async getLeadDocuments(leadId: string): Promise<Document[]> {
    const response = await api.get(`/api/internal/documents/lead/${leadId}`);
    return response.data.data;
  }

  /**
   * Get all documents for a property owner
   */
  async getPropertyOwnerDocuments(propertyOwnerId: string): Promise<Document[]> {
    const response = await api.get(`/api/internal/documents/property-owner/${propertyOwnerId}`);
    return response.data.data;
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    await api.delete(`/api/internal/documents/${documentId}`);
  }

  /**
   * Review a document (approve or reject)
   */
  async reviewDocument(documentId: string, data: ReviewDocumentData): Promise<Document> {
    const response = await api.put(`/api/internal/documents/${documentId}/review`, data);
    return response.data.data;
  }

  /**
   * Download a document
   */
  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await api.get(`/api/internal/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Get document download URL
   */
  getDocumentUrl(documentId: string): string {
    return `${api.defaults.baseURL}/api/internal/documents/${documentId}/download`;
  }

  /**
   * Validate file before upload
   */
  validateFile(
    file: File,
    allowedTypes: string[] = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    maxSizeMB: number = 10
  ): { valid: boolean; error?: string } {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`,
      };
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
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

  /**
   * Get document type label
   */
  getDocumentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      business_license: 'Business License',
      property_photos: 'Property Photos',
      owner_id: 'Owner ID',
      tax_certificate: 'Tax Certificate',
      other: 'Other',
    };
    return labels[type] || type;
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file is an image
   */
  isImageFile(fileName: string): boolean {
    const ext = this.getFileExtension(fileName);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  }

  /**
   * Check if file is a PDF
   */
  isPdfFile(fileName: string): boolean {
    const ext = this.getFileExtension(fileName);
    return ext === 'pdf';
  }

  /**
   * Get required documents for property onboarding
   */
  getRequiredDocuments(): string[] {
    return ['business_license', 'property_photos', 'owner_id'];
  }

  /**
   * Check if all required documents are uploaded and approved
   */
  checkRequiredDocuments(documents: Document[]): {
    allUploaded: boolean;
    allApproved: boolean;
    missing: string[];
    pendingReview: string[];
    rejected: string[];
  } {
    const required = this.getRequiredDocuments();
    const uploadedTypes = documents.map(doc => doc.documentType as string);
    const approvedTypes = documents
      .filter(doc => doc.status === 'approved')
      .map(doc => doc.documentType as string);
    const pendingTypes = documents
      .filter(doc => doc.status === 'pending_review')
      .map(doc => doc.documentType as string);
    const rejectedTypes = documents
      .filter(doc => doc.status === 'rejected')
      .map(doc => doc.documentType as string);

    const missing = required.filter(type => !uploadedTypes.includes(type));
    const pendingReview = required.filter(type => pendingTypes.includes(type));
    const rejected = required.filter(type => rejectedTypes.includes(type));

    return {
      allUploaded: missing.length === 0,
      allApproved: required.every(type => approvedTypes.includes(type)),
      missing,
      pendingReview,
      rejected,
    };
  }
}

export const documentService = new DocumentService();

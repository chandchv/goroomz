import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { useToast } from '../../hooks/useToast';
import { documentService, type Document } from '../../services/documentService';

interface DocumentUploadComponentProps {
  leadId?: string;
  propertyOwnerId?: string;
  onUploadComplete?: (document: Document) => void;
  allowedTypes?: string[];
  maxSizeMB?: number;
}

const DEFAULT_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const DEFAULT_MAX_SIZE_MB = 10;

export default function DocumentUploadComponent({
  leadId,
  propertyOwnerId,
  onUploadComplete,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
}: DocumentUploadComponentProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('other');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const documentTypes = [
    { value: 'business_license', label: 'Business License' },
    { value: 'property_photos', label: 'Property Photos' },
    { value: 'owner_id', label: 'Owner ID' },
    { value: 'tax_certificate', label: 'Tax Certificate' },
    { value: 'other', label: 'Other' },
  ];

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `File type not allowed. Allowed types: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`;
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    return null;
  }

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    const error = validateFile(file);
    if (error) {
      showToast({ title: error, type: 'error' });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast({ title: 'Please select a file to upload', type: 'error' });
      return;
    }

    if (!leadId && !propertyOwnerId) {
      showToast({ title: 'Lead ID or Property Owner ID is required', type: 'error' });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload document using service
      const uploadedDocument = await documentService.uploadDocument({
        file: selectedFile,
        documentType: documentType as any,
        leadId,
        propertyOwnerId,
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      showToast({ title: 'Document uploaded successfully', type: 'success' });
      
      // Reset form
      setSelectedFile(null);
      setDocumentType('other');
      setUploadProgress(0);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Call callback if provided
      if (onUploadComplete) {
        onUploadComplete(uploadedDocument);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      showToast({ 
        title: error.response?.data?.message || 'Failed to upload document', 
        type: 'error' 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Document Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Document Type
        </label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          disabled={uploading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
        >
          {documentTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Drag and Drop Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept={allowedTypes.join(',')}
          disabled={uploading}
          className="hidden"
        />

        {!selectedFile ? (
          <div className="space-y-3">
            <svg
              className="w-12 h-12 text-gray-400 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div>
              <p className="text-gray-700 font-medium">
                Drag and drop your file here, or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supported formats: PDF, JPG, PNG (Max {maxSizeMB}MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <svg
              className="w-12 h-12 text-green-500 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-gray-900 font-medium">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {selectedFile && !uploading && (
        <div className="flex space-x-3">
          <button
            onClick={handleUpload}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Upload Document
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { guestService, type GuestAddress, type GuestDocument } from '../../services/guestService';

export type IdType = 'aadhaar' | 'pan' | 'passport' | 'driving_license' | 'voter_id';

export interface IdVerificationData {
  mode: 'upload' | 'manual';
  idType?: IdType;
  idNumber?: string;
  address?: GuestAddress;
  idFrontFile?: File;
  idBackFile?: File;
  idFrontPreview?: string;
  idBackPreview?: string;
  existingDocuments?: {
    front?: GuestDocument;
    back?: GuestDocument;
  };
}

interface IdVerificationSectionProps {
  guestProfileId?: string;
  bookingId?: string;
  initialData?: Partial<IdVerificationData>;
  onVerificationChange: (data: IdVerificationData, isValid: boolean) => void;
  disabled?: boolean;
}

const ID_TYPES: { value: IdType; label: string; placeholder: string }[] = [
  { value: 'aadhaar', label: 'Aadhaar Card', placeholder: '123456789012' },
  { value: 'pan', label: 'PAN Card', placeholder: 'ABCDE1234F' },
  { value: 'passport', label: 'Passport', placeholder: 'A1234567' },
  { value: 'driving_license', label: 'Driving License', placeholder: 'DL1234567890' },
  { value: 'voter_id', label: 'Voter ID', placeholder: 'ABC1234567' },
];

export default function IdVerificationSection({
  guestProfileId,
  bookingId,
  initialData,
  onVerificationChange,
  disabled = false,
}: IdVerificationSectionProps) {
  const [mode, setMode] = useState<'upload' | 'manual'>(initialData?.mode || 'upload');
  const [idType, setIdType] = useState<IdType | ''>(initialData?.idType || '');
  const [idNumber, setIdNumber] = useState(initialData?.idNumber || '');
  const [address, setAddress] = useState<GuestAddress>(initialData?.address || {});
  
  // File upload state
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(initialData?.idFrontPreview || null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(initialData?.idBackPreview || null);
  const [existingDocuments, setExistingDocuments] = useState<{ front?: GuestDocument; back?: GuestDocument }>({});
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Validation state
  const [idNumberError, setIdNumberError] = useState<string | null>(null);
  
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Load existing documents if guest profile exists
  useEffect(() => {
    if (guestProfileId) {
      loadExistingDocuments();
    }
  }, [guestProfileId]);

  const loadExistingDocuments = async () => {
    if (!guestProfileId) return;
    
    try {
      const documents = await guestService.getGuestDocuments(guestProfileId);
      const front = documents.find(d => d.documentType === 'id_front');
      const back = documents.find(d => d.documentType === 'id_back');
      setExistingDocuments({ front, back });
    } catch (error) {
      console.error('Error loading existing documents:', error);
    }
  };

  // Validate and notify parent of changes
  useEffect(() => {
    const isValid = validateVerification();
    const data: IdVerificationData = {
      mode,
      idType: idType || undefined,
      idNumber: idNumber || undefined,
      address,
      idFrontFile: idFrontFile || undefined,
      idBackFile: idBackFile || undefined,
      idFrontPreview: idFrontPreview || undefined,
      idBackPreview: idBackPreview || undefined,
      existingDocuments: Object.keys(existingDocuments).length > 0 ? existingDocuments : undefined,
    };
    onVerificationChange(data, isValid);
  }, [mode, idType, idNumber, address, idFrontFile, idBackFile, existingDocuments]);

  const validateVerification = (): boolean => {
    if (mode === 'upload') {
      // For upload mode, need at least front ID image (or existing document)
      return !!(idFrontFile || existingDocuments.front);
    } else {
      // For manual mode, need ID type, number, and address
      if (!idType || !idNumber) return false;
      
      // Validate ID number format
      const validation = guestService.validateIdNumber(idType, idNumber);
      if (!validation.valid) return false;
      
      // Need at least city and state in address
      if (!address.city || !address.state) return false;
      
      return true;
    }
  };

  const handleIdNumberChange = (value: string) => {
    setIdNumber(value);
    
    if (idType && value) {
      const validation = guestService.validateIdNumber(idType, value);
      setIdNumberError(validation.valid ? null : validation.error || null);
    } else {
      setIdNumberError(null);
    }
  };

  const handleIdTypeChange = (value: IdType | '') => {
    setIdType(value);
    
    if (value && idNumber) {
      const validation = guestService.validateIdNumber(value, idNumber);
      setIdNumberError(validation.valid ? null : validation.error || null);
    } else {
      setIdNumberError(null);
    }
  };

  const handleFileSelect = async (file: File, type: 'front' | 'back') => {
    // Validate file
    const validation = guestService.validateIdDocument(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }
    
    setUploadError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'front') {
        setIdFrontFile(file);
        setIdFrontPreview(reader.result as string);
      } else {
        setIdBackFile(file);
        setIdBackPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
    
    // If guest profile exists, upload immediately
    if (guestProfileId) {
      setUploading(true);
      try {
        await guestService.uploadDocument(guestProfileId, {
          file,
          documentType: type === 'front' ? 'id_front' : 'id_back',
          bookingId,
        });
        // Reload documents
        await loadExistingDocuments();
      } catch (error: any) {
        setUploadError(error.response?.data?.message || 'Failed to upload document');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleAddressChange = (field: keyof GuestAddress, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const clearFile = (type: 'front' | 'back') => {
    if (type === 'front') {
      setIdFrontFile(null);
      setIdFrontPreview(null);
      if (frontInputRef.current) frontInputRef.current.value = '';
    } else {
      setIdBackFile(null);
      setIdBackPreview(null);
      if (backInputRef.current) backInputRef.current.value = '';
    }
  };

  const getIdTypePlaceholder = (): string => {
    const found = ID_TYPES.find(t => t.value === idType);
    return found?.placeholder || 'Enter ID number';
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center space-x-4 mb-4">
        <span className="text-sm font-medium text-gray-700">Verification Method:</span>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            type="button"
            onClick={() => setMode('upload')}
            disabled={disabled}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'upload'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Upload ID
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            disabled={disabled}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'manual'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Manual Entry
          </button>
        </div>
      </div>

      {/* Upload Mode */}
      {mode === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload photos of the guest's ID card (front and back)
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Front ID Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Front <span className="text-red-500">*</span>
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center ${
                  idFrontPreview || existingDocuments.front
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 hover:border-primary-400'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !disabled && frontInputRef.current?.click()}
              >
                {idFrontPreview ? (
                  <div className="relative">
                    <img
                      src={idFrontPreview}
                      alt="ID Front"
                      className="max-h-32 mx-auto rounded"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile('front');
                      }}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : existingDocuments.front ? (
                  <div className="text-green-600">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">ID Front uploaded</p>
                    <p className="text-xs text-gray-500">{existingDocuments.front.fileName}</p>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Click to upload front of ID</p>
                    <p className="text-xs">JPEG, PNG, GIF, WebP (max 5MB)</p>
                  </div>
                )}
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={disabled}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, 'front');
                  }}
                />
              </div>
            </div>

            {/* Back ID Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Back (Optional)
              </label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center ${
                  idBackPreview || existingDocuments.back
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 hover:border-primary-400'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !disabled && backInputRef.current?.click()}
              >
                {idBackPreview ? (
                  <div className="relative">
                    <img
                      src={idBackPreview}
                      alt="ID Back"
                      className="max-h-32 mx-auto rounded"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFile('back');
                      }}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : existingDocuments.back ? (
                  <div className="text-green-600">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">ID Back uploaded</p>
                    <p className="text-xs text-gray-500">{existingDocuments.back.fileName}</p>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Click to upload back of ID</p>
                    <p className="text-xs">JPEG, PNG, GIF, WebP (max 5MB)</p>
                  </div>
                )}
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={disabled}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, 'back');
                  }}
                />
              </div>
            </div>
          </div>

          {uploading && (
            <div className="text-sm text-primary-600 flex items-center">
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Uploading document...
            </div>
          )}

          {uploadError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {uploadError}
            </div>
          )}
        </div>
      )}

      {/* Manual Entry Mode */}
      {mode === 'manual' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the guest's ID details and address manually
          </p>

          {/* ID Type and Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Type <span className="text-red-500">*</span>
              </label>
              <select
                value={idType}
                onChange={(e) => handleIdTypeChange(e.target.value as IdType | '')}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
              >
                <option value="">Select ID Type</option>
                {ID_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => handleIdNumberChange(e.target.value.toUpperCase())}
                placeholder={getIdTypePlaceholder()}
                disabled={disabled || !idType}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 ${
                  idNumberError ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {idNumberError && (
                <p className="text-xs text-red-600 mt-1">{idNumberError}</p>
              )}
            </div>
          </div>

          {/* Address Fields */}
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Guest Address</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Street Address</label>
                <input
                  type="text"
                  value={address.street || ''}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="House/Flat No., Street Name"
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={address.city || ''}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    placeholder="City"
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={address.state || ''}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    placeholder="State"
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={address.pincode || ''}
                    onChange={(e) => handleAddressChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit pincode"
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Country</label>
                  <input
                    type="text"
                    value={address.country || 'India'}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                    placeholder="Country"
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

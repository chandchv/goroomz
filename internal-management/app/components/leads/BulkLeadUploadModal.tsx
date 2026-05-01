import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, X, FileSpreadsheet, AlertCircle, CheckCircle, 
  Download, Loader2, FileText, Trash2 
} from 'lucide-react';
import { leadService, BulkLeadData, BulkValidationResult, BulkUploadResult } from '../../services/leadService';

interface BulkLeadUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadStep = 'upload' | 'preview' | 'validating' | 'validated' | 'uploading' | 'complete';

export const BulkLeadUploadModal: React.FC<BulkLeadUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<UploadStep>('upload');
  const [leads, setLeads] = useState<BulkLeadData[]>([]);
  const [validationResult, setValidationResult] = useState<BulkValidationResult | null>(null);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep('upload');
    setLeads([]);
    setValidationResult(null);
    setUploadResult(null);
    setError(null);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseCSV = (text: string): BulkLeadData[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV must have header row and at least one data row');

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: BulkLeadData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        // Map common CSV headers to our field names
        const fieldMap: Record<string, string> = {
          'property_owner_name': 'propertyOwnerName',
          'owner_name': 'propertyOwnerName',
          'name': 'propertyOwnerName',
          'property_type': 'propertyType',
          'type': 'propertyType',
          'business_name': 'businessName',
          'estimated_rooms': 'estimatedRooms',
          'rooms': 'estimatedRooms'
        };
        
        const fieldName = fieldMap[header.toLowerCase()] || header;
        
        if (fieldName === 'estimatedRooms') {
          row[fieldName] = parseInt(value) || 1;
        } else if (fieldName === 'amenities') {
          row[fieldName] = value ? value.split(';').map(a => a.trim()) : [];
        } else {
          row[fieldName] = value;
        }
      });

      if (row.propertyOwnerName && row.email) {
        data.push(row as BulkLeadData);
      }
    }

    return data;
  };

  const parseJSON = (text: string): BulkLeadData[] => {
    const parsed = JSON.parse(text);
    const data = Array.isArray(parsed) ? parsed : parsed.leads || parsed.data || [];
    return data;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    try {
      const text = await file.text();
      let parsedLeads: BulkLeadData[];

      if (file.name.endsWith('.csv')) {
        parsedLeads = parseCSV(text);
      } else if (file.name.endsWith('.json')) {
        parsedLeads = parseJSON(text);
      } else {
        throw new Error('Unsupported file format. Please use CSV or JSON.');
      }

      if (parsedLeads.length === 0) {
        throw new Error('No valid leads found in file');
      }

      if (parsedLeads.length > 500) {
        throw new Error('Maximum 500 leads can be uploaded at once');
      }

      setLeads(parsedLeads);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const handleValidate = async () => {
    setStep('validating');
    setError(null);

    try {
      const result = await leadService.validateBulkUpload(leads);
      setValidationResult(result);
      setStep('validated');
    } catch (err: any) {
      setError(err.message || 'Validation failed');
      setStep('preview');
    }
  };

  const handleUpload = async () => {
    setStep('uploading');
    setError(null);

    try {
      const result = await leadService.bulkUploadLeads(leads, skipDuplicates);
      setUploadResult(result);
      setStep('complete');
      if (result.successful > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setStep('validated');
    }
  };

  const downloadTemplate = async () => {
    try {
      const template = await leadService.getBulkUploadTemplate();
      const csvContent = generateCSVTemplate(template.sampleData);
      downloadFile(csvContent, 'lead_upload_template.csv', 'text/csv');
    } catch (err) {
      // Fallback template
      const fallbackCSV = `propertyOwnerName,email,phone,propertyType,estimatedRooms,address,city,state,country,pincode,businessName,amenities,notes
John Doe,john@example.com,9876543210,hotel,20,"123 Main Street, Downtown",Bangalore,Karnataka,India,560001,Sunrise Hotel,"wifi;parking;ac",Premium location
Jane Smith,jane@example.com,8765432109,pg,15,"456 College Road",Hyderabad,Telangana,India,500001,Comfort PG,"wifi;meals;laundry",Near university`;
      downloadFile(fallbackCSV, 'lead_upload_template.csv', 'text/csv');
    }
  };

  const generateCSVTemplate = (sampleData: BulkLeadData[]): string => {
    const headers = ['propertyOwnerName', 'email', 'phone', 'propertyType', 'estimatedRooms', 
                     'address', 'city', 'state', 'country', 'pincode', 'businessName', 'amenities', 'notes'];
    
    const rows = sampleData.map(row => 
      headers.map(h => {
        const value = (row as any)[h];
        if (Array.isArray(value)) return `"${value.join(';')}"`;
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return value || '';
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Bulk Lead Upload</h2>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Upload a CSV or JSON file containing property leads. Maximum 500 leads per upload.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
                >
                  <Download className="w-4 h-4" />
                  Download CSV Template
                </button>
              </div>

              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drop your file here or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports CSV and JSON formats
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Required Fields:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-700">
                  <span>• propertyOwnerName</span>
                  <span>• email</span>
                  <span>• phone</span>
                  <span>• propertyType</span>
                  <span>• address</span>
                  <span>• city</span>
                  <span>• state</span>
                </div>
              </div>
            </div>
          )}


          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Preview ({leads.length} leads)</h3>
                <button
                  onClick={resetState}
                  className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leads.slice(0, 10).map((lead, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{lead.propertyOwnerName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.phone}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.propertyType}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{lead.city}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {leads.length > 10 && (
                  <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                    ... and {leads.length - 10} more leads
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="skipDuplicates" className="text-sm text-gray-700">
                  Skip duplicate emails (recommended)
                </label>
              </div>
            </div>
          )}

          {/* Step: Validating */}
          {step === 'validating' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700">Validating leads...</p>
              <p className="text-sm text-gray-500">Checking {leads.length} records</p>
            </div>
          )}

          {/* Step: Validated */}
          {step === 'validated' && validationResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800">{validationResult.total}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{validationResult.valid}</p>
                  <p className="text-sm text-green-600">Valid</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{validationResult.invalid}</p>
                  <p className="text-sm text-red-600">Invalid</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{validationResult.duplicates}</p>
                  <p className="text-sm text-yellow-600">Duplicates</p>
                </div>
              </div>

              {validationResult.errors.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b">
                    <h4 className="font-medium text-red-800">Validation Errors</h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {validationResult.errors.map((err, index) => (
                      <div key={index} className="px-4 py-2 border-b last:border-b-0 text-sm">
                        <span className="font-medium text-gray-700">Row {err.row}</span>
                        <span className="text-gray-500 mx-2">({err.email})</span>
                        <ul className="text-red-600 mt-1">
                          {err.errors.map((e, i) => (
                            <li key={i}>• {e}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validationResult.valid > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700">
                    <CheckCircle className="w-5 h-5 inline mr-2" />
                    {validationResult.valid} leads are ready to upload
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step: Uploading */}
          {step === 'uploading' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700">Uploading leads...</p>
              <p className="text-sm text-gray-500">This may take a moment</p>
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && uploadResult && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800">Upload Complete!</h3>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800">{uploadResult.total}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{uploadResult.successful}</p>
                  <p className="text-sm text-green-600">Created</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{uploadResult.skipped}</p>
                  <p className="text-sm text-yellow-600">Skipped</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{uploadResult.failed}</p>
                  <p className="text-sm text-red-600">Failed</p>
                </div>
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b">
                    <h4 className="font-medium text-red-800">Failed Records</h4>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {uploadResult.errors.map((err, index) => (
                      <div key={index} className="px-4 py-2 border-b last:border-b-0 text-sm">
                        <span className="font-medium">Row {err.row}</span>
                        <span className="text-gray-500 mx-2">({err.email})</span>
                        <span className="text-red-600">- {err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <button
            onClick={step === 'complete' ? handleClose : resetState}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            {step === 'complete' ? 'Close' : 'Cancel'}
          </button>

          <div className="flex gap-3">
            {step === 'preview' && (
              <button
                onClick={handleValidate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Validate Data
              </button>
            )}
            {step === 'validated' && validationResult && validationResult.valid > 0 && (
              <button
                onClick={handleUpload}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Upload {validationResult.valid} Leads
              </button>
            )}
            {step === 'complete' && (
              <button
                onClick={() => {
                  resetState();
                  onSuccess();
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload More
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkLeadUploadModal;

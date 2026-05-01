import React, { useState, useRef } from 'react';
import internalUserService, { type CSVUserRow, type BulkImportResult } from '../../services/internalUserService';
import { useToast } from '../../hooks/useToast';
import { IndeterminateProgress } from './BulkOperationProgress';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ValidationError {
  row: number;
  errors: string[];
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedUsers, setParsedUsers] = useState<CSVUserRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'validate' | 'import' | 'complete'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const resetState = () => {
    setFile(null);
    setParsedUsers([]);
    setValidationErrors([]);
    setImportResult(null);
    setStep('upload');
    setLoading(false);
    setParsing(false);
  };

  const handleClose = () => {
    if (!loading && !parsing) {
      resetState();
      onClose();
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      showToast({ title: 'Invalid file type. Please upload a CSV file.', type: 'error' });
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      showToast({ title: 'File too large. Maximum size is 5MB.', type: 'error' });
      return;
    }

    setFile(selectedFile);
    await parseAndValidateFile(selectedFile);
  };

  const parseAndValidateFile = async (fileToProcess: File) => {
    setParsing(true);
    setStep('validate');

    try {
      // Parse CSV
      const users = await internalUserService.parseCSV(fileToProcess);
      setParsedUsers(users);

      // Validate users
      const errors = internalUserService.validateCSVUsers(users);
      setValidationErrors(errors);

      if (errors.length === 0) {
        showToast({ 
          title: `Successfully validated ${users.length} users`, 
          type: 'success' 
        });
      } else {
        showToast({ 
          title: `Found ${errors.length} validation errors`, 
          description: 'Please review and fix errors before importing',
          type: 'warning' 
        });
      }
    } catch (error: any) {
      showToast({ 
        title: 'Failed to parse CSV file', 
        description: error.message,
        type: 'error' 
      });
      setStep('upload');
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = internalUserService.downloadCSVTemplate();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showToast({ title: 'Template downloaded', type: 'success' });
  };

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      showToast({ 
        title: 'Cannot import with validation errors', 
        description: 'Please fix all errors before importing',
        type: 'error' 
      });
      return;
    }

    setLoading(true);
    setStep('import');

    try {
      const result = await internalUserService.bulkImport(parsedUsers);
      setImportResult(result);
      setStep('complete');

      if (result.failed === 0) {
        showToast({ 
          title: 'Import completed successfully', 
          description: `${result.success} users created`,
          type: 'success' 
        });
        onSuccess();
      } else {
        showToast({ 
          title: 'Import completed with errors', 
          description: `${result.success} succeeded, ${result.failed} failed`,
          type: 'warning' 
        });
      }
    } catch (error: any) {
      showToast({ 
        title: 'Import failed', 
        description: error.message,
        type: 'error' 
      });
      setStep('validate');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    resetState();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bulk Import Users</h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 'upload' && 'Upload a CSV file to import multiple users'}
              {step === 'validate' && 'Review and validate user data'}
              {step === 'import' && 'Importing users...'}
              {step === 'complete' && 'Import complete'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={loading || parsing}
          >
            ×
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${step === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Upload</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-200">
              <div className={`h-full transition-all ${
                ['validate', 'import', 'complete'].includes(step) ? 'bg-blue-600 w-full' : 'w-0'
              }`} />
            </div>
            <div className={`flex items-center ${step === 'validate' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'validate' ? 'bg-blue-600 text-white' : 
                ['import', 'complete'].includes(step) ? 'bg-green-600 text-white' : 'bg-gray-200'
              }`}>
                {['import', 'complete'].includes(step) ? '✓' : '2'}
              </div>
              <span className="ml-2 text-sm font-medium">Validate</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-200">
              <div className={`h-full transition-all ${
                ['import', 'complete'].includes(step) ? 'bg-blue-600 w-full' : 'w-0'
              }`} />
            </div>
            <div className={`flex items-center ${['import', 'complete'].includes(step) ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'complete' ? 'bg-green-600 text-white' :
                step === 'import' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                {step === 'complete' ? '✓' : '3'}
              </div>
              <span className="ml-2 text-sm font-medium">Import</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Download Template */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-blue-800">
                      Download CSV Template
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Use our template to ensure your CSV file has the correct format and required columns.
                    </p>
                    <button
                      onClick={handleDownloadTemplate}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Download Template
                    </button>
                  </div>
                </div>
              </div>

              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
                
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                
                <div className="mt-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Select CSV File
                  </button>
                  <p className="mt-2 text-sm text-gray-500">
                    or drag and drop your file here
                  </p>
                </div>
                
                <p className="mt-2 text-xs text-gray-500">
                  CSV files only, maximum 5MB
                </p>
              </div>

              {/* Format Requirements */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  CSV Format Requirements
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Required columns:</strong> name, email, role</li>
                  <li>• <strong>Optional columns:</strong> phone, territory, commissionRate, supervisorEmail</li>
                  <li>• <strong>Valid roles:</strong> agent, regional_manager, operations_manager, platform_admin, superuser</li>
                  <li>• Email addresses must be unique and valid</li>
                  <li>• Commission rate must be between 0 and 100 (for agents)</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Validate */}
          {step === 'validate' && (
            <div className="space-y-4">
              {parsing ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">Parsing and validating CSV file...</p>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600 font-medium">Total Users</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">{parsedUsers.length}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600 font-medium">Valid</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">
                        {parsedUsers.length - validationErrors.length}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-red-600 font-medium">Errors</p>
                      <p className="text-2xl font-bold text-red-900 mt-1">{validationErrors.length}</p>
                    </div>
                  </div>

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-red-800 mb-3">
                        Validation Errors ({validationErrors.length})
                      </h3>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {validationErrors.map((error, index) => (
                          <div key={index} className="bg-white rounded p-3 text-sm">
                            <p className="font-medium text-red-900">Row {error.row}</p>
                            <ul className="mt-1 space-y-1">
                              {error.errors.map((err, errIndex) => (
                                <li key={errIndex} className="text-red-700">• {err}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-sm text-red-700">
                        Please fix these errors in your CSV file and upload again.
                      </p>
                    </div>
                  )}

                  {/* Preview Valid Users */}
                  {parsedUsers.length > 0 && validationErrors.length === 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-green-800 mb-3">
                        Preview ({parsedUsers.length} users ready to import)
                      </h3>
                      <div className="max-h-60 overflow-y-auto">
                        <table className="min-w-full divide-y divide-green-200">
                          <thead className="bg-green-100">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-green-900">Name</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-green-900">Email</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-green-900">Role</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-green-100">
                            {parsedUsers.slice(0, 10).map((user, index) => (
                              <tr key={index}>
                                <td className="px-3 py-2 text-sm text-gray-900">{user.name}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">{user.email}</td>
                                <td className="px-3 py-2 text-sm text-gray-600">
                                  {user.role.replace('_', ' ')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {parsedUsers.length > 10 && (
                          <p className="text-xs text-green-700 mt-2 text-center">
                            Showing first 10 of {parsedUsers.length} users
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 3: Import Progress */}
          {step === 'import' && (
            <IndeterminateProgress
              operation="Importing users..."
              message="This may take a few moments. Please don't close this window."
            />
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && importResult && (
            <div className="space-y-6">
              {/* Success Summary */}
              <div className={`rounded-lg p-6 text-center ${
                importResult.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
                  importResult.failed === 0 ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {importResult.failed === 0 ? (
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>
                <h3 className={`mt-4 text-lg font-semibold ${
                  importResult.failed === 0 ? 'text-green-900' : 'text-yellow-900'
                }`}>
                  {importResult.failed === 0 ? 'Import Completed Successfully!' : 'Import Completed with Errors'}
                </h3>
                <div className="mt-4 grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <div>
                    <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                    <p className="text-sm text-gray-600">Successful</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                    <p className="text-sm text-gray-600">Failed</p>
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-red-800 mb-3">
                    Failed Imports ({importResult.errors.length})
                  </h3>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="bg-white rounded p-3 text-sm">
                        <p className="font-medium text-red-900">
                          Row {error.row}: {error.email}
                        </p>
                        <p className="text-red-700 mt-1">{error.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Message */}
              {importResult.success > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Credentials Sent
                      </h3>
                      <p className="mt-1 text-sm text-blue-700">
                        Login credentials have been sent to all successfully created users via email.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
          {step === 'upload' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <div></div>
            </>
          )}

          {step === 'validate' && !parsing && (
            <>
              <button
                onClick={handleStartOver}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Upload Different File
              </button>
              <button
                onClick={handleImport}
                disabled={validationErrors.length > 0 || parsedUsers.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {parsedUsers.length} Users
              </button>
            </>
          )}

          {step === 'import' && (
            <div className="w-full text-center text-sm text-gray-500">
              Please wait while we import your users...
            </div>
          )}

          {step === 'complete' && (
            <>
              <button
                onClick={handleStartOver}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Import More Users
              </button>
              <button
                onClick={() => {
                  onSuccess();
                  handleClose();
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;

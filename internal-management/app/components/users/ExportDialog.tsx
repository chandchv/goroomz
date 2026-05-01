import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, X } from 'lucide-react';
import type { GetUsersFilters } from '../../services/internalUserService';

export type ExportFormat = 'csv' | 'pdf';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => Promise<void>;
  filters?: GetUsersFilters;
}

export default function ExportDialog({
  isOpen,
  onClose,
  onExport,
  filters
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      await onExport(selectedFormat);
      onClose();
    } catch (err: any) {
      console.error('Export failed:', err);
      setError(err.message || 'Failed to export users. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions = [
    {
      value: 'csv' as ExportFormat,
      label: 'CSV (Excel)',
      description: 'Export as comma-separated values file',
      icon: FileSpreadsheet,
      available: true
    },
    {
      value: 'pdf' as ExportFormat,
      label: 'PDF Document',
      description: 'Export as formatted PDF document',
      icon: FileText,
      available: false // PDF export not yet implemented
    }
  ];

  // Count active filters
  const activeFiltersCount = Object.keys(filters || {}).filter(
    key => filters?.[key as keyof GetUsersFilters] !== undefined && 
           key !== 'page' && 
           key !== 'limit'
  ).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Download className="h-6 w-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">
                Export Users
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isExporting}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Info Message */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <svg
                  className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Export Information</p>
                  <p>
                    {activeFiltersCount > 0
                      ? `Export will include users matching ${activeFiltersCount} active filter${activeFiltersCount > 1 ? 's' : ''}.`
                      : 'Export will include all users.'}
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    Sensitive information like passwords will be excluded.
                  </p>
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Export Format
              </label>
              {formatOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => option.available && setSelectedFormat(option.value)}
                  disabled={!option.available || isExporting}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedFormat === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  } ${
                    !option.available
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  } ${isExporting ? 'cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start">
                    <option.icon
                      className={`h-6 w-6 mr-3 flex-shrink-0 ${
                        selectedFormat === option.value
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {option.label}
                        </span>
                        {!option.available && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {option.description}
                      </p>
                    </div>
                    {selectedFormat === option.value && option.available && (
                      <div className="ml-3 flex-shrink-0">
                        <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                          <svg
                            className="h-3 w-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-600 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || !formatOptions.find(o => o.value === selectedFormat)?.available}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center transition-colors"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

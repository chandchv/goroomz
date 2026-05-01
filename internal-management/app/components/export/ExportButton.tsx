import { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';

export type ExportFormat = 'pdf' | 'csv';

export interface ExportButtonProps {
  onExport: (format: ExportFormat) => Promise<void>;
  label?: string;
  formats?: ExportFormat[];
  disabled?: boolean;
  className?: string;
}

export default function ExportButton({
  onExport,
  label = 'Export',
  formats = ['pdf', 'csv'],
  disabled = false,
  className = ''
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: ExportFormat) => {
    try {
      setIsExporting(true);
      setError(null);
      setShowMenu(false);
      await onExport(format);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getFormatLabel = (format: ExportFormat) => {
    switch (format) {
      case 'pdf':
        return 'Export as PDF';
      case 'csv':
        return 'Export as CSV';
      default:
        return 'Export';
    }
  };

  // If only one format, show simple button
  if (formats.length === 1) {
    return (
      <div className="relative">
        <button
          onClick={() => handleExport(formats[0])}
          disabled={disabled || isExporting}
          className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2"></div>
              Exporting...
            </>
          ) : (
            <>
              {getFormatIcon(formats[0])}
              <span className="ml-2">{label}</span>
            </>
          )}
        </button>
        {error && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-red-50 border border-red-200 rounded-md p-2 text-xs text-red-700 z-10">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Multiple formats - show dropdown menu
  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled || isExporting}
        className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isExporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2"></div>
            Exporting...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span className="ml-2">{label}</span>
            <svg
              className="ml-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </>
        )}
      </button>

      {showMenu && !isExporting && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          ></div>

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1" role="menu">
              {formats.map((format) => (
                <button
                  key={format}
                  onClick={() => handleExport(format)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                  role="menuitem"
                >
                  {getFormatIcon(format)}
                  <span className="ml-3">{getFormatLabel(format)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-red-50 border border-red-200 rounded-md p-2 text-xs text-red-700 z-10">
          {error}
        </div>
      )}
    </div>
  );
}

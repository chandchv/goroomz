import { useState } from 'react';
import { Calendar, Filter, FileText } from 'lucide-react';
import { ExportButton, type ExportFormat } from '../export';

export type ReportType = 
  | 'agent_performance'
  | 'team_performance'
  | 'commission_summary'
  | 'lead_pipeline'
  | 'territory_analytics'
  | 'platform_analytics'
  | 'audit_log';

export interface ReportConfig {
  type: ReportType;
  startDate: string;
  endDate: string;
  filters?: Record<string, any>;
}

export interface ReportGeneratorProps {
  reportTypes: Array<{
    value: ReportType;
    label: string;
    description?: string;
  }>;
  onGenerate: (config: ReportConfig) => Promise<void>;
  onExport?: (config: ReportConfig, format: ExportFormat) => Promise<void>;
  defaultType?: ReportType;
  additionalFilters?: React.ReactNode;
  className?: string;
}

export default function ReportGenerator({
  reportTypes,
  onGenerate,
  onExport,
  defaultType,
  additionalFilters,
  className = ''
}: ReportGeneratorProps) {
  const [selectedType, setSelectedType] = useState<ReportType>(
    defaultType || reportTypes[0]?.value
  );
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedReportType = reportTypes.find((rt) => rt.value === selectedType);

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      await onGenerate({
        type: selectedType,
        startDate,
        endDate
      });
    } catch (err) {
      console.error('Report generation failed:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!onExport) return;

    if (!startDate || !endDate) {
      throw new Error('Please select both start and end dates');
    }

    if (new Date(startDate) > new Date(endDate)) {
      throw new Error('Start date must be before end date');
    }

    await onExport(
      {
        type: selectedType,
        startDate,
        endDate
      },
      format
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center mb-6">
        <FileText className="h-6 w-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-900">Generate Report</h2>
      </div>

      <div className="space-y-6">
        {/* Report Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ReportType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            {reportTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {selectedReportType?.description && (
            <p className="mt-2 text-sm text-gray-500">
              {selectedReportType.description}
            </p>
          )}
        </div>

        {/* Date Range Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        </div>

        {/* Additional Filters */}
        {additionalFilters && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="inline h-4 w-4 mr-1" />
              Filters
            </label>
            {additionalFilters}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </button>

          {onExport && (
            <ExportButton
              onExport={handleExport}
              label="Export Report"
              formats={['pdf', 'csv']}
              disabled={isGenerating}
            />
          )}
        </div>
      </div>
    </div>
  );
}

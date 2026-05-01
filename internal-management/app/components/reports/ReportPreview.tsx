import { useState } from 'react';
import { FileText, Calendar, User, TrendingUp, DollarSign, Target, MapPin } from 'lucide-react';
import { ExportButton, type ExportFormat } from '../export';

export interface ReportMetadata {
  title: string;
  type: string;
  generatedAt: string;
  generatedBy?: string;
  period: {
    startDate: string;
    endDate: string;
  };
  filters?: Record<string, any>;
}

export interface ReportSection {
  title: string;
  type: 'summary' | 'table' | 'chart' | 'text';
  data: any;
}

export interface ReportPreviewProps {
  metadata: ReportMetadata;
  sections: ReportSection[];
  onExport?: (format: ExportFormat) => Promise<void>;
  className?: string;
}

export default function ReportPreview({
  metadata,
  sections,
  onExport,
  className = ''
}: ReportPreviewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(sections.map((_, i) => i))
  );

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getIconForType = (type: string) => {
    switch (type.toLowerCase()) {
      case 'agent_performance':
      case 'team_performance':
        return <User className="h-5 w-5" />;
      case 'commission_summary':
        return <DollarSign className="h-5 w-5" />;
      case 'lead_pipeline':
        return <TrendingUp className="h-5 w-5" />;
      case 'territory_analytics':
        return <MapPin className="h-5 w-5" />;
      case 'platform_analytics':
        return <Target className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const renderSummarySection = (data: any) => {
    if (Array.isArray(data)) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.map((item, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600">{item.label}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{item.value}</div>
              {item.change && (
                <div
                  className={`text-sm mt-1 ${
                    item.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {item.change > 0 ? '+' : ''}
                  {item.change}%
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    return <pre className="text-sm text-gray-700">{JSON.stringify(data, null, 2)}</pre>;
  };

  const renderTableSection = (data: any) => {
    if (!data.headers || !data.rows) {
      return <p className="text-sm text-gray-500">Invalid table data</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {data.headers.map((header: string, index: number) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.rows.map((row: any[], rowIndex: number) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderChartSection = (data: any) => {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-2">Chart visualization</p>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
          <p className="text-gray-400">Chart data: {data.chartType || 'Unknown'}</p>
        </div>
      </div>
    );
  };

  const renderTextSection = (data: any) => {
    if (typeof data === 'string') {
      return <p className="text-sm text-gray-700 whitespace-pre-wrap">{data}</p>;
    }
    return <pre className="text-sm text-gray-700">{JSON.stringify(data, null, 2)}</pre>;
  };

  const renderSection = (section: ReportSection) => {
    switch (section.type) {
      case 'summary':
        return renderSummarySection(section.data);
      case 'table':
        return renderTableSection(section.data);
      case 'chart':
        return renderChartSection(section.data);
      case 'text':
        return renderTextSection(section.data);
      default:
        return <p className="text-sm text-gray-500">Unknown section type</p>;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Report Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 text-blue-600">
              {getIconForType(metadata.type)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{metadata.title}</h2>
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>
                    {formatDate(metadata.period.startDate)} -{' '}
                    {formatDate(metadata.period.endDate)}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <FileText className="h-4 w-4 mr-2" />
                  <span>Generated on {formatDate(metadata.generatedAt)}</span>
                </div>
                {metadata.generatedBy && (
                  <div className="flex items-center text-sm text-gray-500">
                    <User className="h-4 w-4 mr-2" />
                    <span>By {metadata.generatedBy}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {onExport && (
            <ExportButton
              onExport={onExport}
              label="Export"
              formats={['pdf', 'csv']}
            />
          )}
        </div>

        {/* Filters */}
        {metadata.filters && Object.keys(metadata.filters).length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-xs font-medium text-gray-700 mb-2">Applied Filters:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(metadata.filters).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report Sections */}
      <div className="divide-y divide-gray-200">
        {sections.map((section, index) => (
          <div key={index} className="p-6">
            <button
              onClick={() => toggleSection(index)}
              className="w-full flex items-center justify-between text-left mb-4"
            >
              <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
              <svg
                className={`h-5 w-5 text-gray-400 transform transition-transform ${
                  expandedSections.has(index) ? 'rotate-180' : ''
                }`}
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
            </button>

            {expandedSections.has(index) && (
              <div className="mt-4">{renderSection(section)}</div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sections.length === 0 && (
        <div className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No report data</h3>
          <p className="mt-1 text-sm text-gray-500">
            Generate a report to see the preview here.
          </p>
        </div>
      )}
    </div>
  );
}

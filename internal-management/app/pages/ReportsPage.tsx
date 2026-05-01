import { useState } from 'react';
import type { ReportType, ExportFormat } from '../services/reportService';
import { reportService } from '../services/reportService';
import OccupancyReportView from '../components/reports/OccupancyReportView';
import RevenueReportView from '../components/reports/RevenueReportView';
import BookingReportView from '../components/reports/BookingReportView';
import HousekeepingReportView from '../components/reports/HousekeepingReportView';
import PaymentCollectionReportView from '../components/reports/PaymentCollectionReportView';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('occupancy');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [exporting, setExporting] = useState(false);
  const [reportKey, setReportKey] = useState(0); // Used to trigger report regeneration

  const reportTypes: { value: ReportType; label: string; description: string }[] = [
    {
      value: 'occupancy',
      label: 'Occupancy Report',
      description: 'Room utilization and occupancy rates'
    },
    {
      value: 'revenue',
      label: 'Revenue Report',
      description: 'Income analysis and payment tracking'
    },
    {
      value: 'bookings',
      label: 'Booking Report',
      description: 'Booking statistics and trends'
    },
    {
      value: 'housekeeping',
      label: 'Housekeeping Report',
      description: 'Cleaning efficiency and room turnover'
    },
    {
      value: 'payments',
      label: 'Payment Collection Report',
      description: 'Payment collection efficiency (PG-specific)'
    }
  ];

  const handleGenerateReport = () => {
    // Increment key to force report components to regenerate
    setReportKey(prev => prev + 1);
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      const blob = await reportService.exportReport({
        reportType,
        format: exportFormat,
        startDate,
        endDate
      });

      const filename = `${reportType}-report-${startDate}-to-${endDate}.${exportFormat}`;
      reportService.downloadReport(blob, filename);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const isDateRangeValid = () => {
    if (!startDate || !endDate) return false;
    return new Date(endDate) > new Date(startDate);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate and export detailed reports for your property
        </p>
      </div>

      {/* Report Configuration Panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Report Type Selection */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {reportTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setReportType(type.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    reportType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">{type.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>

          {/* Export Format */}
          <div>
            <label htmlFor="exportFormat" className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <select
              id="exportFormat"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              <option value="csv">CSV</option>
              <option value="pdf">PDF (Coming Soon)</option>
            </select>
          </div>

          {/* Additional Options */}
          {reportType === 'revenue' && (
            <div className="lg:col-span-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={compareWithPrevious}
                  onChange={(e) => setCompareWithPrevious(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Compare with previous period
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleGenerateReport}
            disabled={!isDateRangeValid()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Generate Report
          </button>

          <button
            onClick={handleExport}
            disabled={!isDateRangeValid() || exporting || exportFormat === 'pdf'}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`-ml-1 mr-2 h-5 w-5 ${exporting ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {exporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
          </button>

          {!isDateRangeValid() && (
            <span className="text-sm text-red-600">
              Please select a valid date range
            </span>
          )}
        </div>
      </div>

      {/* Report Display */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {reportType === 'occupancy' && (
          <OccupancyReportView
            key={reportKey}
            startDate={startDate}
            endDate={endDate}
          />
        )}

        {reportType === 'revenue' && (
          <RevenueReportView
            key={reportKey}
            startDate={startDate}
            endDate={endDate}
            compareWithPrevious={compareWithPrevious}
          />
        )}

        {reportType === 'bookings' && (
          <BookingReportView
            key={reportKey}
            startDate={startDate}
            endDate={endDate}
          />
        )}

        {reportType === 'housekeeping' && (
          <HousekeepingReportView
            key={reportKey}
            startDate={startDate}
            endDate={endDate}
          />
        )}

        {reportType === 'payments' && (
          <PaymentCollectionReportView
            key={reportKey}
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </div>
    </div>
  );
}

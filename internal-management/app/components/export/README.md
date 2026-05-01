# Export and Report Generation Components

This directory contains reusable components for exporting data and generating reports in the internal management system.

## Components

### ExportButton

A flexible button component that supports exporting data in multiple formats (PDF, CSV).

**Features:**
- Single or multiple format selection
- Loading states
- Error handling
- Dropdown menu for multiple formats
- Customizable styling

**Usage:**

```tsx
import { ExportButton } from '../export';

// Single format
<ExportButton
  onExport={async (format) => {
    const blob = await reportService.exportReport({
      reportType: 'agent_performance',
      format,
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    reportService.downloadReport(blob, `report.${format}`);
  }}
  formats={['pdf']}
  label="Export as PDF"
/>

// Multiple formats with dropdown
<ExportButton
  onExport={async (format) => {
    const blob = await analyticsService.exportReport({
      format,
      startDate,
      endDate
    });
    const filename = `analytics_${Date.now()}.${format}`;
    analyticsService.downloadReport(blob, filename);
  }}
  formats={['pdf', 'csv']}
  label="Export Report"
/>
```

### ReportGenerator

A comprehensive form component for configuring and generating reports.

**Features:**
- Report type selection
- Date range picker
- Custom filters support
- Export integration
- Validation
- Loading states

**Usage:**

```tsx
import { ReportGenerator } from '../reports';

const reportTypes = [
  {
    value: 'agent_performance',
    label: 'Agent Performance Report',
    description: 'Detailed performance metrics for individual agents'
  },
  {
    value: 'team_performance',
    label: 'Team Performance Report',
    description: 'Aggregate performance metrics for teams'
  },
  {
    value: 'commission_summary',
    label: 'Commission Summary',
    description: 'Commission earnings and payment status'
  }
];

<ReportGenerator
  reportTypes={reportTypes}
  onGenerate={async (config) => {
    // Generate and display report
    const data = await analyticsService.getReport(config);
    setReportData(data);
  }}
  onExport={async (config, format) => {
    // Export report
    const blob = await analyticsService.exportReport({
      ...config,
      format
    });
    const filename = `${config.type}_${Date.now()}.${format}`;
    analyticsService.downloadReport(blob, filename);
  }}
  defaultType="agent_performance"
/>
```

### ReportPreview

A component for displaying generated reports with collapsible sections and export functionality.

**Features:**
- Report metadata display
- Multiple section types (summary, table, chart, text)
- Collapsible sections
- Export integration
- Responsive design

**Usage:**

```tsx
import { ReportPreview } from '../reports';

const reportData = {
  metadata: {
    title: 'Agent Performance Report',
    type: 'agent_performance',
    generatedAt: new Date().toISOString(),
    generatedBy: 'John Doe',
    period: {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    },
    filters: {
      territory: 'North Region',
      status: 'active'
    }
  },
  sections: [
    {
      title: 'Summary',
      type: 'summary',
      data: [
        { label: 'Total Properties', value: '45', change: 12 },
        { label: 'Conversion Rate', value: '68%', change: 5 },
        { label: 'Commission Earned', value: '₹2,45,000', change: 18 }
      ]
    },
    {
      title: 'Performance Details',
      type: 'table',
      data: {
        headers: ['Agent', 'Properties', 'Conversion Rate', 'Commission'],
        rows: [
          ['John Doe', '15', '72%', '₹85,000'],
          ['Jane Smith', '12', '65%', '₹68,000'],
          ['Bob Johnson', '18', '70%', '₹92,000']
        ]
      }
    }
  ]
};

<ReportPreview
  metadata={reportData.metadata}
  sections={reportData.sections}
  onExport={async (format) => {
    const blob = await analyticsService.exportReport({
      reportType: 'agent_performance',
      format,
      startDate: reportData.metadata.period.startDate,
      endDate: reportData.metadata.period.endDate
    });
    analyticsService.downloadReport(blob, `report.${format}`);
  }}
/>
```

## Integration with Backend

### Analytics Export

```typescript
// Export analytics report
const handleExportAnalytics = async (format: 'pdf' | 'csv') => {
  try {
    const response = await api.post('/api/internal/analytics/export', {
      reportType: 'platform',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      format
    }, {
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], {
      type: format === 'pdf' ? 'application/pdf' : 'text/csv'
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_report.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};
```

### Audit Log Export

```typescript
// Export audit logs
const handleExportAuditLogs = async (format: 'csv') => {
  try {
    const response = await api.post('/api/internal/audit/export', {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      format,
      isCritical: true // Optional filter
    }, {
      responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_logs_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};
```

## Complete Example

Here's a complete example of a report page using all components:

```tsx
import { useState } from 'react';
import { ReportGenerator, ReportPreview } from '../reports';
import { analyticsService } from '../../services/analyticsService';

export default function AnalyticsReportPage() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const reportTypes = [
    {
      value: 'agent_performance',
      label: 'Agent Performance',
      description: 'Individual agent metrics and performance'
    },
    {
      value: 'team_performance',
      label: 'Team Performance',
      description: 'Team-level aggregated metrics'
    },
    {
      value: 'platform_analytics',
      label: 'Platform Analytics',
      description: 'Platform-wide analytics and trends'
    }
  ];

  const handleGenerate = async (config) => {
    setIsLoading(true);
    try {
      const data = await analyticsService.getReport(config);
      setReportData({
        metadata: {
          title: reportTypes.find(t => t.value === config.type)?.label || 'Report',
          type: config.type,
          generatedAt: new Date().toISOString(),
          period: {
            startDate: config.startDate,
            endDate: config.endDate
          }
        },
        sections: data.sections
      });
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (config, format) => {
    const blob = await analyticsService.exportReport({
      ...config,
      format
    });
    const filename = `${config.type}_${Date.now()}.${format}`;
    analyticsService.downloadReport(blob, filename);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Analytics Reports
      </h1>

      <div className="space-y-8">
        <ReportGenerator
          reportTypes={reportTypes}
          onGenerate={handleGenerate}
          onExport={handleExport}
        />

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {reportData && !isLoading && (
          <ReportPreview
            metadata={reportData.metadata}
            sections={reportData.sections}
            onExport={async (format) => {
              await handleExport(
                {
                  type: reportData.metadata.type,
                  startDate: reportData.metadata.period.startDate,
                  endDate: reportData.metadata.period.endDate
                },
                format
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
```

## Requirements Validation

These components satisfy the following requirements:

- **Requirement 13.4**: Export analytics reports in PDF and CSV formats
- **Requirement 21.5**: Export audit logs for compliance and reporting
- **Requirement 13.1**: Generate agent performance reports
- **Requirement 13.2**: Generate team performance reports
- **Requirement 13.3**: Generate platform-wide analytics reports

## Styling

All components use Tailwind CSS for styling and are fully responsive. They follow the existing design system used throughout the internal management application.

## Accessibility

- Keyboard navigation support
- ARIA labels for screen readers
- Focus management
- Color contrast compliance

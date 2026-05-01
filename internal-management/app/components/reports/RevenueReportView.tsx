import { useState, useEffect } from 'react';
import { reportService, type RevenueReportData } from '../../services/reportService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface RevenueReportViewProps {
  startDate: string;
  endDate: string;
  compareWithPrevious?: boolean;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function RevenueReportView({
  startDate,
  endDate,
  compareWithPrevious = false
}: RevenueReportViewProps) {
  const [data, setData] = useState<RevenueReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const reportData = await reportService.getRevenueReport({
          startDate,
          endDate,
          compareWithPrevious
        });
        setData(reportData);
      } catch (err) {
        console.error('Error fetching revenue report:', err);
        setError('Failed to load revenue report. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (startDate && endDate) {
      fetchReport();
    }
  }, [startDate, endDate, compareWithPrevious]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        No data available for the selected period
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Revenue Report</h2>
        <p className="text-sm text-gray-500 mt-1">
          {data.period.startDate} to {data.period.endDate}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-600">Total Revenue</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">
            {formatCurrency(data.totalRevenue)}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600">Total Payments</div>
          <div className="text-2xl font-bold text-green-900 mt-1">{data.totalPayments}</div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-sm font-medium text-yellow-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-900 mt-1">
            {formatCurrency(data.paymentStatus.pending)}
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm font-medium text-red-600">Overdue</div>
          <div className="text-2xl font-bold text-red-900 mt-1">
            {formatCurrency(data.paymentStatus.overdue)}
          </div>
        </div>
      </div>

      {/* Period Comparison */}
      {data.comparison && (
        <div className="bg-purple-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">Period Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-purple-600">Previous Period</div>
              <div className="text-xl font-bold text-purple-900">
                {formatCurrency(data.comparison.previousPeriod.revenue)}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {data.comparison.previousPeriod.startDate} to {data.comparison.previousPeriod.endDate}
              </div>
            </div>
            <div>
              <div className="text-sm text-purple-600">Change</div>
              <div className="text-xl font-bold text-purple-900">
                {formatCurrency(data.comparison.change)}
              </div>
            </div>
            <div>
              <div className="text-sm text-purple-600">Percentage Change</div>
              <div className={`text-xl font-bold ${
                data.comparison.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {data.comparison.percentageChange >= 0 ? '+' : ''}
                {data.comparison.percentageChange.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Category */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Source */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Source</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.bySource as any}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.source}: ${entry.percentage.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="revenue"
              >
                {data.bySource.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue by Floor Chart */}
      {data.byFloor.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Floor</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.byFloor}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="floor" label={{ value: 'Floor', position: 'insideBottom', offset: -5 }} />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Payment Status Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Paid
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCurrency(data.paymentStatus.paid)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            (data.paymentStatus.paid /
                              (data.paymentStatus.paid +
                                data.paymentStatus.pending +
                                data.paymentStatus.overdue)) *
                              100,
                            100
                          )}%`
                        }}
                      ></div>
                    </div>
                    <span className="font-medium">
                      {(
                        (data.paymentStatus.paid /
                          (data.paymentStatus.paid +
                            data.paymentStatus.pending +
                            data.paymentStatus.overdue)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCurrency(data.paymentStatus.pending)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            (data.paymentStatus.pending /
                              (data.paymentStatus.paid +
                                data.paymentStatus.pending +
                                data.paymentStatus.overdue)) *
                              100,
                            100
                          )}%`
                        }}
                      ></div>
                    </div>
                    <span className="font-medium">
                      {(
                        (data.paymentStatus.pending /
                          (data.paymentStatus.paid +
                            data.paymentStatus.pending +
                            data.paymentStatus.overdue)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Overdue
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCurrency(data.paymentStatus.overdue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            (data.paymentStatus.overdue /
                              (data.paymentStatus.paid +
                                data.paymentStatus.pending +
                                data.paymentStatus.overdue)) *
                              100,
                            100
                          )}%`
                        }}
                      ></div>
                    </div>
                    <span className="font-medium">
                      {(
                        (data.paymentStatus.overdue /
                          (data.paymentStatus.paid +
                            data.paymentStatus.pending +
                            data.paymentStatus.overdue)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue by Category Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Category</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.byCategory.map((category, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {category.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(category.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

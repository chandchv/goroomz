import { useState, useEffect } from 'react';
import { reportService, type PaymentCollectionReportData } from '../../services/reportService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface PaymentCollectionReportViewProps {
  startDate: string;
  endDate: string;
}

const COLORS = ['#10B981', '#F59E0B'];

export default function PaymentCollectionReportView({
  startDate,
  endDate
}: PaymentCollectionReportViewProps) {
  const [data, setData] = useState<PaymentCollectionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const reportData = await reportService.getPaymentCollectionReport({
          startDate,
          endDate
        });
        setData(reportData);
      } catch (err) {
        console.error('Error fetching payment collection report:', err);
        setError('Failed to load payment collection report. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (startDate && endDate) {
      fetchReport();
    }
  }, [startDate, endDate]);

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

  // Prepare data for payment timing pie chart
  const timingData = [
    { name: 'On Time', value: data.paymentTiming.onTimePayments },
    { name: 'Late', value: data.paymentTiming.latePayments }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Payment Collection Report</h2>
        <p className="text-sm text-gray-500 mt-1">
          {data.period.startDate} to {data.period.endDate}
        </p>
        <p className="text-xs text-gray-400 mt-1">PG-specific report for monthly payment tracking</p>
      </div>

      {/* Collection Efficiency Display */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-600 mb-2">Collection Efficiency</div>
          <div className="text-5xl font-bold text-blue-600 mb-2">
            {data.summary.collectionEfficiency.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500">
            {formatCurrency(data.summary.totalCollected)} collected out of{' '}
            {formatCurrency(
              data.summary.totalCollected + data.summary.totalPending + data.summary.totalOverdue
            )}{' '}
            expected
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600">Total Collected</div>
          <div className="text-2xl font-bold text-green-900 mt-1">
            {formatCurrency(data.summary.totalCollected)}
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-sm font-medium text-yellow-600">Total Pending</div>
          <div className="text-2xl font-bold text-yellow-900 mt-1">
            {formatCurrency(data.summary.totalPending)}
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm font-medium text-red-600">Total Overdue</div>
          <div className="text-2xl font-bold text-red-900 mt-1">
            {formatCurrency(data.summary.totalOverdue)}
          </div>
        </div>
      </div>

      {/* Payment Timing Statistics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Timing</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {data.paymentTiming.onTimePayments}
            </div>
            <div className="text-sm text-gray-600 mt-1">On-Time Payments</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{data.paymentTiming.latePayments}</div>
            <div className="text-sm text-gray-600 mt-1">Late Payments</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {data.paymentTiming.onTimePercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">On-Time Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {data.paymentTiming.latePercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Late Rate</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Timing Distribution */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            On-Time vs Late Payments
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={timingData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {timingData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Trends */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tickFormatter={(month) => {
                  const [year, monthNum] = month.split('-');
                  return new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString(
                    'en-IN',
                    {
                      month: 'short',
                      year: '2-digit'
                    }
                  );
                }}
              />
              <YAxis />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(month) => {
                  const [year, monthNum] = month.split('-');
                  return new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString(
                    'en-IN',
                    {
                      month: 'long',
                      year: 'numeric'
                    }
                  );
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="collected"
                stroke="#10B981"
                strokeWidth={2}
                name="Collected"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Defaulters List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Defaulters List
          {data.defaulters.length > 0 && (
            <span className="ml-2 text-sm font-normal text-red-600">
              ({data.defaulters.length} residents)
            </span>
          )}
        </h3>
        {data.defaulters.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
            <p className="text-sm text-green-700">
              🎉 No defaulters! All residents are up to date with their payments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resident Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Overdue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Late Payment Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment History
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.defaulters.map((defaulter, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {defaulter.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {defaulter.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {defaulter.roomNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                      {formatCurrency(defaulter.totalOverdue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-red-600 h-2 rounded-full"
                            style={{ width: `${Math.min(defaulter.latePaymentRate, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-medium">{defaulter.latePaymentRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {defaulter.latePayments} / {defaulter.totalPayments} late
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly Trends Table */}
      {data.trends.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Collection Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount Collected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Number of Payments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Average Payment
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.trends.map((trend, index) => {
                  const [year, monthNum] = trend.month.split('-');
                  const monthName = new Date(
                    parseInt(year),
                    parseInt(monthNum) - 1
                  ).toLocaleDateString('en-IN', {
                    month: 'long',
                    year: 'numeric'
                  });
                  const avgPayment = trend.count > 0 ? trend.collected / trend.count : 0;

                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {monthName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(trend.collected)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trend.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(avgPayment)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-blue-600">Collection Efficiency:</span>
            <span className="ml-2 font-semibold text-blue-900">
              {data.summary.collectionEfficiency.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-blue-600">On-Time Payment Rate:</span>
            <span className="ml-2 font-semibold text-blue-900">
              {data.paymentTiming.onTimePercentage.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-blue-600">Total Defaulters:</span>
            <span className="ml-2 font-semibold text-blue-900">{data.defaulters.length}</span>
          </div>
          <div>
            <span className="text-blue-600">Total Collected:</span>
            <span className="ml-2 font-semibold text-blue-900">
              {formatCurrency(data.summary.totalCollected)}
            </span>
          </div>
          <div>
            <span className="text-blue-600">Total Pending:</span>
            <span className="ml-2 font-semibold text-blue-900">
              {formatCurrency(data.summary.totalPending)}
            </span>
          </div>
          <div>
            <span className="text-blue-600">Total Overdue:</span>
            <span className="ml-2 font-semibold text-blue-900">
              {formatCurrency(data.summary.totalOverdue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

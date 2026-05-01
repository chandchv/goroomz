import { useState, useEffect } from 'react';
import { reportService, type BookingReportData } from '../../services/reportService';
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

interface BookingReportViewProps {
  startDate: string;
  endDate: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function BookingReportView({ startDate, endDate }: BookingReportViewProps) {
  const [data, setData] = useState<BookingReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const reportData = await reportService.getBookingReport({
          startDate,
          endDate
        });
        setData(reportData);
      } catch (err) {
        console.error('Error fetching booking report:', err);
        setError('Failed to load booking report. Please try again.');
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

  // Prepare data for source distribution pie chart
  const sourceData = [
    { name: 'Online', value: data.sourceDistribution.online },
    { name: 'Offline', value: data.sourceDistribution.offline }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Booking Report</h2>
        <p className="text-sm text-gray-500 mt-1">
          {data.period.startDate} to {data.period.endDate}
        </p>
      </div>

      {/* Booking Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-600">Total Bookings</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{data.totalBookings}</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600">Completion Rate</div>
          <div className="text-2xl font-bold text-green-900 mt-1">
            {data.statusBreakdown.completionRate.toFixed(1)}%
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm font-medium text-red-600">Cancellation Rate</div>
          <div className="text-2xl font-bold text-red-900 mt-1">
            {data.statusBreakdown.cancellationRate.toFixed(1)}%
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm font-medium text-purple-600">Avg Stay Duration</div>
          <div className="text-2xl font-bold text-purple-900 mt-1">
            {data.guestStatistics.averageStayDuration.toFixed(1)} days
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Status Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {data.statusBreakdown.pending}
            </div>
            <div className="text-sm text-gray-600 mt-1">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {data.statusBreakdown.confirmed}
            </div>
            <div className="text-sm text-gray-600 mt-1">Confirmed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {data.statusBreakdown.completed}
            </div>
            <div className="text-sm text-gray-600 mt-1">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {data.statusBreakdown.cancelled}
            </div>
            <div className="text-sm text-gray-600 mt-1">Cancelled</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Online vs Offline Distribution */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Online vs Offline Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-600">Online</div>
              <div className="text-lg font-bold text-blue-600">
                {data.sourceDistribution.onlinePercentage.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Offline</div>
              <div className="text-lg font-bold text-green-600">
                {data.sourceDistribution.offlinePercentage.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Popular Room Types */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Room Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.popularRoomTypes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#10B981" name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Booking Trends */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.trends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => new Date(date).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric'
              })}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(date) => new Date(date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3B82F6"
              strokeWidth={2}
              name="Bookings"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Guest Statistics Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Guest Statistics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Total Guests
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {data.guestStatistics.totalGuests}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Repeat Guests
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {data.guestStatistics.repeatGuests}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Repeat Guest Rate
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {data.guestStatistics.totalGuests > 0
                    ? (
                        (data.guestStatistics.repeatGuests / data.guestStatistics.totalGuests) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Average Stay Duration
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {data.guestStatistics.averageStayDuration.toFixed(1)} days
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Popular Room Types Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Popular Room Types</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.popularRoomTypes.map((roomType, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {roomType.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {roomType.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.totalBookings > 0
                      ? ((roomType.count / data.totalBookings) * 100).toFixed(1)
                      : 0}
                    %
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

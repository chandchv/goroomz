import { useState, useEffect } from 'react';
import { reportService, type OccupancyReportData } from '../../services/reportService';
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
  Cell
} from 'recharts';

interface OccupancyReportViewProps {
  startDate: string;
  endDate: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function OccupancyReportView({ startDate, endDate }: OccupancyReportViewProps) {
  const [data, setData] = useState<OccupancyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const reportData = await reportService.getOccupancyReport({
          startDate,
          endDate
        });
        setData(reportData);
      } catch (err) {
        console.error('Error fetching occupancy report:', err);
        setError('Failed to load occupancy report. Please try again.');
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

  // Prepare data for pie chart
  const pieData = [
    { name: 'Occupied', value: data.occupiedRooms },
    { name: 'Vacant', value: data.vacantRooms }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Occupancy Report</h2>
        <p className="text-sm text-gray-500 mt-1">
          {data.period.startDate} to {data.period.endDate} ({data.period.days} days)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-600">Total Rooms</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{data.totalRooms}</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600">Occupied Rooms</div>
          <div className="text-2xl font-bold text-green-900 mt-1">{data.occupiedRooms}</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Vacant Rooms</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{data.vacantRooms}</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm font-medium text-purple-600">Occupancy Rate</div>
          <div className="text-2xl font-bold text-purple-900 mt-1">
            {data.occupancyPercentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Pie Chart */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy by Category */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Occupancy by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="occupancyPercentage" fill="#3B82F6" name="Occupancy %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown by Category Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Breakdown by Category</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Rooms
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Occupancy Rate
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
                    {category.totalRooms}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(category.occupancyPercentage, 100)}%` }}
                        ></div>
                      </div>
                      <span className="font-medium">{category.occupancyPercentage.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdown by Floor Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Breakdown by Floor</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Floor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Rooms
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Occupancy Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.byFloor.map((floor, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Floor {floor.floor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {floor.totalRooms}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${Math.min(floor.occupancyPercentage, 100)}%` }}
                        ></div>
                      </div>
                      <span className="font-medium">{floor.occupancyPercentage.toFixed(1)}%</span>
                    </div>
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

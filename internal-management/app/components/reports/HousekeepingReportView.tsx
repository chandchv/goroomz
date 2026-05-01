import { useState, useEffect } from 'react';
import { reportService, type HousekeepingReportData } from '../../services/reportService';
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
  AreaChart,
  Area
} from 'recharts';

interface HousekeepingReportViewProps {
  startDate: string;
  endDate: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

export default function HousekeepingReportView({ startDate, endDate }: HousekeepingReportViewProps) {
  const [data, setData] = useState<HousekeepingReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const reportData = await reportService.getHousekeepingReport({
          startDate,
          endDate
        });
        setData(reportData);
      } catch (err) {
        console.error('Error fetching housekeeping report:', err);
        setError('Failed to load housekeeping report. Please try again.');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Housekeeping Report</h2>
        <p className="text-sm text-gray-500 mt-1">
          {data.period.startDate} to {data.period.endDate}
        </p>
      </div>

      {/* Cleaning Efficiency Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-600">Rooms Cleaned</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{data.totalRoomsCleaned}</div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-sm font-medium text-yellow-600">Pending Tasks</div>
          <div className="text-2xl font-bold text-yellow-900 mt-1">{data.pendingTasks}</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600">Avg Cleaning Time</div>
          <div className="text-2xl font-bold text-green-900 mt-1">
            {data.averageCleaningTime.toFixed(0)} min
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm font-medium text-purple-600">Avg Turnover Time</div>
          <div className="text-2xl font-bold text-purple-900 mt-1">
            {data.averageTurnoverTime.toFixed(0)} min
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Efficiency Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Rooms Cleaned Per Day</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">
              {data.roomsCleanedPerDay.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Completion Rate</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">
              {data.totalRoomsCleaned > 0 && data.pendingTasks >= 0
                ? (
                    (data.totalRoomsCleaned / (data.totalRoomsCleaned + data.pendingTasks)) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Turnover Time Chart */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Average Cleaning & Turnover Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                {
                  name: 'Cleaning Time',
                  minutes: data.averageCleaningTime
                },
                {
                  name: 'Turnover Time',
                  minutes: data.averageTurnoverTime
                }
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value: number) => `${value.toFixed(0)} min`} />
              <Legend />
              <Bar dataKey="minutes" fill="#10B981" name="Time (minutes)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cleaner Performance */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cleaner Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.cleanerPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="roomsCleaned" fill="#3B82F6" name="Rooms Cleaned" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Distribution Over Time */}
      {data.statusDistribution.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Room Status Distribution Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.statusDistribution}>
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
              <Area
                type="monotone"
                dataKey="occupied"
                stackId="1"
                stroke="#3B82F6"
                fill="#3B82F6"
                name="Occupied"
              />
              <Area
                type="monotone"
                dataKey="vacant_clean"
                stackId="1"
                stroke="#10B981"
                fill="#10B981"
                name="Vacant Clean"
              />
              <Area
                type="monotone"
                dataKey="vacant_dirty"
                stackId="1"
                stroke="#F59E0B"
                fill="#F59E0B"
                name="Vacant Dirty"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cleaner Performance Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cleaner Performance Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cleaner Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rooms Cleaned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Average Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Efficiency
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.cleanerPerformance.map((cleaner, index) => {
                const efficiency =
                  data.averageCleaningTime > 0
                    ? (data.averageCleaningTime / cleaner.averageTime) * 100
                    : 100;
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cleaner.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cleaner.roomsCleaned}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cleaner.averageTime.toFixed(0)} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              efficiency >= 100
                                ? 'bg-green-600'
                                : efficiency >= 80
                                ? 'bg-yellow-600'
                                : 'bg-red-600'
                            }`}
                            style={{ width: `${Math.min(efficiency, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-medium">{efficiency.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-blue-600">Total Rooms Cleaned:</span>
            <span className="ml-2 font-semibold text-blue-900">{data.totalRoomsCleaned}</span>
          </div>
          <div>
            <span className="text-blue-600">Pending Tasks:</span>
            <span className="ml-2 font-semibold text-blue-900">{data.pendingTasks}</span>
          </div>
          <div>
            <span className="text-blue-600">Average Cleaning Time:</span>
            <span className="ml-2 font-semibold text-blue-900">
              {data.averageCleaningTime.toFixed(0)} minutes
            </span>
          </div>
          <div>
            <span className="text-blue-600">Average Turnover Time:</span>
            <span className="ml-2 font-semibold text-blue-900">
              {data.averageTurnoverTime.toFixed(0)} minutes
            </span>
          </div>
          <div>
            <span className="text-blue-600">Rooms Cleaned Per Day:</span>
            <span className="ml-2 font-semibold text-blue-900">
              {data.roomsCleanedPerDay.toFixed(1)}
            </span>
          </div>
          <div>
            <span className="text-blue-600">Total Cleaners:</span>
            <span className="ml-2 font-semibold text-blue-900">
              {data.cleanerPerformance.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

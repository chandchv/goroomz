import { useState, useEffect } from 'react';
import { analyticsService, type PlatformAnalytics as PlatformAnalyticsData } from '../../services/analyticsService';
import { TrendChart, PieChart, TREND_COLORS, PIE_COLORS } from '../charts';

interface PlatformAnalyticsProps {
  dateRange?: { startDate: string; endDate: string };
}

export default function PlatformAnalytics({ dateRange }: PlatformAnalyticsProps) {
  const [analytics, setAnalytics] = useState<PlatformAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'trends' | 'regional' | 'types'>('trends');

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await analyticsService.getPlatformAnalytics({
        startDate: dateRange?.startDate,
        endDate: dateRange?.endDate,
        groupBy: 'day',
      });

      setAnalytics(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load analytics');
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Platform Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Total Properties</div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(analytics.metrics.totalProperties)}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Total Bookings</div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(analytics.metrics.totalBookings)}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Total Revenue</div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.metrics.totalRevenue)}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">Avg Occupancy</div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatPercentage(analytics.metrics.averageOccupancy)}</div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-600 mb-2">Active Property Owners</div>
          <div className="text-xl font-bold text-gray-900">{formatNumber(analytics.metrics.activePropertyOwners)}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-600 mb-2">Total Rooms</div>
          <div className="text-xl font-bold text-gray-900">{formatNumber(analytics.metrics.totalRooms)}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-600 mb-2">Occupied / Vacant</div>
          <div className="text-xl font-bold text-gray-900">
            {formatNumber(analytics.metrics.occupiedRooms)} / {formatNumber(analytics.metrics.vacantRooms)}
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setSelectedView('trends')}
              className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                selectedView === 'trends'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Booking & Revenue Trends
            </button>
            <button
              onClick={() => setSelectedView('regional')}
              className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                selectedView === 'regional'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Regional Breakdown
            </button>
            <button
              onClick={() => setSelectedView('types')}
              className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                selectedView === 'types'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Property Types
            </button>
          </div>
        </div>

        <div className="p-6">
          {selectedView === 'trends' && (
            <div className="space-y-6">
              {/* Booking Trends Chart */}
              {analytics.bookingTrends && analytics.bookingTrends.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <TrendChart
                    data={analytics.bookingTrends.map((trend) => ({
                      name: new Date(trend.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                      bookings: trend.bookings || 0,
                    }))}
                    lines={[
                      { dataKey: 'bookings', name: 'Bookings', color: TREND_COLORS.blue },
                    ]}
                    title="Booking Trends"
                    height={250}
                    formatValue={(value) => formatNumber(value)}
                  />
                </div>
              )}

              {/* Revenue Trends Chart */}
              {analytics.revenueTrends && analytics.revenueTrends.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <TrendChart
                    data={analytics.revenueTrends.map((trend) => ({
                      name: new Date(trend.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                      revenue: trend.revenue || 0,
                    }))}
                    lines={[
                      { dataKey: 'revenue', name: 'Revenue', color: TREND_COLORS.green },
                    ]}
                    title="Revenue Trends"
                    height={250}
                    type="area"
                    formatValue={(value) => formatCurrency(value)}
                  />
                </div>
              )}
            </div>
          )}

          {selectedView === 'regional' && (
            <div className="space-y-6">
              {/* Regional Revenue Distribution Chart */}
              {analytics.regionalBreakdown.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <PieChart
                    data={analytics.regionalBreakdown.map((region: any) => ({
                      name: region.region,
                      value: region.revenue,
                    }))}
                    title="Revenue Distribution by Region"
                    height={300}
                    formatValue={(value) => formatCurrency(value)}
                    colors={PIE_COLORS}
                  />
                </div>
              )}

              <h4 className="text-sm font-medium text-gray-900 mb-3">Performance by Region</h4>
              {analytics.regionalBreakdown.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No regional data available</p>
                </div>
              ) : (
                analytics.regionalBreakdown.map((region, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-gray-900">{region.region}</h5>
                      <span className="text-sm text-gray-600">{formatPercentage(region.occupancy)} occupancy</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Properties</div>
                        <div className="font-semibold text-gray-900">{formatNumber(region.properties)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Bookings</div>
                        <div className="font-semibold text-gray-900">{formatNumber(region.bookings)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Revenue</div>
                        <div className="font-semibold text-gray-900">{formatCurrency(region.revenue)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {selectedView === 'types' && (
            <div className="space-y-6">
              {/* Property Type Distribution Chart */}
              {analytics.propertyTypeBreakdown.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <PieChart
                    data={analytics.propertyTypeBreakdown.map((type: any) => ({
                      name: type.propertyType.toUpperCase(),
                      value: type.count,
                    }))}
                    title="Property Distribution by Type"
                    height={300}
                    colors={PIE_COLORS}
                  />
                </div>
              )}

              <h4 className="text-sm font-medium text-gray-900 mb-3">Performance by Property Type</h4>
              {analytics.propertyTypeBreakdown.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No property type data available</p>
                </div>
              ) : (
                analytics.propertyTypeBreakdown.map((type, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-gray-900">{type.propertyType.toUpperCase()}</h5>
                      <span className="text-sm text-gray-600">{formatPercentage(type.occupancy)} occupancy</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Count</div>
                        <div className="font-semibold text-gray-900">{formatNumber(type.count)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Bookings</div>
                        <div className="font-semibold text-gray-900">{formatNumber(type.bookings)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Revenue</div>
                        <div className="font-semibold text-gray-900">{formatCurrency(type.revenue)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

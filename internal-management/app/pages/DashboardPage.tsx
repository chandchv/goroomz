import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useSelectedProperty } from '../hooks/useSelectedProperty';
import { dashboardService } from '../services/dashboardService';
import type { KPIData, ActivitiesData, AlertsData } from '../services/dashboardService';
import KPICards from '../components/dashboard/KPICards';
import RoomStatusSummary from '../components/dashboard/RoomStatusSummary';
import TodayActivities from '../components/dashboard/TodayActivities';
import AlertsSection from '../components/dashboard/AlertsSection';
import PropertyIndicator from '../components/PropertyIndicator';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedProperty, hasMultipleProperties } = useSelectedProperty();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [activitiesData, setActivitiesData] = useState<ActivitiesData | null>(null);
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Determine if this is a property owner and get their property ID
  const isPropertyOwner = user?.role === 'owner' && !user?.internalRole;
  const propertyId = selectedProperty?.id;

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      console.log('Fetching dashboard data for property:', propertyId, selectedProperty?.name);
      
      // Fetch all dashboard data in parallel
      // For property owners, pass propertyId to filter data to their property only
      const [kpis, activities, alerts] = await Promise.all([
        dashboardService.getKPIs(propertyId),
        dashboardService.getActivities(propertyId),
        dashboardService.getAlerts(propertyId),
      ]);

      setKpiData(kpis);
      setActivitiesData(activities);
      setAlertsData(alerts);
      setLastUpdated(new Date());
      console.log('Dashboard data updated for property:', selectedProperty?.name);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [propertyId, selectedProperty?.name]);

  // Initial load and when property changes
  useEffect(() => {
    if (selectedProperty || !hasMultipleProperties) {
      // Only fetch if we have a selected property or if user has only one property
      setLoading(true);
      
      // Show a brief notification when switching properties (but not on initial load)
      if (selectedProperty && kpiData) {
        console.log(`Switching to property: ${selectedProperty.name}`);
      }
      
      fetchDashboardData();
    }
  }, [fetchDashboardData, selectedProperty, hasMultipleProperties]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchDashboardData();
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    return lastUpdated.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div>
      {/* Header with refresh button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          {hasMultipleProperties && selectedProperty && (
            <div className="mt-1">
              <PropertyIndicator size="sm" className="text-gray-600" />
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {lastUpdated && (
            <span className="text-xs sm:text-sm text-gray-500 hidden md:inline">
              Last updated: {formatLastUpdated()}
            </span>
          )}
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-touch"
          >
            <svg
              className={`-ml-1 mr-2 h-5 w-5 text-gray-500 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden xs:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-md p-3 sm:p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-red-400 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Quick Action Shortcuts */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* New Booking */}
          <button
            onClick={() => navigate('/bookings?action=new')}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg border border-blue-200 transition-all hover:shadow-md group"
          >
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900">New Booking</span>
          </button>

          {/* Check-In */}
          <button
            onClick={() => navigate('/check-in')}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg border border-green-200 transition-all hover:shadow-md group"
          >
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900">Check-In</span>
          </button>

          {/* Check-Out */}
          <button
            onClick={() => navigate('/check-out')}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-lg border border-orange-200 transition-all hover:shadow-md group"
          >
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900">Check-Out</span>
          </button>

          {/* All Bookings */}
          <button
            onClick={() => navigate('/bookings')}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg border border-purple-200 transition-all hover:shadow-md group"
          >
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900">Bookings</span>
          </button>

          {/* Rooms */}
          <button
            onClick={() => navigate('/rooms')}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 rounded-lg border border-indigo-200 transition-all hover:shadow-md group"
          >
            <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900">Rooms</span>
          </button>

          {/* Housekeeping */}
          <button
            onClick={() => navigate('/housekeeping')}
            className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 rounded-lg border border-pink-200 transition-all hover:shadow-md group"
          >
            <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900">Housekeeping</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards data={kpiData} loading={loading} />

      {/* Room Status and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
        <RoomStatusSummary data={kpiData?.roomStatus || null} loading={loading} />
        <TodayActivities data={activitiesData} loading={loading} />
      </div>

      {/* Alerts */}
      <div className="mt-4 sm:mt-6">
        <AlertsSection data={alertsData} loading={loading} />
      </div>
    </div>
  );
}

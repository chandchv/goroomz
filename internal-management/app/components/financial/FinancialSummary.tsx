import React, { useState, useEffect } from 'react';
import { commissionService } from '../../services/commissionService';
import { analyticsService } from '../../services/analyticsService';
import { useToast } from '../../hooks/useToast';

interface FinancialStats {
  totalRevenue: number;
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  platformFees: number;
  netRevenue: number;
}

const FinancialSummary: React.FC = () => {
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: 0,
    totalCommissions: 0,
    pendingCommissions: 0,
    paidCommissions: 0,
    platformFees: 0,
    netRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const { showToast } = useToast();

  useEffect(() => {
    loadFinancialStats();
  }, [period]);

  const loadFinancialStats = async () => {
    try {
      setLoading(true);
      
      // Get platform analytics for revenue
      const analytics = await analyticsService.getPlatformAnalytics({});

      // Get commission data
      const commissionsResponse = await commissionService.getCommissions({});
      const commissions = commissionsResponse.data || [];
      
      const totalCommissions = commissions.reduce(
        (sum: number, c: any) => sum + parseFloat(c.amount || 0),
        0
      );
      const pendingCommissions = commissions
        .filter((c: any) => c.status === 'pending_payment' || c.status === 'earned')
        .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);
      const paidCommissions = commissions
        .filter((c: any) => c.status === 'paid')
        .reduce((sum: number, c: any) => sum + parseFloat(c.amount || 0), 0);

      const totalRevenue = analytics.metrics?.totalRevenue || 0;
      const platformFees = totalRevenue * 0.1; // Assuming 10% platform fee
      const netRevenue = totalRevenue - totalCommissions - platformFees;

      setStats({
        totalRevenue,
        totalCommissions,
        pendingCommissions,
        paidCommissions,
        platformFees,
        netRevenue,
      });
    } catch (error) {
      console.error('Error loading financial stats:', error);
      showToast({ title: 'Failed to load financial statistics', type: 'error' });
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Summary</h2>
          <p className="text-sm text-gray-500 mt-1">
            Platform-wide financial overview
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as 'month' | 'quarter' | 'year')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        >
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Revenue</h3>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-sm text-gray-500 mt-2">From all properties</p>
        </div>

        {/* Total Commissions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Commissions</h3>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(stats.totalCommissions)}
          </p>
          <div className="flex gap-4 mt-2 text-sm">
            <span className="text-orange-600">
              Pending: {formatCurrency(stats.pendingCommissions)}
            </span>
            <span className="text-green-600">
              Paid: {formatCurrency(stats.paidCommissions)}
            </span>
          </div>
        </div>

        {/* Platform Fees */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Platform Fees</h3>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.platformFees)}</p>
          <p className="text-sm text-gray-500 mt-2">10% of revenue</p>
        </div>

        {/* Net Revenue */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:col-span-2 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Net Revenue</h3>
              <p className="text-4xl font-bold text-gray-900">
                {formatCurrency(stats.netRevenue)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                After commissions and platform fees
              </p>
            </div>
            <div className="p-4 bg-indigo-100 rounded-full">
              <svg
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Gross Revenue</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(stats.totalRevenue)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Agent Commissions</span>
            <span className="text-sm font-medium text-red-600">
              - {formatCurrency(stats.totalCommissions)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Platform Fees</span>
            <span className="text-sm font-medium text-red-600">
              - {formatCurrency(stats.platformFees)}
            </span>
          </div>
          <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
            <span className="text-base font-semibold text-gray-900">Net Revenue</span>
            <span className="text-base font-bold text-green-600">
              {formatCurrency(stats.netRevenue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;

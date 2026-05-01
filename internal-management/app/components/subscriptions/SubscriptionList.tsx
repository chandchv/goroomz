import React, { useState, useEffect } from 'react';
import subscriptionService from '../../services/subscriptionService';
import { useToast } from '../../hooks/useToast';

interface Subscription {
  id: string;
  propertyOwnerId: string;
  propertyOwnerName: string;
  propertyOwnerEmail: string;
  plan: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  startDate: string;
  endDate: string;
  amount: number;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  autoRenew: boolean;
}

interface SubscriptionListProps {
  onViewDetails: (subscription: Subscription) => void;
}

const SubscriptionList: React.FC<SubscriptionListProps> = ({ onViewDetails }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    plan: '',
    search: '',
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadSubscriptions();
  }, [filters]);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const filterParams: any = {};
      if (filters.status) filterParams.status = filters.status;
      if (filters.plan) filterParams.plan = filters.plan;
      if (filters.search) filterParams.search = filters.search;

      const data = await subscriptionService.getSubscriptions(filterParams);
      setSubscriptions(data);
    } catch (error) {
      showToast('Failed to load subscriptions');
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (subscriptionId: string) => {
    try {
      await subscriptionService.upgradeSubscription(subscriptionId, {
        newPlan: 'premium', // This should be dynamic
      });
      showToast('Subscription upgraded successfully');
      loadSubscriptions();
    } catch (error) {
      showToast('Failed to upgrade subscription');
      console.error('Error upgrading subscription:', error);
    }
  };

  const handleApplyDiscount = async (subscriptionId: string) => {
    const discountCode = prompt('Enter discount code:');
    if (!discountCode) return;

    try {
      await subscriptionService.applyDiscount(subscriptionId, { code: discountCode });
      showToast('Discount applied successfully');
      loadSubscriptions();
    } catch (error) {
      showToast('Failed to apply discount');
      console.error('Error applying discount:', error);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPlanBadgeColor = (plan: string) => {
    const colors: Record<string, string> = {
      basic: 'bg-blue-100 text-blue-800',
      standard: 'bg-purple-100 text-purple-800',
      premium: 'bg-orange-100 text-orange-800',
      enterprise: 'bg-red-100 text-red-800',
    };
    return colors[plan.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
            <select
              value={filters.plan}
              onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="">All Plans</option>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by owner name or email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Property Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Billing Cycle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {subscriptions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No subscriptions found
                </td>
              </tr>
            ) : (
              subscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {subscription.propertyOwnerName}
                    </div>
                    <div className="text-sm text-gray-500">{subscription.propertyOwnerEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPlanBadgeColor(
                        subscription.plan
                      )}`}
                    >
                      {subscription.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                        subscription.status
                      )}`}
                    >
                      {subscription.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {subscription.billingCycle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(subscription.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{subscription.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onViewDetails(subscription)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    {subscription.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleUpgrade(subscription.id)}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Upgrade
                        </button>
                        <button
                          onClick={() => handleApplyDiscount(subscription.id)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Discount
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Subscriptions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{subscriptions.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {subscriptions.filter((s) => s.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Expired</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {subscriptions.filter((s) => s.status === 'expired').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Monthly Revenue</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            ₹
            {subscriptions
              .filter((s) => s.status === 'active')
              .reduce((sum, s) => sum + s.amount, 0)
              .toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionList;

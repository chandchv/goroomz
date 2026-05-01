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
  features: string[];
  discount?: {
    code: string;
    amount: number;
    type: 'percentage' | 'fixed';
  };
}

interface SubscriptionDetailViewProps {
  subscription: Subscription;
  onClose: () => void;
  onUpdate: () => void;
}

const SubscriptionDetailView: React.FC<SubscriptionDetailViewProps> = ({
  subscription,
  onClose,
  onUpdate,
}) => {
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadBillingHistory();
  }, [subscription.id]);

  const loadBillingHistory = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getBillingHistory(subscription.id);
      setBillingHistory(data);
    } catch (error) {
      console.error('Error loading billing history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    const newPlan = prompt('Enter new plan (basic, standard, premium, enterprise):');
    if (!newPlan) return;

    try {
      await subscriptionService.upgradeSubscription(subscription.id, { newPlan });
      showToast('Subscription upgraded successfully');
      onUpdate();
    } catch (error) {
      showToast('Failed to upgrade subscription');
      console.error('Error upgrading subscription:', error);
    }
  };

  const handleApplyDiscount = async () => {
    const code = prompt('Enter discount code:');
    if (!code) return;

    try {
      await subscriptionService.applyDiscount(subscription.id, { code });
      showToast('Discount applied successfully');
      onUpdate();
    } catch (error) {
      showToast('Failed to apply discount');
      console.error('Error applying discount:', error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;

    try {
      await subscriptionService.cancelSubscription(subscription.id);
      showToast('Subscription cancelled successfully');
      onUpdate();
    } catch (error) {
      showToast('Failed to cancel subscription');
      console.error('Error cancelling subscription:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'text-green-600 bg-green-100',
      expired: 'text-red-600 bg-red-100',
      cancelled: 'text-gray-600 bg-gray-100',
      pending: 'text-yellow-600 bg-yellow-100',
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Subscription Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Subscription Info */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Subscription Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Property Owner</p>
                    <p className="text-sm font-medium text-gray-900">
                      {subscription.propertyOwnerName}
                    </p>
                    <p className="text-sm text-gray-500">{subscription.propertyOwnerEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Plan</p>
                    <p className="text-sm font-medium text-gray-900">{subscription.plan}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        subscription.status
                      )}`}
                    >
                      {subscription.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Billing Cycle</p>
                    <p className="text-sm font-medium text-gray-900">
                      {subscription.billingCycle}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(subscription.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">End Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(subscription.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="text-sm font-medium text-gray-900">
                      ₹{subscription.amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Auto Renew</p>
                    <p className="text-sm font-medium text-gray-900">
                      {subscription.autoRenew ? 'Yes' : 'No'}
                    </p>
                  </div>
                  {subscription.discount && (
                    <div>
                      <p className="text-sm text-gray-600">Discount</p>
                      <p className="text-sm font-medium text-green-600">
                        {subscription.discount.code} -{' '}
                        {subscription.discount.type === 'percentage'
                          ? `${subscription.discount.amount}%`
                          : `₹${subscription.discount.amount}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Plan Features</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <ul className="space-y-2">
                {subscription.features?.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-700">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Billing History */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Billing History</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : billingHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No billing history available</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billingHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{item.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              item.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : item.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            {subscription.status === 'active' && (
              <>
                <button
                  onClick={handleUpgrade}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Upgrade Plan
                </button>
                <button
                  onClick={handleApplyDiscount}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Apply Discount
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Cancel Subscription
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDetailView;

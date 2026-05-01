import { useState, useEffect } from 'react';
import { commissionService, type Commission, type CommissionSummary } from '../../services/commissionService';
import { useAuth } from '../../contexts/AuthContext';

interface CommissionDashboardProps {
  agentId?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export default function CommissionDashboard({ agentId, dateRange }: CommissionDashboardProps) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveAgentId = agentId || user?.id;

  useEffect(() => {
    if (effectiveAgentId) {
      loadCommissionData();
    }
  }, [effectiveAgentId, dateRange]);

  const loadCommissionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load summary
      const summaryData = await commissionService.getAgentCommissionSummary(
        effectiveAgentId!,
        dateRange?.startDate,
        dateRange?.endDate
      );
      setSummary(summaryData);

      // Load commissions list
      const commissionsData = await commissionService.getAgentCommissions(
        effectiveAgentId!,
        {
          startDate: dateRange?.startDate,
          endDate: dateRange?.endDate,
          limit: 50,
        }
      );
      setCommissions(commissionsData.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load commission data');
      console.error('Error loading commission data:', err);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'earned':
        return 'bg-blue-100 text-blue-800';
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
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

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Earned</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalEarned)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Pending Payment</div>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(summary.totalPending)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Total Paid</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600 mb-1">Average Commission</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.averageCommission)}</div>
          </div>
        </div>
      )}

      {/* Commission Breakdown Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Commission Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Earned Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No commissions found
                  </td>
                </tr>
              ) : (
                commissions.map((commission) => (
                  <tr key={commission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {commission.lead?.businessName || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {commission.lead?.propertyOwnerName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(commission.earnedDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(commission.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {commission.rate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(commission.status)}`}>
                        {getStatusLabel(commission.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {commission.paymentDate ? formatDate(commission.paymentDate) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

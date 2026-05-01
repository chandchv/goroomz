import { useState } from 'react';
import targetService from '../../services/targetService';

interface TargetSettingFormProps {
  agentId: string;
  territoryId: string;
  onClose: () => void;
  onTargetSet: () => void;
}

export default function TargetSettingForm({ agentId, territoryId, onClose, onTargetSet }: TargetSettingFormProps) {
  const [formData, setFormData] = useState({
    period: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    targetProperties: '',
    targetRevenue: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate end date based on period
  const calculateEndDate = (startDate: string, period: string) => {
    const start = new Date(startDate);
    let end = new Date(start);
    
    switch (period) {
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'quarterly':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'yearly':
        end.setFullYear(end.getFullYear() + 1);
        break;
    }
    
    return end.toISOString().split('T')[0];
  };

  const handlePeriodChange = (period: 'monthly' | 'quarterly' | 'yearly') => {
    const endDate = calculateEndDate(formData.startDate, period);
    setFormData({ ...formData, period, endDate });
  };

  const handleStartDateChange = (startDate: string) => {
    const endDate = calculateEndDate(startDate, formData.period);
    setFormData({ ...formData, startDate, endDate });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.targetProperties || !formData.targetRevenue) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await targetService.createTarget({
        agentId,
        territoryId,
        period: formData.period,
        startDate: formData.startDate,
        endDate: formData.endDate,
        targetProperties: parseInt(formData.targetProperties),
        targetRevenue: parseFloat(formData.targetRevenue),
        actualProperties: 0,
        actualRevenue: 0,
      });

      onTargetSet();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set target');
      console.error('Error setting target:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Set Agent Target</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Period Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Target Period *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handlePeriodChange('monthly')}
                className={`px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                  formData.period === 'monthly'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('quarterly')}
                className={`px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                  formData.period === 'quarterly'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                Quarterly
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('yearly')}
                className={`px-4 py-3 rounded-lg border-2 font-medium transition-colors ${
                  formData.period === 'yearly'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-gray-900"
              />
            </div>
          </div>

          {/* Target Properties */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Properties *
            </label>
            <input
              type="number"
              min="1"
              value={formData.targetProperties}
              onChange={(e) => setFormData({ ...formData, targetProperties: e.target.value })}
              placeholder="e.g., 10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Number of properties to be onboarded during this period
            </p>
          </div>

          {/* Target Revenue */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Revenue (₹) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.targetRevenue}
              onChange={(e) => setFormData({ ...formData, targetRevenue: e.target.value })}
              placeholder="e.g., 500000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Expected revenue from onboarded properties during this period
            </p>
          </div>

          {/* Summary */}
          {formData.targetProperties && formData.targetRevenue && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Target Summary</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>Period:</span>
                  <span className="font-medium capitalize">{formData.period}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">
                    {new Date(formData.startDate).toLocaleDateString()} - {new Date(formData.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Properties Target:</span>
                  <span className="font-medium">{formData.targetProperties} properties</span>
                </div>
                <div className="flex justify-between">
                  <span>Revenue Target:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(parseFloat(formData.targetRevenue))}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-300">
                  <span>Avg. Revenue per Property:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(parseFloat(formData.targetRevenue) / parseInt(formData.targetProperties))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Setting Target...' : 'Set Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

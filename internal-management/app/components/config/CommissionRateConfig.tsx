import React, { useState, useEffect } from 'react';
import configService from '../../services/configService';
import { useToast } from '../../hooks/useToast';

interface CommissionRate {
  id?: string;
  role: string;
  rate: number;
  type: 'percentage' | 'fixed';
  description: string;
}

const CommissionRateConfig: React.FC = () => {
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CommissionRate>({
    role: '',
    rate: 0,
    type: 'percentage',
    description: '',
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadCommissionRates();
  }, []);

  const loadCommissionRates = async () => {
    try {
      setLoading(true);
      const data = await configService.getCommissionRates();
      setRates(data);
    } catch (error) {
      showToast('Failed to load commission rates');
      console.error('Error loading commission rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rate: CommissionRate) => {
    setEditing(rate.id || null);
    setEditForm(rate);
  };

  const handleCancel = () => {
    setEditing(null);
    setEditForm({
      role: '',
      rate: 0,
      type: 'percentage',
      description: '',
    });
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await configService.updateCommissionRate(editing, editForm);
        showToast('Commission rate updated successfully');
      } else {
        await configService.createCommissionRate(editForm);
        showToast('Commission rate created successfully');
      }
      handleCancel();
      loadCommissionRates();
    } catch (error) {
      showToast('Failed to save commission rate');
      console.error('Error saving commission rate:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this commission rate?')) return;

    try {
      await configService.deleteCommissionRate(id);
      showToast('Commission rate deleted successfully');
      loadCommissionRates();
    } catch (error) {
      showToast('Failed to delete commission rate');
      console.error('Error deleting commission rate:', error);
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Commission Rate Configuration</h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure commission rates for agents and property onboardings
          </p>
        </div>
        <button
          onClick={() => {
            setEditing('new');
            setEditForm({
              role: 'agent',
              rate: 0,
              type: 'percentage',
              description: '',
            });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Rate
        </button>
      </div>

      {/* Commission Rates Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rates.map((rate) => (
              <tr key={rate.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {rate.role}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {rate.rate}
                  {rate.type === 'percentage' ? '%' : ' (fixed)'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      rate.type === 'percentage'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {rate.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{rate.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(rate)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => rate.id && handleDelete(rate.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Form Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editing === 'new' ? 'Add Commission Rate' : 'Edit Commission Rate'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="agent">Agent</option>
                  <option value="regional_manager">Regional Manager</option>
                  <option value="default">Default</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm({ ...editForm, type: e.target.value as 'percentage' | 'fixed' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate * {editForm.type === 'percentage' ? '(%)' : '(₹)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={editForm.type === 'percentage' ? '100' : undefined}
                  value={editForm.rate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, rate: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Important Note</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Changes to commission rates will only apply to future onboardings. Historical
                commission records will remain unchanged.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionRateConfig;

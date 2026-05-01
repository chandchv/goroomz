import React, { useState, useEffect } from 'react';
import configService from '../../services/configService';
import { useToast } from '../../hooks/useToast';

interface PlatformPolicy {
  id?: string;
  category: string;
  name: string;
  value: string;
  type: 'text' | 'number' | 'boolean' | 'json';
  description: string;
  updatedAt?: string;
  updatedBy?: string;
}

const PlatformPoliciesConfig: React.FC = () => {
  const [policies, setPolicies] = useState<PlatformPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<PlatformPolicy>({
    category: 'payment',
    name: '',
    value: '',
    type: 'text',
    description: '',
  });
  const { showToast } = useToast();

  useEffect(() => {
    loadPlatformPolicies();
  }, []);

  const loadPlatformPolicies = async () => {
    try {
      setLoading(true);
      const data = await configService.getPlatformPolicies();
      setPolicies(data);
    } catch (error) {
      showToast('Failed to load platform policies');
      console.error('Error loading platform policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (policy: PlatformPolicy) => {
    setEditing(policy.id || null);
    setEditForm(policy);
  };

  const handleCancel = () => {
    setEditing(null);
    setEditForm({
      category: 'payment',
      name: '',
      value: '',
      type: 'text',
      description: '',
    });
  };

  const handleSave = async () => {
    try {
      if (editing && editing !== 'new') {
        await configService.updatePlatformPolicy(editing, editForm);
        showToast('Platform policy updated successfully');
      } else {
        await configService.createPlatformPolicy(editForm);
        showToast('Platform policy created successfully');
      }
      handleCancel();
      loadPlatformPolicies();
    } catch (error) {
      showToast('Failed to save platform policy');
      console.error('Error saving platform policy:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;

    try {
      await configService.deletePlatformPolicy(id);
      showToast('Platform policy deleted successfully');
      loadPlatformPolicies();
    } catch (error) {
      showToast('Failed to delete platform policy');
      console.error('Error deleting platform policy:', error);
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      payment: 'bg-green-100 text-green-800',
      cancellation: 'bg-red-100 text-red-800',
      service: 'bg-blue-100 text-blue-800',
      security: 'bg-purple-100 text-purple-800',
      general: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
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
          <h3 className="text-lg font-semibold text-gray-900">Platform Policies</h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure platform-wide policies and settings
          </p>
        </div>
        <button
          onClick={() => {
            setEditing('new');
            setEditForm({
              category: 'payment',
              name: '',
              value: '',
              type: 'text',
              description: '',
            });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Policy
        </button>
      </div>

      {/* Platform Policies Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Policy Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
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
            {policies.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No platform policies configured
                </td>
              </tr>
            ) : (
              policies.map((policy) => (
                <tr key={policy.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryBadgeColor(
                        policy.category
                      )}`}
                    >
                      {policy.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {policy.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {policy.type === 'boolean'
                      ? policy.value === 'true'
                        ? 'Yes'
                        : 'No'
                      : policy.value}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{policy.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(policy)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => policy.id && handleDelete(policy.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Form Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editing === 'new' ? 'Add Platform Policy' : 'Edit Platform Policy'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="payment">Payment</option>
                  <option value="cancellation">Cancellation</option>
                  <option value="service">Service</option>
                  <option value="security">Security</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Policy Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="e.g., payment_terms_days"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                <select
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      type: e.target.value as 'text' | 'number' | 'boolean' | 'json',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Value *</label>
                {editForm.type === 'boolean' ? (
                  <select
                    value={editForm.value}
                    onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : editForm.type === 'json' ? (
                  <textarea
                    value={editForm.value}
                    onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-gray-900"
                    placeholder='{"key": "value"}'
                  />
                ) : (
                  <input
                    type={editForm.type === 'number' ? 'number' : 'text'}
                    value={editForm.value}
                    onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                )}
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
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Changes to platform policies may affect all users and properties. Please review
                carefully before saving.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformPoliciesConfig;

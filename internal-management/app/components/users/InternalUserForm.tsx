import React, { useState, useEffect } from 'react';
import type { InternalUser } from '../../services/internalUserService';
import internalUserService from '../../services/internalUserService';
import territoryService from '../../services/territoryService';
import { useToast } from '../../hooks/useToast';

interface InternalUserFormProps {
  user?: InternalUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface Territory {
  id: string;
  name: string;
}

const InternalUserForm: React.FC<InternalUserFormProps> = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    internalRole: 'agent',
    territoryId: '',
    managerId: '',
    commissionRate: '',
    isActive: true,
    internalPermissions: {
      canOnboardProperties: false,
      canApproveOnboardings: false,
      canManageAgents: false,
      canAccessAllProperties: false,
      canManageSystemSettings: false,
      canViewAuditLogs: false,
      canManageCommissions: false,
      canManageTerritories: false,
      canManageTickets: false,
      canBroadcastAnnouncements: false,
    },
  });
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [managers, setManagers] = useState<InternalUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendCredentials, setSendCredentials] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    loadTerritories();
    loadManagers();

    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        internalRole: user.internalRole || 'agent',
        territoryId: user.territoryId || '',
        managerId: user.managerId || '',
        commissionRate: user.commissionRate?.toString() || '',
        isActive: user.isActive ?? true,
        internalPermissions: user.internalPermissions || formData.internalPermissions,
      });
      setSendCredentials(false); // Don't send credentials when editing
    }
  }, [user]);

  const loadTerritories = async () => {
    try {
      const data = await territoryService.getTerritories();
      setTerritories(data);
    } catch (error) {
      console.error('Error loading territories:', error);
    }
  };

  const loadManagers = async () => {
    try {
      const data = await internalUserService.getInternalUsers({ role: 'regional_manager' });
      setManagers(data);
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const handleRoleChange = (role: string) => {
    // Set default permissions based on role
    const defaultPermissions: Record<string, any> = {
      agent: {
        canOnboardProperties: true,
        canApproveOnboardings: false,
        canManageAgents: false,
        canAccessAllProperties: false,
        canManageSystemSettings: false,
        canViewAuditLogs: false,
        canManageCommissions: false,
        canManageTerritories: false,
        canManageTickets: false,
        canBroadcastAnnouncements: false,
      },
      regional_manager: {
        canOnboardProperties: true,
        canApproveOnboardings: true,
        canManageAgents: true,
        canAccessAllProperties: false,
        canManageSystemSettings: false,
        canViewAuditLogs: false,
        canManageCommissions: true,
        canManageTerritories: true,
        canManageTickets: false,
        canBroadcastAnnouncements: false,
      },
      operations_manager: {
        canOnboardProperties: false,
        canApproveOnboardings: false,
        canManageAgents: false,
        canAccessAllProperties: true,
        canManageSystemSettings: false,
        canViewAuditLogs: false,
        canManageCommissions: false,
        canManageTerritories: false,
        canManageTickets: true,
        canBroadcastAnnouncements: true,
      },
      platform_admin: {
        canOnboardProperties: true,
        canApproveOnboardings: true,
        canManageAgents: true,
        canAccessAllProperties: true,
        canManageSystemSettings: true,
        canViewAuditLogs: true,
        canManageCommissions: true,
        canManageTerritories: true,
        canManageTickets: true,
        canBroadcastAnnouncements: true,
      },
      superuser: {
        canOnboardProperties: true,
        canApproveOnboardings: true,
        canManageAgents: true,
        canAccessAllProperties: true,
        canManageSystemSettings: true,
        canViewAuditLogs: true,
        canManageCommissions: true,
        canManageTerritories: true,
        canManageTickets: true,
        canBroadcastAnnouncements: true,
      },
    };

    setFormData({
      ...formData,
      internalRole: role,
      internalPermissions: defaultPermissions[role] || formData.internalPermissions,
    });
  };

  const handlePermissionChange = (permission: string, value: boolean) => {
    setFormData({
      ...formData,
      internalPermissions: {
        ...formData.internalPermissions,
        [permission]: value,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        internalRole: formData.internalRole,
        internalPermissions: formData.internalPermissions,
        isActive: formData.isActive,
      };

      // Add optional fields
      if (formData.territoryId) submitData.territoryId = formData.territoryId;
      if (formData.managerId) submitData.managerId = formData.managerId;
      if (formData.commissionRate) submitData.commissionRate = parseFloat(formData.commissionRate);
      if (!user && sendCredentials) submitData.sendCredentials = true;

      if (user) {
        await internalUserService.updateInternalUser(user.id, submitData);
        showToast('User updated successfully');
      } else {
        await internalUserService.createInternalUser(submitData);
        showToast('User created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to save user');
      console.error('Error saving user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {user ? 'Edit Internal User' : 'Create Internal User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-600"
                  required
                  disabled={!!user} // Can't change email when editing
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  value={formData.internalRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                >
                  <option value="agent">Agent</option>
                  <option value="regional_manager">Regional Manager</option>
                  <option value="operations_manager">Operations Manager</option>
                  <option value="platform_admin">Platform Admin</option>
                  <option value="superuser">Superuser</option>
                </select>
              </div>
            </div>
          </div>

          {/* Role-specific fields */}
          {(formData.internalRole === 'agent' || formData.internalRole === 'regional_manager') && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {formData.internalRole === 'agent' ? 'Agent Details' : 'Manager Details'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.internalRole === 'agent' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Territory
                      </label>
                      <select
                        value={formData.territoryId}
                        onChange={(e) =>
                          setFormData({ ...formData, territoryId: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="">Select Territory</option>
                        {territories.map((territory) => (
                          <option key={territory.id} value={territory.id}>
                            {territory.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Manager
                      </label>
                      <select
                        value={formData.managerId}
                        onChange={(e) =>
                          setFormData({ ...formData, managerId: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="">Select Manager</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Commission Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.commissionRate}
                        onChange={(e) =>
                          setFormData({ ...formData, commissionRate: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </>
                )}

                {formData.internalRole === 'regional_manager' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Territory
                    </label>
                    <select
                      value={formData.territoryId}
                      onChange={(e) =>
                        setFormData({ ...formData, territoryId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      <option value="">Select Territory</option>
                      {territories.map((territory) => (
                        <option key={territory.id} value={territory.id}>
                          {territory.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Permissions */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(formData.internalPermissions).map(([key, value]) => (
                <label key={key} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => handlePermissionChange(key, e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {key
                      .replace(/^can/, '')
                      .replace(/([A-Z])/g, ' $1')
                      .trim()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="mb-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>

          {/* Send credentials checkbox (only for new users) */}
          {!user && (
            <div className="mb-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendCredentials}
                  onChange={(e) => setSendCredentials(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Send credentials via email
                </span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InternalUserForm;
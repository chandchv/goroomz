import React, { useState, useEffect } from 'react';
import roleService, { type Role, type CreateRoleData } from '../../services/roleService';
import { useToast } from '../../hooks/useToast';

interface CustomRoleFormProps {
  role?: Role | null;
  onClose: () => void;
  onSuccess: () => void;
}

const AVAILABLE_PERMISSIONS = [
  { key: 'canOnboardProperties', label: 'Onboard Properties', description: 'Create and manage property onboardings' },
  { key: 'canApproveOnboardings', label: 'Approve Onboardings', description: 'Review and approve property onboardings' },
  { key: 'canManageAgents', label: 'Manage Agents', description: 'Manage agent accounts and assignments' },
  { key: 'canAccessAllProperties', label: 'Access All Properties', description: 'View and manage all properties on the platform' },
  { key: 'canManageSystemSettings', label: 'Manage System Settings', description: 'Configure platform-wide settings' },
  { key: 'canViewAuditLogs', label: 'View Audit Logs', description: 'Access system audit logs and user activity' },
  { key: 'canManageCommissions', label: 'Manage Commissions', description: 'View and process commission payments' },
  { key: 'canManageTerritories', label: 'Manage Territories', description: 'Create and assign territories' },
  { key: 'canManageTickets', label: 'Manage Support Tickets', description: 'Handle property owner support tickets' },
  { key: 'canBroadcastAnnouncements', label: 'Broadcast Announcements', description: 'Send announcements to property owners' },
];

const CustomRoleForm: React.FC<CustomRoleFormProps> = ({ role, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateRoleData>({
    name: '',
    displayName: '',
    description: '',
    defaultPermissions: {},
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        defaultPermissions: role.defaultPermissions,
      });
    }
  }, [role]);

  const handlePermissionToggle = (permissionKey: string) => {
    setFormData((prev) => ({
      ...prev,
      defaultPermissions: {
        ...prev.defaultPermissions,
        [permissionKey]: !prev.defaultPermissions[permissionKey],
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.displayName) {
      showToast({ title: 'Please fill in all required fields', type: 'error' });
      return;
    }

    if (Object.keys(formData.defaultPermissions).length === 0) {
      showToast({ title: 'Please select at least one permission', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      if (role) {
        // For predefined roles (not custom), only send permissions
        // For custom roles, send all fields
        const updateData: any = {
          defaultPermissions: formData.defaultPermissions,
        };

        if (role.isCustom) {
          updateData.displayName = formData.displayName;
          updateData.description = formData.description;
        }

        await roleService.updateRole(role.id, updateData);
        showToast({ title: 'Role updated successfully', type: 'success' });
      } else {
        await roleService.createRole(formData);
        showToast({ title: 'Role created successfully', type: 'success' });
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error saving role:', error);
      showToast({ title: error.response?.data?.message || 'Failed to save role', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const selectedPermissionsCount = Object.values(formData.defaultPermissions).filter(
    Boolean
  ).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {role ? 'Edit Role' : 'Create Custom Role'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {role ? 'Update role details and permissions' : 'Define a new custom role with specific permissions'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-6">
            {/* Info message for predefined roles */}
            {role && !role.isCustom && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Editing Predefined Role
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        This is a predefined system role. You can only modify the permissions, 
                        but not the name, display name, or description.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={!!role} // Can't change name for existing roles
                  placeholder="e.g., custom_manager"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Internal identifier (lowercase, underscores only)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name <span className="text-red-500">*</span>
                  {role && !role.isCustom && (
                    <span className="text-xs text-gray-500 ml-2">(Read-only for predefined roles)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  disabled={role && !role.isCustom} // Disable for predefined roles
                  placeholder="e.g., Custom Manager"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                  {role && !role.isCustom && (
                    <span className="text-xs text-gray-500 ml-2">(Read-only for predefined roles)</span>
                  )}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  disabled={role && !role.isCustom} // Disable for predefined roles
                  placeholder="Describe the role's responsibilities..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900"
                />
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Permissions</h3>
                <span className="text-sm text-gray-500">
                  {selectedPermissionsCount} selected
                </span>
              </div>

              <div className="space-y-3">
                {AVAILABLE_PERMISSIONS.map((permission) => (
                  <div
                    key={permission.key}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      id={permission.key}
                      checked={!!formData.defaultPermissions[permission.key]}
                      onChange={() => handlePermissionToggle(permission.key)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={permission.key} className="flex-1 cursor-pointer">
                      <div className="text-sm font-medium text-gray-900">
                        {permission.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {permission.description}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              {role ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomRoleForm;

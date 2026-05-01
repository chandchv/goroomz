import React, { useState, useEffect } from 'react';
import roleService, { type Role } from '../../services/roleService';
import { useToast } from '../../hooks/useToast';
import CustomRoleForm from './CustomRoleForm';

interface RoleManagementProps {
  onEditRole?: (role: Role) => void;
}

const RoleManagement: React.FC<RoleManagementProps> = ({ onEditRole }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await roleService.getRoles();
      setRoles(data);
    } catch (error) {
      console.error('Error loading roles:', error);
      showToast({ title: 'Failed to load roles', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    setShowCreateForm(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setShowCreateForm(true);
    if (onEditRole) {
      onEditRole(role);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await roleService.deleteRole(roleId);
      showToast({ title: 'Role deleted successfully', type: 'success' });
      loadRoles();
      setShowDeleteConfirm(null);
    } catch (error: any) {
      console.error('Error deleting role:', error);
      showToast({
        title: error.response?.data?.message || 'Failed to delete role. It may have users assigned.',
        type: 'error'
      });
    }
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
    setSelectedRole(null);
  };

  const handleFormSuccess = () => {
    loadRoles();
    handleFormClose();
  };

  const getPermissionCount = (permissions: Record<string, boolean>) => {
    return Object.values(permissions).filter(Boolean).length;
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
          <h2 className="text-2xl font-bold text-gray-900">Role Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage system roles and permissions
          </p>
        </div>
        <button
          onClick={handleCreateRole}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Create Custom Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            {/* Role Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {role.displayName}
                  </h3>
                  {role.isCustom && (
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                      Custom
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{role.name}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {role.description}
            </p>

            {/* Permissions Count */}
            <div className="flex items-center gap-2 mb-4">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="text-sm text-gray-600">
                {getPermissionCount(role.defaultPermissions)} permissions
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleEditRole(role)}
                className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Edit
              </button>
              {role.isCustom && (
                <button
                  onClick={() => setShowDeleteConfirm(role.id)}
                  className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {roles.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No roles found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a custom role.
          </p>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <CustomRoleForm
          role={selectedRole}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Role
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this role? This action cannot be undone.
              Users with this role will need to be reassigned.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRole(showDeleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import internalUserService from '../services/internalUserService';
import type { InternalUser, GetUsersFilters } from '../services/internalUserService';
import UserListView from '../components/users/UserListView';
import UserCreationModal from '../components/users/UserCreationModal';
import UserEditModal from '../components/users/UserEditModal';
import DeactivateUserDialog from '../components/users/DeactivateUserDialog';
import BulkImportModal from '../components/users/BulkImportModal';
import ExportDialog from '../components/users/ExportDialog';
import type { ExportFormat } from '../components/users/ExportDialog';
import { useToast } from '../hooks/useToast';
import ErrorDisplay from '../components/users/ErrorDisplay';

interface InternalUserManagementPageProps {
  openCreateModal?: boolean;
}

export default function InternalUserManagementPage({ openCreateModal = false }: InternalUserManagementPageProps) {
  const { user } = useAuth();
  const { 
    canCreateUsers,
    canEditUsers,
    canDeactivateUsers,
    canBulkImportUsers,
    canExportUsers,
  } = usePermissions();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // State management for users, filters, pagination
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(openCreateModal);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<InternalUser | null>(null);
  const [deactivateMode, setDeactivateMode] = useState<'deactivate' | 'reactivate'>('deactivate');
  
  // Filter state
  const [filters, setFilters] = useState<GetUsersFilters>({
    page: 1,
    limit: 20,
  });
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Load users function
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await internalUserService.getUsers(filters);
      
      setUsers(response.data || []);
      setPagination({
        page: response.page || 1,
        limit: filters.limit || 20,
        total: response.count || 0,
        totalPages: response.totalPages || 1,
      });
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load users on mount and when filters change
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Permission checks are now handled by usePermissions hook

  // Handle filter changes
  const handleFiltersChange = (newFilters: GetUsersFilters) => {
    setFilters(newFilters);
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  // Handle page size change
  const handleLimitChange = (limit: number) => {
    setFilters({ ...filters, limit, page: 1 });
  };

  // Handle view user
  const handleViewUser = (userId: string) => {
    navigate(`/internal-users/${userId}`);
  };

  // Handle edit user
  const handleEditUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowEditModal(true);
  };

  // Handle close edit modal
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedUserId(null);
  };

  // Handle edit success
  const handleEditSuccess = () => {
    loadUsers();
  };

  // Handle deactivate user
  const handleDeactivateUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    setSelectedUser(user);
    setDeactivateMode(user.isActive ? 'deactivate' : 'reactivate');
    setShowDeactivateDialog(true);
  };

  // Handle confirm deactivation/reactivation
  const handleConfirmDeactivation = async () => {
    if (!selectedUser) return;

    try {
      if (deactivateMode === 'deactivate') {
        await internalUserService.deactivateUser(selectedUser.id);
        showToast({ 
          title: 'User deactivated successfully', 
          description: 'All authentication tokens have been revoked',
          type: 'success' 
        });
      } else {
        await internalUserService.reactivateUser(selectedUser.id);
        showToast({ 
          title: 'User reactivated successfully', 
          description: 'User can now access the platform',
          type: 'success' 
        });
      }
      
      // Refresh user list
      await loadUsers();
      
      // Close dialog
      setShowDeactivateDialog(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error(`Failed to ${deactivateMode} user:`, err);
      // Error is handled in the dialog component
      throw err;
    }
  };

  // Handle close deactivate dialog
  const handleCloseDeactivateDialog = () => {
    setShowDeactivateDialog(false);
    setSelectedUser(null);
  };

  // Handle export
  const handleExport = async (format: ExportFormat) => {
    try {
      const blob = await internalUserService.exportUsers(filters, format);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `internal-users-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showToast({ 
        title: 'Users exported successfully', 
        description: `Downloaded as ${format.toUpperCase()} file`,
        type: 'success' 
      });
    } catch (err: any) {
      console.error('Export failed:', err);
      throw err; // Re-throw to let ExportDialog handle the error display
    }
  };

  // Handle open export dialog
  const handleOpenExportDialog = () => {
    setShowExportDialog(true);
  };

  // Handle close export dialog
  const handleCloseExportDialog = () => {
    setShowExportDialog(false);
  };

  // Handle bulk import
  const handleBulkImport = () => {
    setShowBulkImportModal(true);
  };

  // Handle close bulk import modal
  const handleCloseBulkImportModal = () => {
    setShowBulkImportModal(false);
  };

  // Handle bulk import success
  const handleBulkImportSuccess = () => {
    loadUsers();
  };

  // Handle create user
  const handleCreateUser = () => {
    setShowCreateModal(true);
  };

  // Handle close create modal
  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    // Navigate back to list if we came from create route
    if (openCreateModal) {
      navigate('/internal-users');
    }
  };

  // Handle create success
  const handleCreateSuccess = () => {
    loadUsers();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Internal Users</h1>
            <p className="text-gray-600">Manage internal team members and their roles</p>
          </div>
          <div className="flex space-x-3">
            {canBulkImportUsers() && (
              <button
                onClick={handleBulkImport}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Bulk Import
              </button>
            )}
            {canExportUsers() && (
              <button
                onClick={handleOpenExportDialog}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 inline-flex items-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export
              </button>
            )}
            {canCreateUsers() && (
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
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
                Create User
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6">
          <ErrorDisplay
            title="Failed to load users"
            message={error}
            onRetry={loadUsers}
            retryLabel="Retry"
          />
        </div>
      )}

      {/* User List View */}
      <UserListView
        users={users}
        loading={loading}
        onEdit={handleEditUser}
        onDeactivate={handleDeactivateUser}
        onView={handleViewUser}
        canEdit={canEditUsers()}
        canDelete={canDeactivateUsers()}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        pagination={pagination}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />

      {/* User Creation Modal */}
      <UserCreationModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        onSuccess={handleCreateSuccess}
      />

      {/* User Edit Modal */}
      {selectedUserId && (
        <UserEditModal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          onSuccess={handleEditSuccess}
          userId={selectedUserId}
          canEditRole={canEditUsers()}
          canEditPermissions={user?.internalRole === 'superuser'}
        />
      )}

      {/* Deactivate/Reactivate User Dialog */}
      <DeactivateUserDialog
        isOpen={showDeactivateDialog}
        onClose={handleCloseDeactivateDialog}
        onConfirm={handleConfirmDeactivation}
        user={selectedUser}
        mode={deactivateMode}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={handleCloseBulkImportModal}
        onSuccess={handleBulkImportSuccess}
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={handleCloseExportDialog}
        onExport={handleExport}
        filters={filters}
      />
    </div>
  );
}

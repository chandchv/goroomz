import React, { useState, useEffect } from 'react';
import staffService, { type StaffUser } from '../services/staffService';
import StaffUserModal from '../components/StaffUserModal';

const StaffManagementPage: React.FC = () => {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('');

  useEffect(() => {
    loadStaff();
  }, [filterRole]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters = filterRole ? { role: filterRole } : undefined;
      const data = await staffService.getStaffUsers(filters);
      setStaff(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff users');
      console.error('Error loading staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingStaff(null);
    setShowModal(true);
  };

  const handleEdit = (staffUser: StaffUser) => {
    setEditingStaff(staffUser);
    setShowModal(true);
  };

  const handleDelete = async (staffId: string) => {
    if (deleteConfirm !== staffId) {
      setDeleteConfirm(staffId);
      return;
    }

    try {
      await staffService.deleteStaffUser(staffId);
      await loadStaff();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete staff user');
      setDeleteConfirm(null);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingStaff(null);
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setEditingStaff(null);
    loadStaff();
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      front_desk: 'bg-blue-100 text-blue-800',
      housekeeping: 'bg-green-100 text-green-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      manager: 'bg-purple-100 text-purple-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      front_desk: 'Front Desk',
      housekeeping: 'Housekeeping',
      maintenance: 'Maintenance',
      manager: 'Manager',
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Management</h1>
          <p className="text-gray-600">Manage staff accounts and permissions</p>
        </div>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Staff User
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium text-gray-700">Filter by Role:</label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">All Roles</option>
            <option value="front_desk">Front Desk</option>
            <option value="housekeeping">Housekeeping</option>
            <option value="maintenance">Maintenance</option>
            <option value="manager">Manager</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {staff.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No staff users found</p>
            <p className="text-sm">Create your first staff account to get started</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staff.map((staffUser) => (
                <tr key={staffUser.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{staffUser.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{staffUser.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{staffUser.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                        staffUser.staffRole
                      )}`}
                    >
                      {getRoleLabel(staffUser.staffRole)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        staffUser.isVerified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {staffUser.isVerified ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(staffUser)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(staffUser.id)}
                        className={`${
                          deleteConfirm === staffUser.id
                            ? 'text-red-600 font-semibold'
                            : 'text-red-600 hover:text-red-900'
                        }`}
                      >
                        {deleteConfirm === staffUser.id ? 'Confirm Delete?' : 'Delete'}
                      </button>
                      {deleteConfirm === staffUser.id && (
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Staff User Modal */}
      <StaffUserModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingStaff={editingStaff}
      />
    </div>
  );
};

export default StaffManagementPage;

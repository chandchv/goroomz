import React, { useState, useEffect } from 'react';
import staffService, { type StaffUser, type CreateStaffUserData } from '../services/staffService';

interface StaffUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingStaff: StaffUser | null;
}

const StaffUserModal: React.FC<StaffUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingStaff,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    staffRole: 'front_desk' as 'front_desk' | 'housekeeping' | 'maintenance' | 'manager',
    password: '',
    generatePassword: false,
  });

  const [permissions, setPermissions] = useState({
    canCheckIn: false,
    canCheckOut: false,
    canManageRooms: false,
    canRecordPayments: false,
    canViewReports: false,
    canManageStaff: false,
    canUpdateRoomStatus: false,
    canManageMaintenance: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  // Default permissions for each role
  const defaultPermissions = {
    front_desk: {
      canCheckIn: true,
      canCheckOut: true,
      canManageRooms: false,
      canRecordPayments: true,
      canViewReports: false,
      canManageStaff: false,
      canUpdateRoomStatus: false,
      canManageMaintenance: false,
    },
    housekeeping: {
      canCheckIn: false,
      canCheckOut: false,
      canManageRooms: false,
      canRecordPayments: false,
      canViewReports: false,
      canManageStaff: false,
      canUpdateRoomStatus: true,
      canManageMaintenance: false,
    },
    maintenance: {
      canCheckIn: false,
      canCheckOut: false,
      canManageRooms: false,
      canRecordPayments: false,
      canViewReports: false,
      canManageStaff: false,
      canUpdateRoomStatus: false,
      canManageMaintenance: true,
    },
    manager: {
      canCheckIn: true,
      canCheckOut: true,
      canManageRooms: true,
      canRecordPayments: true,
      canViewReports: true,
      canManageStaff: true,
      canUpdateRoomStatus: true,
      canManageMaintenance: true,
    },
  };

  useEffect(() => {
    if (editingStaff) {
      setFormData({
        name: editingStaff.name,
        email: editingStaff.email,
        phone: editingStaff.phone || '',
        staffRole: editingStaff.staffRole,
        password: '',
        generatePassword: false,
      });
      setPermissions(editingStaff.permissions);
    } else {
      // Reset form for new staff
      setFormData({
        name: '',
        email: '',
        phone: '',
        staffRole: 'front_desk',
        password: '',
        generatePassword: true,
      });
      setPermissions(defaultPermissions.front_desk);
    }
    setGeneratedPassword(null);
    setError(null);
  }, [editingStaff, isOpen]);

  const handleRoleChange = (role: typeof formData.staffRole) => {
    setFormData({ ...formData, staffRole: role });
    // Update permissions to match the new role's defaults
    setPermissions(defaultPermissions[role]);
  };

  const handlePermissionChange = (permission: keyof typeof permissions) => {
    setPermissions({
      ...permissions,
      [permission]: !permissions[permission],
    });
  };

  const handleGeneratePassword = () => {
    setFormData({ ...formData, generatePassword: true, password: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedPassword(null);

    try {
      if (editingStaff) {
        // Update existing staff
        await staffService.updateStaffUser(editingStaff.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          staffRole: formData.staffRole,
          permissions,
        });
        onSuccess();
      } else {
        // Create new staff
        const createData: CreateStaffUserData = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          staffRole: formData.staffRole,
          permissions,
        };

        if (formData.generatePassword) {
          createData.generatePasswordFlag = true;
        } else {
          if (!formData.password) {
            setError('Password is required when not auto-generating');
            setLoading(false);
            return;
          }
          createData.password = formData.password;
        }

        const response = await staffService.createStaffUser(createData);
        
        if (response.generatedPassword) {
          setGeneratedPassword(response.generatedPassword);
          // Don't close modal immediately so user can see the password
        } else {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save staff user');
      console.error('Error saving staff user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (generatedPassword) {
      if (confirm('Are you sure? The generated password will not be shown again.')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingStaff ? 'Edit Staff User' : 'Add New Staff User'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              type="button"
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

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {generatedPassword && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-green-900 mb-2">
                Staff user created successfully!
              </p>
              <p className="text-green-800 mb-2">
                Generated Password: <span className="font-mono font-bold">{generatedPassword}</span>
              </p>
              <p className="text-sm text-green-700">
                Please save this password securely. It will not be shown again.
              </p>
              <button
                onClick={onSuccess}
                className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Done
              </button>
            </div>
          )}

          {!generatedPassword && (
            <form onSubmit={handleSubmit}>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                      placeholder="John Doe"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="+1234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Staff Role *
                    </label>
                    <select
                      value={formData.staffRole}
                      onChange={(e) =>
                        handleRoleChange(
                          e.target.value as typeof formData.staffRole
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                    >
                      <option value="front_desk">Front Desk</option>
                      <option value="housekeeping">Housekeeping</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Password Section (only for new users) */}
              {!editingStaff && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Password</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="generatePassword"
                        checked={formData.generatePassword}
                        onChange={(e) =>
                          setFormData({ ...formData, generatePassword: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="generatePassword" className="text-sm text-gray-700">
                        Auto-generate secure password
                      </label>
                    </div>
                    {!formData.generatePassword && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password *
                        </label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="Enter password"
                          minLength={8}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Minimum 8 characters
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Permissions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Default permissions are set based on the selected role. You can customize them
                  below.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(permissions).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={key}
                        checked={value}
                        onChange={() => handlePermissionChange(key as keyof typeof permissions)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={key} className="text-sm text-gray-700">
                        {key
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, (str) => str.toUpperCase())
                          .replace('can ', '')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingStaff ? 'Update Staff User' : 'Create Staff User'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffUserModal;

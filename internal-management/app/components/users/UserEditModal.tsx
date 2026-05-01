import React, { useState, useEffect } from 'react';
import internalUserService, { type InternalUser } from '../../services/internalUserService';
import territoryService, { type Territory } from '../../services/territoryService';
import roleService, { type Role } from '../../services/roleService';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import ModalLoadingSkeleton from './ModalLoadingSkeleton';
import { InlineError } from './ErrorDisplay';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  canEditRole: boolean;
  canEditPermissions: boolean;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  internalRole: string;
  territoryId: string;
  managerId: string;
  commissionRate: string;
  isActive: boolean;
  permissions: {
    canOnboardProperties: boolean;
    canApproveOnboardings: boolean;
    canManageAgents: boolean;
    canAccessAllProperties: boolean;
    canManageSystemSettings: boolean;
    canViewAuditLogs: boolean;
    canManageCommissions: boolean;
    canManageTerritories: boolean;
    canManageTickets: boolean;
    canBroadcastAnnouncements: boolean;
  };
}

interface ValidationErrors {
  name?: string;
  phone?: string;
  commissionRate?: string;
}

type TabType = 'basic' | 'role' | 'permissions';

const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userId,
  canEditRole,
  canEditPermissions,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [originalData, setOriginalData] = useState<FormData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    internalRole: '',
    territoryId: '',
    managerId: '',
    commissionRate: '',
    isActive: true,
    permissions: {
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
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [managers, setManagers] = useState<InternalUser[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showRoleChangeConfirm, setShowRoleChangeConfirm] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<string>('');
  const { showToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && userId) {
      loadUserData();
      loadSupportingData();
    }
  }, [isOpen, userId]);

  const loadUserData = async () => {
    setLoadingUser(true);
    try {
      console.log('Loading user data for ID:', userId);
      
      // Check if we have an auth token
      const token = localStorage.getItem('auth_token');
      console.log('Auth token present:', !!token);
      
      const userData = await internalUserService.getUserById(userId);
      console.log('Received user data:', userData);
      
      if (!userData) {
        throw new Error('No user data received');
      }
      
      const initialFormData: FormData = {
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        internalRole: userData.internalRole || '',
        territoryId: userData.territoryId || '',
        managerId: userData.managerId || '',
        commissionRate: userData.commissionRate?.toString() || '',
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        permissions: userData.internalPermissions ? { ...userData.internalPermissions } : {
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
      };

      console.log('Setting form data:', initialFormData);
      setFormData(initialFormData);
      setOriginalData(initialFormData);
    } catch (error: any) {
      console.error('Error loading user:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to load user data';
      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view this user.';
      } else if (error.response?.status === 404) {
        errorMessage = 'User not found.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showToast({ title: errorMessage, type: 'error' });
    } finally {
      setLoadingUser(false);
    }
  };

  const loadSupportingData = async () => {
    try {
      // Load territories
      try {
        const territoriesResponse = await territoryService.getTerritories();
        console.log('Territories response:', territoriesResponse);
        
        // Handle different response structures
        let territoriesData = [];
        if (Array.isArray(territoriesResponse)) {
          territoriesData = territoriesResponse;
        } else if (territoriesResponse && Array.isArray(territoriesResponse.data)) {
          territoriesData = territoriesResponse.data;
        } else if (territoriesResponse && territoriesResponse.territories && Array.isArray(territoriesResponse.territories)) {
          territoriesData = territoriesResponse.territories;
        }
        
        console.log('Setting territories:', territoriesData);
        setTerritories(territoriesData);
      } catch (error) {
        console.warn('Failed to load territories:', error);
        setTerritories([]);
      }

      // Load regional managers
      try {
        const managersResponse = await internalUserService.getInternalUsers({
          role: 'regional_manager',
          isActive: true,
        });
        console.log('Managers response:', managersResponse);
        
        // Handle different response structures
        let managersData = [];
        if (Array.isArray(managersResponse)) {
          managersData = managersResponse;
        } else if (managersResponse && Array.isArray(managersResponse.data)) {
          managersData = managersResponse.data;
        }
        
        setManagers(managersData);
      } catch (error) {
        console.warn('Failed to load managers:', error);
        setManagers([]);
      }

      // Load available roles
      try {
        const rolesResponse = await roleService.getRoles();
        console.log('Roles response:', rolesResponse);
        
        // Handle different response structures
        let rolesData = [];
        if (Array.isArray(rolesResponse)) {
          rolesData = rolesResponse;
        } else if (rolesResponse && Array.isArray(rolesResponse.data)) {
          rolesData = rolesResponse.data;
        }
        
        // Filter roles based on current user's role
        let filteredRoles = rolesData;
        if (user?.internalRole === 'platform_admin') {
          filteredRoles = rolesData.filter((role) => role.name !== 'superuser');
        }
        
        console.log('Setting roles:', filteredRoles);
        setAvailableRoles(filteredRoles);
      } catch (error) {
        console.warn('Failed to load roles:', error);
        // Fallback to hardcoded roles if API fails
        const fallbackRoles = [
          {
            id: 'agent',
            name: 'agent',
            displayName: 'Marketing/Sales Agent',
            description: 'Onboards new properties and property owners onto the platform',
            defaultPermissions: {
              canOnboardProperties: true,
              canApproveOnboardings: false,
              canManageAgents: false,
              canAccessAllProperties: false,
              canManageSystemSettings: false,
              canViewAuditLogs: false,
              canManageCommissions: false,
              canManageTerritories: false,
              canManageTickets: false,
              canBroadcastAnnouncements: false
            },
            isCustom: false,
            createdBy: '',
            createdAt: '',
            updatedAt: ''
          },
          {
            id: 'regional_manager',
            name: 'regional_manager',
            displayName: 'Regional Manager',
            description: 'Oversees agents and properties in a geographic region',
            defaultPermissions: {
              canOnboardProperties: true,
              canApproveOnboardings: true,
              canManageAgents: true,
              canAccessAllProperties: false,
              canManageSystemSettings: false,
              canViewAuditLogs: false,
              canManageCommissions: true,
              canManageTerritories: true,
              canManageTickets: false,
              canBroadcastAnnouncements: false
            },
            isCustom: false,
            createdBy: '',
            createdAt: '',
            updatedAt: ''
          },
          {
            id: 'operations_manager',
            name: 'operations_manager',
            displayName: 'Operations Manager',
            description: 'Manages platform-wide operations and support',
            defaultPermissions: {
              canOnboardProperties: false,
              canApproveOnboardings: false,
              canManageAgents: false,
              canAccessAllProperties: true,
              canManageSystemSettings: false,
              canViewAuditLogs: false,
              canManageCommissions: false,
              canManageTerritories: false,
              canManageTickets: true,
              canBroadcastAnnouncements: true
            },
            isCustom: false,
            createdBy: '',
            createdAt: '',
            updatedAt: ''
          },
          {
            id: 'platform_admin',
            name: 'platform_admin',
            displayName: 'Platform Administrator',
            description: 'Manages system configuration and internal users',
            defaultPermissions: {
              canOnboardProperties: false,
              canApproveOnboardings: false,
              canManageAgents: true,
              canAccessAllProperties: true,
              canManageSystemSettings: true,
              canViewAuditLogs: true,
              canManageCommissions: true,
              canManageTerritories: true,
              canManageTickets: true,
              canBroadcastAnnouncements: true
            },
            isCustom: false,
            createdBy: '',
            createdAt: '',
            updatedAt: ''
          },
          {
            id: 'superuser',
            name: 'superuser',
            displayName: 'Superuser',
            description: 'Complete platform access and control',
            defaultPermissions: {
              canOnboardProperties: true,
              canApproveOnboardings: true,
              canManageAgents: true,
              canAccessAllProperties: true,
              canManageSystemSettings: true,
              canViewAuditLogs: true,
              canManageCommissions: true,
              canManageTerritories: true,
              canManageTickets: true,
              canBroadcastAnnouncements: true
            },
            isCustom: false,
            createdBy: '',
            createdAt: '',
            updatedAt: ''
          }
        ];
        
        let filteredRoles = fallbackRoles;
        if (user?.internalRole === 'platform_admin') {
          filteredRoles = fallbackRoles.filter((role) => role.name !== 'superuser');
        }
        
        setAvailableRoles(filteredRoles);
      }
    } catch (error) {
      console.error('Error loading supporting data:', error);
    }
  };

  const hasUnsavedChanges = (): boolean => {
    if (!originalData) return false;
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
      resetForm();
    }
  };

  const confirmClose = () => {
    setShowUnsavedWarning(false);
    onClose();
    resetForm();
  };

  const cancelClose = () => {
    setShowUnsavedWarning(false);
  };

  const resetForm = () => {
    setActiveTab('basic');
    setFormData({
      name: '',
      email: '',
      phone: '',
      internalRole: '',
      territoryId: '',
      managerId: '',
      commissionRate: '',
      isActive: true,
      permissions: {
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
    setOriginalData(null);
    setValidationErrors({});
    setShowUnsavedWarning(false);
    setShowRoleChangeConfirm(false);
    setPendingRoleChange('');
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Validate name
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    // Validate phone
    if (!formData.phone.trim()) {
      errors.phone = 'Phone is required';
    } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
      errors.phone = 'Invalid phone format';
    }

    // Validate commission rate if provided
    if (formData.commissionRate) {
      const rate = parseFloat(formData.commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        errors.commissionRate = 'Commission rate must be between 0 and 100';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showToast({ title: 'Please fix validation errors', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const updateData: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        internalRole: formData.internalRole,
        isActive: formData.isActive,
      };

      // Add optional fields based on role
      if (formData.internalRole === 'agent' || formData.internalRole === 'regional_manager') {
        updateData.territoryId = formData.territoryId || null;
      }

      if (formData.internalRole === 'agent') {
        updateData.managerId = formData.managerId || null;
        if (formData.commissionRate) {
          updateData.commissionRate = parseFloat(formData.commissionRate);
        }
      }

      // Update user basic info and role
      await internalUserService.updateUser(userId, updateData);

      // Update permissions if user has permission to edit them and they've changed
      if (canEditPermissions && originalData) {
        const permissionsChanged =
          JSON.stringify(formData.permissions) !== JSON.stringify(originalData.permissions);
        
        if (permissionsChanged) {
          await internalUserService.updatePermissions(userId, formData.permissions);
        }
      }

      showToast({
        title: 'User updated successfully',
        description: 'Changes have been saved and logged',
        type: 'success',
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update user';
      showToast({ title: errorMessage, type: 'error' });
      console.error('Error updating user:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRoleName = (role: string): string => {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
        <div className="bg-white md:rounded-lg shadow-xl w-full md:max-w-4xl h-full md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex justify-between items-center flex-shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Edit User</h2>
              <p className="text-xs md:text-sm text-gray-500 mt-1 truncate">
                {loadingUser ? 'Loading...' : formData.email}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl ml-4 flex-shrink-0"
              disabled={loading}
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0 overflow-x-auto">
            <nav className="flex -mb-px px-4 md:px-6">
              <button
                onClick={() => setActiveTab('basic')}
                className={`py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'basic'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Basic Info
              </button>
              {canEditRole && (
                <button
                  onClick={() => setActiveTab('role')}
                  className={`py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'role'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Role & Territory
                </button>
              )}
              {canEditPermissions && (
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`py-3 md:py-4 px-4 md:px-6 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'permissions'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Permissions
                </button>
              )}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {loadingUser ? (
              <ModalLoadingSkeleton type="form" />
            ) : (
              <>
                {/* Basic Information Tab */}
                {activeTab === 'basic' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (validationErrors.name) {
                            setValidationErrors({ ...validationErrors, name: undefined });
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          validationErrors.name ? 'border-red-500' : 'border-gray-300'
                        } text-gray-900`}
                        placeholder="Enter full name"
                      />
                      {validationErrors.name && <InlineError message={validationErrors.name} />}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed text-gray-900"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Email address cannot be changed for security reasons
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (validationErrors.phone) {
                            setValidationErrors({ ...validationErrors, phone: undefined });
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          validationErrors.phone ? 'border-red-500' : 'border-gray-300'
                        } text-gray-900`}
                        placeholder="+91 1234567890"
                      />
                      {validationErrors.phone && <InlineError message={validationErrors.phone} />}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Status
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            checked={formData.isActive}
                            onChange={() => setFormData({ ...formData, isActive: true })}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Active</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            checked={!formData.isActive}
                            onChange={() => setFormData({ ...formData, isActive: false })}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Inactive</span>
                        </label>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Inactive users cannot log in to the platform
                      </p>
                    </div>

                    {!formData.isActive && originalData?.isActive && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg
                              className="h-5 w-5 text-yellow-400"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                              Warning: Deactivating User
                            </h3>
                            <p className="mt-1 text-sm text-yellow-700">
                              This user will be immediately logged out and will not be able to access the platform until reactivated.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Role & Territory Tab */}
                {activeTab === 'role' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        User Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.internalRole}
                        onChange={(e) => {
                          const newRole = e.target.value;
                          if (newRole !== formData.internalRole) {
                            setPendingRoleChange(newRole);
                            setShowRoleChangeConfirm(true);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        {Array.isArray(availableRoles) && availableRoles.map((role) => (
                          <option key={role.id} value={role.name}>
                            {role.displayName}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Changing the role will update the user's permissions
                      </p>
                    </div>

                    {/* Permission Preview */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Current Role Permissions
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(formData.permissions).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center ${
                                value ? 'bg-green-100' : 'bg-gray-100'
                              }`}
                            >
                              {value && (
                                <svg
                                  className="w-3 h-3 text-green-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            <span className="text-xs text-gray-700">
                              {key
                                .replace(/^can/, '')
                                .replace(/([A-Z])/g, ' $1')
                                .trim()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Territory Assignment (for agents and regional managers) */}
                    {(formData.internalRole === 'agent' ||
                      formData.internalRole === 'regional_manager') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Territory Assignment
                        </label>
                        <select
                          value={formData.territoryId}
                          onChange={(e) =>
                            setFormData({ ...formData, territoryId: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        >
                          <option value="">No Territory Assigned</option>
                          {Array.isArray(territories) && territories.map((territory) => (
                            <option key={territory.id} value={territory.id}>
                              {territory.name}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          {formData.internalRole === 'agent'
                            ? 'Assign the agent to a specific territory for property onboarding'
                            : 'Assign the regional manager to oversee a specific territory'}
                        </p>
                      </div>
                    )}

                    {/* Manager Assignment (for agents only) */}
                    {formData.internalRole === 'agent' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reporting Manager
                        </label>
                        <select
                          value={formData.managerId}
                          onChange={(e) =>
                            setFormData({ ...formData, managerId: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        >
                          <option value="">No Manager Assigned</option>
                          {Array.isArray(managers) && managers.map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Assign a regional manager as the agent's supervisor
                        </p>
                      </div>
                    )}

                    {/* Commission Rate (for agents only) */}
                    {formData.internalRole === 'agent' && (
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
                          onChange={(e) => {
                            setFormData({ ...formData, commissionRate: e.target.value });
                            if (validationErrors.commissionRate) {
                              setValidationErrors({
                                ...validationErrors,
                                commissionRate: undefined,
                              });
                            }
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            validationErrors.commissionRate
                              ? 'border-red-500'
                              : 'border-gray-300'
                          } text-gray-900`}
                          placeholder="5.0"
                        />
                        {validationErrors.commissionRate && <InlineError message={validationErrors.commissionRate} />}
                        <p className="mt-1 text-xs text-gray-500">
                          Commission percentage for property onboardings (0-100)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Permissions Tab */}
                {activeTab === 'permissions' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-blue-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">
                            Granular Permission Control
                          </h3>
                          <p className="mt-1 text-sm text-blue-700">
                            Customize individual permissions for this user. Changes here override the default role permissions.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900">
                        User Permissions
                      </h4>

                      {/* Property Management Permissions */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-3">
                          Property Management
                        </h5>
                        <div className="space-y-3">
                          <label className="flex items-start cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions.canOnboardProperties}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  permissions: {
                                    ...formData.permissions,
                                    canOnboardProperties: e.target.checked,
                                  },
                                })
                              }
                              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-700">
                                Can Onboard Properties
                              </p>
                              <p className="text-xs text-gray-500">
                                Allows user to add new properties to the platform
                              </p>
                            </div>
                          </label>

                          <label className="flex items-start cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions.canApproveOnboardings}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  permissions: {
                                    ...formData.permissions,
                                    canApproveOnboardings: e.target.checked,
                                  },
                                })
                              }
                              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-700">
                                Can Approve Onboardings
                              </p>
                              <p className="text-xs text-gray-500">
                                Allows user to review and approve property onboarding requests
                              </p>
                            </div>
                          </label>

                          <label className="flex items-start cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions.canAccessAllProperties}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  permissions: {
                                    ...formData.permissions,
                                    canAccessAllProperties: e.target.checked,
                                  },
                                })
                              }
                              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-700">
                                Can Access All Properties
                              </p>
                              <p className="text-xs text-gray-500">
                                Allows user to view and manage all properties regardless of territory
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Team Management Permissions */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-3">
                          Team Management
                        </h5>
                        <div className="space-y-3">
                          <label className="flex items-start cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions.canManageAgents}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  permissions: {
                                    ...formData.permissions,
                                    canManageAgents: e.target.checked,
                                  },
                                })
                              }
                              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-700">
                                Can Manage Agents
                              </p>
                              <p className="text-xs text-gray-500">
                                Allows user to oversee and manage marketing agents
                              </p>
                            </div>
                          </label>

                          <label className="flex items-start cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions.canManageTerritories}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  permissions: {
                                    ...formData.permissions,
                                    canManageTerritories: e.target.checked,
                                  },
                                })
                              }
                              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-700">
                                Can Manage Territories
                              </p>
                              <p className="text-xs text-gray-500">
                                Allows user to create and manage territory assignments
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Financial Permissions */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-3">
                          Financial Management
                        </h5>
                        <div className="space-y-3">
                          <label className="flex items-start cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions.canManageCommissions}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  permissions: {
                                    ...formData.permissions,
                                    canManageCommissions: e.target.checked,
                                  },
                                })
                              }
                              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-700">
                                Can Manage Commissions
                              </p>
                              <p className="text-xs text-gray-500">
                                Allows user to view and manage commission payments
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Operations Permissions */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-3">
                          Operations
                        </h5>
                        <div className="space-y-3">
                          <label className="flex items-start cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions.canManageTickets}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  permissions: {
                                    ...formData.permissions,
                                    canManageTickets: e.target.checked,
                                  },
                                })
                              }
                              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-700">
                                Can Manage Tickets
                              </p>
                              <p className="text-xs text-gray-500">
                                Allows user to handle support tickets and maintenance requests
                              </p>
                            </div>
                          </label>

                          <label className="flex items-start cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions.canBroadcastAnnouncements}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  permissions: {
                                    ...formData.permissions,
                                    canBroadcastAnnouncements: e.target.checked,
                                  },
                                })
                              }
                              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-700">
                                Can Broadcast Announcements
                              </p>
                              <p className="text-xs text-gray-500">
                                Allows user to send platform-wide announcements
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* System Permissions */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-3">
                          System Administration
                        </h5>
                        <div className="space-y-3">
                          <label className="flex items-start cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions.canManageSystemSettings}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  permissions: {
                                    ...formData.permissions,
                                    canManageSystemSettings: e.target.checked,
                                  },
                                })
                              }
                              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-700">
                                Can Manage System Settings
                              </p>
                              <p className="text-xs text-gray-500">
                                Allows user to configure platform settings and policies
                              </p>
                            </div>
                          </label>

                          <label className="flex items-start cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions.canViewAuditLogs}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  permissions: {
                                    ...formData.permissions,
                                    canViewAuditLogs: e.target.checked,
                                  },
                                })
                              }
                              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-700">
                                Can View Audit Logs
                              </p>
                              <p className="text-xs text-gray-500">
                                Allows user to view system audit logs and user activity
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-yellow-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Warning: Custom Permissions
                          </h3>
                          <p className="mt-1 text-sm text-yellow-700">
                            Custom permissions override the default role permissions. Use caution when granting elevated permissions.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-4 md:px-6 py-3 md:py-4 flex gap-3 flex-shrink-0">
            <button
              onClick={handleClose}
              className="flex-1 md:flex-none min-h-[44px] px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm md:text-base font-medium"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              className="flex-1 md:flex-none min-h-[44px] px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 text-sm md:text-base font-medium"
              disabled={loading || loadingUser || !hasUnsavedChanges()}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning Dialog */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-4 md:p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 md:h-6 md:w-6 text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-medium text-gray-900">Unsaved Changes</h3>
                <p className="mt-2 text-sm text-gray-500">
                  You have unsaved changes. Are you sure you want to close without saving?
                </p>
              </div>
            </div>
            <div className="mt-4 md:mt-6 flex flex-col-reverse md:flex-row justify-end gap-2 md:gap-3">
              <button
                onClick={cancelClose}
                className="min-h-[44px] px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm md:text-base font-medium"
              >
                Continue Editing
              </button>
              <button
                onClick={confirmClose}
                className="min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors text-sm md:text-base font-medium"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Confirmation Dialog */}
      {showRoleChangeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-4 md:p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 md:h-6 md:w-6 text-orange-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-medium text-gray-900">Confirm Role Change</h3>
                <p className="mt-2 text-sm text-gray-500">
                  You are about to change this user's role from{' '}
                  <span className="font-semibold">{formatRoleName(formData.internalRole)}</span> to{' '}
                  <span className="font-semibold">{formatRoleName(pendingRoleChange)}</span>.
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  This will immediately update their permissions and access level. Are you sure you want to continue?
                </p>
              </div>
            </div>
            <div className="mt-4 md:mt-6 flex flex-col-reverse md:flex-row justify-end gap-2 md:gap-3">
              <button
                onClick={() => {
                  setShowRoleChangeConfirm(false);
                  setPendingRoleChange('');
                }}
                className="min-h-[44px] px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm md:text-base font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Update role and permissions
                  const selectedRole = availableRoles.find((r) => r.name === pendingRoleChange);
                  if (selectedRole) {
                    setFormData({
                      ...formData,
                      internalRole: pendingRoleChange,
                      permissions: { ...selectedRole.defaultPermissions } as any,
                    });
                  }
                  setShowRoleChangeConfirm(false);
                  setPendingRoleChange('');
                }}
                className="min-h-[44px] px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 transition-colors text-sm md:text-base font-medium"
              >
                Change Role
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserEditModal;

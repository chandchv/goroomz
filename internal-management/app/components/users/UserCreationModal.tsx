import React, { useState, useEffect } from 'react';
import internalUserService from '../../services/internalUserService';
import territoryService, { type Territory } from '../../services/territoryService';
import roleService, { type Role } from '../../services/roleService';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import ErrorDisplay, { InlineError } from './ErrorDisplay';
import ModalLoadingSkeleton from './ModalLoadingSkeleton';

interface UserCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  // Basic Information
  name: string;
  email: string;
  phone: string;
  
  // Role Selection
  internalRole: string;
  
  // Role-specific fields
  territoryId: string;
  managerId: string;
  commissionRate: string;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  internalRole?: string;
  territoryId?: string;
  commissionRate?: string;
}

const STEPS = [
  { id: 1, name: 'Basic Information', description: 'Enter user details' },
  { id: 2, name: 'Role Selection', description: 'Choose user role' },
  { id: 3, name: 'Role Details', description: 'Configure role-specific settings' },
  { id: 4, name: 'Review', description: 'Review and submit' },
];

const ROLE_DESCRIPTIONS: Record<string, string> = {
  agent: 'Marketing agents onboard properties and manage leads in their assigned territory',
  regional_manager: 'Regional managers oversee agents, approve onboardings, and manage territories',
  operations_manager: 'Operations managers handle tickets, maintenance, and property operations',
  platform_admin: 'Platform administrators manage system settings, users, and platform configuration',
  superuser: 'Superusers have full platform access including custom role creation',
};

const UserCreationModal: React.FC<UserCreationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    internalRole: '',
    territoryId: '',
    managerId: '',
    commissionRate: '',
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { canCreateRole } = usePermissions();

  useEffect(() => {
    if (isOpen) {
      loadData();
      resetForm();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoadingData(true);
    setDataLoadError(null);
    
    try {
      // Load territories
      try {
        const territoriesData = await territoryService.getTerritories();
        setTerritories(territoriesData);
      } catch (error) {
        console.warn('Failed to load territories:', error);
        setTerritories([]);
      }

      // Load regional managers for agent supervisor assignment
      try {
        const managersData = await internalUserService.getInternalUsers({ 
          role: 'regional_manager',
          isActive: true 
        });
        setManagers(managersData);
      } catch (error) {
        console.warn('Failed to load managers:', error);
        setManagers([]);
      }

      // Load available roles with fallback to hardcoded roles
      let rolesData: Role[] = [];
      try {
        rolesData = await roleService.getRoles();
      } catch (error) {
        console.warn('Failed to load roles from API, using fallback roles:', error);
        // Fallback to hardcoded predefined roles
        rolesData = [
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
      }
      
      // Filter roles based on current user's permissions
      const filteredRoles = rolesData.filter(role => {
        // If canCreateRole function exists, use it; otherwise allow all roles for superuser
        if (typeof canCreateRole === 'function') {
          return canCreateRole(role.name);
        }
        
        // Fallback: superuser can create all roles, platform_admin cannot create superuser
        if (user?.internalRole === 'superuser') {
          return true;
        } else if (user?.internalRole === 'platform_admin') {
          return role.name !== 'superuser';
        }
        
        return false;
      });
      
      setAvailableRoles(filteredRoles);
    } catch (error: any) {
      console.error('Error loading data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load required data';
      setDataLoadError(errorMessage);
      showToast({ title: errorMessage, type: 'error' });
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData({
      name: '',
      email: '',
      phone: '',
      internalRole: '',
      territoryId: '',
      managerId: '',
      commissionRate: '',
    });
    setValidationErrors({});
  };

  const validateStep = (step: number): boolean => {
    const errors: ValidationErrors = {};

    if (step === 1) {
      // Validate basic information
      if (!formData.name.trim()) {
        errors.name = 'Name is required';
      }

      if (!formData.email.trim()) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Invalid email format';
      }

      if (!formData.phone.trim()) {
        errors.phone = 'Phone is required';
      } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
        errors.phone = 'Invalid phone format';
      }
    }

    if (step === 2) {
      // Validate role selection
      if (!formData.internalRole) {
        errors.internalRole = 'Role is required';
      }
    }

    if (step === 3) {
      // Validate role-specific fields
      if (formData.internalRole === 'agent') {
        if (formData.commissionRate) {
          const rate = parseFloat(formData.commissionRate);
          if (isNaN(rate) || rate < 0 || rate > 100) {
            errors.commissionRate = 'Commission rate must be between 0 and 100';
          }
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      // Check if email exists by attempting to get users with this email
      const response = await internalUserService.getInternalUsers({ search: email.toLowerCase() });
      return response.some((user: any) => user.email.toLowerCase() === email.toLowerCase());
    } catch (error) {
      console.warn('Failed to check email existence:', error);
      return false; // Don't block if check fails
    }
  };

  const checkPhoneExists = async (phone: string): Promise<boolean> => {
    try {
      // Check if phone exists by attempting to get users with this phone
      const response = await internalUserService.getInternalUsers({ search: phone.trim() });
      return response.some((user: any) => user.phone === phone.trim());
    } catch (error) {
      console.warn('Failed to check phone existence:', error);
      return false; // Don't block if check fails
    }
  };

  const validateUniqueFields = async (): Promise<boolean> => {
    const errors: ValidationErrors = {};

    // Check email uniqueness
    if (formData.email.trim()) {
      const emailExists = await checkEmailExists(formData.email.trim());
      if (emailExists) {
        errors.email = 'A user with this email already exists';
      }
    }

    // Check phone uniqueness
    if (formData.phone.trim()) {
      const phoneExists = await checkPhoneExists(formData.phone.trim());
      if (phoneExists) {
        errors.phone = 'A user with this phone number already exists';
      }
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      // For step 1, also validate unique fields
      if (currentStep === 1) {
        setLoading(true);
        const isUnique = await validateUniqueFields();
        setLoading(false);
        
        if (!isUnique) {
          return; // Stop if email or phone already exists
        }
      }

      // Skip step 3 if role doesn't need additional fields
      if (currentStep === 2 && !needsRoleSpecificFields()) {
        setCurrentStep(4);
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    // Skip step 3 if role doesn't need additional fields
    if (currentStep === 4 && !needsRoleSpecificFields()) {
      setCurrentStep(2);
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setLoading(true);

    try {
      const submitData: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        internalRole: formData.internalRole,
      };

      // Add optional fields based on role
      if (formData.territoryId) {
        submitData.territoryId = formData.territoryId;
      }

      if (formData.managerId) {
        submitData.managerId = formData.managerId;
      }

      if (formData.commissionRate) {
        submitData.commissionRate = parseFloat(formData.commissionRate);
      }

      await internalUserService.createUser(submitData);
      
      showToast({ 
        title: 'User created successfully', 
        description: 'Credentials sent via email',
        type: 'success' 
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create user';
      showToast({ title: errorMessage, type: 'error' });
      console.error('Error creating user:', error);
    } finally {
      setLoading(false);
    }
  };

  const needsRoleSpecificFields = (): boolean => {
    return formData.internalRole === 'agent' || formData.internalRole === 'regional_manager';
  };

  const goToStep = (step: number) => {
    // Only allow going back to completed steps
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const formatRoleName = (role: string): string => {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white md:rounded-lg shadow-xl w-full md:max-w-3xl h-full md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex justify-between items-center flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 truncate">Create Internal User</h2>
            <p className="text-xs md:text-sm text-gray-500 mt-1 truncate">
              {STEPS[currentStep - 1].description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl ml-4 flex-shrink-0"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Stepper */}
        <div className="px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center">
                  <button
                    onClick={() => goToStep(step.id)}
                    disabled={step.id > currentStep}
                    className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full text-sm md:text-base font-semibold transition-colors ${
                      step.id === currentStep
                        ? 'bg-blue-600 text-white'
                        : step.id < currentStep
                        ? 'bg-green-600 text-white cursor-pointer hover:bg-green-700 active:bg-green-800'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {step.id < currentStep ? '✓' : step.id}
                  </button>
                  <div className="ml-2 md:ml-3 hidden md:block">
                    <p className={`text-sm font-medium ${
                      step.id === currentStep ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </p>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 md:mx-4 ${
                    step.id < currentStep ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Data Load Error */}
          {dataLoadError && (
            <div className="mb-4">
              <ErrorDisplay
                title="Failed to load required data"
                message={dataLoadError}
                onRetry={loadData}
                retryLabel="Retry"
              />
            </div>
          )}

          {/* Loading State */}
          {loadingData && <ModalLoadingSkeleton type="form" />}

          {/* Step 1: Basic Information */}
          {!loadingData && currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
                    validationErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter full name"
                />
                {validationErrors.name && <InlineError message={validationErrors.name} />}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
                    validationErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="user@example.com"
                />
                {validationErrors.email && <InlineError message={validationErrors.email} />}
                <p className="mt-1 text-xs text-gray-500">
                  Login credentials will be sent to this email
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
                    validationErrors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+91 1234567890"
                />
                {validationErrors.phone && <InlineError message={validationErrors.phone} />}
              </div>
            </div>
          )}

          {/* Step 2: Role Selection */}
          {!loadingData && currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Role <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {availableRoles.map((role) => (
                    <label
                      key={role.id}
                      className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.internalRole === role.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.name}
                        checked={formData.internalRole === role.name}
                        onChange={(e) => setFormData({ ...formData, internalRole: e.target.value })}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <p className="font-medium text-gray-900">{role.displayName}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {role.description || ROLE_DESCRIPTIONS[role.name] || 'No description available'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                {validationErrors.internalRole && <InlineError message={validationErrors.internalRole} />}
              </div>

              {formData.internalRole === 'superuser' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Warning: Creating Superuser
                      </h3>
                      <p className="mt-1 text-sm text-yellow-700">
                        Superusers have full platform access including the ability to create other superusers and custom roles. Only create superuser accounts for trusted administrators.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Role-specific Fields */}
          {!loadingData && currentStep === 3 && (
            <div className="space-y-4">
              {formData.internalRole === 'agent' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Territory Assignment
                    </label>
                    <select
                      value={formData.territoryId}
                      onChange={(e) => setFormData({ ...formData, territoryId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      <option value="">Select Territory (Optional)</option>
                      {territories.map((territory) => (
                        <option key={territory.id} value={territory.id}>
                          {territory.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Assign the agent to a specific territory for property onboarding
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reporting Manager
                    </label>
                    <select
                      value={formData.managerId}
                      onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      <option value="">Select Manager (Optional)</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Assign a regional manager as the agent's supervisor
                    </p>
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
                      onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
                        validationErrors.commissionRate ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="5.0"
                    />
                    {validationErrors.commissionRate && <InlineError message={validationErrors.commissionRate} />}
                    <p className="mt-1 text-xs text-gray-500">
                      Commission percentage for property onboardings (0-100)
                    </p>
                  </div>
                </>
              )}

              {formData.internalRole === 'regional_manager' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Territory Assignment
                  </label>
                  <select
                    value={formData.territoryId}
                    onChange={(e) => setFormData({ ...formData, territoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Select Territory (Optional)</option>
                    {territories.map((territory) => (
                      <option key={territory.id} value={territory.id}>
                        {territory.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Assign the regional manager to oversee a specific territory
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Review and Submit */}
          {!loadingData && currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review User Information</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Basic Information</p>
                      <p className="text-base text-gray-900 mt-1">{formData.name}</p>
                      <p className="text-sm text-gray-600">{formData.email}</p>
                      <p className="text-sm text-gray-600">{formData.phone}</p>
                    </div>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="border-t border-gray-200 pt-3 flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Role</p>
                      <p className="text-base text-gray-900 mt-1">
                        {formatRoleName(formData.internalRole)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {ROLE_DESCRIPTIONS[formData.internalRole]}
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                  </div>

                  {needsRoleSpecificFields() && (
                    <div className="border-t border-gray-200 pt-3 flex justify-between items-start">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-500">Role Details</p>
                        
                        {formData.territoryId && (
                          <div>
                            <p className="text-xs text-gray-500">Territory</p>
                            <p className="text-sm text-gray-900">
                              {territories.find(t => t.id === formData.territoryId)?.name || 'Unknown'}
                            </p>
                          </div>
                        )}

                        {formData.managerId && (
                          <div>
                            <p className="text-xs text-gray-500">Manager</p>
                            <p className="text-sm text-gray-900">
                              {managers.find(m => m.id === formData.managerId)?.name || 'Unknown'}
                            </p>
                          </div>
                        )}

                        {formData.commissionRate && (
                          <div>
                            <p className="text-xs text-gray-500">Commission Rate</p>
                            <p className="text-sm text-gray-900">{formData.commissionRate}%</p>
                          </div>
                        )}

                        {!formData.territoryId && !formData.managerId && !formData.commissionRate && (
                          <p className="text-sm text-gray-600 italic">No additional details configured</p>
                        )}
                      </div>
                      <button
                        onClick={() => setCurrentStep(3)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Credentials will be sent via email
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      A temporary password will be generated and sent to {formData.email}. The user will be required to change their password on first login.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 md:px-6 py-3 md:py-4 flex gap-3 flex-shrink-0">
          <button
            onClick={currentStep === 1 ? onClose : handleBack}
            className="flex-1 md:flex-none min-h-[44px] px-4 md:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm md:text-base font-medium"
            disabled={loading}
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              className="flex-1 md:flex-none min-h-[44px] px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm md:text-base font-medium"
              disabled={loading}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex-1 md:flex-none min-h-[44px] px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 text-sm md:text-base font-medium"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCreationModal;

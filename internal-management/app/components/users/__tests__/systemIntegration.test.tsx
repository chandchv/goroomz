/**
 * System Integration Tests for Internal User Management UI
 * 
 * This test suite performs comprehensive end-to-end testing of the internal
 * user management feature, verifying:
 * - Component rendering
 * - User workflows (create, edit, deactivate)
 * - Permission enforcement
 * - Integration with dashboards
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import InternalUserManagementPage from '../../../pages/InternalUserManagementPage';
import SuperuserDashboardPage from '../../../pages/SuperuserDashboardPage';
import PlatformAdminDashboardPage from '../../../pages/PlatformAdminDashboardPage';
import RegionalManagerDashboardPage from '../../../pages/RegionalManagerDashboardPage';
import OperationsManagerDashboardPage from '../../../pages/OperationsManagerDashboardPage';
import MyProfilePage from '../../../pages/MyProfilePage';
import { AuthProvider } from '../../../contexts/AuthContext';
import * as internalUserService from '../../../services/internalUserService';

// Mock the services
vi.mock('../../../services/internalUserService');
vi.mock('../../../services/roleService');
vi.mock('../../../services/territoryService');
vi.mock('../../../services/dashboardService');

// Mock user data
const mockSuperuser = {
  id: 'superuser-1',
  name: 'Super Admin',
  email: 'super@goroomz.com',
  phone: '+911234567890',
  internalRole: 'superuser',
  internalPermissions: {
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
  isActive: true,
  lastLoginAt: new Date().toISOString(),
};

const mockPlatformAdmin = {
  ...mockSuperuser,
  id: 'admin-1',
  name: 'Platform Admin',
  email: 'admin@goroomz.com',
  internalRole: 'platform_admin',
};

const mockRegionalManager = {
  ...mockSuperuser,
  id: 'rm-1',
  name: 'Regional Manager',
  email: 'rm@goroomz.com',
  internalRole: 'regional_manager',
  internalPermissions: {
    ...mockSuperuser.internalPermissions,
    canManageSystemSettings: false,
    canManageAgents: true,
  },
};

const mockOperationsManager = {
  ...mockSuperuser,
  id: 'om-1',
  name: 'Operations Manager',
  email: 'om@goroomz.com',
  internalRole: 'operations_manager',
  internalPermissions: {
    ...mockSuperuser.internalPermissions,
    canManageSystemSettings: false,
    canManageAgents: false,
  },
};

const mockUsers = [
  mockSuperuser,
  mockPlatformAdmin,
  mockRegionalManager,
  mockOperationsManager,
  {
    id: 'agent-1',
    name: 'Marketing Agent',
    email: 'agent@goroomz.com',
    phone: '+911234567891',
    internalRole: 'agent',
    territoryId: 'territory-1',
    managerId: 'rm-1',
    commissionRate: 5.0,
    internalPermissions: {
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
    isActive: true,
    lastLoginAt: new Date().toISOString(),
  },
];

// Helper to render with auth context
const renderWithAuth = (component: React.ReactElement, user = mockSuperuser) => {
  return render(
    <BrowserRouter>
      <AuthProvider value={{ user, isAuthenticated: true, login: vi.fn(), logout: vi.fn() }}>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('System Integration Tests - Component Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(internalUserService.getUsers).mockResolvedValue({
      users: mockUsers,
      total: mockUsers.length,
    });
  });

  it('should render InternalUserManagementPage correctly', async () => {
    renderWithAuth(<InternalUserManagementPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/internal user management/i)).toBeInTheDocument();
    });
    
    // Verify quick action buttons are present
    expect(screen.getByText(/create user/i)).toBeInTheDocument();
    expect(screen.getByText(/bulk import/i)).toBeInTheDocument();
    expect(screen.getByText(/export/i)).toBeInTheDocument();
  });

  it('should render user list with all users', async () => {
    renderWithAuth(<InternalUserManagementPage />);
    
    await waitFor(() => {
      mockUsers.forEach(user => {
        expect(screen.getByText(user.name)).toBeInTheDocument();
        expect(screen.getByText(user.email)).toBeInTheDocument();
      });
    });
  });

  it('should render SuperuserDashboardPage with user management quick actions', async () => {
    renderWithAuth(<SuperuserDashboardPage />, mockSuperuser);
    
    await waitFor(() => {
      expect(screen.getByText(/create internal user/i)).toBeInTheDocument();
      expect(screen.getByText(/manage internal users/i)).toBeInTheDocument();
    });
  });

  it('should render PlatformAdminDashboardPage with user management quick actions', async () => {
    renderWithAuth(<PlatformAdminDashboardPage />, mockPlatformAdmin);
    
    await waitFor(() => {
      expect(screen.getByText(/create internal user/i)).toBeInTheDocument();
      expect(screen.getByText(/manage internal users/i)).toBeInTheDocument();
    });
  });

  it('should render MyProfilePage correctly', async () => {
    vi.mocked(internalUserService.getUserById).mockResolvedValue(mockSuperuser);
    
    renderWithAuth(<MyProfilePage />, mockSuperuser);
    
    await waitFor(() => {
      expect(screen.getByText(/my profile/i)).toBeInTheDocument();
      expect(screen.getByText(mockSuperuser.name)).toBeInTheDocument();
      expect(screen.getByText(mockSuperuser.email)).toBeInTheDocument();
    });
  });
});

describe('System Integration Tests - User Creation Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(internalUserService.getUsers).mockResolvedValue({
      users: mockUsers,
      total: mockUsers.length,
    });
    vi.mocked(internalUserService.createUser).mockResolvedValue({
      ...mockUsers[0],
      id: 'new-user-1',
      name: 'New User',
      email: 'newuser@goroomz.com',
    });
  });

  it('should complete user creation workflow', async () => {
    const user = userEvent.setup();
    renderWithAuth(<InternalUserManagementPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/create user/i)).toBeInTheDocument();
    });
    
    // Click create user button
    const createButton = screen.getByText(/create user/i);
    await user.click(createButton);
    
    // Modal should open
    await waitFor(() => {
      expect(screen.getByText(/create internal user/i)).toBeInTheDocument();
    });
    
    // Fill in basic information
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const phoneInput = screen.getByLabelText(/phone/i);
    
    await user.type(nameInput, 'New User');
    await user.type(emailInput, 'newuser@goroomz.com');
    await user.type(phoneInput, '+911234567899');
    
    // Select role
    const roleSelect = screen.getByLabelText(/role/i);
    await user.selectOptions(roleSelect, 'agent');
    
    // Submit form
    const submitButton = screen.getByText(/create user/i);
    await user.click(submitButton);
    
    // Verify API was called
    await waitFor(() => {
      expect(internalUserService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New User',
          email: 'newuser@goroomz.com',
          phone: '+911234567899',
          internalRole: 'agent',
        })
      );
    });
  });

  it('should validate required fields in user creation', async () => {
    const user = userEvent.setup();
    renderWithAuth(<InternalUserManagementPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/create user/i)).toBeInTheDocument();
    });
    
    // Click create user button
    const createButton = screen.getByText(/create user/i);
    await user.click(createButton);
    
    // Try to submit without filling fields
    const submitButton = screen.getByText(/create user/i);
    await user.click(submitButton);
    
    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });
});

describe('System Integration Tests - Permission Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(internalUserService.getUsers).mockResolvedValue({
      users: mockUsers,
      total: mockUsers.length,
    });
  });

  it('should show all roles for Superuser', async () => {
    const user = userEvent.setup();
    renderWithAuth(<InternalUserManagementPage />, mockSuperuser);
    
    await waitFor(() => {
      expect(screen.getByText(/create user/i)).toBeInTheDocument();
    });
    
    const createButton = screen.getByText(/create user/i);
    await user.click(createButton);
    
    await waitFor(() => {
      const roleSelect = screen.getByLabelText(/role/i);
      const options = within(roleSelect).getAllByRole('option');
      
      // Superuser should see all roles including superuser
      expect(options.some(opt => opt.textContent?.includes('superuser'))).toBe(true);
    });
  });

  it('should hide Superuser role for Platform Admin', async () => {
    const user = userEvent.setup();
    renderWithAuth(<InternalUserManagementPage />, mockPlatformAdmin);
    
    await waitFor(() => {
      expect(screen.getByText(/create user/i)).toBeInTheDocument();
    });
    
    const createButton = screen.getByText(/create user/i);
    await user.click(createButton);
    
    await waitFor(() => {
      const roleSelect = screen.getByLabelText(/role/i);
      const options = within(roleSelect).getAllByRole('option');
      
      // Platform Admin should NOT see superuser role
      expect(options.some(opt => opt.textContent?.includes('superuser'))).toBe(false);
    });
  });

  it('should show read-only view for Operations Manager', async () => {
    renderWithAuth(<InternalUserManagementPage />, mockOperationsManager);
    
    await waitFor(() => {
      // Operations Manager should see user list
      expect(screen.getByText(mockUsers[0].name)).toBeInTheDocument();
    });
    
    // But should NOT see create/edit buttons
    expect(screen.queryByText(/create user/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/edit/i)).not.toBeInTheDocument();
  });

  it('should show only team members for Regional Manager', async () => {
    const teamMembers = mockUsers.filter(u => u.managerId === 'rm-1');
    vi.mocked(internalUserService.getUsers).mockResolvedValue({
      users: teamMembers,
      total: teamMembers.length,
    });
    
    renderWithAuth(<RegionalManagerDashboardPage />, mockRegionalManager);
    
    await waitFor(() => {
      // Should see team section
      expect(screen.getByText(/my team/i)).toBeInTheDocument();
    });
    
    // Should only see agents assigned to this manager
    teamMembers.forEach(member => {
      expect(screen.getByText(member.name)).toBeInTheDocument();
    });
  });
});

describe('System Integration Tests - User Editing Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(internalUserService.getUsers).mockResolvedValue({
      users: mockUsers,
      total: mockUsers.length,
    });
    vi.mocked(internalUserService.getUserById).mockResolvedValue(mockUsers[4]);
    vi.mocked(internalUserService.updateUser).mockResolvedValue({
      ...mockUsers[4],
      name: 'Updated Agent',
    });
  });

  it('should complete user editing workflow', async () => {
    const user = userEvent.setup();
    renderWithAuth(<InternalUserManagementPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Marketing Agent')).toBeInTheDocument();
    });
    
    // Click edit button for agent
    const editButtons = screen.getAllByText(/edit/i);
    await user.click(editButtons[0]);
    
    // Edit modal should open
    await waitFor(() => {
      expect(screen.getByText(/edit user/i)).toBeInTheDocument();
    });
    
    // Update name
    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Agent');
    
    // Save changes
    const saveButton = screen.getByText(/save/i);
    await user.click(saveButton);
    
    // Verify API was called
    await waitFor(() => {
      expect(internalUserService.updateUser).toHaveBeenCalledWith(
        'agent-1',
        expect.objectContaining({
          name: 'Updated Agent',
        })
      );
    });
  });
});

describe('System Integration Tests - User Deactivation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(internalUserService.getUsers).mockResolvedValue({
      users: mockUsers,
      total: mockUsers.length,
    });
    vi.mocked(internalUserService.deactivateUser).mockResolvedValue(undefined);
  });

  it('should complete user deactivation workflow', async () => {
    const user = userEvent.setup();
    renderWithAuth(<InternalUserManagementPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Marketing Agent')).toBeInTheDocument();
    });
    
    // Click deactivate button
    const deactivateButtons = screen.getAllByText(/deactivate/i);
    await user.click(deactivateButtons[0]);
    
    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
    
    // Confirm deactivation
    const confirmButton = screen.getByText(/confirm/i);
    await user.click(confirmButton);
    
    // Verify API was called
    await waitFor(() => {
      expect(internalUserService.deactivateUser).toHaveBeenCalledWith('agent-1');
    });
  });
});

describe('System Integration Tests - Filtering and Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(internalUserService.getUsers).mockResolvedValue({
      users: mockUsers,
      total: mockUsers.length,
    });
  });

  it('should filter users by role', async () => {
    const user = userEvent.setup();
    const agentUsers = mockUsers.filter(u => u.internalRole === 'agent');
    
    renderWithAuth(<InternalUserManagementPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/filter by role/i)).toBeInTheDocument();
    });
    
    // Select agent role filter
    const roleFilter = screen.getByLabelText(/filter by role/i);
    await user.selectOptions(roleFilter, 'agent');
    
    // Should call API with filter
    await waitFor(() => {
      expect(internalUserService.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'agent',
        })
      );
    });
  });

  it('should search users by name', async () => {
    const user = userEvent.setup();
    renderWithAuth(<InternalUserManagementPage />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });
    
    // Type in search box
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Marketing');
    
    // Should call API with search query (debounced)
    await waitFor(() => {
      expect(internalUserService.getUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Marketing',
        })
      );
    }, { timeout: 1000 });
  });
});

describe('System Integration Tests - Dashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should navigate from Superuser dashboard to user management', async () => {
    const user = userEvent.setup();
    renderWithAuth(<SuperuserDashboardPage />, mockSuperuser);
    
    await waitFor(() => {
      expect(screen.getByText(/manage internal users/i)).toBeInTheDocument();
    });
    
    // Click manage users button
    const manageButton = screen.getByText(/manage internal users/i);
    await user.click(manageButton);
    
    // Should navigate to user management page
    // (In real app, this would change the route)
    expect(manageButton).toHaveAttribute('href', '/internal-users');
  });

  it('should show user count on dashboard', async () => {
    vi.mocked(internalUserService.getUsers).mockResolvedValue({
      users: mockUsers,
      total: mockUsers.length,
    });
    
    renderWithAuth(<SuperuserDashboardPage />, mockSuperuser);
    
    await waitFor(() => {
      expect(screen.getByText(mockUsers.length.toString())).toBeInTheDocument();
    });
  });
});

console.log('✅ System Integration Tests Completed');

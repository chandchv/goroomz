import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import ProtectedRoute, { useUserType, useDefaultDashboard } from '../ProtectedRoute';
import PlatformRoute from '../PlatformRoute';
import * as AuthContext from '../../contexts/AuthContext';

// Mock the AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Route Guards - User Type Classification', () => {
  it('should classify user with internalRole as platform_staff', () => {
    const mockUser = {
      id: '1',
      email: 'agent@test.com',
      name: 'Test Agent',
      internalRole: 'agent',
    };

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    });

    const TestComponent = () => {
      const userType = useUserType();
      return <div>User Type: {userType}</div>;
    };

    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    );

    expect(screen.getByText('User Type: platform_staff')).toBeInTheDocument();
  });

  it('should classify user with owner role as property_owner', () => {
    const mockUser = {
      id: '1',
      email: 'owner@test.com',
      name: 'Test Owner',
      role: 'owner',
    };

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    });

    const TestComponent = () => {
      const userType = useUserType();
      return <div>User Type: {userType}</div>;
    };

    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    );

    expect(screen.getByText('User Type: property_owner')).toBeInTheDocument();
  });

  it('should classify user with staffRole as property_staff', () => {
    const mockUser = {
      id: '1',
      email: 'staff@test.com',
      name: 'Test Staff',
      staffRole: 'front_desk',
    };

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    });

    const TestComponent = () => {
      const userType = useUserType();
      return <div>User Type: {userType}</div>;
    };

    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    );

    expect(screen.getByText('User Type: property_staff')).toBeInTheDocument();
  });

  it('should prioritize internalRole over role', () => {
    const mockUser = {
      id: '1',
      email: 'test@test.com',
      name: 'Test User',
      role: 'owner',
      internalRole: 'superuser',
    };

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    });

    const TestComponent = () => {
      const userType = useUserType();
      return <div>User Type: {userType}</div>;
    };

    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    );

    // Should be platform_staff due to priority
    expect(screen.getByText('User Type: platform_staff')).toBeInTheDocument();
  });
});

describe('Route Guards - Default Dashboard Paths', () => {
  it('should return agent dashboard for agent role', () => {
    const mockUser = {
      id: '1',
      email: 'agent@test.com',
      name: 'Test Agent',
      internalRole: 'agent',
    };

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    });

    const TestComponent = () => {
      const dashboardPath = useDefaultDashboard();
      return <div>Dashboard: {dashboardPath}</div>;
    };

    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    );

    expect(screen.getByText('Dashboard: /agent-dashboard')).toBeInTheDocument();
  });

  it('should return standard dashboard for property owners', () => {
    const mockUser = {
      id: '1',
      email: 'owner@test.com',
      name: 'Test Owner',
      role: 'owner',
    };

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    });

    const TestComponent = () => {
      const dashboardPath = useDefaultDashboard();
      return <div>Dashboard: {dashboardPath}</div>;
    };

    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    );

    expect(screen.getByText('Dashboard: /dashboard')).toBeInTheDocument();
  });

  it('should return superuser dashboard for superuser role', () => {
    const mockUser = {
      id: '1',
      email: 'superuser@test.com',
      name: 'Test Superuser',
      internalRole: 'superuser',
    };

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    });

    const TestComponent = () => {
      const dashboardPath = useDefaultDashboard();
      return <div>Dashboard: {dashboardPath}</div>;
    };

    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    );

    expect(screen.getByText('Dashboard: /superuser-dashboard')).toBeInTheDocument();
  });
});

describe('Route Guards - Access Control', () => {
  it('should show loading state when auth is loading', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: false,
      isLoading: true,
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: false,
      isLoading: false,
    });

    const { container } = render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    // Should not render protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render content when authenticated', () => {
    const mockUser = {
      id: '1',
      email: 'user@test.com',
      name: 'Test User',
      role: 'owner',
    };

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});

describe('PlatformRoute - Platform Staff Access', () => {
  it('should allow platform staff to access platform routes', () => {
    const mockUser = {
      id: '1',
      email: 'agent@test.com',
      name: 'Test Agent',
      internalRole: 'agent',
    };

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <PlatformRoute>
          <div>Platform Content</div>
        </PlatformRoute>
      </BrowserRouter>
    );

    expect(screen.getByText('Platform Content')).toBeInTheDocument();
  });

  it('should redirect property owners away from platform routes', () => {
    const mockUser = {
      id: '1',
      email: 'owner@test.com',
      name: 'Test Owner',
      role: 'owner',
    };

    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: mockUser,
      token: 'test-token',
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <PlatformRoute>
          <div>Platform Content</div>
        </PlatformRoute>
      </BrowserRouter>
    );

    // Should not render platform content for property owners
    expect(screen.queryByText('Platform Content')).not.toBeInTheDocument();
  });
});

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/authService';

interface User {
  id: string;
  email: string;
  name: string;
  // Base role field (for property ecosystem)
  role?: 'user' | 'owner' | 'category_owner' | 'admin' | null;
  // Property staff role
  staffRole?: 'front_desk' | 'housekeeping' | 'maintenance' | 'manager' | null;
  // Property staff permissions
  permissions?: {
    canCheckIn?: boolean;
    canCheckOut?: boolean;
    canManageRooms?: boolean;
    canRecordPayments?: boolean;
    canViewReports?: boolean;
    canManageStaff?: boolean;
    canUpdateRoomStatus?: boolean;
    canManageMaintenance?: boolean;
  };
  // Platform staff role
  internalRole?: 'agent' | 'regional_manager' | 'operations_manager' | 'platform_admin' | 'superuser' | null;
  // Platform staff permissions
  internalPermissions?: {
    canOnboardProperties?: boolean;
    canApproveOnboardings?: boolean;
    canManageAgents?: boolean;
    canAccessAllProperties?: boolean;
    canManageSystemSettings?: boolean;
    canViewAuditLogs?: boolean;
    canManageCommissions?: boolean;
    canManageTerritories?: boolean;
    canManageTickets?: boolean;
    canBroadcastAnnouncements?: boolean;
  };
  // Assignment fields
  territoryId?: string | null;
  managerId?: string | null;
  commissionRate?: number | null;
  assignedPropertyId?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        // Check for existing token on mount (localStorage or cookie)
        const storedToken = localStorage.getItem('auth_token');
        
        if (storedToken) {
          setToken(storedToken);
          // Verify token and get user info
          try {
            const userData = await authService.getCurrentUser();
            if (isMounted) {
              setUser(userData);
            }
          } catch (error) {
            // Token is invalid, clear it
            if (isMounted) {
              localStorage.removeItem('auth_token');
              setToken(null);
              setUser(null);
            }
          }
        } else {
          // Even if no localStorage token, try to get user (cookie might exist)
          try {
            const userData = await authService.getCurrentUser();
            if (isMounted) {
              setUser(userData);
              // If we got user data, we have a valid cookie session
              setToken('cookie-session'); // Placeholder to indicate authenticated
            }
          } catch (error) {
            // No valid session - this is expected when not logged in
            if (isMounted) {
              setToken(null);
              setUser(null);
            }
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('auth_token', response.token);
    return response.user; // Return user data for role-based redirect
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

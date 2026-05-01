import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../hooks/useRole';
import { useNotifications } from '../contexts/NotificationContext';

interface MenuItem {
  name: string;
  path: string;
  icon: string;
  roles: Array<'agent' | 'regional_manager' | 'operations_manager' | 'platform_admin' | 'superuser'>;
  badge?: 'pendingClaims';
}

interface InternalSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InternalSidebar({ isOpen, onClose }: InternalSidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const { hasAnyInternalRole } = useRole();
  const { pendingClaimsCount } = useNotifications();

  // Get the appropriate dashboard path based on user's role
  const getDashboardPath = (): string => {
    // If user has internal role, use role-specific dashboard
    if (user?.internalRole) {
      switch (user.internalRole) {
        case 'agent':
          return '/agent-dashboard';
        case 'regional_manager':
          return '/regional-manager-dashboard';
        case 'operations_manager':
          return '/operations-manager-dashboard';
        case 'platform_admin':
          return '/platform-admin-dashboard';
        case 'superuser':
          return '/superuser-dashboard';
        default:
          return '/dashboard';
      }
    }
    
    // For users with basic roles, use general dashboard
    return '/dashboard';
  };

  // Dashboard items
  const dashboardItems: MenuItem[] = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: '📊',
      roles: ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Agent Dashboard', 
      path: '/agent-dashboard', 
      icon: '🎯',
      roles: ['agent']
    },
    { 
      name: 'Regional Manager Dashboard', 
      path: '/regional-manager-dashboard', 
      icon: '📊',
      roles: ['regional_manager']
    },
    { 
      name: 'Operations Manager Dashboard', 
      path: '/operations-manager-dashboard', 
      icon: '⚙️',
      roles: ['operations_manager']
    },
    { 
      name: 'Platform Admin Dashboard', 
      path: '/platform-admin-dashboard', 
      icon: '🛡️',
      roles: ['platform_admin']
    },
    { 
      name: 'Superuser Dashboard', 
      path: '/superuser-dashboard', 
      icon: '👑',
      roles: ['superuser']
    },
  ];

  // Lead Management items
  const leadManagementItems: MenuItem[] = [
    { 
      name: 'My Leads', 
      path: '/leads', 
      icon: '🎯',
      roles: ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Lead Pipeline', 
      path: '/lead-pipeline', 
      icon: '📈',
      roles: ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
  ];

  // Commission & Performance items
  const commissionItems: MenuItem[] = [
    { 
      name: 'My Commissions', 
      path: '/commissions', 
      icon: '💵',
      roles: ['agent', 'regional_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Commission Reports', 
      path: '/commission-reports', 
      icon: '📊',
      roles: ['regional_manager', 'platform_admin', 'superuser']
    },
  ];

  // Territory Management items
  const territoryItems: MenuItem[] = [
    { 
      name: 'Territories', 
      path: '/territories', 
      icon: '🗺️',
      roles: ['regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Territory Assignment', 
      path: '/territory-assignment', 
      icon: '📍',
      roles: ['regional_manager', 'platform_admin', 'superuser']
    },
  ];

  // Team Management items
  const teamItems: MenuItem[] = [
    { 
      name: 'My Team', 
      path: '/my-team', 
      icon: '👥',
      roles: ['regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Team Performance', 
      path: '/team-performance', 
      icon: '📊',
      roles: ['regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Performance Targets', 
      path: '/performance-targets', 
      icon: '🎯',
      roles: ['regional_manager', 'platform_admin', 'superuser']
    },
  ];

  // Operations items
  const operationsItems: MenuItem[] = [
    { 
      name: 'Support Tickets', 
      path: '/tickets', 
      icon: '🎫',
      roles: ['operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Announcements', 
      path: '/announcements', 
      icon: '📢',
      roles: ['operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Platform Analytics', 
      path: '/analytics', 
      icon: '📈',
      roles: ['operations_manager', 'platform_admin', 'superuser']
    },
  ];

  // Platform Management items (under /platform/ prefix)
  const platformItems: MenuItem[] = [
    { 
      name: 'All Properties', 
      path: '/platform/properties', 
      icon: '🏘️',
      roles: ['regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Property Owners', 
      path: '/platform/owners', 
      icon: '🏛️',
      roles: ['operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Property Claims', 
      path: '/property-claims', 
      icon: '📋',
      roles: ['platform_admin', 'superuser'],
      badge: 'pendingClaims'
    },
    { 
      name: 'Agents', 
      path: '/platform/agents', 
      icon: '👔',
      roles: ['regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
  ];

  // Property Management items (non-platform routes)
  const propertyItems: MenuItem[] = [
    { 
      name: 'Bookings', 
      path: '/bookings', 
      icon: '📅',
      roles: ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Rooms', 
      path: '/rooms', 
      icon: '🏠',
      roles: ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Check-In', 
      path: '/check-in', 
      icon: '🔑',
      roles: ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Check-Out', 
      path: '/check-out', 
      icon: '🚪',
      roles: ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Housekeeping', 
      path: '/housekeeping', 
      icon: '🧹',
      roles: ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Property Onboarding', 
      path: '/property-onboarding', 
      icon: '🏢',
      roles: ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Property Details', 
      path: '/property-overview', 
      icon: '⚙️',
      roles: ['regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Property Documents', 
      path: '/property-documents', 
      icon: '📄',
      roles: ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
  ];

  // Administration items
  const adminItems: MenuItem[] = [
    { 
      name: 'Internal Users', 
      path: '/internal-users', 
      icon: '👤',
      roles: ['platform_admin', 'superuser']
    },
    { 
      name: 'Role Management', 
      path: '/role-management', 
      icon: '🔐',
      roles: ['superuser']
    },
    { 
      name: 'System Settings', 
      path: '/settings', 
      icon: '⚙️',
      roles: ['platform_admin', 'superuser']
    },
    { 
      name: 'Subscriptions', 
      path: '/subscriptions', 
      icon: '💳',
      roles: ['platform_admin', 'superuser']
    },
    { 
      name: 'Audit Logs', 
      path: '/audit-logs', 
      icon: '📋',
      roles: ['platform_admin', 'superuser']
    },
  ];

  // Profile items
  const profileItems: MenuItem[] = [
    { 
      name: 'My Profile', 
      path: '/my-profile', 
      icon: '👤',
      roles: ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Notifications', 
      path: '/notifications', 
      icon: '🔔',
      roles: ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
    { 
      name: 'Notification Preferences', 
      path: '/notification-preferences', 
      icon: '⚙️',
      roles: ['agent', 'regional_manager', 'operations_manager', 'platform_admin', 'superuser']
    },
  ];

  const hasPermission = (item: MenuItem): boolean => {
    // If user has internal role, use the existing logic
    if (user?.internalRole) {
      return hasAnyInternalRole(item.roles);
    }
    
    // For users with basic roles accessing internal management system,
    // grant access to general items based on their role level
    if (user?.role) {
      // Superusers can see everything
      if (user.role === 'superuser') {
        return true;
      }
      
      // Admins and category owners can see most items except agent-specific ones
      if (user.role === 'admin' || user.role === 'category_owner') {
        return !item.roles.includes('agent') || item.roles.includes('platform_admin') || item.roles.includes('superuser');
      }
      
      // Property owners can see property management items
      if (user.role === 'owner') {
        const ownerPaths = [
          '/dashboard', '/my-profile', '/notifications', '/notification-preferences',
          '/bookings', '/rooms', '/check-in', '/check-out', '/housekeeping',
          '/maintenance', '/payments', '/deposits', '/property-documents',
          '/properties', '/property-overview'
        ];
        return ownerPaths.includes(item.path) || 
               item.roles.includes('agent') ||
               item.path.startsWith('/properties/');
      }
    }
    
    return false;
  };

  // Filter each category
  const filteredDashboard = dashboardItems.filter(hasPermission);
  const filteredLeadManagement = leadManagementItems.filter(hasPermission);
  const filteredCommission = commissionItems.filter(hasPermission);
  const filteredTerritory = territoryItems.filter(hasPermission);
  const filteredTeam = teamItems.filter(hasPermission);
  const filteredOperations = operationsItems.filter(hasPermission);
  const filteredPlatform = platformItems.filter(hasPermission);
  const filteredProperty = propertyItems.filter(hasPermission);
  const filteredAdmin = adminItems.filter(hasPermission);
  const filteredProfile = profileItems.filter(hasPermission);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const renderMenuSection = (title: string, items: MenuItem[]) => {
    if (items.length === 0) return null;

    return (
      <div>
        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {title}
        </h3>
        <div className="space-y-1">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            const badgeCount = item.badge === 'pendingClaims' ? pendingClaimsCount : 0;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-colors
                  min-h-touch
                  ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg md:text-xl">{item.icon}</span>
                  <span className="text-sm md:text-base">{item.name}</span>
                </div>
                {badgeCount > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Overlay for mobile/tablet */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 md:w-72 bg-white border-r border-gray-200 
          transform transition-transform duration-300 ease-in-out
          lg:transform-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto
        `}
      >
        {/* Close button for mobile/tablet */}
        <div className="lg:hidden flex justify-end p-4">
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-touch min-w-touch flex items-center justify-center"
            aria-label="Close menu"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* User Info Section */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.internalRole?.replace('_', ' ') || (user?.role === 'owner' ? 'Property Owner' : 'Internal User')}
              </p>
            </div>
          </div>
        </div>

        <nav className="p-3 md:p-4 space-y-6">
          {/* Dashboard Section */}
          {renderMenuSection('Dashboard', filteredDashboard)}

          {/* Property Owner Quick Access - shown only for owners */}
          {user?.role === 'owner' && !user?.internalRole && renderMenuSection('My Property', [
            { name: 'Overview', path: '/dashboard', icon: '📊', roles: ['agent'] },
            { name: 'Bookings', path: '/bookings', icon: '📅', roles: ['agent'] },
            { name: 'Rooms', path: '/rooms', icon: '🏠', roles: ['agent'] },
            { name: 'Check-In', path: '/check-in', icon: '🔑', roles: ['agent'] },
            { name: 'Check-Out', path: '/check-out', icon: '🚪', roles: ['agent'] },
            { name: 'Payments', path: '/payments', icon: '💰', roles: ['agent'] },
            { name: 'Housekeeping', path: '/housekeeping', icon: '🧹', roles: ['agent'] },
            { name: 'Maintenance', path: '/maintenance', icon: '🔧', roles: ['agent'] },
            { name: 'Documents', path: '/property-documents', icon: '📄', roles: ['agent'] },
          ])}

          {/* Lead Management Section */}
          {renderMenuSection('Lead Management', filteredLeadManagement)}

          {/* Commission & Performance Section */}
          {renderMenuSection('Commission & Performance', filteredCommission)}

          {/* Territory Management Section */}
          {renderMenuSection('Territory Management', filteredTerritory)}

          {/* Team Management Section */}
          {renderMenuSection('Team Management', filteredTeam)}

          {/* Operations Section */}
          {renderMenuSection('Operations', filteredOperations)}

          {/* Platform Management Section */}
          {filteredPlatform.length > 0 && (
            <>
              <div className="px-3">
                <div className="h-px bg-gray-200 mb-4"></div>
              </div>
              {renderMenuSection('Platform Management', filteredPlatform)}
            </>
          )}

          {/* Property Management Section */}
          {renderMenuSection('Property Management', filteredProperty)}

          {/* Administration Section */}
          {filteredAdmin.length > 0 && (
            <>
              <div className="px-3">
                <div className="h-px bg-gray-200 mb-4"></div>
              </div>
              {renderMenuSection('Administration', filteredAdmin)}
            </>
          )}

          {/* Profile Section */}
          {filteredProfile.length > 0 && (
            <>
              <div className="px-3">
                <div className="h-px bg-gray-200 mb-4"></div>
              </div>
              {renderMenuSection('Profile', filteredProfile)}
            </>
          )}
        </nav>
      </aside>
    </>
  );
}

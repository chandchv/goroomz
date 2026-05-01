import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../hooks/useRole';
import { usePermissions } from '../hooks/usePermissions';

interface MenuItem {
  name: string;
  path: string;
  icon: string;
  permission?: string;
  userTypes?: Array<'property_owner' | 'property_staff'>;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const { isStaffMember } = useRole();
  const { hasStaffPermission } = usePermissions();

  // Determine user type for this sidebar
  // This sidebar is for property owners and property staff only
  const getUserType = (): 'property_owner' | 'property_staff' | null => {
    // Property staff have staffRole but no internalRole
    if (user?.staffRole && !user?.internalRole) {
      return 'property_staff';
    }
    // Property owners have owner/admin role but no internalRole or staffRole
    if ((user?.role === 'owner' || user?.role === 'admin' || user?.role === 'category_owner') && 
        !user?.internalRole && !user?.staffRole) {
      return 'property_owner';
    }
    return null;
  };

  const userType = getUserType();

  // Organize menu items by category for property owners and staff
  // Property owners see: Dashboard, My Properties, Rooms, Bookings, Staff, Reports
  // Property staff see items based on their permissions
  const propertyManagementItems: MenuItem[] = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: '📊',
      userTypes: ['property_owner', 'property_staff']
    },
    { 
      name: 'My Properties', 
      path: '/properties', 
      icon: '🏘️',
      userTypes: ['property_owner']
    },
    { 
      name: 'Floor View', 
      path: '/rooms', 
      icon: '🏢',
      permission: 'canManageRooms',
      userTypes: ['property_owner', 'property_staff']
    },
    { 
      name: 'Property Details', 
      path: '/property-overview', 
      icon: '⚙️',
      userTypes: ['property_owner', 'property_staff']
    },
    { 
      name: 'Categories', 
      path: '/categories', 
      icon: '📁',
      permission: 'canManageRooms',
      userTypes: ['property_owner', 'property_staff']
    },
    { 
      name: 'Bookings', 
      path: '/bookings', 
      icon: '📅',
      userTypes: ['property_owner', 'property_staff']
    },
    { 
      name: 'Check-In', 
      path: '/check-in', 
      icon: '✅',
      permission: 'canCheckIn',
      userTypes: ['property_owner', 'property_staff']
    },
    { 
      name: 'Check-Out', 
      path: '/check-out', 
      icon: '🚪',
      permission: 'canCheckOut',
      userTypes: ['property_owner', 'property_staff']
    },
  ];

  const financialItems: MenuItem[] = [
    { 
      name: 'Payments', 
      path: '/payments', 
      icon: '💰',
      permission: 'canRecordPayments',
      userTypes: ['property_owner', 'property_staff']
    },
    { 
      name: 'Payment Schedule', 
      path: '/payment-schedule', 
      icon: '📅',
      permission: 'canRecordPayments',
      userTypes: ['property_owner', 'property_staff']
    },
    { 
      name: 'Security Deposits', 
      path: '/deposits', 
      icon: '🔒',
      permission: 'canRecordPayments',
      userTypes: ['property_owner', 'property_staff']
    },
  ];

  const operationsItems: MenuItem[] = [
    { 
      name: 'Housekeeping', 
      path: '/housekeeping', 
      icon: '🧹',
      permission: 'canUpdateRoomStatus',
      userTypes: ['property_owner', 'property_staff']
    },
    { 
      name: 'Maintenance', 
      path: '/maintenance', 
      icon: '🔧',
      permission: 'canManageMaintenance',
      userTypes: ['property_owner', 'property_staff']
    },
    { 
      name: 'Reports', 
      path: '/reports', 
      icon: '📈',
      permission: 'canViewReports',
      userTypes: ['property_owner', 'property_staff']
    },
  ];

  const managementItems: MenuItem[] = [
    { 
      name: 'Staff', 
      path: '/staff', 
      icon: '👥',
      permission: 'canManageStaff',
      userTypes: ['property_owner']
    },
  ];

  const hasPermission = (item: MenuItem): boolean => {
    // Check if item is for this user type
    if (item.userTypes && item.userTypes.length > 0) {
      if (!userType || !item.userTypes.includes(userType)) {
        return false;
      }
    }
    
    // Property owners have full access to all property management features
    if (userType === 'property_owner') {
      // Owners can see all items marked for property_owner
      return true;
    }
    
    // Property staff need to check permissions
    if (userType === 'property_staff') {
      // If item has no permission requirement, show it
      if (!item.permission) {
        return true;
      }
      // Check if staff has the required permission
      return hasStaffPermission(item.permission);
    }
    
    return false;
  };

  // Filter each category
  const filteredPropertyManagement = propertyManagementItems.filter(hasPermission);
  const filteredFinancial = financialItems.filter(hasPermission);
  const filteredOperations = operationsItems.filter(hasPermission);
  const filteredManagement = managementItems.filter(hasPermission);

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

        <nav className="p-3 md:p-4 space-y-6">
          {/* Property Management Section */}
          {filteredPropertyManagement.length > 0 && (
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Property
              </h3>
              <div className="space-y-1">
                {filteredPropertyManagement.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-colors
                        min-h-touch
                        ${
                          isActive
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }
                      `}
                    >
                      <span className="text-lg md:text-xl">{item.icon}</span>
                      <span className="text-sm md:text-base">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Financial Section */}
          {filteredFinancial.length > 0 && (
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Financial
              </h3>
              <div className="space-y-1">
                {filteredFinancial.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-colors
                        min-h-touch
                        ${
                          isActive
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }
                      `}
                    >
                      <span className="text-lg md:text-xl">{item.icon}</span>
                      <span className="text-sm md:text-base">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Operations Section */}
          {filteredOperations.length > 0 && (
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Operations
              </h3>
              <div className="space-y-1">
                {filteredOperations.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-colors
                        min-h-touch
                        ${
                          isActive
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }
                      `}
                    >
                      <span className="text-lg md:text-xl">{item.icon}</span>
                      <span className="text-sm md:text-base">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Management Section */}
          {filteredManagement.length > 0 && (
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Management
              </h3>
              <div className="space-y-1">
                {filteredManagement.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`
                        flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-colors
                        min-h-touch
                        ${
                          isActive
                            ? 'bg-primary-50 text-primary-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        }
                      `}
                    >
                      <span className="text-lg md:text-xl">{item.icon}</span>
                      <span className="text-sm md:text-base">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}

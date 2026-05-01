import { useState, type ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import InternalSidebar from './InternalSidebar';
import SyncStatusBar from './SyncStatusBar';
import FloatingActionButton from './FloatingActionButton';
import { useAuth } from '../contexts/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  /**
   * Determine which sidebar to render based on user type
   * Requirements 5.5: Render different sidebar components based on user type
   * For internal management system, show InternalSidebar for platform staff, Sidebar for property owners
   */
  const getUserType = (): 'platform_staff' | 'property_owner' | 'property_staff' | 'external_user' => {
    // Platform staff have internalRole or are superuser/admin/category_owner
    if (user?.internalRole || (user?.role && ['admin', 'category_owner', 'superuser'].includes(user.role))) {
      return 'platform_staff';
    }
    
    // Property owners have owner role but no internalRole
    if (user?.role === 'owner' && !user?.internalRole) {
      return 'property_owner';
    }
    
    // Property staff have staffRole but no internalRole
    if (user?.staffRole && !user?.internalRole) {
      return 'property_staff';
    }
    
    return 'external_user';
  };

  const userType = getUserType();
  
  // Platform staff use InternalSidebar, property owners and staff use Sidebar
  const SidebarComponent = userType === 'platform_staff' ? InternalSidebar : Sidebar;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <SyncStatusBar />
      <div className="flex">
        <SidebarComponent isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <FloatingActionButton />
    </div>
  );
}

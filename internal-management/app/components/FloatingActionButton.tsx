import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

interface QuickAction {
  name: string;
  path: string;
  icon: JSX.Element;
  permission?: string;
}

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const quickActions: QuickAction[] = [
    {
      name: 'Check-In',
      path: '/check-in',
      permission: 'canCheckIn',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
    },
    {
      name: 'Check-Out',
      path: '/check-out',
      permission: 'canCheckOut',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
    },
    {
      name: 'New Booking',
      path: '/bookings?action=create',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      name: 'Room Status',
      path: '/rooms',
      permission: 'canUpdateRoomStatus',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ];

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (!user?.permissions) return false;
    return user.permissions[permission as keyof typeof user.permissions];
  };

  const filteredActions = quickActions.filter((action) => hasPermission(action.permission));

  return (
    <div className="fixed bottom-6 right-6 z-30 md:hidden">
      {/* Quick action buttons */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col space-y-3 mb-2">
          {filteredActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 bg-white text-gray-700 rounded-full shadow-lg px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-all transform hover:scale-105 min-h-touch"
            >
              <span className="text-primary-600">{action.icon}</span>
              <span className="text-sm font-medium whitespace-nowrap">{action.name}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Main FAB button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14 rounded-full shadow-lg 
          flex items-center justify-center
          transition-all transform
          focus:outline-none focus:ring-4 focus:ring-primary-300
          ${isOpen ? 'bg-gray-700 rotate-45' : 'bg-primary-600 hover:bg-primary-700'}
        `}
        aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
      >
        <svg
          className="w-7 h-7 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  );
}

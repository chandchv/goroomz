import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useSyncStatus } from '../hooks/useSyncStatus';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { GlobalSearchBar } from './search';
import PropertySelectorModal from './PropertySelectorModal';
import NotificationBell from './notifications/NotificationBell';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { properties, selectedProperty, setSelectedProperty, loading: propertiesLoading } = useProperty();
  const isOnline = useOnlineStatus();
  const { syncStatus, isSyncing, lastSyncResult, triggerSync } = useSyncStatus();
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [showPropertySelector, setShowPropertySelector] = useState(false);

  // Auto-hide sync details after 5 seconds
  useEffect(() => {
    if (lastSyncResult && syncStatus === 'success') {
      setShowSyncDetails(true);
      const timer = setTimeout(() => setShowSyncDetails(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastSyncResult, syncStatus]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16">
          {/* Logo and Property Selector */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
            {/* Hamburger Menu Button - visible on tablet and below */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-touch min-w-touch flex items-center justify-center"
              aria-label="Toggle menu"
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex-shrink-0">GoRoomz</h1>
            
            {/* Global Search Bar - hidden on small screens */}
            <div className="hidden md:block flex-1 max-w-2xl">
              <GlobalSearchBar />
            </div>
            
            {/* Property Selector - hidden on small screens */}
            {properties.length > 0 && (
              <div className="hidden lg:block relative">
                <select
                  value={selectedProperty?.id || ''}
                  onChange={(e) => {
                    const property = properties.find(p => p.id === e.target.value);
                    if (property) {
                      setSelectedProperty(property);
                    }
                  }}
                  disabled={propertiesLoading}
                  className="px-2 md:px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-touch flex-shrink-0 bg-white disabled:bg-gray-50 disabled:text-gray-500"
                  title={selectedProperty ? `${selectedProperty.name} - ${selectedProperty.location}` : 'Select Property'}
                >
                  {propertiesLoading ? (
                    <option value="">Loading properties...</option>
                  ) : (
                    properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name} ({property.totalRooms} rooms)
                      </option>
                    ))
                  )}
                </select>
                {propertiesLoading && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}
              </div>
            )}
            
            {/* Property Selector for Mobile - show selected property name */}
            {selectedProperty && (
              <button
                onClick={() => setShowPropertySelector(true)}
                className="lg:hidden flex items-center px-2 py-1 bg-gray-50 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <span className="text-sm font-medium text-gray-700 truncate max-w-32">
                  {selectedProperty.name}
                </span>
                <svg className="w-4 h-4 text-gray-500 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>

          {/* Right side - Connection Status and User Menu */}
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
            {/* Connection Status and Sync Indicator */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Connection Status */}
              <div
                className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 rounded-md ${
                  isOnline
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'
                  }`}
                />
                <span className="text-xs sm:text-sm font-medium hidden xs:inline">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Sync Status */}
              {isSyncing && (
                <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 rounded-md bg-blue-50 text-blue-700">
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline">Syncing...</span>
                </div>
              )}

              {/* Sync Success Message - hidden on small screens */}
              {showSyncDetails && lastSyncResult && syncStatus === 'success' && (
                <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-200">
                  <svg
                    className="w-4 h-4"
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
                  <span className="text-sm font-medium">
                    Synced {lastSyncResult.success} operations
                  </span>
                </div>
              )}

              {/* Manual Sync Button (when offline with pending changes) */}
              {isOnline && !isSyncing && (
                <button
                  onClick={triggerSync}
                  className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-touch min-w-touch flex items-center justify-center"
                  title="Sync now"
                  aria-label="Sync now"
                >
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-touch">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user?.staffRole?.replace('_', ' ') || user?.role?.replace('_', ' ') || 'User'}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-500 hidden sm:block"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 p-1"
                  sideOffset={5}
                >
                  <DropdownMenu.Item asChild>
                    <Link
                      to="/my-profile"
                      className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none block"
                    >
                      My Profile
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer outline-none">
                    Settings
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
                  <DropdownMenu.Item
                    className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded cursor-pointer outline-none"
                    onSelect={logout}
                  >
                    Logout
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </div>

      {/* Property Selector Modal for Mobile */}
      <PropertySelectorModal
        isOpen={showPropertySelector}
        onClose={() => setShowPropertySelector(false)}
      />
    </header>
  );
}

import React from 'react';
import type { InternalUser } from '../../services/internalUserService';

interface OnlineStatusIndicatorProps {
  user: InternalUser;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * OnlineStatusIndicator Component
 * 
 * Displays the online status of an internal user with visual indicators:
 * - Green dot for online users (logged in within last 5 minutes)
 * - Gray dot for offline users
 * - Tooltip with session information on hover
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
const OnlineStatusIndicator: React.FC<OnlineStatusIndicatorProps> = ({
  user,
  showLabel = true,
  size = 'md',
}) => {
  const isUserOnline = (lastLoginAt?: string): boolean => {
    if (!lastLoginAt) return false;
    const diffMs = new Date().getTime() - new Date(lastLoginAt).getTime();
    // User is considered online if they logged in within the last 5 minutes
    return diffMs < 300000;
  };

  const formatLastLogin = (lastLoginAt?: string): string => {
    if (!lastLoginAt) return 'Never logged in';
    
    const date = new Date(lastLoginAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getSessionInfo = (user: InternalUser): string => {
    const online = isUserOnline(user.lastLoginAt);
    
    if (online) {
      return `Online - Active session\nLast activity: ${formatLastLogin(user.lastLoginAt)}`;
    } else {
      return `Offline\nLast seen: ${formatLastLogin(user.lastLoginAt)}`;
    }
  };

  const online = isUserOnline(user.lastLoginAt);

  // Size configurations
  const sizeClasses = {
    sm: {
      dot: 'w-1.5 h-1.5',
      text: 'text-xs',
    },
    md: {
      dot: 'w-2 h-2',
      text: 'text-xs',
    },
    lg: {
      dot: 'w-3 h-3',
      text: 'text-sm',
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      className="flex items-center gap-2 group relative"
      title={getSessionInfo(user)}
    >
      {/* Status Dot */}
      <div
        className={`${currentSize.dot} rounded-full transition-colors ${
          online ? 'bg-green-500' : 'bg-gray-300'
        }`}
        aria-label={online ? 'Online' : 'Offline'}
      />
      
      {/* Optional Label */}
      {showLabel && online && (
        <span className={`${currentSize.text} text-green-600 font-medium`}>
          Online
        </span>
      )}

      {/* Tooltip on hover */}
      <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50 pointer-events-none">
        <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg whitespace-nowrap">
          <div className="font-semibold mb-1">
            {online ? '🟢 Online' : '⚫ Offline'}
          </div>
          <div className="text-gray-300">
            {online ? 'Active session' : `Last seen: ${formatLastLogin(user.lastLoginAt)}`}
          </div>
          {user.lastLoginAt && (
            <div className="text-gray-400 text-xs mt-1">
              {new Date(user.lastLoginAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
          {/* Arrow pointing up */}
          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
        </div>
      </div>
    </div>
  );
};

export default OnlineStatusIndicator;

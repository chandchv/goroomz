/**
 * NotificationDropdown Component
 * 
 * Displays the 10 most recent notifications in a dropdown.
 * Includes "View All" link and supports mark as read action.
 * 
 * Requirements: 6.2, 6.3, 6.5
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useNotifications } from '../../contexts/NotificationContext';
import type { Notification } from '../../services/notificationService';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
  } = useNotifications();

  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);

  // Fetch recent notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications({ limit: 10 });
    }
  }, [isOpen, fetchNotifications]);

  // Update recent notifications when notifications change
  useEffect(() => {
    setRecentNotifications(notifications.slice(0, 10));
  }, [notifications]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await markAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-gray-300 bg-white';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'property_claim_submitted':
      case 'property_claim_approved':
      case 'property_claim_rejected':
        return '🏠';
      case 'booking_created':
      case 'booking_confirmed':
      case 'booking_cancelled':
      case 'booking_modified':
        return '📅';
      case 'check_in_completed':
        return '🔑';
      case 'check_out_completed':
        return '🚪';
      case 'payment_reminder_7_day':
      case 'payment_reminder_3_day':
      case 'payment_reminder_1_day':
      case 'payment_overdue':
        return '💳';
      case 'payment_received':
        return '✅';
      case 'lead_assigned':
        return '👤';
      case 'approval_required':
        return '✓';
      case 'ticket_created':
        return '🎫';
      case 'zero_occupancy_alert':
        return '⚠️';
      case 'payment_failure_alert':
        return '❌';
      case 'daily_summary_owner':
      case 'daily_summary_manager':
        return '📊';
      case 'alert':
        return '⚠️';
      case 'announcement':
      case 'system_announcement':
        return '📢';
      case 'reminder':
        return '⏰';
      default:
        return '🔔';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {unreadCount} new
              </span>
            )}
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                getPriorityColor={getPriorityColor}
                getTypeIcon={getTypeIcon}
                formatTimestamp={formatTimestamp}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer - View All Link */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <Link
          to="/notifications"
          onClick={onClose}
          className="block w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline py-1"
        >
          View All Notifications
        </Link>
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string, e: React.MouseEvent) => void;
  getPriorityColor: (priority: string) => string;
  getTypeIcon: (type: string) => string;
  formatTimestamp: (timestamp: string) => string;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  getPriorityColor,
  getTypeIcon,
  formatTimestamp,
}: NotificationItemProps) {
  const isUnread = notification.status === 'unread' || notification.status === 'pending' || notification.status === 'sent';

  return (
    <div
      className={`p-3 hover:bg-gray-50 transition-colors border-l-4 ${getPriorityColor(notification.priority)} ${
        isUnread ? 'bg-blue-50/50' : ''
      }`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-xl">
          {getTypeIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'} text-gray-900 line-clamp-1`}>
              {notification.title}
            </h4>
            {isUnread && (
              <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1.5"></span>
            )}
          </div>
          
          <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
            {notification.message}
          </p>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {formatTimestamp(notification.createdAt)}
            </span>
            
            {isUnread && (
              <button
                onClick={(e) => onMarkAsRead(notification.id, e)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

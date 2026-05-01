/**
 * Notification Center Component
 * 
 * Displays a dropdown panel with user notifications
 * Requirements: 26.3, 26.4, 26.5, 28.2
 */

import { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import type { Notification } from '../../services/notificationService';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    dismissNotification,
    markAllAsRead,
    deleteNotification,
    fetchNotifications,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Fetch notifications when filter changes
  useEffect(() => {
    if (isOpen) {
      fetchNotifications({
        status: filter === 'unread' ? 'unread' : undefined,
        limit: 50,
      });
    }
  }, [filter, isOpen, fetchNotifications]);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dismissNotification(id);
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
    } catch (error) {
      console.error('Failed to delete notification:', error);
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
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return '⚠️';
      case 'lead_assignment':
        return '👤';
      case 'approval_request':
        return '✓';
      case 'commission_payment':
        return '💰';
      case 'ticket_assignment':
        return '🎫';
      case 'system_announcement':
      case 'announcement':
        return '📢';
      case 'reminder':
        return '⏰';
      default:
        return '📬';
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
    <div
      ref={panelRef}
      className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {unreadCount}
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === 'unread'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Mark all as read */}
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📭</div>
            <p>No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDismiss={handleDismiss}
                onDelete={handleDelete}
                getPriorityColor={getPriorityColor}
                getTypeIcon={getTypeIcon}
                formatTimestamp={formatTimestamp}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string, e: React.MouseEvent) => void;
  onDismiss: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  getPriorityColor: (priority: string) => string;
  getTypeIcon: (type: string) => string;
  formatTimestamp: (timestamp: string) => string;
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
  onDelete,
  getPriorityColor,
  getTypeIcon,
  formatTimestamp,
}: NotificationItemProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={`p-4 hover:bg-gray-50 transition-colors relative ${
        notification.status === 'unread' ? 'bg-blue-50' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-2xl">
          {getTypeIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 line-clamp-2">
                {notification.message}
              </p>
            </div>

            {/* Priority badge */}
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(
                notification.priority
              )}`}
            >
              {notification.priority}
            </span>
          </div>

          {/* Timestamp */}
          <div className="mt-2 text-xs text-gray-500">
            {formatTimestamp(notification.createdAt)}
          </div>

          {/* Actions */}
          {showActions && (
            <div className="mt-2 flex gap-2">
              {notification.status === 'unread' && (
                <button
                  onClick={(e) => onMarkAsRead(notification.id, e)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Mark as read
                </button>
              )}
              {notification.status !== 'dismissed' && (
                <button
                  onClick={(e) => onDismiss(notification.id, e)}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                >
                  Dismiss
                </button>
              )}
              <button
                onClick={(e) => onDelete(notification.id, e)}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Unread indicator */}
        {notification.status === 'unread' && (
          <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1"></div>
        )}
      </div>
    </div>
  );
}

/**
 * NotificationsPage Component
 * 
 * Full page view of all notifications with grouping by date,
 * filtering, and pagination support.
 * 
 * Requirements: 6.5, 6.6
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { useNotifications } from '../contexts/NotificationContext';
import type { Notification } from '../services/notificationService';
import notificationService from '../services/notificationService';

type FilterStatus = 'all' | 'unread' | 'read';
type FilterPriority = 'all' | 'urgent' | 'high' | 'medium' | 'low';

interface GroupedNotifications {
  today: Notification[];
  yesterday: Notification[];
  thisWeek: Notification[];
  earlier: Notification[];
}

export default function NotificationsPage() {
  const { markAsRead, markAllAsRead, refreshUnreadCount } = useNotifications();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [groupedNotifications, setGroupedNotifications] = useState<GroupedNotifications | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const limit = 20;

  // Fetch notifications with filters
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        limit,
        offset: (page - 1) * limit,
      };

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (filterPriority !== 'all') {
        params.priority = filterPriority;
      }

      const response = await notificationService.getNotifications(params);
      setNotifications(response.notifications);
      setPagination({
        totalCount: response.total,
        totalPages: Math.ceil(response.total / limit),
        hasNextPage: response.pagination.hasMore,
        hasPrevPage: page > 1,
      });

      // Group notifications by date
      groupNotificationsByDate(response.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filterStatus, filterPriority]);

  // Group notifications by date
  const groupNotificationsByDate = (notifs: Notification[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups: GroupedNotifications = {
      today: [],
      yesterday: [],
      thisWeek: [],
      earlier: [],
    };

    for (const notification of notifs) {
      const createdAt = new Date(notification.createdAt);
      const notificationDate = new Date(
        createdAt.getFullYear(),
        createdAt.getMonth(),
        createdAt.getDate()
      );

      if (notificationDate.getTime() === today.getTime()) {
        groups.today.push(notification);
      } else if (notificationDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notification);
      } else if (notificationDate >= weekAgo) {
        groups.thisWeek.push(notification);
      } else {
        groups.earlier.push(notification);
      }
    }

    setGroupedNotifications(groups);
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, status: 'read' as const, readAt: new Date().toISOString() } : n
        )
      );
      // Re-group
      groupNotificationsByDate(
        notifications.map((n) =>
          n.id === id ? { ...n, status: 'read' as const, readAt: new Date().toISOString() } : n
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      // Update local state
      const updatedNotifications = notifications.map((n) => ({
        ...n,
        status: 'read' as const,
        readAt: new Date().toISOString(),
      }));
      setNotifications(updatedNotifications);
      groupNotificationsByDate(updatedNotifications);
      refreshUnreadCount();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleFilterChange = (status: FilterStatus) => {
    setFilterStatus(status);
    setPage(1);
  };

  const handlePriorityChange = (priority: FilterPriority) => {
    setFilterPriority(priority);
    setPage(1);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
      default:
        return '🔔';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderNotificationGroup = (title: string, notifs: Notification[]) => {
    if (notifs.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
          {title}
        </h3>
        <div className="space-y-2">
          {notifs.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              getPriorityColor={getPriorityColor}
              getTypeIcon={getTypeIcon}
              formatTimestamp={formatTimestamp}
            />
          ))}
        </div>
      </div>
    );
  };

  const unreadCount = notifications.filter(
    (n) => n.status === 'unread' || n.status === 'pending' || n.status === 'sent'
  ).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500 mt-1">
              {pagination.totalCount} total notifications
              {unreadCount > 0 && ` • ${unreadCount} unread`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/notification-preferences"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Preferences
            </Link>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Status:</span>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(['all', 'unread', 'read'] as FilterStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleFilterChange(status)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => handlePriorityChange(e.target.value as FilterPriority)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
          <p className="text-sm text-gray-500">
            {filterStatus !== 'all' || filterPriority !== 'all'
              ? 'Try adjusting your filters'
              : "You're all caught up!"}
          </p>
        </div>
      ) : (
        <>
          {/* Grouped Notifications */}
          {groupedNotifications && (
            <>
              {renderNotificationGroup('Today', groupedNotifications.today)}
              {renderNotificationGroup('Yesterday', groupedNotifications.yesterday)}
              {renderNotificationGroup('This Week', groupedNotifications.thisWeek)}
              {renderNotificationGroup('Earlier', groupedNotifications.earlier)}
            </>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pagination.hasPrevPage
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNextPage}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pagination.hasNextPage
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  getPriorityColor: (priority: string) => string;
  getTypeIcon: (type: string) => string;
  formatTimestamp: (timestamp: string) => string;
}

function NotificationCard({
  notification,
  onMarkAsRead,
  getPriorityColor,
  getTypeIcon,
  formatTimestamp,
}: NotificationCardProps) {
  const isUnread =
    notification.status === 'unread' ||
    notification.status === 'pending' ||
    notification.status === 'sent';

  return (
    <div
      className={`p-4 bg-white rounded-lg border transition-all hover:shadow-md ${
        isUnread ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'
      }`}
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 text-2xl">{getTypeIcon(notification.type)}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4
                  className={`text-sm ${
                    isUnread ? 'font-semibold' : 'font-medium'
                  } text-gray-900`}
                >
                  {notification.title}
                </h4>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityColor(
                    notification.priority
                  )}`}
                >
                  {notification.priority}
                </span>
              </div>
              <p className="text-sm text-gray-600">{notification.message}</p>
            </div>

            {/* Unread indicator */}
            {isUnread && (
              <span className="flex-shrink-0 w-2.5 h-2.5 bg-blue-600 rounded-full mt-1"></span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-400">
              {formatTimestamp(notification.createdAt)}
            </span>

            {isUnread && (
              <button
                onClick={() => onMarkAsRead(notification.id)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                Mark as read
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

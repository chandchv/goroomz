/**
 * NotificationToast Component
 * 
 * Displays toast notifications for high-priority notifications.
 * Auto-dismisses after 5 seconds.
 * 
 * Requirements: 6.7
 */

import { useEffect, useState } from 'react';
import type { Notification } from '../../services/notificationService';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  autoDismissDelay?: number;
}

export default function NotificationToast({
  notification,
  onDismiss,
  autoDismissDelay = 5000,
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  // Auto-dismiss after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, autoDismissDelay);

    return () => clearTimeout(timer);
  }, [autoDismissDelay]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss(notification.id);
    }, 300); // Animation duration
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          bg: 'bg-red-600',
          border: 'border-red-700',
          icon: '🚨',
        };
      case 'high':
        return {
          bg: 'bg-orange-500',
          border: 'border-orange-600',
          icon: '⚠️',
        };
      case 'medium':
        return {
          bg: 'bg-blue-500',
          border: 'border-blue-600',
          icon: '📢',
        };
      default:
        return {
          bg: 'bg-gray-600',
          border: 'border-gray-700',
          icon: '🔔',
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'property_claim_submitted':
        return '🏠';
      case 'booking_created':
        return '📅';
      case 'payment_overdue':
        return '💳';
      case 'payment_failure_alert':
        return '❌';
      case 'zero_occupancy_alert':
        return '⚠️';
      case 'lead_assigned':
        return '👤';
      case 'approval_required':
        return '✓';
      case 'ticket_created':
        return '🎫';
      default:
        return '🔔';
    }
  };

  if (!isVisible) return null;

  const styles = getPriorityStyles(notification.priority);

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-in-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`
          ${styles.bg} ${styles.border}
          rounded-lg shadow-2xl border-l-4 overflow-hidden
        `}
      >
        {/* Progress bar for auto-dismiss */}
        <div className="h-1 bg-white/20">
          <div
            className="h-full bg-white/40 animate-shrink"
            style={{
              animationDuration: `${autoDismissDelay}ms`,
            }}
          />
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 text-2xl">
              {getTypeIcon(notification.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">
                      {notification.priority}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white line-clamp-1">
                    {notification.title}
                  </h4>
                  <p className="text-xs text-white/80 line-clamp-2 mt-1">
                    {notification.message}
                  </p>
                </div>

                {/* Close button */}
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
                  aria-label="Dismiss notification"
                >
                  <svg
                    className="w-4 h-4 text-white/80"
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * NotificationToastContainer Component
 * 
 * Manages multiple toast notifications in a stack.
 */
interface NotificationToastContainerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  maxVisible?: number;
}

export function NotificationToastContainer({
  notifications,
  onDismiss,
  maxVisible = 3,
}: NotificationToastContainerProps) {
  // Only show high-priority notifications as toasts
  const highPriorityNotifications = notifications
    .filter((n) => n.priority === 'urgent' || n.priority === 'high')
    .slice(0, maxVisible);

  if (highPriorityNotifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {highPriorityNotifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            transform: `translateY(${index * -8}px)`,
            zIndex: maxVisible - index,
          }}
        >
          <NotificationToast
            notification={notification}
            onDismiss={onDismiss}
          />
        </div>
      ))}
    </div>
  );
}

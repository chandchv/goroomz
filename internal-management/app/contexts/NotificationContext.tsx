/**
 * Notification Context
 * 
 * Manages notification state and provides notification functionality throughout the app
 * Requirements: 26.3, 28.2
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import notificationService from '../services/notificationService';
import type { Notification, NotificationPreferences } from '../services/notificationService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  pendingClaimsCount: number;
  isLoading: boolean;
  preferences: NotificationPreferences | null;
  fetchNotifications: (params?: {
    status?: 'unread' | 'read' | 'dismissed';
    type?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  refreshPendingClaimsCount: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingClaimsCount, setPendingClaimsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (params?: {
    status?: 'unread' | 'read' | 'dismissed';
    type?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }) => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const response = await notificationService.getNotifications(params);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Refresh unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to refresh unread count:', error);
    }
  }, [isAuthenticated]);

  // Refresh pending claims count (for admin badge)
  const refreshPendingClaimsCount = useCallback(async () => {
    if (!isAuthenticated) return;
    
    // Only fetch for admin/superuser roles
    const userRole = user?.role || user?.internalRole;
    const isAdmin = ['admin', 'superuser', 'super_admin', 'platform_admin'].includes(userRole || '');
    
    if (!isAdmin) {
      setPendingClaimsCount(0);
      return;
    }
    
    try {
      const count = await notificationService.getPendingClaimsCount();
      setPendingClaimsCount(count);
    } catch (error) {
      console.error('Failed to refresh pending claims count:', error);
    }
  }, [isAuthenticated, user]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const updatedNotification = await notificationService.markAsRead(id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === id ? updatedNotification : n)
      );
      
      // Decrease unread count if notification was unread
      const notification = notifications.find(n => n.id === id);
      if (notification?.status === 'unread') {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }, [notifications]);

  // Dismiss notification
  const dismissNotification = useCallback(async (id: string) => {
    try {
      const updatedNotification = await notificationService.dismissNotification(id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === id ? updatedNotification : n)
      );
      
      // Decrease unread count if notification was unread
      const notification = notifications.find(n => n.id === id);
      if (notification?.status === 'unread') {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
      throw error;
    }
  }, [notifications]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, status: 'read' as const, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      throw error;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      
      // Update local state
      const notification = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      // Decrease unread count if notification was unread
      if (notification?.status === 'unread') {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }, [notifications]);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const prefs = await notificationService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
    }
  }, [isAuthenticated]);

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const updatedPrefs = await notificationService.updatePreferences(newPreferences);
      setPreferences(updatedPrefs);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }, []);

  // Initial fetch on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications({ limit: 20 });
      refreshUnreadCount();
      refreshPendingClaimsCount();
      fetchPreferences();
    }
  }, [isAuthenticated, user, fetchNotifications, refreshUnreadCount, refreshPendingClaimsCount, fetchPreferences]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      refreshUnreadCount();
      refreshPendingClaimsCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshUnreadCount, refreshPendingClaimsCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        pendingClaimsCount,
        isLoading,
        preferences,
        fetchNotifications,
        markAsRead,
        dismissNotification,
        markAllAsRead,
        deleteNotification,
        refreshUnreadCount,
        refreshPendingClaimsCount,
        fetchPreferences,
        updatePreferences,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

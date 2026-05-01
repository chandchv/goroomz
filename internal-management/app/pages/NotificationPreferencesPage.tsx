/**
 * NotificationPreferencesPage Component
 * 
 * Allows users to configure notification preferences including:
 * - Per-channel toggles (email, SMS, in-app, push)
 * - Per-type toggles
 * - Quiet hours settings
 * - Digest mode settings
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// Notification types grouped by category
const NOTIFICATION_CATEGORIES = {
  'Property Claims': [
    { type: 'property_claim_submitted', label: 'New Property Claim Submitted', description: 'When a new property claim is submitted' },
    { type: 'property_claim_approved', label: 'Property Claim Approved', description: 'When your property claim is approved' },
    { type: 'property_claim_rejected', label: 'Property Claim Rejected', description: 'When your property claim is rejected' },
  ],
  'Bookings': [
    { type: 'booking_created', label: 'New Booking Created', description: 'When a new booking is made for your property' },
    { type: 'booking_confirmed', label: 'Booking Confirmed', description: 'When a booking is confirmed' },
    { type: 'booking_cancelled', label: 'Booking Cancelled', description: 'When a booking is cancelled' },
    { type: 'booking_modified', label: 'Booking Modified', description: 'When booking dates are changed' },
    { type: 'check_in_completed', label: 'Guest Check-In', description: 'When a guest checks in' },
    { type: 'check_out_completed', label: 'Guest Check-Out', description: 'When a guest checks out' },
  ],
  'Payments': [
    { type: 'payment_reminder_7_day', label: 'Payment Reminder (7 days)', description: 'Reminder 7 days before payment due' },
    { type: 'payment_reminder_3_day', label: 'Payment Reminder (3 days)', description: 'Reminder 3 days before payment due' },
    { type: 'payment_reminder_1_day', label: 'Payment Reminder (1 day)', description: 'Urgent reminder 1 day before payment due' },
    { type: 'payment_overdue', label: 'Payment Overdue', description: 'When a payment becomes overdue' },
    { type: 'payment_received', label: 'Payment Received', description: 'Confirmation when payment is received' },
    { type: 'checkout_reminder', label: 'Checkout Reminder', description: 'Reminder on checkout day' },
  ],
  'Internal': [
    { type: 'lead_assigned', label: 'Lead Assigned', description: 'When a new lead is assigned to you' },
    { type: 'approval_required', label: 'Approval Required', description: 'When something needs your approval' },
    { type: 'ticket_created', label: 'Support Ticket Created', description: 'When a support ticket is created or escalated' },
    { type: 'zero_occupancy_alert', label: 'Zero Occupancy Alert', description: 'Alert when property has zero occupancy' },
    { type: 'payment_failure_alert', label: 'Payment Failure Alert', description: 'Alert when a payment fails' },
  ],
  'Summaries': [
    { type: 'daily_summary_owner', label: 'Daily Summary (Owner)', description: 'Daily summary of check-ins and check-outs' },
    { type: 'daily_summary_manager', label: 'Daily Summary (Manager)', description: 'Daily territory performance summary' },
  ],
};

interface NotificationPreference {
  id?: string;
  notificationType: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  digestMode: 'immediate' | 'daily' | 'weekly';
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  language: 'en' | 'hi';
}

interface PreferencesState {
  [key: string]: NotificationPreference;
}

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<PreferencesState>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Property Claims', 'Bookings']));
  
  // Global settings (from default preference)
  const [globalSettings, setGlobalSettings] = useState({
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    language: 'en' as 'en' | 'hi',
    digestMode: 'immediate' as 'immediate' | 'daily' | 'weekly',
  });

  // Fetch preferences from API
  const fetchPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/notifications/preferences');
      const data = response.data.data;
      
      // Convert array to object keyed by notificationType
      const prefsMap: PreferencesState = {};
      for (const pref of data.preferences) {
        prefsMap[pref.notificationType] = pref;
      }
      
      setPreferences(prefsMap);
      
      // Set global settings from default preference
      if (prefsMap['default']) {
        const defaultPref = prefsMap['default'];
        setGlobalSettings({
          quietHoursEnabled: !!(defaultPref.quietHoursStart && defaultPref.quietHoursEnd),
          quietHoursStart: defaultPref.quietHoursStart || '22:00',
          quietHoursEnd: defaultPref.quietHoursEnd || '08:00',
          language: defaultPref.language || 'en',
          digestMode: defaultPref.digestMode || 'immediate',
        });
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      setSaveMessage({ type: 'error', text: 'Failed to load preferences' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Get preference for a specific type, falling back to default
  const getPreference = (type: string): NotificationPreference => {
    if (preferences[type]) {
      return preferences[type];
    }
    if (preferences['default']) {
      return { ...preferences['default'], notificationType: type };
    }
    return {
      notificationType: type,
      emailEnabled: true,
      smsEnabled: true,
      inAppEnabled: true,
      pushEnabled: true,
      digestMode: 'immediate',
      quietHoursStart: null,
      quietHoursEnd: null,
      language: 'en',
    };
  };

  // Update a specific preference
  const updatePreference = async (type: string, updates: Partial<NotificationPreference>) => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      await api.put('/api/notifications/preferences', {
        notificationType: type,
        ...updates,
      });
      
      // Update local state
      setPreferences(prev => ({
        ...prev,
        [type]: {
          ...getPreference(type),
          ...updates,
          notificationType: type,
        },
      }));
      
      setSaveMessage({ type: 'success', text: 'Preference saved' });
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error('Failed to update preference:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save preference' });
    } finally {
      setIsSaving(false);
    }
  };

  // Update global settings (default preference)
  const updateGlobalSettings = async (updates: Partial<typeof globalSettings>) => {
    setIsSaving(true);
    setSaveMessage(null);
    
    const newSettings = { ...globalSettings, ...updates };
    setGlobalSettings(newSettings);
    
    try {
      await api.put('/api/notifications/preferences', {
        notificationType: 'default',
        quietHoursStart: newSettings.quietHoursEnabled ? newSettings.quietHoursStart : null,
        quietHoursEnd: newSettings.quietHoursEnabled ? newSettings.quietHoursEnd : null,
        language: newSettings.language,
        digestMode: newSettings.digestMode,
      });
      
      setSaveMessage({ type: 'success', text: 'Settings saved' });
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error('Failed to update global settings:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle channel for all notifications in a category
  const toggleCategoryChannel = async (category: string, channel: 'email' | 'sms' | 'inApp' | 'push', enabled: boolean) => {
    setIsSaving(true);
    setSaveMessage(null);
    
    const types = NOTIFICATION_CATEGORIES[category as keyof typeof NOTIFICATION_CATEGORIES];
    const updates = types.map(({ type }) => ({
      notificationType: type,
      [`${channel}Enabled`]: enabled,
    }));
    
    try {
      await api.put('/api/notifications/preferences/bulk', { preferences: updates });
      
      // Update local state
      setPreferences(prev => {
        const newPrefs = { ...prev };
        for (const { type } of types) {
          newPrefs[type] = {
            ...getPreference(type),
            [`${channel}Enabled`]: enabled,
          };
        }
        return newPrefs;
      });
      
      setSaveMessage({ type: 'success', text: 'Category preferences saved' });
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error('Failed to update category preferences:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset all preferences to defaults
  const resetToDefaults = async () => {
    if (!confirm('Are you sure you want to reset all notification preferences to defaults?')) {
      return;
    }
    
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      await api.delete('/api/notifications/preferences');
      await fetchPreferences();
      setSaveMessage({ type: 'success', text: 'Preferences reset to defaults' });
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error('Failed to reset preferences:', error);
      setSaveMessage({ type: 'error', text: 'Failed to reset preferences' });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Check if all types in a category have a channel enabled
  const isCategoryChannelEnabled = (category: string, channel: 'email' | 'sms' | 'inApp' | 'push') => {
    const types = NOTIFICATION_CATEGORIES[category as keyof typeof NOTIFICATION_CATEGORIES];
    const channelKey = `${channel}Enabled` as keyof NotificationPreference;
    return types.every(({ type }) => getPreference(type)[channelKey]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure how and when you receive notifications
        </p>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg ${
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Global Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Global Settings</h2>
        
        {/* Language Preference */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notification Language
          </label>
          <select
            value={globalSettings.language}
            onChange={(e) => updateGlobalSettings({ language: e.target.value as 'en' | 'hi' })}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            disabled={isSaving}
          >
            <option value="en">English</option>
            <option value="hi">Hindi (हिंदी)</option>
          </select>
        </div>

        {/* Digest Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Delivery Mode
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Choose how non-urgent notifications are delivered
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { value: 'immediate', label: 'Immediate', description: 'Send notifications as they happen' },
              { value: 'daily', label: 'Daily Digest', description: 'Combine into a daily summary' },
              { value: 'weekly', label: 'Weekly Digest', description: 'Combine into a weekly summary' },
            ].map(({ value, label, description }) => (
              <button
                key={value}
                onClick={() => updateGlobalSettings({ digestMode: value as 'immediate' | 'daily' | 'weekly' })}
                disabled={isSaving}
                className={`px-4 py-3 rounded-lg border text-left transition-colors ${
                  globalSettings.digestMode === value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quiet Hours
              </label>
              <p className="text-xs text-gray-500">
                Non-urgent notifications will be held during these hours
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={globalSettings.quietHoursEnabled}
                onChange={(e) => updateGlobalSettings({ quietHoursEnabled: e.target.checked })}
                disabled={isSaving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          {globalSettings.quietHoursEnabled && (
            <div className="flex items-center gap-4 mt-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                <input
                  type="time"
                  value={globalSettings.quietHoursStart}
                  onChange={(e) => updateGlobalSettings({ quietHoursStart: e.target.value })}
                  disabled={isSaving}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <span className="text-gray-400 mt-5">to</span>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Time</label>
                <input
                  type="time"
                  value={globalSettings.quietHoursEnd}
                  onChange={(e) => updateGlobalSettings({ quietHoursEnd: e.target.value })}
                  disabled={isSaving}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Per-Type Preferences */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Notification Types</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure channels for each notification type
          </p>
        </div>

        {/* Channel Headers */}
        <div className="hidden sm:grid grid-cols-[1fr,60px,60px,60px,60px] gap-2 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div>Notification Type</div>
          <div className="text-center">Email</div>
          <div className="text-center">SMS</div>
          <div className="text-center">In-App</div>
          <div className="text-center">Push</div>
        </div>

        {/* Categories */}
        {Object.entries(NOTIFICATION_CATEGORIES).map(([category, types]) => (
          <div key={category} className="border-b border-gray-200 last:border-b-0">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedCategories.has(category) ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-medium text-gray-900">{category}</span>
                <span className="text-xs text-gray-400">({types.length} types)</span>
              </div>
              
              {/* Category-level toggles */}
              <div className="hidden sm:flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {(['email', 'sms', 'inApp', 'push'] as const).map((channel) => (
                  <button
                    key={channel}
                    onClick={() => toggleCategoryChannel(category, channel, !isCategoryChannelEnabled(category, channel))}
                    disabled={isSaving}
                    className={`w-[60px] px-2 py-1 text-xs rounded transition-colors ${
                      isCategoryChannelEnabled(category, channel)
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isCategoryChannelEnabled(category, channel) ? 'All On' : 'All Off'}
                  </button>
                ))}
              </div>
            </button>

            {/* Notification Types */}
            {expandedCategories.has(category) && (
              <div className="bg-gray-50/50">
                {types.map(({ type, label, description }) => {
                  const pref = getPreference(type);
                  return (
                    <div
                      key={type}
                      className="px-6 py-3 border-t border-gray-100 sm:grid sm:grid-cols-[1fr,60px,60px,60px,60px] sm:gap-2 sm:items-center"
                    >
                      <div className="mb-3 sm:mb-0">
                        <div className="text-sm font-medium text-gray-700">{label}</div>
                        <div className="text-xs text-gray-500">{description}</div>
                      </div>
                      
                      {/* Mobile: Horizontal toggles */}
                      <div className="flex sm:hidden gap-2 flex-wrap">
                        {(['email', 'sms', 'inApp', 'push'] as const).map((channel) => {
                          const channelKey = `${channel}Enabled` as keyof NotificationPreference;
                          const isEnabled = pref[channelKey] as boolean;
                          return (
                            <button
                              key={channel}
                              onClick={() => updatePreference(type, { [channelKey]: !isEnabled })}
                              disabled={isSaving}
                              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                                isEnabled
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {channel === 'inApp' ? 'In-App' : channel.charAt(0).toUpperCase() + channel.slice(1)}
                            </button>
                          );
                        })}
                      </div>

                      {/* Desktop: Toggle switches */}
                      {(['email', 'sms', 'inApp', 'push'] as const).map((channel) => {
                        const channelKey = `${channel}Enabled` as keyof NotificationPreference;
                        const isEnabled = pref[channelKey] as boolean;
                        return (
                          <div key={channel} className="hidden sm:flex justify-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => updatePreference(type, { [channelKey]: !isEnabled })}
                                disabled={isSaving}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          onClick={resetToDefaults}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          Reset All to Defaults
        </button>
      </div>
    </div>
  );
}

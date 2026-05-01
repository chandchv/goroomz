import React, { useState, useEffect } from 'react';
import configService from '../../services/configService';
import { useToast } from '../../hooks/useToast';

interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  sms: boolean;
}

interface NotificationSetting {
  id: string;
  userId: string;
  userName: string;
  eventType: string;
  preferences: NotificationPreferences;
}

const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, NotificationPreferences>>({});
  const { showToast } = useToast();

  const eventTypes = [
    { key: 'lead_assigned', label: 'Lead Assigned' },
    { key: 'onboarding_approved', label: 'Onboarding Approved' },
    { key: 'onboarding_rejected', label: 'Onboarding Rejected' },
    { key: 'commission_earned', label: 'Commission Earned' },
    { key: 'commission_paid', label: 'Commission Paid' },
    { key: 'ticket_assigned', label: 'Ticket Assigned' },
    { key: 'ticket_resolved', label: 'Ticket Resolved' },
    { key: 'target_achieved', label: 'Target Achieved' },
    { key: 'target_missed', label: 'Target Missed' },
    { key: 'system_alert', label: 'System Alert' },
  ];

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      setLoading(true);
      const data = await configService.getNotificationSettings();
      setSettings(data);
    } catch (error) {
      showToast('Failed to load notification settings');
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (userId: string) => {
    setEditingUser(userId);
    const userSettings = settings.filter((s) => s.userId === userId);
    const form: Record<string, NotificationPreferences> = {};
    
    eventTypes.forEach((event) => {
      const setting = userSettings.find((s) => s.eventType === event.key);
      form[event.key] = setting?.preferences || {
        email: true,
        inApp: true,
        sms: false,
      };
    });
    
    setEditForm(form);
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      await configService.updateNotificationSettings(editingUser, editForm);
      showToast('Notification settings updated successfully');
      handleCancel();
      loadNotificationSettings();
    } catch (error) {
      showToast('Failed to update notification settings');
      console.error('Error updating notification settings:', error);
    }
  };

  const handlePreferenceChange = (
    eventType: string,
    channel: keyof NotificationPreferences,
    value: boolean
  ) => {
    setEditForm({
      ...editForm,
      [eventType]: {
        ...editForm[eventType],
        [channel]: value,
      },
    });
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.userId]) {
      acc[setting.userId] = {
        userName: setting.userName,
        settings: [],
      };
    }
    acc[setting.userId].settings.push(setting);
    return acc;
  }, {} as Record<string, { userName: string; settings: NotificationSetting[] }>);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
        <p className="text-sm text-gray-500 mt-1">
          Configure notification preferences for internal users
        </p>
      </div>

      {/* User List */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y divide-gray-200">
          {Object.entries(groupedSettings).map(([userId, data]) => (
            <div key={userId} className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-semibold text-gray-900">{data.userName}</h4>
                {editingUser === userId ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(userId)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editingUser === userId ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4 text-xs font-medium text-gray-500 uppercase pb-2 border-b">
                    <div>Event Type</div>
                    <div className="text-center">Email</div>
                    <div className="text-center">In-App</div>
                    <div className="text-center">SMS</div>
                  </div>
                  {eventTypes.map((event) => (
                    <div key={event.key} className="grid grid-cols-4 gap-4 items-center">
                      <div className="text-sm text-gray-700">{event.label}</div>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={editForm[event.key]?.email || false}
                          onChange={(e) =>
                            handlePreferenceChange(event.key, 'email', e.target.checked)
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={editForm[event.key]?.inApp || false}
                          onChange={(e) =>
                            handlePreferenceChange(event.key, 'inApp', e.target.checked)
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={editForm[event.key]?.sms || false}
                          onChange={(e) =>
                            handlePreferenceChange(event.key, 'sms', e.target.checked)
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {data.settings.slice(0, 3).map((setting) => (
                    <div key={setting.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {eventTypes.find((e) => e.key === setting.eventType)?.label ||
                          setting.eventType}
                      </span>
                      <div className="flex gap-4 text-gray-500">
                        {setting.preferences.email && <span>📧 Email</span>}
                        {setting.preferences.inApp && <span>🔔 In-App</span>}
                        {setting.preferences.sms && <span>📱 SMS</span>}
                      </div>
                    </div>
                  ))}
                  {data.settings.length > 3 && (
                    <p className="text-xs text-gray-500">
                      +{data.settings.length - 3} more settings
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Notification Channels</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Email: Notifications sent to user's registered email address</li>
                <li>In-App: Notifications displayed in the application notification center</li>
                <li>SMS: Text messages sent to user's registered phone number</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import internalUserService from '../services/internalUserService';

/**
 * MyProfile Page Component
 * 
 * Allows internal users to view and edit their own profile information.
 * Users can update their phone number and notification preferences.
 * Role and permission editing is prevented for security.
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */
export default function MyProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    notificationPreferences: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      weeklyDigest: true,
      announcementAlerts: true,
      taskReminders: true,
    },
  });

  // Initialize form data when user is loaded
  useEffect(() => {
    if (user) {
      setFormData({
        phone: (user as any)?.phone || '',
        notificationPreferences: {
          emailNotifications: (user as any)?.notificationPreferences?.emailNotifications ?? true,
          pushNotifications: (user as any)?.notificationPreferences?.pushNotifications ?? true,
          smsNotifications: (user as any)?.notificationPreferences?.smsNotifications ?? false,
          weeklyDigest: (user as any)?.notificationPreferences?.weeklyDigest ?? true,
          announcementAlerts: (user as any)?.notificationPreferences?.announcementAlerts ?? true,
          taskReminders: (user as any)?.notificationPreferences?.taskReminders ?? true,
        },
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      showToast({
        title: 'Error',
        description: 'User information not available',
        type: 'error',
      });
      return;
    }

    setIsSaving(true);

    try {
      // Update user profile
      await internalUserService.updateUser(user.id, {
        phone: formData.phone,
      });

      showToast({
        title: 'Success',
        description: 'Your profile has been updated successfully',
        type: 'success',
      });

      setIsEditing(false);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      showToast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update profile',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (user) {
      setFormData({
        phone: (user as any)?.phone || '',
        notificationPreferences: {
          emailNotifications: (user as any)?.notificationPreferences?.emailNotifications ?? true,
          pushNotifications: (user as any)?.notificationPreferences?.pushNotifications ?? true,
          smsNotifications: (user as any)?.notificationPreferences?.smsNotifications ?? false,
          weeklyDigest: (user as any)?.notificationPreferences?.weeklyDigest ?? true,
          announcementAlerts: (user as any)?.notificationPreferences?.announcementAlerts ?? true,
          taskReminders: (user as any)?.notificationPreferences?.taskReminders ?? true,
        },
      });
    }
    setIsEditing(false);
  };

  const formatRoleName = (role?: string | null) => {
    if (!role) return 'User';
    return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatPermissionName = (key: string) => {
    return key
      .replace(/^can/, '')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600">Manage your personal information and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-medium">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user?.name}</h2>
              <p className="text-gray-600">{user?.email}</p>
              <p className="text-sm text-gray-500 mt-1">
                {formatRoleName(user?.internalRole || user?.staffRole)}
              </p>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Name cannot be changed. Contact an administrator.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed for security reasons</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 1234567890"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +91 for India)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    value={formatRoleName(user?.internalRole || user?.staffRole)}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Role cannot be changed. Contact an administrator.</p>
                </div>
              </div>
            </div>

            {/* Notification Preferences Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notificationPreferences.emailNotifications}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notificationPreferences: {
                          ...formData.notificationPreferences,
                          emailNotifications: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                    <p className="text-xs text-gray-500">Receive notifications via email</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notificationPreferences.pushNotifications}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notificationPreferences: {
                          ...formData.notificationPreferences,
                          pushNotifications: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Push Notifications</p>
                    <p className="text-xs text-gray-500">Receive in-app notifications</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notificationPreferences.smsNotifications}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notificationPreferences: {
                          ...formData.notificationPreferences,
                          smsNotifications: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">SMS Notifications</p>
                    <p className="text-xs text-gray-500">Receive notifications via SMS</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notificationPreferences.weeklyDigest}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notificationPreferences: {
                          ...formData.notificationPreferences,
                          weeklyDigest: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Weekly Digest</p>
                    <p className="text-xs text-gray-500">Receive a weekly summary of activities</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notificationPreferences.announcementAlerts}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notificationPreferences: {
                          ...formData.notificationPreferences,
                          announcementAlerts: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Announcement Alerts</p>
                    <p className="text-xs text-gray-500">Get notified about platform announcements</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notificationPreferences.taskReminders}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notificationPreferences: {
                          ...formData.notificationPreferences,
                          taskReminders: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Task Reminders</p>
                    <p className="text-xs text-gray-500">Receive reminders for pending tasks</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Basic Information Display */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{user?.name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{user?.email || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{formData.phone || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium text-gray-900">
                    {formatRoleName(user?.internalRole || user?.staffRole)}
                  </p>
                </div>
              </div>
            </div>

            {/* Notification Preferences Display */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(formData.notificationPreferences).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        value ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-sm text-gray-700">
                      {key
                        .replace(/([A-Z])/g, ' $1')
                        .trim()
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Permissions Card - Read Only */}
      {user?.internalPermissions && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">My Permissions</h3>
          <p className="text-sm text-gray-600 mb-4">
            These permissions are assigned based on your role and cannot be changed from this page.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(user.internalPermissions).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    value ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <span className="text-sm text-gray-700">
                  {formatPermissionName(key)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Last Login</p>
            <p className="font-medium text-gray-900">
              {(user as any)?.lastLoginAt
                ? new Date((user as any).lastLoginAt).toLocaleString()
                : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Account Created</p>
            <p className="font-medium text-gray-900">
              {(user as any)?.createdAt
                ? new Date((user as any).createdAt).toLocaleDateString()
                : 'Unknown'}
            </p>
          </div>
          {(user as any)?.territoryId && (
            <div>
              <p className="text-sm text-gray-500">Territory</p>
              <p className="font-medium text-gray-900">{(user as any).territoryId}</p>
            </div>
          )}
          {(user as any)?.commissionRate !== undefined && (
            <div>
              <p className="text-sm text-gray-500">Commission Rate</p>
              <p className="font-medium text-gray-900">{(user as any).commissionRate}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

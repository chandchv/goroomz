import React, { useState, useEffect } from 'react';
import configService from '../../services/configService';
import { useToast } from '../../hooks/useToast';

interface NotificationRule {
  id?: string;
  name: string;
  eventType: string;
  conditions: {
    field: string;
    operator: string;
    value: string;
  }[];
  targetRoles: string[];
  channels: string[];
  isActive: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const NotificationRules: React.FC = () => {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<NotificationRule>({
    name: '',
    eventType: 'lead_assigned',
    conditions: [],
    targetRoles: [],
    channels: ['email', 'inApp'],
    isActive: true,
    priority: 'medium',
  });
  const { showToast } = useToast();

  const eventTypes = [
    'lead_assigned',
    'onboarding_approved',
    'onboarding_rejected',
    'commission_earned',
    'ticket_assigned',
    'ticket_resolved',
    'target_achieved',
    'system_alert',
    'property_zero_occupancy',
    'payment_failure',
  ];

  const roles = [
    'agent',
    'regional_manager',
    'operations_manager',
    'platform_admin',
    'superuser',
  ];

  useEffect(() => {
    loadNotificationRules();
  }, []);

  const loadNotificationRules = async () => {
    try {
      setLoading(true);
      const data = await configService.getNotificationRules();
      setRules(data);
    } catch (error) {
      showToast('Failed to load notification rules');
      console.error('Error loading notification rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule: NotificationRule) => {
    setEditing(rule.id || null);
    setEditForm(rule);
  };

  const handleCancel = () => {
    setEditing(null);
    setEditForm({
      name: '',
      eventType: 'lead_assigned',
      conditions: [],
      targetRoles: [],
      channels: ['email', 'inApp'],
      isActive: true,
      priority: 'medium',
    });
  };

  const handleSave = async () => {
    try {
      if (editing && editing !== 'new') {
        await configService.updateNotificationRule(editing, editForm);
        showToast('Notification rule updated successfully');
      } else {
        await configService.createNotificationRule(editForm);
        showToast('Notification rule created successfully');
      }
      handleCancel();
      loadNotificationRules();
    } catch (error) {
      showToast('Failed to save notification rule');
      console.error('Error saving notification rule:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification rule?')) return;

    try {
      await configService.deleteNotificationRule(id);
      showToast('Notification rule deleted successfully');
      loadNotificationRules();
    } catch (error) {
      showToast('Failed to delete notification rule');
      console.error('Error deleting notification rule:', error);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await configService.updateNotificationRule(id, { isActive: !isActive });
      showToast(`Notification rule ${!isActive ? 'activated' : 'deactivated'}`);
      loadNotificationRules();
    } catch (error) {
      showToast('Failed to update notification rule');
      console.error('Error updating notification rule:', error);
    }
  };

  const addCondition = () => {
    setEditForm({
      ...editForm,
      conditions: [
        ...editForm.conditions,
        { field: '', operator: 'equals', value: '' },
      ],
    });
  };

  const removeCondition = (index: number) => {
    setEditForm({
      ...editForm,
      conditions: editForm.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (
    index: number,
    field: 'field' | 'operator' | 'value',
    value: string
  ) => {
    const newConditions = [...editForm.conditions];
    newConditions[index][field] = value;
    setEditForm({ ...editForm, conditions: newConditions });
  };

  const toggleRole = (role: string) => {
    const newRoles = editForm.targetRoles.includes(role)
      ? editForm.targetRoles.filter((r) => r !== role)
      : [...editForm.targetRoles, role];
    setEditForm({ ...editForm, targetRoles: newRoles });
  };

  const toggleChannel = (channel: string) => {
    const newChannels = editForm.channels.includes(channel)
      ? editForm.channels.filter((c) => c !== channel)
      : [...editForm.channels, channel];
    setEditForm({ ...editForm, channels: newChannels });
  };

  const getPriorityBadgeColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Notification Rules</h3>
          <p className="text-sm text-gray-500 mt-1">
            Define conditions for when notifications should be sent
          </p>
        </div>
        <button
          onClick={() => {
            setEditing('new');
            setEditForm({
              name: '',
              eventType: 'lead_assigned',
              conditions: [],
              targetRoles: [],
              channels: ['email', 'inApp'],
              isActive: true,
              priority: 'medium',
            });
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        {rules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No notification rules configured</div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-md font-semibold text-gray-900">{rule.name}</h4>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeColor(
                        rule.priority
                      )}`}
                    >
                      {rule.priority}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        rule.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Event: {rule.eventType}</p>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Roles: {rule.targetRoles.join(', ') || 'All'}</span>
                    <span>Channels: {rule.channels.join(', ')}</span>
                  </div>
                  {rule.conditions.length > 0 && (
                    <div className="mt-2 text-sm text-gray-500">
                      Conditions: {rule.conditions.length} defined
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => rule.id && handleToggleActive(rule.id, rule.isActive)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                  >
                    {rule.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleEdit(rule)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => rule.id && handleDelete(rule.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Form Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editing === 'new' ? 'Add Notification Rule' : 'Edit Notification Rule'}
              </h3>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 text-2xl">
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="e.g., Notify agents on lead assignment"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type *
                </label>
                <select
                  value={editForm.eventType}
                  onChange={(e) => setEditForm({ ...editForm, eventType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  {eventTypes.map((event) => (
                    <option key={event} value={event}>
                      {event.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                <select
                  value={editForm.priority}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Roles
                </label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <label key={role} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.targetRoles.includes(role)}
                        onChange={() => toggleRole(role)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {role.replace(/_/g, ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Channels *</label>
                <div className="flex gap-4">
                  {['email', 'inApp', 'sms'].map((channel) => (
                    <label key={channel} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.channels.includes(channel)}
                        onChange={() => toggleChannel(channel)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{channel}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationRules;

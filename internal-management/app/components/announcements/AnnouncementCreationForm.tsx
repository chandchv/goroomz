import { useState } from 'react';
import { announcementService, type CreateAnnouncementData } from '../../services/announcementService';

interface AnnouncementCreationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AnnouncementCreationForm({ onSuccess, onCancel }: AnnouncementCreationFormProps) {
  const [formData, setFormData] = useState<CreateAnnouncementData>({
    title: '',
    content: '',
    targetAudience: 'all_property_owners',
    targetFilters: {},
    deliveryMethod: ['email', 'in_app'],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }

    if (formData.deliveryMethod.length === 0) {
      setError('Please select at least one delivery method');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await announcementService.createAnnouncement(formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create announcement');
      console.error('Error creating announcement:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeliveryMethodChange = (method: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      deliveryMethod: checked
        ? [...prev.deliveryMethod, method]
        : prev.deliveryMethod.filter(m => m !== method),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter announcement title"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          required
        />
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Enter announcement content"
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
          required
        />
      </div>

      {/* Target Audience */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Audience <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.targetAudience}
          onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        >
          <option value="all_property_owners">All Property Owners</option>
          <option value="specific_region">Specific Region</option>
          <option value="specific_property_type">Specific Property Type</option>
        </select>
      </div>

      {/* Region Filter (if specific_region selected) */}
      {formData.targetAudience === 'specific_region' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Regions
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" />
              <span className="text-gray-700">North Region</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" />
              <span className="text-gray-700">South Region</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" />
              <span className="text-gray-700">East Region</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" />
              <span className="text-gray-700">West Region</span>
            </label>
          </div>
        </div>
      )}

      {/* Property Type Filter (if specific_property_type selected) */}
      {formData.targetAudience === 'specific_property_type' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Property Types
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" />
              <span className="text-gray-700">Hotel</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 rounded" />
              <span className="text-gray-700">PG (Paying Guest)</span>
            </label>
          </div>
        </div>
      )}

      {/* Delivery Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Delivery Method <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.deliveryMethod.includes('email')}
              onChange={(e) => handleDeliveryMethodChange('email', e.target.checked)}
              className="mr-2 rounded"
            />
            <span className="text-gray-700">Email</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.deliveryMethod.includes('in_app')}
              onChange={(e) => handleDeliveryMethodChange('in_app', e.target.checked)}
              className="mr-2 rounded"
            />
            <span className="text-gray-700">In-App Notification</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.deliveryMethod.includes('sms')}
              onChange={(e) => handleDeliveryMethodChange('sms', e.target.checked)}
              className="mr-2 rounded"
            />
            <span className="text-gray-700">SMS</span>
          </label>
        </div>
      </div>

      {/* Schedule (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Schedule for Later (Optional)
        </label>
        <input
          type="datetime-local"
          value={formData.scheduledAt || ''}
          onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        />
        <p className="text-sm text-gray-500 mt-1">
          Leave empty to send immediately
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating...' : formData.scheduledAt ? 'Schedule Announcement' : 'Send Announcement'}
        </button>
      </div>
    </form>
  );
}

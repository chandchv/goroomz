import { useState, useEffect } from 'react';
import maintenanceService from '../../services/maintenanceService';
import type { CreateMaintenanceRequest } from '../../services/maintenanceService';
import roomService from '../../services/roomService';

interface MaintenanceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Room {
  id: string;
  roomNumber: string;
  floorNumber: number;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  staffRole: string;
}

export default function MaintenanceRequestModal({
  isOpen,
  onClose,
  onSuccess,
}: MaintenanceRequestModalProps) {
  const [formData, setFormData] = useState<CreateMaintenanceRequest>({
    roomId: '',
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    expectedCompletionDate: '',
    images: [],
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadRooms();
      loadStaff();
    }
  }, [isOpen]);

  const loadRooms = async () => {
    try {
      const response = await roomService.getRooms();
      setRooms(response);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  };

  const loadStaff = async () => {
    try {
      // Mock staff data - in real implementation, this would come from an API
      setStaffMembers([
        { id: '1', name: 'John Maintenance', email: 'john@example.com', staffRole: 'maintenance' },
        { id: '2', name: 'Jane Technician', email: 'jane@example.com', staffRole: 'maintenance' },
      ]);
    } catch (err) {
      console.error('Failed to load staff:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.roomId || !formData.title || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // In a real implementation, you would upload images first and get URLs
      const imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        // Mock image upload - replace with actual upload logic
        imageUrls.push(...imageFiles.map((_, i) => `/uploads/maintenance-${Date.now()}-${i}.jpg`));
      }

      await maintenanceService.createRequest({
        ...formData,
        images: imageUrls,
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create maintenance request');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      roomId: '',
      title: '',
      description: '',
      priority: 'medium',
      assignedTo: '',
      expectedCompletionDate: '',
      images: [],
    });
    setImageFiles([]);
    setError(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...files]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create Maintenance Request</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Room Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.roomId}
                onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                required
              >
                <option value="">Select a room</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    Room {room.roomNumber} (Floor {room.floorNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="e.g., Leaking faucet in bathroom"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Provide detailed description of the issue..."
                required
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                required
              >
                <option value="low">Low - Can wait</option>
                <option value="medium">Medium - Normal priority</option>
                <option value="high">High - Needs attention soon</option>
                <option value="urgent">Urgent - Immediate attention required</option>
              </select>
            </div>

            {/* Staff Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to Staff (Optional)
              </label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">Unassigned</option>
                {staffMembers.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.staffRole})
                  </option>
                ))}
              </select>
            </div>

            {/* Expected Completion Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Completion Date (Optional)
              </label>
              <input
                type="date"
                value={formData.expectedCompletionDate}
                onChange={(e) => setFormData({ ...formData, expectedCompletionDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photos (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
              {imageFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {imageFiles.map((file, index) => (
                    <div key={index} className="relative">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-gray-500">{file.name.substring(0, 10)}...</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

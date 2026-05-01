import { useState, useEffect } from 'react';
import maintenanceService from '../../services/maintenanceService';
import type { MaintenanceRequest, UpdateMaintenanceRequest } from '../../services/maintenanceService';

interface MaintenanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: MaintenanceRequest | null;
  onSuccess: () => void;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  staffRole: string;
}

export default function MaintenanceDetailModal({
  isOpen,
  onClose,
  request,
  onSuccess,
}: MaintenanceDetailModalProps) {
  const [updateData, setUpdateData] = useState<UpdateMaintenanceRequest>({
    status: undefined,
    assignedTo: undefined,
    expectedCompletionDate: undefined,
    workPerformed: undefined,
    costIncurred: undefined,
  });
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isOpen && request) {
      loadStaff();
      setUpdateData({
        status: request.status,
        assignedTo: request.assignedTo,
        expectedCompletionDate: request.expectedCompletionDate,
        workPerformed: request.workPerformed,
        costIncurred: request.costIncurred,
      });
    }
  }, [isOpen, request]);

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

  const handleUpdate = async () => {
    if (!request) return;

    try {
      setLoading(true);
      setError(null);

      await maintenanceService.updateRequest(request.id, updateData);
      
      onSuccess();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update maintenance request');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!request) return;
    
    if (!updateData.workPerformed) {
      setError('Please provide work performed details before completing');
      return;
    }

    if (!confirm('Mark this maintenance request as completed?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await maintenanceService.updateRequest(request.id, {
        ...updateData,
        status: 'completed',
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete maintenance request');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-green-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Maintenance Request Details</h2>
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

          {/* Request Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl font-semibold text-gray-900">{request.title}</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(request.priority)}`}>
                {request.priority.toUpperCase()}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(request.status)}`}>
                {request.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <p className="text-gray-600">{request.description}</p>
          </div>

          {/* Request Information */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600">Room</div>
              <div className="font-medium text-gray-900">Room {request.roomNumber || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Floor</div>
              <div className="font-medium text-gray-900">Floor {request.floorNumber || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Reported By</div>
              <div className="font-medium text-gray-900">{request.reportedByName || 'Unknown'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Reported Date</div>
              <div className="font-medium text-gray-900">{formatDate(request.reportedDate)}</div>
            </div>
            {request.completedDate && (
              <div>
                <div className="text-sm text-gray-600">Completed Date</div>
                <div className="font-medium text-gray-900">{formatDate(request.completedDate)}</div>
              </div>
            )}
          </div>

          {/* Status Update Controls */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Update Request</h4>
              {!isEditing && request.status !== 'completed' && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={updateData.status}
                onChange={(e) => setUpdateData({ ...updateData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                disabled={!isEditing}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Assigned To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <select
                value={updateData.assignedTo || ''}
                onChange={(e) => setUpdateData({ ...updateData, assignedTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                disabled={!isEditing}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Completion Date</label>
              <input
                type="date"
                value={updateData.expectedCompletionDate || ''}
                onChange={(e) => setUpdateData({ ...updateData, expectedCompletionDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                disabled={!isEditing}
              />
            </div>

            {/* Work Performed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Performed</label>
              <textarea
                value={updateData.workPerformed || ''}
                onChange={(e) => setUpdateData({ ...updateData, workPerformed: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Describe the work performed..."
                disabled={!isEditing}
              />
            </div>

            {/* Cost Incurred */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Incurred (₹)</label>
              <input
                type="number"
                value={updateData.costIncurred || ''}
                onChange={(e) => setUpdateData({ ...updateData, costIncurred: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={!isEditing}
              />
            </div>

            {isEditing && (
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {/* Images */}
          {request.images && request.images.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Photos</h4>
              <div className="grid grid-cols-3 gap-3">
                {request.images.map((image, index) => (
                  <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img src={image} alt={`Maintenance ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Close
            </button>
            {request.status !== 'completed' && request.status !== 'cancelled' && (
              <button
                onClick={handleComplete}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !updateData.workPerformed}
              >
                {loading ? 'Completing...' : 'Mark as Completed'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import roomService, { type Room } from '../../services/roomService';

interface RoomStatusUpdateModalProps {
  room: Room;
  onClose: () => void;
  onSuccess: () => void;
}

const RoomStatusUpdateModal: React.FC<RoomStatusUpdateModalProps> = ({
  room,
  onClose,
  onSuccess,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<'occupied' | 'vacant_clean' | 'vacant_dirty'>(
    room.currentStatus
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const statusOptions = [
    {
      value: 'occupied' as const,
      label: 'Occupied',
      color: 'bg-yellow-100 border-yellow-500 text-yellow-800',
      icon: '●',
    },
    {
      value: 'vacant_clean' as const,
      label: 'Vacant/Clean',
      color: 'bg-green-100 border-green-500 text-green-800',
      icon: '✓',
    },
    {
      value: 'vacant_dirty' as const,
      label: 'Vacant/Dirty',
      color: 'bg-red-100 border-red-500 text-red-800',
      icon: '!',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedStatus === room.currentStatus) {
      alert('Status is already set to this value');
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setLoading(true);
      await roomService.updateRoomStatus(room.id, selectedStatus, notes);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update room status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            Update Room Status
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Room: <span className="font-semibold">{room.roomNumber}</span>
            </p>
            <p className="text-sm text-gray-600">
              Current Status: <span className="font-semibold">{room.currentStatus.replace('_', '/')}</span>
            </p>
          </div>

          {/* Status Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select New Status
            </label>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedStatus(option.value)}
                  className={`
                    w-full p-4 rounded-lg border-2 text-left transition-all
                    ${selectedStatus === option.value
                      ? option.color + ' border-current'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              rows={3}
              placeholder="Add any notes about this status change..."
            />
          </div>

          {/* Confirmation Message */}
          {showConfirm && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Are you sure you want to change the status from{' '}
                <strong>{room.currentStatus.replace('_', '/')}</strong> to{' '}
                <strong>{selectedStatus.replace('_', '/')}</strong>?
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Updating...' : showConfirm ? 'Confirm Update' : 'Update Status'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomStatusUpdateModal;

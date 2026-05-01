import React, { useState, useEffect } from 'react';
import superuserService, { type Property } from '../services/superuserService';
import categoryService, { type RoomCategory } from '../services/categoryService';

interface BulkRoomCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  property: Property;
}

interface PreviewRoom {
  roomNumber: string;
  floorNumber: number;
}

const BulkRoomCreationModal: React.FC<BulkRoomCreationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  property,
}) => {
  const [formData, setFormData] = useState({
    floorType: 'regular' as 'regular' | 'ground' | 'basement',
    floorNumber: 1,
    startRoomNumber: 1,
    endRoomNumber: 10,
    categoryId: '',
    sharingType: 'single' as 'single' | '2_sharing' | '3_sharing' | 'quad' | 'dormitory',
    dailyRate: 0,
    monthlyRate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [previewRooms, setPreviewRooms] = useState<PreviewRoom[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    generatePreview();
  }, [formData.floorType, formData.floorNumber, formData.startRoomNumber, formData.endRoomNumber]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await categoryService.getCategories(property.id);
      setCategories(data);
    } catch (err: any) {
      console.error('Error loading categories:', err);
      // Categories are optional, so we can continue without them
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const generatePreview = () => {
    const { floorType, floorNumber, startRoomNumber, endRoomNumber } = formData;
    
    if (startRoomNumber > endRoomNumber) {
      setPreviewRooms([]);
      return;
    }

    const rooms: PreviewRoom[] = [];
    for (let i = startRoomNumber; i <= endRoomNumber; i++) {
      // Generate room number with floor convention based on floor type
      let roomNumber: string;
      let floorPrefix: string;
      
      switch (floorType) {
        case 'ground':
          floorPrefix = 'G';
          roomNumber = `${floorPrefix}${floorNumber}${String(i).padStart(2, '0')}`;
          break;
        case 'basement':
          floorPrefix = 'B';
          roomNumber = `${floorPrefix}${floorNumber}${String(i).padStart(2, '0')}`;
          break;
        default: // regular
          roomNumber = `${floorNumber}${String(i).padStart(2, '0')}`;
          break;
      }
      
      rooms.push({
        roomNumber,
        floorNumber,
      });
    }
    
    setPreviewRooms(rooms);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'floorNumber' || name === 'startRoomNumber' || name === 'endRoomNumber' || name === 'dailyRate' || name === 'monthlyRate'
        ? parseInt(value) || 0
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation: Floor number (1-50 for regular, 1-10 for ground/basement)
    const maxFloor = formData.floorType === 'regular' ? 50 : 10;
    if (formData.floorNumber < 1 || formData.floorNumber > maxFloor) {
      setError(`Floor number must be between 1 and ${maxFloor} for ${formData.floorType} floors`);
      return;
    }

    // Validation: Room range
    if (formData.startRoomNumber > formData.endRoomNumber) {
      setError('Start room number must be less than or equal to end room number');
      return;
    }

    if (previewRooms.length === 0) {
      setError('No rooms to create');
      return;
    }

    // Validation: At least one rate must be provided
    if (!formData.dailyRate && !formData.monthlyRate) {
      setError('Please provide at least one rate (daily or monthly)');
      return;
    }

    // Validation: Max 100 rooms per batch
    if (previewRooms.length > 100) {
      setError('Cannot create more than 100 rooms at once');
      return;
    }

    try {
      setLoading(true);

      const result = await superuserService.bulkCreateRooms({
        propertyId: property.id,
        floorType: formData.floorType,
        floorNumber: formData.floorNumber,
        startRoom: formData.startRoomNumber,
        endRoom: formData.endRoomNumber,
        categoryId: formData.categoryId || undefined,
        sharingType: formData.sharingType,
        dailyRate: formData.dailyRate || undefined,
        monthlyRate: formData.monthlyRate || undefined,
      });

      // Show success message with warnings if any
      let message = `Successfully created ${result.created} room(s)`;
      if (result.warnings && result.warnings.length > 0) {
        message += `\n\nWarnings:\n${result.warnings.join('\n')}`;
      }
      alert(message);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create rooms');
      console.error('Error creating rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk Room Creation</h2>
            <p className="text-sm text-gray-600 mt-1">Property: {property.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form Inputs */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Room Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="floorType"
                    value={formData.floorType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  >
                    <option value="regular">Regular Floor (1, 2, 3...)</option>
                    <option value="ground">Ground Floor (G1, G2...)</option>
                    <option value="basement">Basement (B1, B2...)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Choose the type of floor for room numbering
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="floorNumber"
                    value={formData.floorNumber}
                    onChange={handleChange}
                    min="1"
                    max={formData.floorType === 'regular' ? 50 : 10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.floorType === 'regular' 
                      ? 'Floor number must be between 1 and 50'
                      : `${formData.floorType === 'ground' ? 'Ground' : 'Basement'} level must be between 1 and 10`
                    }
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Room Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="startRoomNumber"
                    value={formData.startRoomNumber}
                    onChange={handleChange}
                    min="1"
                    max="99"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter 1-99. Room will be named {
                      formData.floorType === 'ground' ? `G${formData.floorNumber}${String(formData.startRoomNumber).padStart(2, '0')}` :
                      formData.floorType === 'basement' ? `B${formData.floorNumber}${String(formData.startRoomNumber).padStart(2, '0')}` :
                      `${formData.floorNumber}${String(formData.startRoomNumber).padStart(2, '0')}`
                    }
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Room Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="endRoomNumber"
                    value={formData.endRoomNumber}
                    onChange={handleChange}
                    min="1"
                    max="99"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter 1-99. Room will be named {
                      formData.floorType === 'ground' ? `G${formData.floorNumber}${String(formData.endRoomNumber).padStart(2, '0')}` :
                      formData.floorType === 'basement' ? `B${formData.floorNumber}${String(formData.endRoomNumber).padStart(2, '0')}` :
                      `${formData.floorNumber}${String(formData.endRoomNumber).padStart(2, '0')}`
                    }
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Category
                  </label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={loadingCategories}
                  >
                    <option value="">No Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sharing Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="sharingType"
                    value={formData.sharingType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    required
                  >
                    <option value="single">Single (1 bed)</option>
                    <option value="2_sharing">2-Sharing (2 beds)</option>
                    <option value="3_sharing">3-Sharing (3 beds)</option>
                    <option value="quad">4-Sharing (4 beds)</option>
                    <option value="dormitory">Dormitory (6+ beds)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Rate (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="dailyRate"
                    value={formData.dailyRate}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Rate per day for short-term stays
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Rate (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="monthlyRate"
                    value={formData.monthlyRate}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Rate per month for long-term stays
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Preview */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Preview ({previewRooms.length} rooms)
              </h3>
              
              {previewRooms.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
                  <p>No rooms to preview</p>
                  <p className="text-sm mt-1">Adjust the room number range to see preview</p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {previewRooms.map((room, index) => (
                      <div
                        key={index}
                        className="bg-white border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        <div className="font-medium text-gray-900">Room {room.roomNumber}</div>
                        <div className="text-xs text-gray-600">Floor {room.floorNumber}</div>
                        <div className="text-xs text-gray-600">
                          {formData.sharingType === 'single' && '1 bed'}
                          {formData.sharingType === '2_sharing' && '2 beds'}
                          {formData.sharingType === '3_sharing' && '3 beds'}
                          {formData.sharingType === 'quad' && '4 beds'}
                          {formData.sharingType === 'dormitory' && '6 beds'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewRooms.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  <p className="font-medium">Summary:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• {previewRooms.length} rooms will be created</li>
                    <li>• Floor: {
                      formData.floorType === 'ground' ? `Ground ${formData.floorNumber}` :
                      formData.floorType === 'basement' ? `Basement ${formData.floorNumber}` :
                      `Floor ${formData.floorNumber}`
                    }</li>
                    <li>• Room numbers: {
                      formData.floorType === 'ground' ? `G${formData.floorNumber}${String(formData.startRoomNumber).padStart(2, '0')} - G${formData.floorNumber}${String(formData.endRoomNumber).padStart(2, '0')}` :
                      formData.floorType === 'basement' ? `B${formData.floorNumber}${String(formData.startRoomNumber).padStart(2, '0')} - B${formData.floorNumber}${String(formData.endRoomNumber).padStart(2, '0')}` :
                      `${formData.floorNumber}${String(formData.startRoomNumber).padStart(2, '0')} - ${formData.floorNumber}${String(formData.endRoomNumber).padStart(2, '0')}`
                    }</li>
                    <li>• Sharing type: {formData.sharingType.replace('_', '-')}</li>
                    {formData.dailyRate > 0 && (
                      <li>• Daily rate: ₹{formData.dailyRate} per day</li>
                    )}
                    {formData.monthlyRate > 0 && (
                      <li>• Monthly rate: ₹{formData.monthlyRate} per month</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
              disabled={loading || previewRooms.length === 0}
            >
              {loading ? 'Creating...' : `Create ${previewRooms.length} Rooms`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkRoomCreationModal;

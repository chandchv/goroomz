import { useState, useEffect } from 'react';
import { bookingService } from '../../services/bookingService';
import type { Room } from '../../services/roomService';

interface BedSelectionModalProps {
  room: Room;
  onClose: () => void;
  onBedSelected: (bedId: string) => void;
}

interface BedInfo {
  id: string;
  number: number;
  isOccupied: boolean;
}

export default function BedSelectionModal({
  room,
  onClose,
  onBedSelected,
}: BedSelectionModalProps) {
  const [beds, setBeds] = useState<BedInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBed, setSelectedBed] = useState<string | null>(null);

  useEffect(() => {
    loadBedAvailability();
  }, [room.id]);

  const loadBedAvailability = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await bookingService.getAvailableBedsForRoom(room.id);
      
      // Generate bed list based on total beds
      const bedList: BedInfo[] = [];
      for (let i = 1; i <= result.totalBeds; i++) {
        const bedId = `bed-${room.id}-${i}`;
        bedList.push({
          id: bedId,
          number: i,
          isOccupied: result.occupiedBedIds.includes(bedId),
        });
      }
      setBeds(bedList);
    } catch (err: any) {
      // If API doesn't exist yet, generate beds from room data
      const totalBeds = room.totalBeds || room.total_beds || 2;
      const occupiedBeds = room.occupiedBeds || 0;
      
      const bedList: BedInfo[] = [];
      for (let i = 1; i <= totalBeds; i++) {
        const bedId = `bed-${room.id}-${i}`;
        bedList.push({
          id: bedId,
          number: i,
          isOccupied: i <= occupiedBeds,
        });
      }
      setBeds(bedList);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedBed) {
      onBedSelected(selectedBed);
    }
  };

  const availableBeds = beds.filter(b => !b.isOccupied);
  const occupiedBeds = beds.filter(b => b.isOccupied);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Select a Bed</h2>
          <p className="text-sm text-gray-600 mt-1">
            Room {room.roomNumber} - {room.sharingType?.replace('_', '-')}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading bed availability...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadBedAvailability}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Bed Status Summary */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Beds:</span>
                  <span className="font-medium text-gray-900">{beds.length}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Available:</span>
                  <span className="font-medium text-green-600">{availableBeds.length}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Occupied:</span>
                  <span className="font-medium text-red-600">{occupiedBeds.length}</span>
                </div>
              </div>

              {/* Bed Grid */}
              <div className="grid grid-cols-3 gap-3">
                {beds.map((bed) => (
                  <button
                    key={bed.id}
                    onClick={() => !bed.isOccupied && setSelectedBed(bed.id)}
                    disabled={bed.isOccupied}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${bed.isOccupied
                        ? 'bg-red-50 border-red-200 cursor-not-allowed opacity-60'
                        : selectedBed === bed.id
                        ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-200'
                        : 'bg-green-50 border-green-200 hover:border-green-400 cursor-pointer'
                      }
                    `}
                  >
                    <div className="text-center">
                      <div className={`text-2xl mb-1 ${bed.isOccupied ? 'text-red-400' : 'text-green-600'}`}>
                        {bed.isOccupied ? '🛏️' : '🛏️'}
                      </div>
                      <div className={`text-sm font-medium ${
                        bed.isOccupied ? 'text-red-700' : selectedBed === bed.id ? 'text-primary-700' : 'text-green-700'
                      }`}>
                        Bed {bed.number}
                      </div>
                      <div className={`text-xs mt-1 ${
                        bed.isOccupied ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {bed.isOccupied ? 'Occupied' : 'Available'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {availableBeds.length === 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <p className="text-yellow-800 font-medium">No beds available</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    All beds in this room are currently occupied.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedBed || availableBeds.length === 0}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

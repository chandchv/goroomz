/**
 * Optimistic Update Example Component
 * 
 * This component demonstrates how to use optimistic updates
 * in the internal management system
 * 
 * Requirements: 16.3
 */

import { useState } from 'react';
import { useOptimisticUpdate, useOptimisticState } from '../hooks/useOptimisticUpdate';
import { useLoadingState } from '../hooks/useLoadingState';
import { ButtonWithLoading, LoadingOverlay } from './LoadingSpinner';
import roomService, { type Room } from '../services/roomService';

/**
 * Example 1: Simple optimistic update with useOptimisticUpdate hook
 */
export function RoomStatusUpdateExample({ room }: { room: Room }) {
  const [currentStatus, setCurrentStatus] = useState(room.currentStatus);
  const { execute, isLoading, error } = useOptimisticUpdate();

  const handleStatusUpdate = async (newStatus: Room['currentStatus']) => {
    await execute(
      // Optimistic update - update UI immediately
      () => setCurrentStatus(newStatus),
      
      // API call
      () => roomService.updateRoomStatus(room.id, newStatus),
      
      // Revert function - restore previous state if API fails
      () => setCurrentStatus(currentStatus),
      
      // Options
      {
        onSuccess: (result) => {
          console.log('Status updated successfully:', result);
        },
        onError: (err) => {
          console.error('Failed to update status:', err);
          alert('Failed to update room status. Please try again.');
        },
      }
    );
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="font-semibold mb-2">Room {room.roomNumber}</h3>
      <p className="text-sm mb-3">Current Status: {currentStatus}</p>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">
          Error: {error.message}
        </div>
      )}
      
      <div className="flex gap-2">
        <ButtonWithLoading
          isLoading={isLoading}
          onClick={() => handleStatusUpdate('vacant_clean')}
          className="px-3 py-1 bg-green-600 text-white rounded text-sm"
        >
          Mark Clean
        </ButtonWithLoading>
        
        <ButtonWithLoading
          isLoading={isLoading}
          onClick={() => handleStatusUpdate('vacant_dirty')}
          className="px-3 py-1 bg-yellow-600 text-white rounded text-sm"
        >
          Mark Dirty
        </ButtonWithLoading>
      </div>
    </div>
  );
}

/**
 * Example 2: Optimistic list updates with useOptimisticState hook
 */
export function RoomListExample({ initialRooms }: { initialRooms: Room[] }) {
  const {
    state: rooms,
    setState: setRooms,
    updateOptimistic,
    isLoading,
    error,
  } = useOptimisticState<Room>(initialRooms);

  const handleRoomUpdate = async (roomId: string, newStatus: Room['currentStatus']) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    await updateOptimistic(
      (r) => r.id === roomId,
      { ...room, currentStatus: newStatus },
      () => roomService.updateRoomStatus(roomId, newStatus).then(() => ({
        ...room,
        currentStatus: newStatus,
      })),
      {
        onError: (err) => {
          alert(`Failed to update room: ${err.message}`);
        },
      }
    );
  };

  return (
    <LoadingOverlay isLoading={isLoading} message="Updating room...">
      <div className="space-y-2">
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded text-sm">
            Error: {error.message}
          </div>
        )}
        
        {rooms.map((room) => (
          <div key={room.id} className="p-3 border rounded flex justify-between items-center">
            <div>
              <span className="font-semibold">Room {room.roomNumber}</span>
              <span className="ml-3 text-sm text-gray-600">{room.currentStatus}</span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleRoomUpdate(room.id, 'vacant_clean')}
                className="px-2 py-1 bg-green-600 text-white rounded text-xs"
              >
                Clean
              </button>
              <button
                onClick={() => handleRoomUpdate(room.id, 'vacant_dirty')}
                className="px-2 py-1 bg-yellow-600 text-white rounded text-xs"
              >
                Dirty
              </button>
            </div>
          </div>
        ))}
      </div>
    </LoadingOverlay>
  );
}

/**
 * Example 3: Using the optimistic API wrapper directly
 */
export function DirectApiExample({ room }: { room: Room }) {
  const [localRoom, setLocalRoom] = useState(room);
  const isLoading = useLoadingState(`room-${room.id}`);

  const handleUpdate = async (newStatus: Room['currentStatus']) => {
    const previousRoom = { ...localRoom };

    await roomService.updateRoomStatusOptimistic(
      room.id,
      newStatus,
      undefined,
      {
        optimisticUpdate: () => {
          setLocalRoom({ ...localRoom, currentStatus: newStatus });
        },
        revertUpdate: () => {
          setLocalRoom(previousRoom);
        },
        onSuccess: (result) => {
          setLocalRoom({ ...localRoom, currentStatus: result.status });
        },
        onError: (err) => {
          alert(`Failed: ${err.message}`);
        },
      }
    );
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="font-semibold mb-2">Room {localRoom.roomNumber}</h3>
      <p className="text-sm mb-3">Status: {localRoom.currentStatus}</p>
      
      <ButtonWithLoading
        isLoading={isLoading}
        onClick={() => handleUpdate('vacant_clean')}
        className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
      >
        Update Status
      </ButtonWithLoading>
    </div>
  );
}

import { useState, useEffect } from 'react';
import housekeepingService from '../services/housekeepingService';
import type { HousekeepingTask } from '../services/housekeepingService';

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [floors, setFloors] = useState<number[]>([]);
  const [completingTask, setCompletingTask] = useState<string | null>(null);

  // Default cleaning checklist
  const defaultChecklist = [
    { item: 'Bed made and linens changed', completed: false },
    { item: 'Bathroom cleaned and sanitized', completed: false },
    { item: 'Floor swept and mopped', completed: false },
    { item: 'Trash emptied', completed: false },
    { item: 'Amenities restocked', completed: false },
  ];

  useEffect(() => {
    loadTasks();
  }, [selectedFloor]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await housekeepingService.getTasks(selectedFloor || undefined);
      setTasks(data);

      // Extract unique floors
      const uniqueFloors = Array.from(new Set(data.map(task => task.floorNumber))).sort((a, b) => a - b);
      setFloors(uniqueFloors);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load housekeeping tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsClean = async (task: HousekeepingTask) => {
    if (!confirm(`Mark Room ${task.roomNumber} as clean?`)) {
      return;
    }

    try {
      setCompletingTask(task.id);
      // Extract roomId from task.id (format: task_${roomId}) or use roomId if available
      const roomId = task.roomId || task.id.replace('task_', '');
      await housekeepingService.completeTask(roomId, {
        roomId: roomId,
        timeTaken: 30, // Default 30 minutes
        checklistCompleted: defaultChecklist.map(item => ({ ...item, completed: true })),
        notes: 'Cleaned via housekeeping dashboard',
      });
      
      // Reload tasks
      await loadTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to mark room as clean');
    } finally {
      setCompletingTask(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'High Priority';
      case 'medium':
        return 'Medium Priority';
      default:
        return 'Normal';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading housekeeping tasks...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Housekeeping Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage room cleaning tasks and priorities</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Floor Filter */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Filter by Floor:</label>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedFloor(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedFloor === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Floors
          </button>
          {floors.map(floor => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedFloor === floor
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Floor {floor}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Pending</div>
          <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">High Priority</div>
          <div className="text-2xl font-bold text-red-600">
            {tasks.filter(t => t.priority === 'high').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Medium Priority</div>
          <div className="text-2xl font-bold text-yellow-600">
            {tasks.filter(t => t.priority === 'medium').length}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 text-lg mb-2">✓ All rooms are clean!</div>
          <div className="text-gray-500 text-sm">No pending housekeeping tasks</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Floor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Since Checkout
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasks.map(task => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      Room {task.roomNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">Floor {task.floorNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      Vacant/Dirty
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {task.timeSinceCheckout ? `${task.timeSinceCheckout} hours` : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleMarkAsClean(task)}
                      disabled={completingTask === task.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {completingTask === task.id ? 'Marking...' : 'Mark as Clean'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import maintenanceService, { type MaintenanceRequest } from '../services/maintenanceService';
import MaintenanceRequestModal from '../components/maintenance/MaintenanceRequestModal';
import MaintenanceDetailModal from '../components/maintenance/MaintenanceDetailModal';

export default function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [activeTab, selectedPriority, selectedFloor]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = { status: activeTab };
      if (selectedPriority) filters.priority = selectedPriority;
      if (selectedFloor) filters.floor = parseInt(selectedFloor);

      const data = await maintenanceService.getRequests(filters);
      setRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load maintenance requests');
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

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
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
    });
  };

  const filteredRequests = requests;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading maintenance requests...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Management</h1>
          <p className="text-gray-600 mt-1">Track and manage room maintenance requests</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Request
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
              {requests.filter(r => r.status === 'pending').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'in_progress'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            In Progress
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
              {requests.filter(r => r.status === 'in_progress').length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'completed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Completed
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
              {requests.filter(r => r.status === 'completed').length}
            </span>
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="">All Floors</option>
            <option value="1">Floor 1</option>
            <option value="2">Floor 2</option>
            <option value="3">Floor 3</option>
            <option value="4">Floor 4</option>
            <option value="5">Floor 5</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 text-lg mb-2">No maintenance requests</div>
          <div className="text-gray-500 text-sm">
            {activeTab === 'pending' && 'No pending maintenance requests'}
            {activeTab === 'in_progress' && 'No requests in progress'}
            {activeTab === 'completed' && 'No completed requests'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map(request => (
            <div
              key={request.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(request.priority)}`}>
                      {getPriorityLabel(request.priority)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(request.status)}`}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{request.description}</p>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Room:</span> {request.roomNumber || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Floor:</span> {request.floorNumber || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Reported:</span> {formatDate(request.reportedDate)}
                    </div>
                    {request.assignedToName && (
                      <div>
                        <span className="font-medium">Assigned to:</span> {request.assignedToName}
                      </div>
                    )}
                    {request.costIncurred && (
                      <div>
                        <span className="font-medium">Cost:</span> ₹{request.costIncurred}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowDetailModal(true);
                  }}
                  className="ml-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <MaintenanceRequestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadRequests}
      />

      {/* Detail Modal */}
      <MaintenanceDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onSuccess={loadRequests}
      />
    </div>
  );
}

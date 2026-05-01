import { useState, useEffect } from 'react';
import { ticketService, type SupportTicket, type TicketResponse } from '../../services/ticketService';
import { useAuth } from '../../contexts/AuthContext';

interface TicketDetailViewProps {
  ticketId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function TicketDetailView({ ticketId, onClose, onUpdate }: TicketDetailViewProps) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    loadTicketDetails();
  }, [ticketId]);

  const loadTicketDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ticketData, responsesData] = await Promise.all([
        ticketService.getTicket(ticketId),
        ticketService.getResponses(ticketId),
      ]);

      setTicket(ticketData);
      setResponses(responsesData);
      setNewStatus(ticketData.status);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load ticket details');
      console.error('Error loading ticket details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddResponse = async () => {
    if (!responseMessage.trim()) return;

    try {
      setSubmitting(true);
      await ticketService.addResponse(ticketId, {
        message: responseMessage,
        isInternal,
      });

      setResponseMessage('');
      setIsInternal(false);
      await loadTicketDetails();
      onUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add response');
      console.error('Error adding response:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === ticket?.status) {
      setShowStatusUpdate(false);
      return;
    }

    try {
      setSubmitting(true);
      await ticketService.updateTicketStatus(ticketId, newStatus);
      await loadTicketDetails();
      setShowStatusUpdate(false);
      onUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
      console.error('Error updating status:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async () => {
    const resolution = prompt('Enter resolution notes:');
    if (!resolution) return;

    try {
      setSubmitting(true);
      await ticketService.resolveTicket(ticketId, resolution);
      await loadTicketDetails();
      onUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resolve ticket');
      console.error('Error resolving ticket:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('Are you sure you want to close this ticket?')) return;

    try {
      setSubmitting(true);
      await ticketService.closeTicket(ticketId);
      await loadTicketDetails();
      onUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to close ticket');
      console.error('Error closing ticket:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'waiting_response':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLabel = (text: string) => {
    return text.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Ticket not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-mono text-gray-500">#{ticket.ticketNumber}</span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(ticket.priority)}`}>
              {formatLabel(ticket.priority)}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
              {formatLabel(ticket.status)}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{ticket.title}</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Category: {formatLabel(ticket.category)}</span>
            <span>•</span>
            <span>Created: {formatDate(ticket.createdAt)}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Ticket Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Property Owner:</span>
            <p className="font-medium text-gray-900">{ticket.propertyOwnerName || 'Unknown'}</p>
          </div>
          {ticket.propertyName && (
            <div>
              <span className="text-gray-600">Property:</span>
              <p className="font-medium text-gray-900">{ticket.propertyName}</p>
            </div>
          )}
          <div>
            <span className="text-gray-600">Assigned To:</span>
            <p className="font-medium text-gray-900">{ticket.assignedToName || 'Unassigned'}</p>
          </div>
          <div>
            <span className="text-gray-600">Created By:</span>
            <p className="font-medium text-gray-900">{ticket.createdByName || 'Unknown'}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <span className="text-gray-600 text-sm">Description:</span>
          <p className="text-gray-900 mt-1">{ticket.description}</p>
        </div>
        {ticket.resolution && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <span className="text-gray-600 text-sm">Resolution:</span>
            <p className="text-gray-900 mt-1">{ticket.resolution}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3 mb-6">
        <button
          onClick={() => setShowStatusUpdate(!showStatusUpdate)}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Update Status
        </button>
        {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
          <button
            onClick={handleResolve}
            disabled={submitting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
          >
            Resolve
          </button>
        )}
        {ticket.status === 'resolved' && (
          <button
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
          >
            Close
          </button>
        )}
      </div>

      {/* Status Update Form */}
      {showStatusUpdate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_response">Waiting Response</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Update
            </button>
            <button
              onClick={() => setShowStatusUpdate(false)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Responses Timeline */}
      <div className="flex-1 overflow-y-auto mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Responses</h3>
        <div className="space-y-4">
          {responses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No responses yet</p>
            </div>
          ) : (
            responses.map(response => (
              <div
                key={response.id}
                className={`rounded-lg p-4 ${
                  response.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{response.userName || 'Unknown User'}</span>
                    {response.isInternal && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-200 text-yellow-800">
                        Internal Note
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(response.createdAt)}</span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{response.message}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Response Form */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-start space-x-3">
          <textarea
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            placeholder="Type your response..."
            rows={3}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
          />
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleAddResponse}
              disabled={submitting || !responseMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              Send
            </button>
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="mr-2 rounded"
              />
              Internal
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

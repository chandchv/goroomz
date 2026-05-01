import { useState } from 'react';
import { leadService, type LeadCommunication, type AddCommunicationData } from '../../services/leadService';

interface CommunicationTimelineProps {
  leadId: string;
  communications: LeadCommunication[];
  onUpdate?: () => void;
}

export default function CommunicationTimeline({ leadId, communications, onUpdate }: CommunicationTimelineProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<AddCommunicationData>({
    type: 'note',
    subject: '',
    content: '',
    scheduledAt: '',
    completedAt: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim() || !formData.content.trim()) {
      setError('Subject and content are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await leadService.addCommunication(leadId, formData);

      // Reset form
      setFormData({
        type: 'note',
        subject: '',
        content: '',
        scheduledAt: '',
        completedAt: '',
      });
      setShowAddForm(false);

      if (onUpdate) {
        onUpdate();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add communication');
      console.error('Error adding communication:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      case 'email':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'meeting':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'note':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'call':
        return 'bg-blue-100 text-blue-800';
      case 'email':
        return 'bg-green-100 text-green-800';
      case 'meeting':
        return 'bg-purple-100 text-purple-800';
      case 'note':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Communication Button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          + Add Communication
        </button>
      )}

      {/* Add Communication Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h4 className="font-semibold text-gray-900">Add Communication</h4>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="note">Note</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setError(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Communication'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        {communications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No communications recorded yet
          </div>
        ) : (
          communications.map((comm, index) => (
            <div key={comm.id} className="relative">
              {/* Timeline line */}
              {index < communications.length - 1 && (
                <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
              )}

              {/* Communication item */}
              <div className="flex space-x-3">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getTypeColor(comm.type)}`}>
                  {getTypeIcon(comm.type)}
                </div>
                <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="font-semibold text-gray-900">{comm.subject}</h5>
                      <p className="text-sm text-gray-600">
                        {comm.user?.name} • {formatDate(comm.createdAt)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(comm.type)}`}>
                      {comm.type.charAt(0).toUpperCase() + comm.type.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{comm.content}</p>
                  {comm.scheduledAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Scheduled: {formatDate(comm.scheduledAt)}
                    </p>
                  )}
                  {comm.completedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Completed: {formatDate(comm.completedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

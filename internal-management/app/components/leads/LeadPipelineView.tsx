import { useState, useEffect } from 'react';
import { leadService } from '../../services/leadService';
import type { Lead } from '../../services/leadService';
import LeadCard from './LeadCard';
import LeadDetailModal from './LeadDetailModal';

interface LeadPipelineViewProps {
  agentId?: string;
  onLeadUpdate?: () => void;
}

type LeadStatus = 'contacted' | 'in_progress' | 'pending_approval' | 'approved' | 'rejected' | 'lost';

const PIPELINE_COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-yellow-500' },
  { status: 'pending_approval', label: 'Pending Approval', color: 'bg-purple-500' },
  { status: 'approved', label: 'Approved', color: 'bg-green-500' },
  { status: 'rejected', label: 'Rejected', color: 'bg-red-500' },
  { status: 'lost', label: 'Lost', color: 'bg-gray-500' },
];

export default function LeadPipelineView({ agentId, onLeadUpdate }: LeadPipelineViewProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  useEffect(() => {
    loadLeads();
  }, [agentId]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await leadService.getLeads({
        agentId,
        limit: 100,
      });

      setLeads(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load leads');
      console.error('Error loading leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (lead: Lead) => (e: React.DragEvent) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (newStatus: LeadStatus) => async (e: React.DragEvent) => {
    e.preventDefault();

    if (!draggedLead || draggedLead.status === newStatus) {
      setDraggedLead(null);
      return;
    }

    try {
      await leadService.updateLeadStatus(draggedLead.id, { status: newStatus });
      await loadLeads();
      if (onLeadUpdate) {
        onLeadUpdate();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update lead status');
      console.error('Error updating lead status:', err);
    } finally {
      setDraggedLead(null);
    }
  };

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter(lead => lead.status === status);
  };

  const handleLeadClick = (leadId: string) => {
    setSelectedLeadId(leadId);
  };

  const handleModalClose = () => {
    setSelectedLeadId(null);
  };

  const handleModalUpdate = async () => {
    await loadLeads();
    if (onLeadUpdate) {
      onLeadUpdate();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex space-x-4 overflow-x-auto pb-4">
        {PIPELINE_COLUMNS.map(column => {
          const columnLeads = getLeadsByStatus(column.status);
          return (
            <div
              key={column.status}
              className="flex-shrink-0 w-80"
              onDragOver={handleDragOver}
              onDrop={handleDrop(column.status)}
            >
              {/* Column Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${column.color} mr-2`} />
                    <h3 className="font-semibold text-gray-900">{column.label}</h3>
                  </div>
                  <span className="bg-gray-100 text-gray-600 text-sm font-medium px-2 py-1 rounded">
                    {columnLeads.length}
                  </span>
                </div>
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${column.color}`} style={{ width: '100%' }} />
                </div>
              </div>

              {/* Column Content */}
              <div className="space-y-3 min-h-[200px]">
                {columnLeads.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-500 text-sm">
                    No leads in this stage
                  </div>
                ) : (
                  columnLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => handleLeadClick(lead.id)}
                      draggable={true}
                      onDragStart={handleDragStart(lead)}
                      onDragEnd={handleDragEnd}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lead Detail Modal */}
      {selectedLeadId && (
        <LeadDetailModal
          leadId={selectedLeadId}
          isOpen={true}
          onClose={handleModalClose}
          onUpdate={handleModalUpdate}
        />
      )}
    </>
  );
}

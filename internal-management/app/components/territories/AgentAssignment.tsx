import { useState, useEffect } from 'react';
import territoryService, { type Territory, type TerritoryAgent } from '../../services/territoryService';

interface AgentAssignmentProps {
  territoryId: string;
  onAssignmentUpdate?: () => void;
}

interface AvailableAgent {
  id: string;
  name: string;
  email: string;
  phone: string;
  currentTerritory?: string;
}

export default function AgentAssignment({ territoryId, onAssignmentUpdate }: AgentAssignmentProps) {
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [assignedAgents, setAssignedAgents] = useState<TerritoryAgent[]>([]);
  const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [territoryId]);

  const loadData = async () => {
    if (!territoryId) {
      setError('Territory ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load territory info
      const territoryData = await territoryService.getTerritory(territoryId);
      setTerritory(territoryData);

      // Load assigned agents
      const agentsData = await territoryService.getTerritoryAgents(territoryId);
      setAssignedAgents(agentsData);

      // TODO: Load available agents from user service
      // For now, using mock data
      setAvailableAgents([]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load agent data');
      console.error('Error loading agent data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedAgent) return;

    try {
      await territoryService.assignAgent(territoryId, selectedAgent);
      setShowAssignModal(false);
      setSelectedAgent('');
      loadData();
      onAssignmentUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign agent');
      console.error('Error assigning agent:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Agent Assignment</h2>
          <p className="text-sm text-gray-600 mt-1">
            Territory: {territory?.name}
          </p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Assign Agent
        </button>
      </div>

      {/* Assigned Agents */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">
            Assigned Agents ({assignedAgents.length})
          </h3>
        </div>
        <div className="p-6">
          {assignedAgents.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-600 font-medium">No agents assigned</p>
              <p className="text-sm text-gray-500 mt-1">
                Click "Assign Agent" to add agents to this territory
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedAgents.map(agent => (
                <div key={agent.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {agent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{agent.email}</p>
                      <p className="text-sm text-gray-600">{agent.phone}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Leads</span>
                      <span className="font-semibold text-gray-900">{agent.totalLeads}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Approved</span>
                      <span className="font-semibold text-green-600">{agent.approvedLeads}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Commission Rate</span>
                      <span className="font-semibold text-gray-900">{agent.commissionRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Commission</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(agent.totalCommission)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => {/* TODO: View agent details */}}
                      className="w-full px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Agent Workload Summary */}
      {assignedAgents.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Workload Distribution</h3>
          <div className="space-y-3">
            {assignedAgents.map(agent => {
              const maxLeads = Math.max(...assignedAgents.map(a => a.totalLeads), 1);
              const percentage = (agent.totalLeads / maxLeads) * 100;
              
              return (
                <div key={agent.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-900">{agent.name}</span>
                    <span className="text-gray-600">{agent.totalLeads} leads</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assign Agent Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Assign Agent</h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedAgent('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Agent
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Choose an agent...</option>
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} - {agent.email}
                      {agent.currentTerritory && ` (Currently in ${agent.currentTerritory})`}
                    </option>
                  ))}
                </select>
              </div>

              {availableAgents.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    No available agents found. All agents may already be assigned to territories.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedAgent('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignAgent}
                  disabled={!selectedAgent}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Assign Agent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

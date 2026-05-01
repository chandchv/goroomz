import { useState, useEffect } from 'react';
import territoryService, { type TerritoryAgent } from '../../services/territoryService';
import targetService, { type AgentTarget } from '../../services/targetService';
import { leadService } from '../../services/leadService';

interface AgentPerformanceViewProps {
  territoryId: string;
  onAgentSelect?: (agentId: string) => void;
}

interface AgentPerformanceData {
  agent: TerritoryAgent;
  targets: AgentTarget[];
  leadsByStatus: Record<string, number>;
  conversionRate: number;
  averageTimeToClose: number;
}

export default function AgentPerformanceView({ territoryId, onAgentSelect }: AgentPerformanceViewProps) {
  const [agents, setAgents] = useState<TerritoryAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<TerritoryAgent | null>(null);
  const [performanceData, setPerformanceData] = useState<AgentPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
  }, [territoryId]);

  useEffect(() => {
    if (selectedAgent) {
      loadAgentPerformance(selectedAgent.id);
    }
  }, [selectedAgent]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const agentsData = await territoryService.getTerritoryAgents(territoryId);
      setAgents(agentsData);
      
      if (agentsData.length > 0 && !selectedAgent) {
        setSelectedAgent(agentsData[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load agents');
      console.error('Error loading agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAgentPerformance = async (agentId: string) => {
    try {
      setError(null);
      
      // Load agent targets
      const targets = await targetService.getAgentTargets(agentId);
      
      // Load agent leads
      const leadsResponse = await leadService.getLeads({ agentId });
      const leads = leadsResponse.data;
      
      // Calculate leads by status
      const leadsByStatus = leads.reduce((acc: Record<string, number>, lead: any) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {});
      
      // Calculate conversion rate
      const approvedLeads = leadsByStatus['approved'] || 0;
      const conversionRate = leads.length > 0 ? (approvedLeads / leads.length) * 100 : 0;
      
      // Calculate average time to close (mock for now)
      const averageTimeToClose = 15; // days
      
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        setPerformanceData({
          agent,
          targets,
          leadsByStatus,
          conversionRate,
          averageTimeToClose,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load performance data');
      console.error('Error loading performance data:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-gray-600 font-medium">No agents in this territory</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Agent List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Team Members</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => {
                    setSelectedAgent(agent);
                    onAgentSelect?.(agent.id);
                  }}
                  className={`w-full p-4 text-left transition-colors ${
                    selectedAgent?.id === agent.id
                      ? 'bg-blue-50 border-l-4 border-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-gray-900">{agent.name}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {agent.totalLeads} leads • {agent.approvedLeads} approved
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Details */}
        <div className="lg:col-span-3">
          {performanceData ? (
            <div className="space-y-6">
              {/* Agent Header */}
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{performanceData.agent.name}</h2>
                    <p className="text-gray-600 mt-1">{performanceData.agent.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Commission Rate</div>
                    <div className="text-2xl font-bold text-gray-900">{performanceData.agent.commissionRate}%</div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                  <div className="text-sm text-gray-600 mb-1">Total Leads</div>
                  <div className="text-3xl font-bold text-gray-900">{performanceData.agent.totalLeads}</div>
                </div>
                <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                  <div className="text-sm text-gray-600 mb-1">Approved</div>
                  <div className="text-3xl font-bold text-green-600">{performanceData.agent.approvedLeads}</div>
                </div>
                <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                  <div className="text-sm text-gray-600 mb-1">Conversion Rate</div>
                  <div className="text-3xl font-bold text-blue-600">{formatPercentage(performanceData.conversionRate)}</div>
                </div>
                <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                  <div className="text-sm text-gray-600 mb-1">Avg. Time to Close</div>
                  <div className="text-3xl font-bold text-purple-600">{performanceData.averageTimeToClose}d</div>
                </div>
              </div>

              {/* Lead Pipeline Status */}
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Pipeline</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Object.entries(performanceData.leadsByStatus).map(([status, count]) => (
                    <div key={status} className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                      <div className="text-sm text-gray-600 capitalize mt-1">
                        {status.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Targets */}
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Targets</h3>
                {performanceData.targets.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No targets set for this agent</p>
                ) : (
                  <div className="space-y-4">
                    {performanceData.targets.map(target => {
                      const propertiesProgress = target.targetProperties > 0 
                        ? (target.actualProperties / target.targetProperties) * 100 
                        : 0;
                      const revenueProgress = target.targetRevenue > 0 
                        ? (target.actualRevenue / target.targetRevenue) * 100 
                        : 0;
                      
                      return (
                        <div key={target.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="text-sm font-medium text-gray-900 capitalize">{target.period}</span>
                              <span className="text-sm text-gray-600 ml-2">
                                {new Date(target.startDate).toLocaleDateString()} - {new Date(target.endDate).toLocaleDateString()}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatPercentage(propertiesProgress)} Complete
                            </span>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Properties</span>
                                <span className="font-medium text-gray-900">
                                  {target.actualProperties} / {target.targetProperties}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(propertiesProgress, 100)}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Revenue</span>
                                <span className="font-medium text-gray-900">
                                  {formatCurrency(target.actualRevenue)} / {formatCurrency(target.targetRevenue)}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(revenueProgress, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Commission Summary */}
              <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Total Earned</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(performanceData.agent.totalCommission)}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Per Property Avg</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(
                        performanceData.agent.approvedLeads > 0
                          ? performanceData.agent.totalCommission / performanceData.agent.approvedLeads
                          : 0
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Commission Rate</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {performanceData.agent.commissionRate}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
              <p className="text-gray-600">Select an agent to view performance details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

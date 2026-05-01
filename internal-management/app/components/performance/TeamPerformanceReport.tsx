import { useState, useEffect } from 'react';
import territoryService, { type TerritoryAgent } from '../../services/territoryService';
import targetService, { type TargetProgress } from '../../services/targetService';
import TargetSettingForm from './TargetSettingForm';

interface TeamPerformanceReportProps {
  territoryId: string;
}

export default function TeamPerformanceReport({ territoryId }: TeamPerformanceReportProps) {
  const [agents, setAgents] = useState<TerritoryAgent[]>([]);
  const [targetProgress, setTargetProgress] = useState<TargetProgress[]>([]);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'leads' | 'approved' | 'commission'>('leads');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadTeamData();
  }, [territoryId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);

      const agentsData = await territoryService.getTerritoryAgents(territoryId);
      setAgents(agentsData);

      const progressData = await targetService.getTeamTargetProgress(territoryId);
      setTargetProgress(progressData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load team data');
      console.error('Error loading team data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetTarget = (agentId: string) => {
    setSelectedAgentId(agentId);
    setShowTargetForm(true);
  };

  const handleTargetSet = () => {
    setShowTargetForm(false);
    setSelectedAgentId(null);
    loadTeamData();
  };

  const sortAgents = (agentsToSort: TerritoryAgent[]) => {
    return [...agentsToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'leads':
          comparison = a.totalLeads - b.totalLeads;
          break;
        case 'approved':
          comparison = a.approvedLeads - b.approvedLeads;
          break;
        case 'commission':
          comparison = a.totalCommission - b.totalCommission;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
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

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const sortedAgents = sortAgents(agents);

  // Calculate team totals
  const teamTotals = agents.reduce(
    (acc, agent) => ({
      totalLeads: acc.totalLeads + agent.totalLeads,
      approvedLeads: acc.approvedLeads + agent.approvedLeads,
      totalCommission: acc.totalCommission + agent.totalCommission,
    }),
    { totalLeads: 0, approvedLeads: 0, totalCommission: 0 }
  );

  const teamConversionRate = teamTotals.totalLeads > 0 
    ? (teamTotals.approvedLeads / teamTotals.totalLeads) * 100 
    : 0;

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

      {/* Team Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Team Size</div>
          <div className="text-3xl font-bold text-gray-900">{agents.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Total Leads</div>
          <div className="text-3xl font-bold text-blue-600">{teamTotals.totalLeads}</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Properties Onboarded</div>
          <div className="text-3xl font-bold text-green-600">{teamTotals.approvedLeads}</div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Team Conversion</div>
          <div className="text-3xl font-bold text-purple-600">{formatPercentage(teamConversionRate)}</div>
        </div>
      </div>

      {/* Team Performance Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Team Performance Comparison</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Name</option>
              <option value="leads">Total Leads</option>
              <option value="approved">Approved</option>
              <option value="commission">Commission</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className={`w-5 h-5 text-gray-600 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Leads
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approved
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Target Progress
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedAgents.map(agent => {
                const conversionRate = agent.totalLeads > 0 
                  ? (agent.approvedLeads / agent.totalLeads) * 100 
                  : 0;
                
                const agentProgress = targetProgress.find(p => p.agentName === agent.name);
                
                return (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-semibold text-sm">
                            {agent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{agent.name}</div>
                          <div className="text-sm text-gray-500">{agent.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-semibold text-gray-900">{agent.totalLeads}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-semibold text-green-600">{agent.approvedLeads}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className={`text-sm font-semibold ${getPerformanceColor(conversionRate)}`}>
                        {formatPercentage(conversionRate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(agent.totalCommission)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {agentProgress ? (
                        <div className="flex items-center justify-center">
                          <div className="w-24">
                            <div className="flex justify-between text-xs mb-1">
                              <span className={getPerformanceColor(agentProgress.propertiesProgress)}>
                                {formatPercentage(agentProgress.propertiesProgress)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(agentProgress.propertiesProgress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-sm text-gray-500">No target</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleSetTarget(agent.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Set Target
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                  Team Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-gray-900">
                  {teamTotals.totalLeads}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-green-600">
                  {teamTotals.approvedLeads}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-gray-900">
                  {formatPercentage(teamConversionRate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center font-semibold text-gray-900">
                  {formatCurrency(teamTotals.totalCommission)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap"></td>
                <td className="px-6 py-4 whitespace-nowrap"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Most Leads */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-sm text-blue-600 font-medium mb-2">Most Leads</div>
            {agents.length > 0 && (
              <>
                <div className="text-lg font-bold text-gray-900">
                  {[...agents].sort((a, b) => b.totalLeads - a.totalLeads)[0].name}
                </div>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {[...agents].sort((a, b) => b.totalLeads - a.totalLeads)[0].totalLeads} leads
                </div>
              </>
            )}
          </div>

          {/* Highest Conversion */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-sm text-green-600 font-medium mb-2">Highest Conversion</div>
            {agents.length > 0 && (
              <>
                <div className="text-lg font-bold text-gray-900">
                  {[...agents].sort((a, b) => {
                    const rateA = a.totalLeads > 0 ? (a.approvedLeads / a.totalLeads) : 0;
                    const rateB = b.totalLeads > 0 ? (b.approvedLeads / b.totalLeads) : 0;
                    return rateB - rateA;
                  })[0].name}
                </div>
                <div className="text-2xl font-bold text-green-600 mt-1">
                  {formatPercentage(
                    [...agents].sort((a, b) => {
                      const rateA = a.totalLeads > 0 ? (a.approvedLeads / a.totalLeads) : 0;
                      const rateB = b.totalLeads > 0 ? (b.approvedLeads / b.totalLeads) : 0;
                      return rateB - rateA;
                    })[0].totalLeads > 0
                      ? ([...agents].sort((a, b) => {
                          const rateA = a.totalLeads > 0 ? (a.approvedLeads / a.totalLeads) : 0;
                          const rateB = b.totalLeads > 0 ? (b.approvedLeads / b.totalLeads) : 0;
                          return rateB - rateA;
                        })[0].approvedLeads / [...agents].sort((a, b) => {
                          const rateA = a.totalLeads > 0 ? (a.approvedLeads / a.totalLeads) : 0;
                          const rateB = b.totalLeads > 0 ? (b.approvedLeads / b.totalLeads) : 0;
                          return rateB - rateA;
                        })[0].totalLeads) * 100
                      : 0
                  )}
                </div>
              </>
            )}
          </div>

          {/* Top Earner */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-sm text-purple-600 font-medium mb-2">Top Earner</div>
            {agents.length > 0 && (
              <>
                <div className="text-lg font-bold text-gray-900">
                  {[...agents].sort((a, b) => b.totalCommission - a.totalCommission)[0].name}
                </div>
                <div className="text-2xl font-bold text-purple-600 mt-1">
                  {formatCurrency([...agents].sort((a, b) => b.totalCommission - a.totalCommission)[0].totalCommission)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Target Setting Modal */}
      {showTargetForm && selectedAgentId && (
        <TargetSettingForm
          agentId={selectedAgentId}
          territoryId={territoryId}
          onClose={() => {
            setShowTargetForm(false);
            setSelectedAgentId(null);
          }}
          onTargetSet={handleTargetSet}
        />
      )}
    </div>
  );
}

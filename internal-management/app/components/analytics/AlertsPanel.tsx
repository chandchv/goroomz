import { useState, useEffect } from 'react';
import { analyticsService, type PropertyHealthMetric } from '../../services/analyticsService';

interface AlertsPanelProps {
  onPropertySelect?: (propertyId: string) => void;
}

export default function AlertsPanel({ onPropertySelect }: AlertsPanelProps) {
  const [properties, setProperties] = useState<PropertyHealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');

  useEffect(() => {
    loadPropertyHealth();
  }, []);

  const loadPropertyHealth = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsService.getPropertyHealth({
        hasIssues: true,
        limit: 50,
      });

      setProperties(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load property health data');
      console.error('Error loading property health:', err);
    } finally {
      setLoading(false);
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getSeverityBadge = (score: number) => {
    if (score >= 60) return { label: 'Warning', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Critical', color: 'bg-red-100 text-red-800' };
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredProperties = properties.filter(property => {
    if (filter === 'critical') return property.healthScore < 60;
    if (filter === 'warning') return property.healthScore >= 60 && property.healthScore < 80;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
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
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Issues ({properties.length})
        </button>
        <button
          onClick={() => setFilter('critical')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'critical'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Critical ({properties.filter(p => p.healthScore < 60).length})
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'warning'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Warning ({properties.filter(p => p.healthScore >= 60 && p.healthScore < 80).length})
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredProperties.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No properties with issues found</p>
          </div>
        ) : (
          filteredProperties.map(property => {
            const severity = getSeverityBadge(property.healthScore);
            return (
              <div
                key={property.propertyId}
                onClick={() => onPropertySelect?.(property.propertyId)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{property.propertyName}</h4>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${severity.color}`}>
                        {severity.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Owner: {property.ownerName} ({property.ownerEmail})
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className={`text-2xl font-bold ${getHealthScoreColor(property.healthScore)}`}>
                      {property.healthScore}
                    </div>
                    <div className="text-xs text-gray-500">Health Score</div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                  <div>
                    <div className="text-gray-600">Occupancy</div>
                    <div className={`font-semibold ${property.occupancyRate < 30 ? 'text-red-600' : 'text-gray-900'}`}>
                      {Math.round(property.occupancyRate)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Last Booking</div>
                    <div className={`font-semibold ${property.daysSinceLastBooking > 7 ? 'text-red-600' : 'text-gray-900'}`}>
                      {property.daysSinceLastBooking} days ago
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Pending Payments</div>
                    <div className={`font-semibold ${property.pendingPayments > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {property.pendingPayments}
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {property.issues && property.issues.length > 0 && (
                  <div className="border-t border-gray-200 pt-3">
                    <div className="text-xs font-medium text-gray-600 mb-2">Issues:</div>
                    <div className="flex flex-wrap gap-2">
                      {property.issues.map((issue, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded border border-red-200"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Maintenance Issues */}
                {property.maintenanceIssues > 0 && (
                  <div className="mt-2 flex items-center text-sm text-orange-600">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {property.maintenanceIssues} maintenance issue{property.maintenanceIssues > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Summary Stats */}
      {filteredProperties.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Avg Health Score</div>
              <div className="text-xl font-bold text-gray-900">
                {Math.round(filteredProperties.reduce((sum, p) => sum + p.healthScore, 0) / filteredProperties.length)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Avg Occupancy</div>
              <div className="text-xl font-bold text-gray-900">
                {Math.round(filteredProperties.reduce((sum, p) => sum + p.occupancyRate, 0) / filteredProperties.length)}%
              </div>
            </div>
            <div>
              <div className="text-gray-600">Total Pending Payments</div>
              <div className="text-xl font-bold text-gray-900">
                {filteredProperties.reduce((sum, p) => sum + p.pendingPayments, 0)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

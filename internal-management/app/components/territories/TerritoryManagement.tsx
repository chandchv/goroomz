import { useState, useEffect } from 'react';
import territoryService, { type Territory } from '../../services/territoryService';
import TerritoryMapView from './TerritoryMapView';

interface TerritoryManagementProps {
  regionalManagerId?: string;
  onTerritoryUpdate?: () => void;
}

export default function TerritoryManagement({ regionalManagerId, onTerritoryUpdate }: TerritoryManagementProps) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cities: '',
    states: '',
  });

  useEffect(() => {
    loadTerritories();
  }, []);

  const loadTerritories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await territoryService.getTerritories();
      
      // Handle different response structures
      let territoriesData = [];
      if (Array.isArray(response)) {
        territoriesData = response;
      } else if (response && Array.isArray(response.data)) {
        territoriesData = response.data;
      } else if (response && response.territories && Array.isArray(response.territories)) {
        territoriesData = response.territories;
      }
      
      console.log('Territories response:', response);
      console.log('Setting territories:', territoriesData);
      setTerritories(territoriesData);
      
      // Select first territory by default
      if (territoriesData.length > 0 && !selectedTerritory) {
        setSelectedTerritory(territoriesData[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load territories');
      console.error('Error loading territories:', err);
      setTerritories([]); // Ensure territories is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTerritory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const territoryData = {
        name: formData.name,
        description: formData.description,
        regionalManagerId,
        cities: formData.cities.split(',').map(c => c.trim()).filter(c => c),
        states: formData.states.split(',').map(s => s.trim()).filter(s => s),
        isActive: true,
      };

      await territoryService.createTerritory(territoryData);
      setShowCreateForm(false);
      setFormData({ name: '', description: '', cities: '', states: '' });
      loadTerritories();
      onTerritoryUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create territory');
      console.error('Error creating territory:', err);
    }
  };

  const handleUpdateTerritory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTerritory) return;

    try {
      const territoryData = {
        name: formData.name,
        description: formData.description,
        cities: formData.cities.split(',').map(c => c.trim()).filter(c => c),
        states: formData.states.split(',').map(s => s.trim()).filter(s => s),
      };

      await territoryService.updateTerritory(selectedTerritory.id, territoryData);
      setShowEditForm(false);
      setFormData({ name: '', description: '', cities: '', states: '' });
      loadTerritories();
      onTerritoryUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update territory');
      console.error('Error updating territory:', err);
    }
  };

  const handleDeleteTerritory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this territory?')) return;

    try {
      await territoryService.deleteTerritory(id);
      setSelectedTerritory(null);
      loadTerritories();
      onTerritoryUpdate?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete territory');
      console.error('Error deleting territory:', err);
    }
  };

  const openEditForm = (territory: Territory) => {
    setFormData({
      name: territory.name,
      description: territory.description || '',
      cities: territory.cities?.join(', ') || '',
      states: territory.states?.join(', ') || '',
    });
    setShowEditForm(true);
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
        <h2 className="text-xl font-semibold text-gray-900">Territory Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Territory
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Territory List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Territories</h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {!Array.isArray(territories) || territories.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No territories found
                </div>
              ) : (
                territories.map(territory => (
                  <div
                    key={territory.id}
                    onClick={() => setSelectedTerritory(territory)}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedTerritory?.id === territory.id
                        ? 'bg-blue-50 border-l-4 border-blue-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{territory.name}</h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {territory.description || 'No description'}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            territory.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {territory.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {territory.cities && territory.cities.length > 0 && (
                            <span className="text-xs text-gray-500">
                              {territory.cities.length} cities
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Territory Details and Map */}
        <div className="lg:col-span-2">
          {selectedTerritory ? (
            <div className="space-y-4">
              {/* Territory Actions */}
              <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedTerritory.name}</h3>
                    <p className="text-sm text-gray-600">{selectedTerritory.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditForm(selectedTerritory)}
                      className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTerritory(selectedTerritory.id)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              {/* Territory Map */}
              <TerritoryMapView territoryId={selectedTerritory.id} />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-gray-600">Select a territory to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Territory Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Create Territory</h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ name: '', description: '', cities: '', states: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateTerritory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Territory Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cities (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.cities}
                  onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
                  placeholder="Mumbai, Pune, Nagpur"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  States (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.states}
                  onChange={(e) => setFormData({ ...formData, states: e.target.value })}
                  placeholder="Maharashtra, Karnataka"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ name: '', description: '', cities: '', states: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Territory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Territory Modal */}
      {showEditForm && selectedTerritory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Edit Territory</h2>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setFormData({ name: '', description: '', cities: '', states: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdateTerritory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Territory Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cities (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.cities}
                  onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
                  placeholder="Mumbai, Pune, Nagpur"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  States (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.states}
                  onChange={(e) => setFormData({ ...formData, states: e.target.value })}
                  placeholder="Maharashtra, Karnataka"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setFormData({ name: '', description: '', cities: '', states: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Territory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

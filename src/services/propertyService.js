import apiService from './api';

class PropertyService {
  // Create property with optional room
  async createProperty(propertyData) {
    try {
      const response = await apiService.post('/properties', propertyData);
      return response;
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  // Get all properties
  async getProperties(filters = {}) {
    try {
      const response = await apiService.get('/properties', { params: filters });
      return response;
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  }

  // Get single property
  async getProperty(id) {
    try {
      const response = await apiService.get(`/properties/${id}`);
      return response;
    } catch (error) {
      console.error('Error fetching property:', error);
      throw error;
    }
  }

  // Get owner's properties
  async getMyProperties() {
    try {
      const response = await apiService.get('/properties/owner/my-properties');
      return response;
    } catch (error) {
      console.error('Error fetching my properties:', error);
      throw error;
    }
  }

  // Update property
  async updateProperty(id, propertyData) {
    try {
      const response = await apiService.put(`/properties/${id}`, propertyData);
      return response;
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  }

  // Delete property
  async deleteProperty(id) {
    try {
      const response = await apiService.delete(`/properties/${id}`);
      return response;
    } catch (error) {
      console.error('Error deleting property:', error);
      throw error;
    }
  }

  // Search properties
  async searchProperties(query, filters = {}) {
    try {
      const response = await apiService.get('/properties', { 
        params: { search: query, ...filters } 
      });
      return response;
    } catch (error) {
      console.error('Error searching properties:', error);
      throw error;
    }
  }

  // Get featured properties
  async getFeaturedProperties() {
    try {
      const response = await apiService.get('/properties', { 
        params: { featured: true, limit: 6 } 
      });
      return response;
    } catch (error) {
      console.error('Error fetching featured properties:', error);
      throw error;
    }
  }

  // Get properties by location
  async getPropertiesByLocation(city, filters = {}) {
    try {
      const response = await apiService.get('/properties', { 
        params: { city, ...filters } 
      });
      return response;
    } catch (error) {
      console.error('Error fetching properties by location:', error);
      throw error;
    }
  }

  // Get properties by type
  async getPropertiesByType(type, filters = {}) {
    try {
      const response = await apiService.get('/properties', { 
        params: { type, ...filters } 
      });
      return response;
    } catch (error) {
      console.error('Error fetching properties by type:', error);
      throw error;
    }
  }
}

export default new PropertyService();

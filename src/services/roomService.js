import apiService from './api';

class RoomService {
  // Get all rooms with optional filters
  async getRooms(filters = {}) {
    try {
      const response = await apiService.getRooms(filters);
      return response;
    } catch (error) {
      console.error('Error fetching rooms:', error);
      throw error;
    }
  }

  // Get single room by ID
  async getRoom(id) {
    try {
      const response = await apiService.getRoom(id);
      return response;
    } catch (error) {
      console.error('Error fetching room:', error);
      throw error;
    }
  }

  // Get rooms by category
  async getRoomsByCategory(category, filters = {}) {
    try {
      const response = await apiService.getRooms({ category, ...filters });
      return response;
    } catch (error) {
      console.error('Error fetching rooms by category:', error);
      throw error;
    }
  }

  // Search rooms
  async searchRooms(query, filters = {}) {
    try {
      const response = await apiService.getRooms({ search: query, ...filters });
      return response;
    } catch (error) {
      console.error('Error searching rooms:', error);
      throw error;
    }
  }

  // Get featured rooms
  async getFeaturedRooms() {
    try {
      const response = await apiService.getRooms({ featured: true, limit: 6 });
      return response;
    } catch (error) {
      console.error('Error fetching featured rooms:', error);
      throw error;
    }
  }

  // Get rooms by location
  async getRoomsByLocation(city, filters = {}) {
    try {
      const response = await apiService.getRooms({ city, ...filters });
      return response;
    } catch (error) {
      console.error('Error fetching rooms by location:', error);
      throw error;
    }
  }

  // Filter rooms by price range
  async getRoomsByPriceRange(minPrice, maxPrice, filters = {}) {
    try {
      const response = await apiService.getRooms({ 
        minPrice, 
        maxPrice, 
        ...filters 
      });
      return response;
    } catch (error) {
      console.error('Error fetching rooms by price range:', error);
      throw error;
    }
  }

  // Get rooms with specific amenities
  async getRoomsByAmenities(amenities, filters = {}) {
    try {
      const response = await apiService.getRooms({ 
        amenities: amenities.join(','), 
        ...filters 
      });
      return response;
    } catch (error) {
      console.error('Error fetching rooms by amenities:', error);
      throw error;
    }
  }

  // Sort rooms
  async getSortedRooms(sortBy, filters = {}) {
    try {
      const response = await apiService.getRooms({ 
        sort: sortBy, 
        ...filters 
      });
      return response;
    } catch (error) {
      console.error('Error fetching sorted rooms:', error);
      throw error;
    }
  }
}

export default new RoomService();

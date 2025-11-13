import apiService from './api';

class RoomTypeService {
  // Get room types for a property
  async getRoomTypesByProperty(propertyId) {
    try {
      const response = await apiService.get(`/room-types/property/${propertyId}`);
      return response;
    } catch (error) {
      console.error('Error fetching room types:', error);
      throw error;
    }
  }

  // Get single room type
  async getRoomType(id) {
    try {
      const response = await apiService.get(`/room-types/${id}`);
      return response;
    } catch (error) {
      console.error('Error fetching room type:', error);
      throw error;
    }
  }

  // Create room type
  async createRoomType(roomTypeData) {
    try {
      const response = await apiService.post('/room-types', roomTypeData);
      return response;
    } catch (error) {
      console.error('Error creating room type:', error);
      throw error;
    }
  }

  // Update room type
  async updateRoomType(id, updates) {
    try {
      const response = await apiService.put(`/room-types/${id}`, updates);
      return response;
    } catch (error) {
      console.error('Error updating room type:', error);
      throw error;
    }
  }

  // Delete room type
  async deleteRoomType(id) {
    try {
      const response = await apiService.delete(`/room-types/${id}`);
      return response;
    } catch (error) {
      console.error('Error deleting room type:', error);
      throw error;
    }
  }

  // Check availability
  async checkAvailability(id, checkIn, checkOut) {
    try {
      const response = await apiService.get(`/room-types/${id}/availability?checkIn=${checkIn}&checkOut=${checkOut}`);
      return response;
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }

  // Utility: Get bed configuration display
  getBedConfigurationDisplay(bedConfig) {
    const beds = [];
    if (bedConfig.single) beds.push(`${bedConfig.single} Single bed${bedConfig.single > 1 ? 's' : ''}`);
    if (bedConfig.double) beds.push(`${bedConfig.double} Double bed${bedConfig.double > 1 ? 's' : ''}`);
    if (bedConfig.bunk) beds.push(`${bedConfig.bunk} Bunk bed${bedConfig.bunk > 1 ? 's' : ''}`);
    if (bedConfig.queen) beds.push(`${bedConfig.queen} Queen bed${bedConfig.queen > 1 ? 's' : ''}`);
    if (bedConfig.king) beds.push(`${bedConfig.king} King bed${bedConfig.king > 1 ? 's' : ''}`);
    return beds.join(', ') || 'Not specified';
  }

  // Utility: Get gender display
  getGenderDisplay(gender) {
    const genderMap = {
      'mixed': 'Mixed',
      'male': 'Male Only',
      'female': 'Female Only'
    };
    return genderMap[gender] || '';
  }
}

export default new RoomTypeService();


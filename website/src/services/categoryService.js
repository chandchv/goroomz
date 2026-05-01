import apiService from './api';

class CategoryService {
  // Get all active categories
  async getCategories() {
    try {
      const response = await apiService.getCategories();
      return response;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Get single category by ID
  async getCategory(id) {
    try {
      const response = await apiService.getCategory(id);
      return response;
    } catch (error) {
      console.error('Error fetching category:', error);
      throw error;
    }
  }

  // Get category by name
  async getCategoryByName(name) {
    try {
      const categories = await this.getCategories();
      const category = categories.data.find(cat => 
        cat.name.toLowerCase() === name.toLowerCase()
      );
      return { success: true, data: category };
    } catch (error) {
      console.error('Error fetching category by name:', error);
      throw error;
    }
  }

  // Get room types for a category
  async getRoomTypesForCategory(categoryName) {
    try {
      const category = await this.getCategoryByName(categoryName);
      if (category.success && category.data) {
        return {
          success: true,
          data: category.data.roomTypes || []
        };
      }
      return { success: false, data: [] };
    } catch (error) {
      console.error('Error fetching room types for category:', error);
      throw error;
    }
  }

  // Get default amenities for a category
  async getDefaultAmenitiesForCategory(categoryName) {
    try {
      const category = await this.getCategoryByName(categoryName);
      if (category.success && category.data) {
        return {
          success: true,
          data: category.data.defaultAmenities || []
        };
      }
      return { success: false, data: [] };
    } catch (error) {
      console.error('Error fetching default amenities for category:', error);
      throw error;
    }
  }

  // Get all available amenities
  getAvailableAmenities() {
    return [
      'wifi',
      'meals',
      'parking',
      'laundry',
      'ac',
      'tv',
      'gym',
      'security',
      'balcony',
      'kitchen',
      'washing-machine',
      'refrigerator',
      'microwave',
      'iron',
      'heater',
      'cctv'
    ];
  }

  // Get all available room types
  getAvailableRoomTypes() {
    return [
      'Private Room',
      'Shared Room',
      'Entire Place',
      'Studio'
    ];
  }

  // Get category display information
  getCategoryDisplayInfo(categoryName) {
    const categoryInfo = {
      'PG': {
        title: 'Paying Guest',
        description: 'Shared accommodations with meals and facilities',
        icon: 'Building',
        color: 'blue'
      },
      'Hotel Room': {
        title: 'Hotel Room',
        description: 'Private rooms in hotels and guesthouses',
        icon: 'BedDouble',
        color: 'green'
      },
      'Independent Home': {
        title: 'Independent Home',
        description: 'Complete houses and apartments',
        icon: 'Home',
        color: 'purple'
      },
      'Home Stay': {
        title: 'Home Stay',
        description: 'Homely accommodations with local experience',
        icon: 'Heart',
        color: 'pink'
      }
    };

    return categoryInfo[categoryName] || {
      title: categoryName,
      description: 'Accommodation options',
      icon: 'Building',
      color: 'gray'
    };
  }

  // Format category data for display
  formatCategoriesForDisplay(categories) {
    return categories.map(category => ({
      ...category,
      displayInfo: this.getCategoryDisplayInfo(category.name)
    }));
  }
}

export default new CategoryService();

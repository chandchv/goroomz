import { api } from './api';

export interface RoomCategory {
  id: string;
  propertyId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roomCount?: number;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

const categoryService = {
  // Get all categories for the current property
  getCategories: async (propertyId?: string): Promise<RoomCategory[]> => {
    const params = propertyId ? { propertyId } : {};
    const response = await api.get('/api/internal/categories', { params });
    return response.data.data || response.data;
  },

  // Get a single category
  getCategory: async (categoryId: string): Promise<RoomCategory> => {
    const response = await api.get(`/internal/categories/${categoryId}`);
    return response.data;
  },

  // Create a new category
  createCategory: async (data: CreateCategoryData): Promise<RoomCategory> => {
    const response = await api.post('/api/internal/categories', data);
    return response.data;
  },

  // Update a category
  updateCategory: async (
    categoryId: string,
    data: UpdateCategoryData
  ): Promise<RoomCategory> => {
    const response = await api.put(`/internal/categories/${categoryId}`, data);
    return response.data;
  },

  // Delete a category
  deleteCategory: async (categoryId: string): Promise<void> => {
    await api.delete(`/internal/categories/${categoryId}`);
  },

  // Assign category to a room
  assignCategoryToRoom: async (
    roomId: string,
    categoryId: string
  ): Promise<void> => {
    await api.post(`/internal/rooms/${roomId}/assign-category`, {
      categoryId,
    });
  },
};

export default categoryService;

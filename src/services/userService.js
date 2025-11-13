import apiService from './api';

class UserService {
  // Get all users (admin only)
  async getUsers(filters = {}) {
    try {
      const response = await apiService.get('/users', filters);
      return response;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Get single user
  async getUser(id) {
    try {
      const response = await apiService.get(`/users/${id}`);
      return response;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  // Get user statistics (admin only)
  async getUserStats() {
    try {
      const response = await apiService.get('/users/stats/overview');
      return response;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }

  // Update user role (admin only)
  async updateUserRole(id, role) {
    try {
      const response = await apiService.put(`/users/${id}/role`, { role });
      return response;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  // Deactivate user (admin only)
  async deactivateUser(id) {
    try {
      const response = await apiService.put(`/users/${id}/deactivate`);
      return response;
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  }

  // Activate user (admin only)
  async activateUser(id) {
    try {
      const response = await apiService.put(`/users/${id}/activate`);
      return response;
    } catch (error) {
      console.error('Error activating user:', error);
      throw error;
    }
  }

  // Get users by role
  async getUsersByRole(role) {
    try {
      const response = await apiService.get(`/users?role=${role}`);
      return response;
    } catch (error) {
      console.error('Error fetching users by role:', error);
      throw error;
    }
  }

  // Get category owners
  async getCategoryOwners() {
    try {
      const response = await this.getUsersByRole('category_owner');
      return response;
    } catch (error) {
      console.error('Error fetching category owners:', error);
      throw error;
    }
  }

  // Get property owners
  async getPropertyOwners() {
    try {
      const response = await this.getUsersByRole('owner');
      return response;
    } catch (error) {
      console.error('Error fetching property owners:', error);
      throw error;
    }
  }

  // Get regular users
  async getRegularUsers() {
    try {
      const response = await this.getUsersByRole('user');
      return response;
    } catch (error) {
      console.error('Error fetching regular users:', error);
      throw error;
    }
  }

  // Search users
  async searchUsers(query) {
    try {
      const response = await apiService.get(`/users?search=${encodeURIComponent(query)}`);
      return response;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  // Get user activity (recent users)
  async getRecentUsers(days = 30) {
    try {
      const response = await apiService.get(`/users?recent=${days}`);
      return response;
    } catch (error) {
      console.error('Error fetching recent users:', error);
      throw error;
    }
  }

  // Validate user role
  validateUserRole(role) {
    const validRoles = ['user', 'owner', 'category_owner', 'admin'];
    return validRoles.includes(role);
  }

  // Get role display name
  getRoleDisplayName(role) {
    const roleNames = {
      'user': 'Regular User',
      'owner': 'Property Owner',
      'category_owner': 'Category Owner',
      'admin': 'Administrator'
    };
    return roleNames[role] || role;
  }

  // Get role color for UI
  getRoleColor(role) {
    const roleColors = {
      'user': 'text-blue-600 bg-blue-100',
      'owner': 'text-green-600 bg-green-100',
      'category_owner': 'text-purple-600 bg-purple-100',
      'admin': 'text-red-600 bg-red-100'
    };
    return roleColors[role] || 'text-gray-600 bg-gray-100';
  }
}

export default new UserService();

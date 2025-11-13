const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    if (typeof window !== 'undefined') {
      // temporary debug logging
      console.log('[ApiService] baseURL:', this.baseURL);
    }
  }

  // Get auth token from localStorage
  getToken() {
    return localStorage.getItem('token');
  }

  // Set auth token in localStorage
  setToken(token) {
    localStorage.setItem('token', token);
  }

  // Remove auth token from localStorage
  removeToken() {
    localStorage.removeItem('token');
  }

  // Create headers with auth token
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.getToken()) {
      headers.Authorization = `Bearer ${this.getToken()}`;
    }

    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(options.includeAuth !== false),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Log validation errors for debugging
        if (data.errors && Array.isArray(data.errors)) {
          console.error('Validation errors:', data.errors);
          const errorMessages = data.errors.map(err => err.msg).join(', ');
          throw new Error(errorMessages || data.message || `HTTP error! status: ${response.status}`);
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Generic HTTP method shortcuts
  async get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  // Special method for file uploads (like CSV import)
  async postFormData(endpoint, formData, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = this.getHeaders(options.includeAuth !== false);
    
    // Remove Content-Type header for FormData (browser will set it with boundary)
    delete headers['Content-Type'];
    
    const config = {
      method: 'POST',
      headers,
      body: formData,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          console.error('Validation errors:', data.errors);
          const errorMessages = data.errors.map(err => err.msg).join(', ');
          throw new Error(errorMessages || data.message || `HTTP error! status: ${response.status}`);
        }
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  // Auth endpoints
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      includeAuth: false,
    });
  }

  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      includeAuth: false,
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async updateProfile(userData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.removeToken();
    }
  }

  // Room endpoints
  async getRooms(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/rooms?${queryString}` : '/rooms';
    return this.request(endpoint, { includeAuth: false });
  }

  async getRoom(id) {
    return this.request(`/rooms/${id}`, { includeAuth: false });
  }

  async createRoom(roomData) {
    return this.request('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  }

  async updateRoom(id, roomData) {
    return this.request(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roomData),
    });
  }

  async deleteRoom(id) {
    return this.request(`/rooms/${id}`, {
      method: 'DELETE',
    });
  }

  async getMyRooms() {
    return this.request('/rooms/owner/my-rooms');
  }

  // Booking endpoints
  async createBooking(bookingData) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getBookings(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/bookings?${queryString}` : '/bookings';
    return this.request(endpoint);
  }

  async getBooking(id) {
    return this.request(`/bookings/${id}`);
  }

  async updateBookingStatus(id, status, cancellationReason = null) {
    const body = { status };
    if (cancellationReason) {
      body.cancellationReason = cancellationReason;
    }

    return this.request(`/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async getMyBookings() {
    return this.request('/bookings/owner/my-bookings');
  }

  // Category endpoints
  async getCategories() {
    return this.request('/categories', { includeAuth: false });
  }

  async getCategory(id) {
    return this.request(`/categories/${id}`, { includeAuth: false });
  }

  // User endpoints (Admin)
  async getUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/users?${queryString}` : '/users';
    return this.request(endpoint);
  }

  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  async updateUserRole(id, role) {
    return this.request(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async deactivateUser(id) {
    return this.request(`/users/${id}/deactivate`, {
      method: 'PUT',
    });
  }

  async getUserStats() {
    return this.request('/users/stats/overview');
  }

  // Health check
  async healthCheck() {
    return this.request('/health', { includeAuth: false });
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;

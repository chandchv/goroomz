import apiService from './api';

class BookingService {
  // Create a guest booking (without authentication)
  async createGuestBooking(bookingData) {
    try {
      const response = await apiService.post('/bookings/guest', bookingData);
      return response;
    } catch (error) {
      console.error('Error creating guest booking:', error);
      throw error;
    }
  }

  // Create a new booking
  async createBooking(bookingData) {
    try {
      const response = await apiService.createBooking(bookingData);
      return response;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  // Get user's bookings
  async getUserBookings(filters = {}) {
    try {
      const response = await apiService.getBookings(filters);
      return response;
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  }

  // Get single booking
  async getBooking(id) {
    try {
      const response = await apiService.getBooking(id);
      return response;
    } catch (error) {
      console.error('Error fetching booking:', error);
      throw error;
    }
  }

  // Update booking status
  async updateBookingStatus(id, status, cancellationReason = null) {
    try {
      const response = await apiService.updateBookingStatus(id, status, cancellationReason);
      return response;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  }

  // Cancel booking
  async cancelBooking(id, reason = null) {
    try {
      const response = await apiService.updateBookingStatus(id, 'cancelled', reason);
      return response;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }

  // Confirm booking (for room owners)
  async confirmBooking(id) {
    try {
      const response = await apiService.updateBookingStatus(id, 'confirmed');
      return response;
    } catch (error) {
      console.error('Error confirming booking:', error);
      throw error;
    }
  }

  // Get bookings by status
  async getBookingsByStatus(status) {
    try {
      const response = await apiService.getBookings({ status });
      return response;
    } catch (error) {
      console.error('Error fetching bookings by status:', error);
      throw error;
    }
  }

  // Get owner's bookings (for room owners)
  async getOwnerBookings(filters = {}) {
    try {
      const response = await apiService.getMyBookings(filters);
      return response;
    } catch (error) {
      console.error('Error fetching owner bookings:', error);
      throw error;
    }
  }

  // Check room availability
  async checkAvailability(roomId, checkIn, checkOut) {
    try {
      // This would typically be a separate endpoint
      // For now, we'll create a dummy booking to check for conflicts
      const tempBooking = {
        room: roomId,
        checkIn,
        checkOut,
        guests: 1,
        contactInfo: {
          phone: '0000000000',
          email: 'temp@example.com'
        }
      };

      // Try to create a temporary booking to check for conflicts
      // In a real implementation, this would be a dedicated availability endpoint
      const response = await apiService.createBooking(tempBooking);
      
      // If successful, immediately cancel it
      if (response.success) {
        await this.cancelBooking(response.data.id, 'Availability check');
        return { available: true };
      }
      
      return { available: false };
    } catch (error) {
      // If there's a conflict error, room is not available
      if (error.message.includes('not available')) {
        return { available: false, error: error.message };
      }
      throw error;
    }
  }

  // Calculate booking total
  calculateBookingTotal(roomPrice, checkIn, checkOut, guests = 1) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const duration = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    return {
      duration,
      totalAmount: roomPrice * duration * guests,
      breakdown: {
        roomPrice,
        duration,
        guests,
        subtotal: roomPrice * duration,
        total: roomPrice * duration * guests
      }
    };
  }

  // Validate booking dates
  validateBookingDates(checkIn, checkOut) {
    const now = new Date();
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkInDate < now) {
      return { valid: false, error: 'Check-in date cannot be in the past' };
    }

    if (checkOutDate <= checkInDate) {
      return { valid: false, error: 'Check-out date must be after check-in date' };
    }

    const daysDifference = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    if (daysDifference > 365) {
      return { valid: false, error: 'Booking cannot exceed 365 days' };
    }

    return { valid: true };
  }
}

export default new BookingService();

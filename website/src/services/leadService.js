import apiService from './api';

class LeadService {
  // Submit property listing as lead
  async submitPropertyLead(leadData) {
    try {
      const response = await apiService.post('/internal/leads', leadData);
      return response;
    } catch (error) {
      console.error('Lead submission failed:', error);
      throw error;
    }
  }

  // Get lead status by tracking reference
  async getLeadStatus(trackingReference) {
    try {
      const response = await apiService.get(`/internal/leads?trackingReference=${trackingReference}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch lead status:', error);
      throw error;
    }
  }

  // Get lead by ID
  async getLeadById(leadId) {
    try {
      const response = await apiService.get(`/internal/leads/${leadId}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch lead:', error);
      throw error;
    }
  }

  // Get leads for property owner (by email)
  async getPropertyOwnerLeads(email) {
    try {
      const response = await apiService.get(`/internal/leads?email=${encodeURIComponent(email)}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch property owner leads:', error);
      throw error;
    }
  }

  // Generate unique submission ID
  generateSubmissionId() {
    return `frontend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Map frontend category to backend property type
  mapCategoryToPropertyType(category) {
    const mapping = {
      'Hotel Room': 'hotel',
      'PG': 'pg',
      'Home Stay': 'homestay',
      'Independent Home': 'apartment'
    };
    return mapping[category] || 'hotel';
  }

  // Prepare lead data from form data
  prepareLead(formData, imageObjects = []) {
    const submissionId = this.generateSubmissionId();
    
    return {
      // Property Owner Information
      propertyOwnerName: formData.ownerName,
      email: formData.ownerEmail,
      phone: formData.ownerPhone,
      businessName: formData.businessName || null,
      
      // Property Information
      propertyType: this.mapCategoryToPropertyType(formData.category),
      estimatedRooms: parseInt(formData.maxGuests) || 1,
      
      // Location Information
      address: formData.address,
      city: formData.city,
      state: formData.state,
      country: 'India',
      pincode: formData.pincode || null,
      landmark: formData.landmark || null,
      
      // Additional Data
      amenities: formData.amenities || [],
      images: imageObjects,
      notes: `Property Title: ${formData.title}\n\nDescription: ${formData.description}`,
      
      // Frontend Sync Fields
      frontendSubmissionId: submissionId,
      
      // Store additional frontend-specific data
      description: formData.description,
      category: formData.category,
      additionalInfo: {
        title: formData.title,
        propertyDetails: this.getPropertyDetails(formData),
        marketingConsent: formData.marketingConsent
      }
    };
  }

  // Get property details based on category
  getPropertyDetails(formData) {
    switch (formData.category) {
      case 'Hotel Room':
        return {
          hotelRoomTypes: formData.hotelRoomTypes,
          dailyRate: formData.dailyRate
        };
      case 'PG':
        return {
          pgSharingOptions: formData.pgSharingOptions,
          monthlyRate: formData.monthlyRate,
          securityDeposit: formData.securityDeposit,
          noticePeriod: formData.noticePeriod,
          foodIncluded: formData.foodIncluded
        };
      default:
        return {
          propertyType: formData.propertyType,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          dailyRate: formData.dailyRate,
          monthlyRate: formData.monthlyRate
        };
    }
  }

  // Retry logic for API calls
  async withRetry(apiCall, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        console.error(`API call attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff: wait 2^attempt seconds
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Create and export a singleton instance
const leadService = new LeadService();
export default leadService;
import { api } from './api';

export interface SearchResult {
  id: string;
  type: 'property' | 'owner' | 'lead';
}

export interface PropertySearchResult extends SearchResult {
  type: 'property';
  title: string;
  description: string;
  location: any;
  category: string;
  roomType: string;
  price: number;
  roomNumber: string;
  floorNumber: number;
  currentStatus: string;
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  primaryImage: string | null;
}

export interface OwnerSearchResult extends SearchResult {
  type: 'owner';
  name: string;
  email: string;
  phone: string;
  location: any;
  city: string;
  state: string;
  isActive: boolean;
  propertyCount: number;
}

export interface LeadSearchResult extends SearchResult {
  type: 'lead';
  propertyOwnerName: string;
  email: string;
  phone: string;
  businessName: string;
  propertyType: 'hotel' | 'pg';
  city: string;
  state: string;
  status: string;
  estimatedRooms: number;
  agent: {
    id: string;
    name: string;
    email: string;
  } | null;
  territory: {
    id: string;
    name: string;
  } | null;
}

export interface SearchResults {
  properties: {
    count: number;
    data: PropertySearchResult[];
  };
  owners: {
    count: number;
    data: OwnerSearchResult[];
  };
  leads: {
    count: number;
    data: LeadSearchResult[];
  };
}

export interface SearchResponse {
  success: boolean;
  query: string;
  totalResults: number;
  page: number;
  limit: number;
  results: SearchResults;
}

export interface SearchParams {
  query: string;
  type?: 'properties' | 'owners' | 'leads' | 'all';
  page?: number;
  limit?: number;
}

class SearchService {
  /**
   * Perform global search across properties, owners, and leads
   * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
   */
  async search(params: SearchParams): Promise<SearchResponse> {
    const searchParams = new URLSearchParams();
    
    searchParams.append('query', params.query);
    if (params.type) searchParams.append('type', params.type);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const response = await api.get(`/internal/search?${searchParams.toString()}`);
    return response.data;
  }

  /**
   * Search only properties
   */
  async searchProperties(query: string, page = 1, limit = 20): Promise<SearchResponse> {
    return this.search({ query, type: 'properties', page, limit });
  }

  /**
   * Search only property owners
   */
  async searchOwners(query: string, page = 1, limit = 20): Promise<SearchResponse> {
    return this.search({ query, type: 'owners', page, limit });
  }

  /**
   * Search only leads
   */
  async searchLeads(query: string, page = 1, limit = 20): Promise<SearchResponse> {
    return this.search({ query, type: 'leads', page, limit });
  }
}

export const searchService = new SearchService();

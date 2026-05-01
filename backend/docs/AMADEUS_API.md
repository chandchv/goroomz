# Amadeus Hotel API Integration - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Configuration](#configuration)
3. [API Endpoints](#api-endpoints)
4. [Error Codes and Messages](#error-codes-and-messages)
5. [Frontend Integration Guide](#frontend-integration-guide)
6. [Examples](#examples)
7. [Monitoring and Debugging](#monitoring-and-debugging)

## Overview

The Amadeus Hotel API integration extends GoRoomz's accommodation inventory by providing access to Amadeus's global hotel database. The integration supports:

- **Unified Search**: Search across both local properties and Amadeus hotels
- **Flexible Search**: Search by city code or geographic coordinates
- **Advanced Filtering**: Filter by amenities, price, ratings, and more
- **Graceful Degradation**: System continues to work even if Amadeus API is unavailable
- **Comprehensive Caching**: Reduces API calls and improves performance
- **Rate Limiting**: Respects Amadeus API rate limits with exponential backoff

### Architecture

```
Frontend → Backend API → Unified Search Controller
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
            Local Database      Amadeus Service
                                        ↓
                                Amadeus API
```

### Key Features

- **Source Flexibility**: Search local only, Amadeus only, or both
- **Automatic Retry**: Exponential backoff for rate limits and server errors
- **Token Management**: Automatic OAuth2 token acquisition and refresh
- **Data Transformation**: Amadeus data transformed to GoRoomz schema
- **Monitoring**: Built-in metrics and health checks



## Configuration

### Environment Variables

All Amadeus configuration is managed through environment variables. Copy these to your `.env` file:

```bash
# Required - Amadeus API Credentials
AMADEUS_API_KEY=your_api_key_here
AMADEUS_API_SECRET=your_api_secret_here

# Required - Enable/Disable Integration
AMADEUS_ENABLED=true

# Optional - API Configuration
AMADEUS_API_BASE_URL=https://test.api.amadeus.com  # Use https://api.amadeus.com for production

# Optional - Cache TTL (Time To Live) in seconds
AMADEUS_TOKEN_CACHE_TTL=1500        # 25 minutes (tokens valid for 30 min)
AMADEUS_HOTEL_CACHE_TTL=86400       # 24 hours
AMADEUS_SEARCH_CACHE_TTL=300        # 5 minutes

# Optional - Search Defaults
AMADEUS_DEFAULT_RADIUS=5            # Default search radius
AMADEUS_DEFAULT_RADIUS_UNIT=KM      # KM or MILE

# Optional - Rate Limiting
AMADEUS_RATE_LIMIT_PER_SECOND=10    # Max requests per second
```

### Getting Amadeus Credentials

1. **Sign up** at [Amadeus for Developers](https://developers.amadeus.com/)
2. **Create an app** in your dashboard
3. **Copy credentials**: API Key and API Secret
4. **Test environment**: Use test credentials for development
5. **Production**: Request production credentials when ready to go live

### Configuration Validation

The system validates configuration on startup:

**✅ Valid Configuration:**
```
✅ Amadeus integration enabled
   Base URL: https://test.api.amadeus.com
   Default radius: 5 KM
   Cache TTL - Token: 1500s, Hotel: 86400s, Search: 300s
```

**❌ Invalid Configuration (Development):**
```
❌ Failed to initialize Amadeus integration
⚠️  Continuing in development mode without Amadeus integration
```

**❌ Invalid Configuration (Production):**
```
❌ Failed to initialize Amadeus integration
💥 Exiting in production mode due to configuration failure
```

### Disabling Amadeus Integration

To disable Amadeus and use only local properties:

```bash
AMADEUS_ENABLED=false
```

Or simply omit the `AMADEUS_ENABLED` variable.



## API Endpoints

### Unified Search Endpoints

#### 1. Search Hotels

Search for hotels from local database and/or Amadeus API.

**Endpoint:** `GET /api/search/hotels`

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `source` | string | No | Search source: `all`, `local`, or `amadeus` | `all` (default) |
| `cityCode` | string | No* | 3-letter IATA city code | `DEL`, `BLR`, `PAR` |
| `latitude` | number | No* | Latitude for geocode search (-90 to 90) | `28.6139` |
| `longitude` | number | No* | Longitude for geocode search (-180 to 180) | `77.2090` |
| `radius` | number | No | Search radius | `5` (default) |
| `radiusUnit` | string | No | Radius unit: `KM` or `MILE` | `KM` (default) |
| `amenities` | string | No | Comma-separated amenity codes | `wifi,parking,gym` |
| `ratings` | string | No | Comma-separated rating values | `4,5` |
| `chainCodes` | string | No | Comma-separated hotel chain codes (Amadeus only) | `AC,HI` |
| `minPrice` | number | No | Minimum price filter | `1000` |
| `maxPrice` | number | No | Maximum price filter | `5000` |
| `type` | string | No | Property type filter (local only) | `hotel`, `pg` |
| `gender` | string | No | Gender preference (local PGs only) | `male`, `female`, `unisex` |
| `search` | string | No | Text search query | `luxury hotel` |
| `page` | number | No | Page number | `1` (default) |
| `limit` | number | No | Results per page (max 100) | `20` (default) |
| `sortBy` | string | No | Sort field: `distance`, `price`, `rating`, `name` | `name` (default) |
| `sortOrder` | string | No | Sort order: `asc` or `desc` | `asc` (default) |

*Note: Either `cityCode` OR (`latitude` AND `longitude`) is required for Amadeus search.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "amadeus_DELDEL01",
      "name": "The Grand Hotel",
      "source": "amadeus",
      "isExternal": true,
      "location": {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "address": "123 Main Street, New Delhi, India",
        "city": "New Delhi",
        "country": "India",
        "countryCode": "IN"
      },
      "amenities": ["wifi", "parking", "gym", "pool"],
      "price": 3500,
      "rating": 4.5,
      "metadata": {
        "chainCode": "AC",
        "cityCode": "DEL",
        "distance": {
          "value": 2.5,
          "unit": "KM"
        }
      }
    }
  ],
  "meta": {
    "total": 45,
    "localCount": 20,
    "amadeusCount": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  },
  "warnings": {
    "amadeus": null
  }
}
```



#### 2. Get Hotel Details

Get detailed information about a specific hotel.

**Endpoint:** `GET /api/search/hotels/:id`

**Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `id` | string | Yes | Hotel ID (UUID for local, 8-char code for Amadeus) | `DELDEL01` or `550e8400-e29b-41d4-a716-446655440000` |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "amadeus_DELDEL01",
    "name": "The Grand Hotel",
    "source": "amadeus",
    "isExternal": true,
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "address": "123 Main Street, New Delhi, India",
      "city": "New Delhi",
      "country": "India",
      "countryCode": "IN"
    },
    "amenities": ["wifi", "parking", "gym", "pool"],
    "description": "Luxury hotel in the heart of New Delhi",
    "images": [],
    "metadata": {
      "chainCode": "AC",
      "cityCode": "DEL",
      "dupeId": 700140792
    }
  }
}
```

### Amadeus Monitoring Endpoints

#### 3. Health Check

Check the health status of Amadeus integration.

**Endpoint:** `GET /api/amadeus/health`

**Response:**

```json
{
  "success": true,
  "status": "healthy",
  "lastRequestTime": "2026-01-10T10:30:00.000Z",
  "requestCount": 1234,
  "errorRate": 0.02,
  "timestamp": "2026-01-10T10:35:00.000Z"
}
```

**Status Values:**
- `healthy`: Integration is working normally
- `degraded`: Some errors but still functional
- `unhealthy`: Integration is not working
- `disabled`: Integration is disabled in configuration

#### 4. Metrics

Get detailed metrics about Amadeus API usage.

**Endpoint:** `GET /api/amadeus/metrics`

**Response:**

```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalRequests": 1234,
      "successfulRequests": 1210,
      "failedRequests": 24,
      "averageResponseTime": 450,
      "cacheHitRate": 0.65,
      "errorsByType": {
        "RATE_LIMIT_EXCEEDED": 5,
        "TIMEOUT": 10,
        "SERVER_ERROR": 9
      }
    },
    "configuration": {
      "enabled": true,
      "baseUrl": "https://test.api.amadeus.com",
      "defaultRadius": 5,
      "defaultRadiusUnit": "KM",
      "cacheEnabled": true
    },
    "timestamp": "2026-01-10T10:35:00.000Z"
  }
}
```

#### 5. Configuration Summary

Get current Amadeus configuration (credentials redacted).

**Endpoint:** `GET /api/amadeus/config`

**Response:**

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "baseUrl": "https://test.api.amadeus.com",
    "defaultRadius": 5,
    "defaultRadiusUnit": "KM",
    "cacheTTL": {
      "token": 1500,
      "hotel": 86400,
      "search": 300
    },
    "rateLimit": {
      "perSecond": 10
    }
  }
}
```

#### 6. Request Log

Get recent Amadeus API requests (for debugging).

**Endpoint:** `GET /api/amadeus/requests`

**Query Parameters:**

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `limit` | number | No | Number of requests to return | 50 |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2026-01-10T10:30:00.000Z",
      "endpoint": "/v1/reference-data/locations/hotels/by-city",
      "params": { "cityCode": "DEL" },
      "status": 200,
      "responseTime": 450,
      "cached": false
    }
  ]
}
```

#### 7. Clear Request Log

Clear the request log (admin only).

**Endpoint:** `POST /api/amadeus/clear-log`

**Response:**

```json
{
  "success": true,
  "message": "Request log cleared"
}
```



## Error Codes and Messages

### HTTP Status Codes

| Status Code | Error Code | User-Friendly Message | Description |
|-------------|------------|----------------------|-------------|
| 400 | `BAD_REQUEST` | Invalid search parameters provided | Client sent invalid parameters |
| 401 | `UNAUTHORIZED` | Authentication failed with hotel search service | Invalid or expired credentials |
| 403 | `FORBIDDEN` | Access denied to hotel search service | Insufficient permissions |
| 404 | `NOT_FOUND` | Hotel not found | Requested hotel does not exist |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests. Please try again later | Rate limit exceeded |
| 500 | `INTERNAL_SERVER_ERROR` | Hotel search service is temporarily unavailable | Server error |
| 502 | `BAD_GATEWAY` | Hotel search service is experiencing issues | Gateway error |
| 503 | `SERVICE_UNAVAILABLE` | Hotel search service is under maintenance | Service unavailable |
| 504 | `GATEWAY_TIMEOUT` | Hotel search service request timed out | Gateway timeout |

### Custom Error Codes

| Error Code | Description | Retry Behavior |
|------------|-------------|----------------|
| `AUTH_FAILED` | Authentication failed after retry | No automatic retry |
| `RATE_LIMIT_RETRY_FAILED` | Rate limit exceeded, max retries reached | No automatic retry |
| `SERVER_ERROR_RETRY_FAILED` | Server error, max retries reached | No automatic retry |
| `TIMEOUT` | Request timed out after retry | No automatic retry |
| `UNKNOWN_ERROR` | Unclassified error | No automatic retry |
| `AMADEUS_DISABLED` | Amadeus integration is disabled | N/A |
| `AMADEUS_UNAVAILABLE` | Amadeus service is unavailable | Graceful degradation |

### Error Response Format

All errors follow this consistent format:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later",
    "statusCode": 429,
    "details": {
      "errors": [
        {
          "status": 429,
          "code": 38194,
          "title": "Rate limit exceeded"
        }
      ]
    }
  }
}
```

### Retry Logic

The system implements automatic retry with exponential backoff for certain errors:

#### Rate Limit Errors (429)
- **Retry**: Yes, up to 3 times
- **Backoff**: Exponential (1s, 2s, 4s, 8s)
- **Respects**: `Retry-After` header from Amadeus
- **Max Delay**: 60 seconds

#### Server Errors (500-599)
- **Retry**: Yes, up to 3 times
- **Backoff**: Exponential (1s, 2s, 4s, 8s)
- **Max Delay**: 60 seconds

#### Authentication Errors (401, 403)
- **Retry**: Yes, once after clearing token cache
- **Backoff**: None (immediate retry)

#### Timeout Errors
- **Retry**: Yes, once
- **Backoff**: None (immediate retry)

#### Client Errors (400, 404)
- **Retry**: No
- **Reason**: Client errors won't be fixed by retrying

### Graceful Degradation

When Amadeus API is unavailable, the system gracefully degrades:

1. **Unified Search (`source=all`)**:
   - Returns local properties only
   - Includes warning in response:
   ```json
   {
     "success": true,
     "data": [...],
     "warnings": {
       "amadeus": "Amadeus service is temporarily unavailable"
     }
   }
   ```

2. **Amadeus-Only Search (`source=amadeus`)**:
   - Returns error response
   - Suggests trying local search

3. **Hotel Details**:
   - Local properties: Works normally
   - Amadeus hotels: Returns error



## Frontend Integration Guide

### Overview

This guide helps frontend developers integrate with the Amadeus-enabled unified search API.

### Key Concepts

1. **Source Indicator**: Every property has a `source` field (`local` or `amadeus`)
2. **External Flag**: `isExternal` boolean indicates if property is from external API
3. **ID Format**: 
   - Local: UUID format (e.g., `550e8400-e29b-41d4-a716-446655440000`)
   - Amadeus: 8-character code, optionally prefixed (e.g., `DELDEL01` or `amadeus_DELDEL01`)
4. **Graceful Degradation**: API may return partial results with warnings

### TypeScript Interfaces

```typescript
// Property source type
type PropertySource = 'local' | 'amadeus';

// Unified property interface
interface UnifiedProperty {
  id: string;
  name: string;
  source: PropertySource;
  isExternal: boolean;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    country: string;
    countryCode: string;
  };
  amenities: string[];
  price?: number;
  rating?: number;
  description?: string;
  images?: string[];
  metadata?: {
    chainCode?: string;
    cityCode?: string;
    dupeId?: number;
    distance?: {
      value: number;
      unit: 'KM' | 'MILE';
    };
  };
}

// Search response interface
interface SearchResponse {
  success: boolean;
  data: UnifiedProperty[];
  meta: {
    total: number;
    localCount: number;
    amadeusCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  warnings?: {
    amadeus?: string;
    local?: string;
  };
}

// Error response interface
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode?: number;
    details?: any;
  };
}
```

### API Service Implementation

```typescript
// api/searchService.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export class SearchService {
  /**
   * Search hotels with unified search
   */
  async searchHotels(params: {
    source?: 'all' | 'local' | 'amadeus';
    cityCode?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    radiusUnit?: 'KM' | 'MILE';
    amenities?: string[];
    ratings?: number[];
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
    sortBy?: 'distance' | 'price' | 'rating' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Promise<SearchResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      // Add all parameters to query string
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            queryParams.append(key, value.join(','));
          } else {
            queryParams.append(key, String(value));
          }
        }
      });

      const response = await axios.get(
        `${API_BASE_URL}/api/search/hotels?${queryParams.toString()}`
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw error.response.data;
      }
      throw error;
    }
  }

  /**
   * Get hotel details by ID
   */
  async getHotelDetails(id: string): Promise<{ success: boolean; data: UnifiedProperty }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/search/hotels/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw error.response.data;
      }
      throw error;
    }
  }

  /**
   * Check if property is from Amadeus
   */
  isAmadeusProperty(property: UnifiedProperty): boolean {
    return property.source === 'amadeus' || property.isExternal;
  }

  /**
   * Check if property is local
   */
  isLocalProperty(property: UnifiedProperty): boolean {
    return property.source === 'local' && !property.isExternal;
  }
}

export const searchService = new SearchService();
```



### React Component Example

```typescript
// components/HotelSearch.tsx
import React, { useState, useEffect } from 'react';
import { searchService } from '../api/searchService';
import type { UnifiedProperty, SearchResponse } from '../types';

export const HotelSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useState({
    cityCode: 'DEL',
    source: 'all' as const,
    page: 1,
    limit: 20
  });
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await searchService.searchHotels(searchParams);
      setResults(response);

      // Show warning if Amadeus is unavailable
      if (response.warnings?.amadeus) {
        console.warn('Amadeus warning:', response.warnings.amadeus);
        // Optionally show a toast notification to user
      }
    } catch (err: any) {
      setError(err.error?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [searchParams.page]);

  return (
    <div className="hotel-search">
      {/* Search filters */}
      <div className="search-filters">
        <select
          value={searchParams.source}
          onChange={(e) => setSearchParams({ ...searchParams, source: e.target.value as any })}
        >
          <option value="all">All Sources</option>
          <option value="local">Local Only</option>
          <option value="amadeus">Amadeus Only</option>
        </select>

        <input
          type="text"
          placeholder="City Code (e.g., DEL)"
          value={searchParams.cityCode}
          onChange={(e) => setSearchParams({ ...searchParams, cityCode: e.target.value })}
        />

        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="search-results">
          <div className="results-meta">
            <p>
              Found {results.meta.total} hotels
              ({results.meta.localCount} local, {results.meta.amadeusCount} Amadeus)
            </p>
          </div>

          <div className="results-grid">
            {results.data.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button
              disabled={searchParams.page === 1}
              onClick={() => setSearchParams({ ...searchParams, page: searchParams.page - 1 })}
            >
              Previous
            </button>
            <span>Page {searchParams.page} of {results.meta.totalPages}</span>
            <button
              disabled={searchParams.page >= results.meta.totalPages}
              onClick={() => setSearchParams({ ...searchParams, page: searchParams.page + 1 })}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Property card component
const PropertyCard: React.FC<{ property: UnifiedProperty }> = ({ property }) => {
  const isExternal = searchService.isAmadeusProperty(property);

  return (
    <div className={`property-card ${isExternal ? 'external' : 'local'}`}>
      <div className="property-header">
        <h3>{property.name}</h3>
        <span className={`source-badge ${property.source}`}>
          {property.source === 'amadeus' ? '🌍 Amadeus' : '🏠 Local'}
        </span>
      </div>

      <div className="property-location">
        📍 {property.location.city}, {property.location.country}
        {property.metadata?.distance && (
          <span className="distance">
            {' '}({property.metadata.distance.value} {property.metadata.distance.unit})
          </span>
        )}
      </div>

      {property.price && (
        <div className="property-price">
          ₹{property.price.toLocaleString()}
        </div>
      )}

      {property.rating && (
        <div className="property-rating">
          ⭐ {property.rating}/5
        </div>
      )}

      <div className="property-amenities">
        {property.amenities.slice(0, 3).map((amenity) => (
          <span key={amenity} className="amenity-tag">
            {amenity}
          </span>
        ))}
        {property.amenities.length > 3 && (
          <span className="amenity-more">
            +{property.amenities.length - 3} more
          </span>
        )}
      </div>

      <button
        className="view-details-btn"
        onClick={() => window.location.href = `/hotels/${property.id}`}
      >
        View Details
      </button>
    </div>
  );
};
```



### Error Handling Best Practices

```typescript
// utils/errorHandler.ts
import type { ErrorResponse } from '../types';

export class APIError extends Error {
  code: string;
  statusCode?: number;
  details?: any;

  constructor(errorResponse: ErrorResponse['error']) {
    super(errorResponse.message);
    this.code = errorResponse.code;
    this.statusCode = errorResponse.statusCode;
    this.details = errorResponse.details;
  }
}

export function handleSearchError(error: any): string {
  if (error instanceof APIError) {
    // Handle specific error codes
    switch (error.code) {
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many searches. Please wait a moment and try again.';
      
      case 'BAD_REQUEST':
        return 'Invalid search parameters. Please check your input.';
      
      case 'AMADEUS_UNAVAILABLE':
        return 'External hotel search is temporarily unavailable. Showing local results only.';
      
      case 'TIMEOUT':
        return 'Search is taking longer than expected. Please try again.';
      
      default:
        return error.message || 'An error occurred while searching.';
    }
  }

  return 'An unexpected error occurred. Please try again.';
}

// Usage in component
try {
  const response = await searchService.searchHotels(params);
  setResults(response);
} catch (err) {
  const errorMessage = handleSearchError(err);
  setError(errorMessage);
  // Optionally log to error tracking service
  console.error('Search error:', err);
}
```

### UI/UX Recommendations

1. **Source Indicator**:
   - Clearly show which properties are from Amadeus vs local
   - Use badges or icons to differentiate
   - Consider different styling for external properties

2. **Loading States**:
   - Show loading indicator during search
   - Consider skeleton screens for better UX
   - Indicate when results are being fetched from cache

3. **Error Handling**:
   - Display user-friendly error messages
   - Provide retry buttons for transient errors
   - Show partial results when one source fails

4. **Warnings**:
   - Display warnings when Amadeus is unavailable
   - Inform users they're seeing local results only
   - Use non-intrusive notifications (toast, banner)

5. **Filtering**:
   - Allow users to filter by source
   - Show count of results from each source
   - Maintain filter state in URL for sharing

6. **Performance**:
   - Implement debouncing for search input
   - Use pagination to limit results per page
   - Cache search results on client side
   - Show cached results immediately while fetching fresh data

### Testing Frontend Integration

```typescript
// __tests__/searchService.test.ts
import { searchService } from '../api/searchService';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SearchService', () => {
  it('should search hotels successfully', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: [
          {
            id: 'amadeus_DELDEL01',
            name: 'Test Hotel',
            source: 'amadeus',
            isExternal: true,
            location: { /* ... */ },
            amenities: ['wifi']
          }
        ],
        meta: {
          total: 1,
          localCount: 0,
          amadeusCount: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        }
      }
    };

    mockedAxios.get.mockResolvedValue(mockResponse);

    const result = await searchService.searchHotels({ cityCode: 'DEL' });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].source).toBe('amadeus');
  });

  it('should handle errors gracefully', async () => {
    const mockError = {
      response: {
        data: {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests'
          }
        }
      }
    };

    mockedAxios.get.mockRejectedValue(mockError);

    await expect(
      searchService.searchHotels({ cityCode: 'DEL' })
    ).rejects.toMatchObject({
      error: {
        code: 'RATE_LIMIT_EXCEEDED'
      }
    });
  });

  it('should identify Amadeus properties correctly', () => {
    const amadeusProperty = {
      id: 'amadeus_DELDEL01',
      source: 'amadeus' as const,
      isExternal: true,
      /* ... */
    };

    expect(searchService.isAmadeusProperty(amadeusProperty)).toBe(true);
    expect(searchService.isLocalProperty(amadeusProperty)).toBe(false);
  });
});
```



## Examples

### Example 1: Search All Hotels in Delhi

**Request:**
```bash
curl -X GET "http://localhost:5000/api/search/hotels?cityCode=DEL&radius=10&sortBy=price&sortOrder=asc"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "local-uuid-123",
      "name": "Budget PG Near Metro",
      "source": "local",
      "isExternal": false,
      "location": {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "address": "Sector 15, Rohini, New Delhi",
        "city": "New Delhi",
        "country": "India",
        "countryCode": "IN"
      },
      "amenities": ["wifi", "parking"],
      "price": 5000,
      "rating": 4.0
    },
    {
      "id": "amadeus_DELDEL01",
      "name": "The Grand Hotel",
      "source": "amadeus",
      "isExternal": true,
      "location": {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "address": "Connaught Place, New Delhi",
        "city": "New Delhi",
        "country": "India",
        "countryCode": "IN"
      },
      "amenities": ["wifi", "parking", "gym", "pool"],
      "price": 8000,
      "rating": 4.5,
      "metadata": {
        "chainCode": "AC",
        "cityCode": "DEL",
        "distance": {
          "value": 2.5,
          "unit": "KM"
        }
      }
    }
  ],
  "meta": {
    "total": 2,
    "localCount": 1,
    "amadeusCount": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### Example 2: Search Only Amadeus Hotels by Coordinates

**Request:**
```bash
curl -X GET "http://localhost:5000/api/search/hotels?source=amadeus&latitude=28.6139&longitude=77.2090&radius=5&radiusUnit=KM"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "amadeus_DELDEL01",
      "name": "The Grand Hotel",
      "source": "amadeus",
      "isExternal": true,
      "location": { /* ... */ },
      "metadata": {
        "distance": {
          "value": 2.5,
          "unit": "KM"
        }
      }
    }
  ],
  "meta": {
    "total": 1,
    "localCount": 0,
    "amadeusCount": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### Example 3: Search with Filters

**Request:**
```bash
curl -X GET "http://localhost:5000/api/search/hotels?cityCode=BLR&amenities=wifi,parking&minPrice=2000&maxPrice=5000&ratings=4,5&page=1&limit=10"
```

**Response:**
```json
{
  "success": true,
  "data": [
    /* Filtered results with wifi, parking, price 2000-5000, ratings 4-5 */
  ],
  "meta": {
    "total": 15,
    "localCount": 8,
    "amadeusCount": 7,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

### Example 4: Get Hotel Details

**Request (Local Property):**
```bash
curl -X GET "http://localhost:5000/api/search/hotels/550e8400-e29b-41d4-a716-446655440000"
```

**Request (Amadeus Property):**
```bash
curl -X GET "http://localhost:5000/api/search/hotels/DELDEL01"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "amadeus_DELDEL01",
    "name": "The Grand Hotel",
    "source": "amadeus",
    "isExternal": true,
    "location": { /* ... */ },
    "amenities": ["wifi", "parking", "gym", "pool"],
    "description": "Luxury hotel in the heart of New Delhi",
    "images": [],
    "metadata": {
      "chainCode": "AC",
      "cityCode": "DEL",
      "dupeId": 700140792
    }
  }
}
```

### Example 5: Error Response

**Request:**
```bash
curl -X GET "http://localhost:5000/api/search/hotels?cityCode=INVALID"
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid search parameters provided",
    "statusCode": 400,
    "details": {
      "errors": [
        {
          "status": 400,
          "code": 477,
          "title": "INVALID FORMAT",
          "detail": "City code must be 3 letters"
        }
      ]
    }
  }
}
```

### Example 6: Graceful Degradation (Amadeus Unavailable)

**Request:**
```bash
curl -X GET "http://localhost:5000/api/search/hotels?source=all&cityCode=DEL"
```

**Response (when Amadeus is down):**
```json
{
  "success": true,
  "data": [
    /* Only local properties */
  ],
  "meta": {
    "total": 10,
    "localCount": 10,
    "amadeusCount": 0,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  },
  "warnings": {
    "amadeus": "Amadeus service is temporarily unavailable. Showing local results only."
  }
}
```



## Monitoring and Debugging

### Health Monitoring

Check integration health regularly:

```bash
# Health check
curl http://localhost:5000/api/amadeus/health

# Detailed metrics
curl http://localhost:5000/api/amadeus/metrics
```

### Interpreting Metrics

**Key Metrics to Monitor:**

1. **Error Rate**: Should be < 5%
   - High error rate indicates API issues or configuration problems
   - Check error types in `errorsByType`

2. **Cache Hit Rate**: Should be > 50%
   - Low cache hit rate means inefficient caching
   - Consider increasing cache TTL values

3. **Average Response Time**: Should be < 1000ms
   - High response times indicate network or API performance issues
   - Check if rate limiting is causing delays

4. **Request Count**: Monitor for unusual spikes
   - Sudden increases may indicate abuse or bugs
   - Implement rate limiting on client side if needed

### Debugging Common Issues

#### Issue 1: "Authentication failed"

**Symptoms:**
- Error code: `AUTH_FAILED` or `UNAUTHORIZED`
- Status code: 401

**Solutions:**
1. Verify API credentials in `.env` file
2. Check if credentials are for correct environment (test vs production)
3. Ensure credentials haven't expired
4. Clear token cache: `POST /api/amadeus/clear-cache`

#### Issue 2: "Rate limit exceeded"

**Symptoms:**
- Error code: `RATE_LIMIT_EXCEEDED`
- Status code: 429

**Solutions:**
1. Reduce request frequency
2. Implement client-side rate limiting
3. Increase cache TTL to reduce API calls
4. Wait for rate limit to reset (check `Retry-After` header)

#### Issue 3: "No results from Amadeus"

**Symptoms:**
- `amadeusCount: 0` in response
- Warning message about Amadeus unavailability

**Solutions:**
1. Check health endpoint: `GET /api/amadeus/health`
2. Verify Amadeus is enabled: `AMADEUS_ENABLED=true`
3. Check API credentials are valid
4. Review request log: `GET /api/amadeus/requests`
5. Check network connectivity to Amadeus API

#### Issue 4: "Slow search responses"

**Symptoms:**
- Response times > 2 seconds
- Timeout errors

**Solutions:**
1. Check cache hit rate (should be > 50%)
2. Reduce search radius to limit results
3. Implement pagination with smaller page sizes
4. Check network latency to Amadeus API
5. Consider implementing request timeout on client side

#### Issue 5: "Invalid coordinates"

**Symptoms:**
- Error code: `BAD_REQUEST`
- Message about invalid latitude/longitude

**Solutions:**
1. Ensure latitude is between -90 and 90
2. Ensure longitude is between -180 and 180
3. Verify coordinate format (decimal degrees, not DMS)
4. Check for null or undefined values

### Logging

The system logs all Amadeus interactions. Check logs for:

**Successful Requests:**
```
[INFO] Amadeus API Request: GET /v1/reference-data/locations/hotels/by-city
[INFO] Amadeus API Response: 200 OK (450ms)
```

**Failed Requests:**
```
[ERROR] Amadeus API Error: {
  message: "Rate limit exceeded",
  statusCode: 429,
  endpoint: "/v1/reference-data/locations/hotels/by-city",
  params: { cityCode: "DEL" },
  retryCount: 3
}
```

**Authentication Events:**
```
[INFO] Amadeus token acquired successfully
[INFO] Amadeus token refreshed (expired)
[WARN] Amadeus authentication failed, retrying
```

### Performance Optimization

1. **Enable Caching**:
   - Set appropriate TTL values
   - Monitor cache hit rate
   - Clear cache if stale data is an issue

2. **Reduce API Calls**:
   - Use unified search (`source=all`) instead of separate calls
   - Implement client-side caching
   - Batch hotel details requests when possible

3. **Optimize Search Parameters**:
   - Use smaller search radius when possible
   - Limit results per page (20-50 recommended)
   - Use specific filters to reduce result set

4. **Implement Rate Limiting**:
   - Add client-side rate limiting
   - Queue requests during high traffic
   - Use exponential backoff for retries

### Troubleshooting Checklist

- [ ] Verify environment variables are set correctly
- [ ] Check API credentials are valid
- [ ] Confirm Amadeus integration is enabled
- [ ] Test health endpoint
- [ ] Review metrics for anomalies
- [ ] Check request log for errors
- [ ] Verify network connectivity
- [ ] Test with different search parameters
- [ ] Check cache configuration
- [ ] Review application logs

### Support and Resources

- **Amadeus Developer Portal**: https://developers.amadeus.com/
- **API Documentation**: https://developers.amadeus.com/self-service/category/hotels
- **Support**: Contact Amadeus support through developer portal
- **Status Page**: Check Amadeus API status for outages

---

## Appendix

### Amadeus Hotel Chain Codes

Common hotel chain codes for filtering:

| Code | Chain Name |
|------|------------|
| AC | Accor Hotels |
| HI | Hilton Hotels |
| IH | InterContinental Hotels Group |
| MA | Marriott Hotels |
| HY | Hyatt Hotels |
| WY | Wyndham Hotels |
| CH | Choice Hotels |
| BW | Best Western |

### IATA City Codes (India)

Common Indian city codes:

| Code | City |
|------|------|
| DEL | New Delhi |
| BLR | Bangalore |
| BOM | Mumbai |
| MAA | Chennai |
| HYD | Hyderabad |
| CCU | Kolkata |
| PNQ | Pune |
| AMD | Ahmedabad |
| GOI | Goa |
| JAI | Jaipur |

### Amenity Codes

Standard amenity codes used in the system:

- `wifi` - WiFi/Internet
- `parking` - Parking
- `gym` - Fitness Center
- `pool` - Swimming Pool
- `restaurant` - Restaurant
- `bar` - Bar/Lounge
- `spa` - Spa
- `ac` - Air Conditioning
- `tv` - Television
- `laundry` - Laundry Service

---

**Document Version**: 1.0  
**Last Updated**: January 10, 2026  
**Maintained By**: GoRoomz Backend Team


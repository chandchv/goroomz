# GoRoomz Backend API

Node.js/Express API server for the GoRoomz platform.

## Tech Stack
- Node.js
- Express.js
- Sequelize ORM
- PostgreSQL
- JWT Authentication
- Firebase Admin

## Development

```bash
npm install
npm start
```

## Database Setup

1. Install PostgreSQL
2. Create database
3. Run migrations:
```bash
npm run migrate
```

4. Seed data:
```bash
npm run seed
```

## Environment Variables

Copy `.env.example` to `.env` and configure:
- Database connection
- JWT secrets
- Firebase admin config
- Email service config
- Amadeus API credentials (optional)

### Amadeus Integration Configuration

The backend supports integration with Amadeus Hotel API for accessing global hotel inventory. This is optional and can be enabled/disabled via environment variables.

**📚 Complete Documentation:**
- **Quick Start**: See `docs/AMADEUS_QUICK_START.md` for 5-minute setup
- **Full API Documentation**: See `docs/AMADEUS_API.md` for complete reference
- **Frontend Integration Guide**: Included in `docs/AMADEUS_API.md`

**Required Environment Variables:**
```bash
# Amadeus API Credentials
AMADEUS_API_KEY=your_api_key_here
AMADEUS_API_SECRET=your_api_secret_here

# Enable/Disable Integration
AMADEUS_ENABLED=true

# API Base URL (test or production)
AMADEUS_API_BASE_URL=https://test.api.amadeus.com

# Cache TTL (Time To Live) in seconds
AMADEUS_TOKEN_CACHE_TTL=1500        # 25 minutes
AMADEUS_HOTEL_CACHE_TTL=86400       # 24 hours
AMADEUS_SEARCH_CACHE_TTL=300        # 5 minutes

# Search Defaults
AMADEUS_DEFAULT_RADIUS=5            # Default search radius
AMADEUS_DEFAULT_RADIUS_UNIT=KM      # KM or MILE

# Rate Limiting
AMADEUS_RATE_LIMIT_PER_SECOND=10    # Max requests per second
```

**Getting Amadeus Credentials:**
1. Sign up for Amadeus Self-Service API at https://developers.amadeus.com/
2. Create a new app in the dashboard
3. Copy your API Key and API Secret
4. Use test credentials for development, production credentials for live deployment

**Disabling Amadeus Integration:**
Set `AMADEUS_ENABLED=false` or omit the environment variable. The system will continue to work with local properties only.

## API Endpoints

### Authentication & Users
- `/api/auth` - Authentication
- `/api/users` - User management

### Properties & Bookings
- `/api/properties` - Property management
- `/api/bookings` - Booking system
- `/api/rooms` - Room management

### Unified Search (Local + Amadeus)
- `/api/search/hotels` - Search hotels from both local and Amadeus sources
- `/api/search/hotels/:id` - Get hotel details by ID (supports both local UUID and Amadeus hotel ID)

### Amadeus Monitoring
- `/api/amadeus/health` - Health check for Amadeus integration
- `/api/amadeus/metrics` - API usage metrics and statistics
- `/api/amadeus/config` - Configuration summary
- `/api/amadeus/requests` - Recent request log

### Internal Management
- `/api/internal` - Internal management APIs

## Unified Search API

The unified search API combines results from local properties and Amadeus hotels, providing a seamless search experience across both sources.

### Search Hotels

**Endpoint:** `GET /api/search/hotels`

**Query Parameters:**
- `source` (optional) - Search source: `all` (default), `local`, or `amadeus`
- `cityCode` (optional) - 3-letter IATA city code (e.g., `DEL` for Delhi)
- `latitude` (optional) - Latitude for geocode search (-90 to 90)
- `longitude` (optional) - Longitude for geocode search (-180 to 180)
- `radius` (optional) - Search radius (default: 5)
- `radiusUnit` (optional) - Radius unit: `KM` or `MILE` (default: `KM`)
- `amenities` (optional) - Comma-separated amenity codes
- `ratings` (optional) - Comma-separated rating values
- `chainCodes` (optional) - Comma-separated hotel chain codes (Amadeus only)
- `minPrice` (optional) - Minimum price filter
- `maxPrice` (optional) - Maximum price filter
- `type` (optional) - Property type filter (local only)
- `gender` (optional) - Gender preference filter (local PGs only)
- `search` (optional) - Text search query
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Results per page (default: 20, max: 100)
- `sortBy` (optional) - Sort field: `distance`, `price`, `rating`, or `name` (default: `name`)
- `sortOrder` (optional) - Sort order: `asc` or `desc` (default: `asc`)

**Example Request:**
```bash
# Search all sources in Delhi
GET /api/search/hotels?cityCode=DEL&radius=10&sortBy=price&sortOrder=asc

# Search only Amadeus hotels by coordinates
GET /api/search/hotels?source=amadeus&latitude=28.6139&longitude=77.2090&radius=5

# Search with filters
GET /api/search/hotels?cityCode=BLR&amenities=wifi,parking&minPrice=1000&maxPrice=5000
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-or-amadeus-id",
      "name": "Hotel Name",
      "source": "local|amadeus",
      "isExternal": false|true,
      "location": { ... },
      "amenities": [...],
      "price": 2500,
      "rating": 4.5
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
    "amadeus": "Rate limit exceeded"
  }
}
```

### Get Hotel Details

**Endpoint:** `GET /api/search/hotels/:id`

**Parameters:**
- `id` - Hotel ID (UUID for local properties, 8-character code for Amadeus hotels)

**Example Request:**
```bash
# Get local property details
GET /api/search/hotels/550e8400-e29b-41d4-a716-446655440000

# Get Amadeus hotel details
GET /api/search/hotels/DELDEL01
GET /api/search/hotels/amadeus_DELDEL01
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "DELDEL01",
    "name": "Hotel Name",
    "source": "amadeus",
    "isExternal": true,
    "location": { ... },
    "amenities": [...],
    "description": "..."
  }
}
```

### Graceful Degradation

The unified search API implements graceful degradation:
- If Amadeus API fails, local results are still returned
- If local database fails, Amadeus results are still returned
- Partial failures are indicated in the `warnings` field
- The system continues to function even if one source is unavailable

### Monitoring Amadeus Integration

**Health Check:**
```bash
GET /api/amadeus/health
```

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

**Metrics:**
```bash
GET /api/amadeus/metrics
```

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
      "cacheHitRate": 0.65
    },
    "configuration": {
      "enabled": true,
      "baseUrl": "https://test.api.amadeus.com",
      "defaultRadius": 5,
      "defaultRadiusUnit": "KM"
    },
    "timestamp": "2026-01-10T10:35:00.000Z"
  }
}
```

## Testing

```bash
npm test
```
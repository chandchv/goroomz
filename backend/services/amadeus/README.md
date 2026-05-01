# Amadeus Hotel API Integration

This directory contains the implementation of the Amadeus Hotel API integration for GoRoomz.

## Overview

The Amadeus integration enables GoRoomz to search and display hotels from Amadeus's global inventory alongside existing local properties, providing users with a wider range of accommodation options.

## Directory Structure

```
services/amadeus/
├── config.js           # Configuration management and validation
└── README.md          # This file
```

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Amadeus API Configuration
AMADEUS_API_KEY=your-amadeus-api-key
AMADEUS_API_SECRET=your-amadeus-api-secret
AMADEUS_API_BASE_URL=https://test.api.amadeus.com
AMADEUS_TOKEN_CACHE_TTL=1500
AMADEUS_HOTEL_CACHE_TTL=86400
AMADEUS_SEARCH_CACHE_TTL=300
AMADEUS_ENABLED=true
AMADEUS_DEFAULT_RADIUS=5
AMADEUS_DEFAULT_RADIUS_UNIT=KM
AMADEUS_RATE_LIMIT_PER_SECOND=10
```

### Configuration Module

The `config.js` module provides:

- **Credential Management**: Securely loads API credentials from environment variables
- **Validation**: Validates all configuration values on startup
- **URL Generation**: Provides methods to generate API endpoint URLs
- **Feature Flags**: Supports enabling/disabling the integration
- **Singleton Pattern**: Ensures single configuration instance across the application

#### Usage

```javascript
const { getConfig } = require('./services/amadeus/config');

const config = getConfig();

if (config.isEnabled()) {
  const tokenUrl = config.getTokenUrl();
  // Make API calls...
}
```

## Cache Manager

A utility cache manager is provided in `utils/cacheManager.js` for caching API tokens and responses.

### Features

- **TTL Support**: Automatic expiration of cached values
- **Statistics Tracking**: Tracks hits, misses, and hit rate
- **Multiple Operations**: Batch get/set operations
- **Type Support**: Caches strings, numbers, objects, arrays, and booleans

### Usage

```javascript
const { getGlobalCache } = require('./utils/cacheManager');

const cache = getGlobalCache();

// Set with TTL
cache.set('key', 'value', 3600); // 1 hour

// Get value
const value = cache.get('key');

// Check statistics
const stats = cache.getStats();
console.log(`Hit rate: ${stats.hitRate}`);
```

## Testing

### Running Tests

```bash
# Run all Amadeus tests
npm test -- __tests__/services/amadeusConfig.test.js

# Run cache manager tests
npm test -- __tests__/utils/cacheManager.test.js
```

### Test Coverage

- **Configuration Validation**: 30 tests covering all validation scenarios
- **Cache Manager**: 34 tests covering all cache operations

## Next Steps

The following components will be implemented in subsequent tasks:

1. **Authentication Manager**: OAuth2 token management
2. **Amadeus Service**: Core API integration
3. **Data Transformer**: Response transformation to GoRoomz schema
4. **Error Handler**: Comprehensive error handling and retry logic
5. **Unified Search**: Combined search across local and Amadeus sources

## Requirements Validated

This implementation validates the following requirements:

- **1.1**: Store Amadeus API credentials in environment variables ✓
- **1.2**: Validate credentials on startup ✓
- **12.1**: Support configuration for API base URL ✓
- **12.2**: Support configuration for default search radius ✓
- **12.3**: Support configuration for cache TTL values ✓
- **12.4**: Support configuration for rate limit thresholds ✓
- **12.5**: Support enabling/disabling integration ✓
- **12.6**: Validate all configuration values on startup ✓

## Dependencies

- `axios`: HTTP client for API requests
- `node-cache`: In-memory caching with TTL support
- `fast-check`: Property-based testing library
- `dotenv`: Environment variable management

All dependencies have been added to `package.json`.

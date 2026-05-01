# Amadeus Integration - Quick Start Guide

## 5-Minute Setup

### 1. Get Credentials

1. Sign up at https://developers.amadeus.com/
2. Create an app
3. Copy API Key and API Secret

### 2. Configure Environment

Add to `.env`:

```bash
AMADEUS_ENABLED=true
AMADEUS_API_KEY=your_api_key_here
AMADEUS_API_SECRET=your_api_secret_here
AMADEUS_API_BASE_URL=https://test.api.amadeus.com
```

### 3. Start Server

```bash
npm start
```

Look for:
```
✅ Amadeus integration enabled
✅ Unified search routes registered at /api/search
```

### 4. Test It

```bash
# Search hotels in Delhi
curl "http://localhost:5000/api/search/hotels?cityCode=DEL"

# Check health
curl "http://localhost:5000/api/amadeus/health"
```

## Common Use Cases

### Search All Hotels in a City

```bash
GET /api/search/hotels?cityCode=DEL&radius=10
```

### Search by Coordinates

```bash
GET /api/search/hotels?latitude=28.6139&longitude=77.2090&radius=5
```

### Search with Filters

```bash
GET /api/search/hotels?cityCode=BLR&amenities=wifi,parking&minPrice=2000&maxPrice=5000
```

### Get Hotel Details

```bash
GET /api/search/hotels/DELDEL01
```

## Frontend Integration

```typescript
// Search hotels
const response = await fetch(
  '/api/search/hotels?cityCode=DEL&source=all'
);
const data = await response.json();

// Check source
data.data.forEach(hotel => {
  if (hotel.source === 'amadeus') {
    console.log('External hotel:', hotel.name);
  }
});
```

## Troubleshooting

### No Amadeus Results?

1. Check: `GET /api/amadeus/health`
2. Verify: `AMADEUS_ENABLED=true` in `.env`
3. Confirm: API credentials are correct

### Rate Limited?

- Wait 60 seconds
- Reduce request frequency
- Increase cache TTL

### Authentication Failed?

- Verify credentials in `.env`
- Check you're using test credentials for test environment
- Clear token cache

## Next Steps

- Read full documentation: `docs/AMADEUS_API.md`
- Implement frontend integration
- Monitor metrics: `GET /api/amadeus/metrics`
- Set up production credentials

## Quick Reference

| Endpoint | Purpose |
|----------|---------|
| `GET /api/search/hotels` | Search hotels |
| `GET /api/search/hotels/:id` | Get details |
| `GET /api/amadeus/health` | Health check |
| `GET /api/amadeus/metrics` | Usage metrics |

**Need Help?** See full documentation in `docs/AMADEUS_API.md`


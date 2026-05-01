# Search Improvements - Implementation Guide

## Quick Start

This guide will help you integrate the new search improvements into your GoRoomz website.

## Step 1: Verify Dependencies

Ensure you have all required dependencies installed:

```bash
cd projects/website
npm install
```

Required packages (should already be installed):
- `react-router-dom` - For navigation
- `framer-motion` - For animations
- `lucide-react` - For icons

## Step 2: Import New Components

The following new components have been created:

1. **SmartSearchBar** - `src/components/SmartSearchBar.jsx`
2. **AdvancedSearchModal** - `src/components/AdvancedSearchModal.jsx`
3. **EnhancedPropertyCard** - `src/components/EnhancedPropertyCard.jsx`

## Step 3: Update Existing Pages

### Homepage Integration

Add the SmartSearchBar to your homepage:

```jsx
import SmartSearchBar from '@/components/SmartSearchBar';

function HomePage() {
  return (
    <div className="hero-section">
      <h1>Find Your Perfect Stay</h1>
      <SmartSearchBar 
        placeholder="Search by city code (DEL, BOM) or location..."
      />
    </div>
  );
}
```

### Search Results Page

The SearchResultsPage has been automatically updated with:
- SmartSearchBar integration
- Advanced search modal
- Performance metrics
- Enhanced UI

No additional changes needed!

## Step 4: Test the Integration

### Test City Code Search

1. Navigate to the homepage
2. Type "DEL" in the search bar
3. You should see:
   - Autocomplete suggestions for Delhi
   - "Searching global hotels via Amadeus" indicator
   - Results from both local and Amadeus sources

### Test Text Search

1. Type "Delhi hotels" in the search bar
2. You should see:
   - Local search results
   - No Amadeus indicator
   - Faster response time

### Test Advanced Search

1. Click the "Advanced" button on search results page
2. Set multiple filters:
   - Source: Amadeus
   - City Code: BOM
   - Price Range: 1000-5000
   - Amenities: wifi, parking
3. Click "Search"
4. Verify results match all filters

## Step 5: Customize (Optional)

### Add More Cities

Edit `SmartSearchBar.jsx` to add more cities:

```javascript
const popularCities = [
  { code: 'DEL', name: 'Delhi', country: 'India' },
  { code: 'BOM', name: 'Mumbai', country: 'India' },
  // Add your cities here
  { code: 'LAX', name: 'Los Angeles', country: 'USA' },
];
```

### Customize Amenities

Edit `AdvancedSearchModal.jsx` to modify amenity options:

```javascript
const amenityOptions = [
  'wifi', 'parking', 'ac', 'gym', 'pool',
  // Add your amenities here
  'breakfast', 'kitchen', 'workspace'
];
```

### Adjust Debounce Timing

Edit `UnifiedSearchFilters.jsx` to change filter debounce:

```javascript
// Change from 300ms to your preferred value
const timeoutId = setTimeout(() => {
  if (onFiltersChange) {
    onFiltersChange(filters);
  }
}, 500); // 500ms debounce
```

## Step 6: Backend Configuration

Ensure your backend is properly configured:

### Check Amadeus Configuration

```bash
cd projects/backend
```

Verify `.env` file has:

```env
AMADEUS_API_KEY=your_api_key
AMADEUS_API_SECRET=your_api_secret
AMADEUS_ENABLED=true
AMADEUS_BASE_URL=https://test.api.amadeus.com
```

### Test Backend Endpoints

```bash
# Test unified search
curl "http://localhost:5000/api/search/hotels?cityCode=DEL&source=all"

# Test hotel details
curl "http://localhost:5000/api/search/hotels/amadeus_HOTELID"
```

## Step 7: Performance Optimization

### Enable Caching

The backend already implements caching. Verify it's working:

1. Perform a search
2. Check backend logs for "Returning cached results"
3. Repeat the same search
4. Response should be faster

### Monitor Performance

Check the performance metrics displayed on search results:
- Search duration should be < 1000ms for cached results
- Search duration should be < 3000ms for fresh results

## Step 8: Mobile Testing

Test on mobile devices:

1. **Responsive Design**
   - Search bar should be full width
   - Advanced modal should be scrollable
   - Property cards should stack vertically

2. **Touch Interactions**
   - Tap to select suggestions
   - Swipe to close modals
   - Smooth scrolling

3. **Performance**
   - Fast loading on 3G/4G
   - Minimal data usage
   - Smooth animations

## Troubleshooting

### Issue: Components Not Found

**Error:** `Cannot find module '@/components/SmartSearchBar'`

**Solution:**
```bash
# Verify files exist
ls projects/website/src/components/SmartSearchBar.jsx
ls projects/website/src/components/AdvancedSearchModal.jsx
ls projects/website/src/components/EnhancedPropertyCard.jsx

# If missing, copy from the implementation
```

### Issue: Styles Not Applied

**Error:** Components look unstyled

**Solution:**
```bash
# Ensure Tailwind CSS is configured
cat projects/website/tailwind.config.js

# Rebuild CSS
npm run build:css
```

### Issue: API Errors

**Error:** "Amadeus service not available"

**Solution:**
```bash
# Check backend logs
cd projects/backend
npm run dev

# Verify Amadeus credentials
node -e "console.log(require('./services/amadeus/config').getConfig())"
```

### Issue: Search Not Working

**Error:** No results returned

**Solution:**
1. Check browser console for errors
2. Verify API endpoint in Network tab
3. Check backend logs for errors
4. Ensure database has properties

## Best Practices

### 1. Error Handling

Always wrap API calls in try-catch:

```javascript
try {
  const results = await propertyService.searchUnified(params);
  setResults(results.data);
} catch (error) {
  console.error('Search failed:', error);
  toast({
    title: "Search Error",
    description: "Please try again",
    variant: "destructive"
  });
}
```

### 2. Loading States

Show loading indicators during searches:

```javascript
const [isLoading, setIsLoading] = useState(false);

const handleSearch = async () => {
  setIsLoading(true);
  try {
    // ... search logic
  } finally {
    setIsLoading(false);
  }
};
```

### 3. User Feedback

Provide clear feedback for all actions:

```javascript
// Success
toast({ title: "Search completed", description: `Found ${count} properties` });

// Warning
toast({ title: "Partial results", description: "Some sources unavailable", variant: "warning" });

// Error
toast({ title: "Search failed", description: error.message, variant: "destructive" });
```

## Testing Checklist

- [ ] City code search works (e.g., DEL, BOM, NYC)
- [ ] Text search works (e.g., "Delhi hotels")
- [ ] Autocomplete suggestions appear
- [ ] Advanced search modal opens
- [ ] All filters apply correctly
- [ ] Source badges display correctly
- [ ] Performance metrics show
- [ ] Mobile responsive
- [ ] Error handling works
- [ ] Loading states display
- [ ] Keyboard navigation works
- [ ] Results pagination works

## Deployment

### Development

```bash
cd projects/website
npm run dev
```

### Production Build

```bash
cd projects/website
npm run build
npm run preview
```

### Environment Variables

Ensure production environment has:

```env
VITE_API_URL=https://api.goroomz.com
VITE_AMADEUS_ENABLED=true
```

## Support

For issues or questions:

1. Check the documentation: `SEARCH_IMPROVEMENTS.md`
2. Review backend docs: `projects/backend/docs/AMADEUS_API.md`
3. Check integration guide: `projects/website/AMADEUS_FRONTEND_INTEGRATION.md`

## Next Steps

After successful implementation:

1. **Monitor Performance**
   - Track search duration
   - Monitor API response times
   - Check error rates

2. **Gather Feedback**
   - User surveys
   - Analytics tracking
   - A/B testing

3. **Iterate**
   - Add requested features
   - Optimize based on metrics
   - Enhance UX based on feedback

## Summary

You've successfully implemented the enhanced search functionality! The system now provides:

✅ Intelligent city code detection
✅ Autocomplete suggestions
✅ Advanced filtering options
✅ Unified search across local and Amadeus
✅ Performance optimizations
✅ Enhanced user experience

Enjoy your improved search functionality!

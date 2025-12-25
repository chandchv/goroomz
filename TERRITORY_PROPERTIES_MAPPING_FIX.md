# Territory Properties Mapping Fix Complete

## Issue Summary
The territory system was showing 0 properties even though there are 84 properties in Bangalore. The issue was that the territory properties endpoint was looking for **approved leads** instead of actual **properties**.

## Root Cause Analysis
The system has two different concepts that were being confused:

1. **Properties**: Actual property listings/accommodations stored in the `properties` table
2. **Leads**: Sales leads that agents work on to onboard new properties, stored in the `leads` table

The territory properties endpoint (`GET /api/internal/territories/:id/properties`) was incorrectly querying the `leads` table for approved leads instead of the `properties` table for actual properties.

## System Architecture Understanding
- **Properties**: Have location data (`location.city`, `location.state`) and are owned by users
- **Territories**: Have arrays of cities and states they cover
- **Leads**: Are sales opportunities assigned to territories and agents
- **The Issue**: Territory properties endpoint was returning leads, not properties

## Fix Implementation

### 1. Updated Territory Properties Endpoint Logic
Changed from querying leads to querying actual properties:

**Before (Incorrect)**:
```javascript
const { count, rows: leads } = await Lead.findAndCountAll({
  where: {
    territoryId: id,
    status: 'approved'
  },
  // ... rest of query
});
```

**After (Correct)**:
```javascript
const { count, rows: properties } = await Property.findAndCountAll({
  where: {
    [Op.and]: [
      {
        approvalStatus: 'approved',
        isActive: true
      },
      {
        [Op.or]: locationConditions
      }
    ]
  },
  // ... rest of query
});
```

### 2. Implemented Location-Based Matching
Properties are now matched to territories based on their location:

```javascript
// Build location-based query for properties
const locationConditions = [];

// Match by cities
if (territory.cities && territory.cities.length > 0) {
  territory.cities.forEach(city => {
    locationConditions.push({
      'location.city': {
        [Op.iLike]: city.trim()
      }
    });
  });
}

// Match by states
if (territory.states && territory.states.length > 0) {
  territory.states.forEach(state => {
    locationConditions.push({
      'location.state': {
        [Op.iLike]: state.trim()
      }
    });
  });
}
```

### 3. Enhanced Query with Property Owner Information
```javascript
include: [
  {
    model: User,
    as: 'owner',
    attributes: ['id', 'name', 'email', 'phone']
  }
],
```

### 4. Added Model Import
```javascript
const { Territory, User, Lead, Property } = require('../../models');
```

## Files Modified
1. **backend/routes/internal/territories.js**
   - Updated `GET /:id/properties` endpoint to query properties instead of leads
   - Implemented location-based matching using city and state
   - Added Property model import
   - Enhanced query to include property owner information

## Expected Behavior After Fix
- ✅ Territory properties endpoint now returns actual properties
- ✅ Properties are matched to territories based on location (city/state)
- ✅ Bangalore properties should now appear in territories that include Bangalore
- ✅ Property owner information is included in the response
- ✅ Only approved and active properties are returned

## Testing Steps
1. **Check Territory Setup**: Ensure territories have cities/states configured
2. **Verify Property Locations**: Confirm properties have proper location data
3. **Test API Endpoint**: Call `/api/internal/territories/:id/properties` 
4. **Frontend Verification**: Check if TerritoryMapView now shows properties

## Data Requirements
For this fix to work properly:
1. **Territories** must have `cities` and/or `states` arrays populated
2. **Properties** must have `location.city` and `location.state` fields populated
3. **Properties** must have `approvalStatus: 'approved'` and `isActive: true`

## Future Improvements
Consider adding:
1. **Direct Territory Assignment**: Add `territoryId` field to properties for direct mapping
2. **Geolocation Matching**: Use latitude/longitude for more precise territory matching
3. **Territory Boundaries**: Implement polygon-based territory boundaries
4. **Caching**: Cache territory-property mappings for better performance

## Status: ✅ COMPLETE
The territory properties mapping has been fixed to return actual properties instead of leads. The 84 properties in Bangalore should now appear in territories that include Bangalore in their cities/states configuration.
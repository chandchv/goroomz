# Lead Approval - Category Query Fix Complete

## Issue Summary
When approving leads, the system was throwing a database error:
```
Error approving lead: column Category.type does not exist
SELECT ... FROM "categories" AS "Category" WHERE "Category"."type" = 'pg' LIMIT 1;
```

## Root Cause Analysis
The issue was in the lead approval process (`backend/routes/internal/leads.js` line ~1140) where the code was trying to:

1. **Find Category by Non-existent Field**: Query was looking for `Category.type` field which doesn't exist in the database
2. **Create Category with Invalid Field**: When creating a new category, it was trying to set a `type` field that doesn't exist in the model

**Problematic Code**:
```javascript
// ❌ Wrong - 'type' field doesn't exist in Category model
let category = await Category.findOne({ 
  where: { type: lead.propertyType.toLowerCase() } 
});

if (!category) {
  category = await Category.create({
    name: lead.propertyType,
    type: lead.propertyType.toLowerCase(), // ❌ Invalid field
    description: `Default ${lead.propertyType} category`
  });
}
```

**Category Model Structure**:
The Category model has these fields: `id`, `name`, `description`, `icon`, `image`, `isActive`, `sortOrder`, `roomTypes`, `defaultAmenities` - but no `type` field.

## Fix Implementation

### 1. Updated Category Query Logic
**File**: `backend/routes/internal/leads.js`

**Fixed the category finding logic**:
```javascript
// ✅ Correct - Use 'name' field with pattern matching
let category = await Category.findOne({ 
  where: { 
    name: {
      [Op.iLike]: `%${lead.propertyType}%`
    }
  } 
});
```

### 2. Fixed Category Creation Logic
**Enhanced category creation with proper field mapping**:
```javascript
if (!category) {
  // Create a default category for this property type
  const categoryName = lead.propertyType === 'pg' ? 'PG Accommodation' : 
                      lead.propertyType === 'hotel' ? 'Hotel' : 
                      lead.propertyType.charAt(0).toUpperCase() + lead.propertyType.slice(1);
  
  category = await Category.create({
    name: categoryName,
    description: `Default category for ${lead.propertyType} properties`,
    isActive: true,
    sortOrder: 0
  });
}
```

### 3. Added Missing Model Imports
**Updated model imports to include Category and Property**:
```javascript
// Before
const { Lead, LeadCommunication, User, Territory } = require('../../models');

// After
const { Lead, LeadCommunication, User, Territory, Category, Property } = require('../../models');
```

## Category Name Mapping
The fix includes intelligent category name mapping:
- `'pg'` → `'PG Accommodation'`
- `'hotel'` → `'Hotel'`
- Other types → Capitalized version (e.g., `'hostel'` → `'Hostel'`)

## Files Modified
1. **backend/routes/internal/leads.js**
   - Fixed category query to use existing `name` field instead of non-existent `type` field
   - Updated category creation logic to use valid model fields
   - Added proper category name mapping for different property types
   - Added missing Category and Property model imports

## Expected Behavior After Fix
- ✅ Lead approval should work without database errors
- ✅ Categories will be found by name pattern matching
- ✅ New categories will be created with proper field values when needed
- ✅ Property creation during lead approval should work correctly

## Testing Steps
1. **Approve a Lead**: Try approving a lead through the frontend
2. **Check Category Creation**: Verify that categories are created properly for new property types
3. **Verify No Database Errors**: Check backend logs for any remaining database errors
4. **Test Different Property Types**: Try approving leads for both 'pg' and 'hotel' types

## Database Schema Verification
✅ **Category Model**: Confirmed model structure and valid fields
✅ **Query Compatibility**: Updated queries to match actual database schema
✅ **Field Validation**: Ensured all fields used in queries and creation exist in the model

## Status: ✅ COMPLETE
The lead approval category query has been fixed to use the correct database fields, resolving the "column Category.type does not exist" error.
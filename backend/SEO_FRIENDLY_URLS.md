# SEO-Friendly Property URLs

## Overview

Properties now support SEO-friendly URLs using slugs instead of UUIDs. This improves search engine optimization and makes URLs more user-friendly.

## Examples

**Before:**
```
http://localhost:3000/pg/78269f70-6565-4a7a-95cf-1468205c85be
```

**After:**
```
http://localhost:3000/pg/cozy-pg-for-students-bangalore-koramangala
```

## Implementation Details

### 1. Database Schema

A new `slug` column has been added to the `properties` table:
- Type: VARCHAR(255)
- Unique: Yes
- Nullable: Yes (for backward compatibility)

### 2. Slug Generation

Slugs are automatically generated from:
- Property name (sanitized and lowercased)
- City (for uniqueness)
- Area (for additional uniqueness)

**Format:** `{property-name}-{city}-{area}`

**Example:**
- Name: "Cozy PG for Students"
- City: "Bangalore"
- Area: "Koramangala"
- Slug: `cozy-pg-for-students-bangalore-koramangala`

### 3. Slug Rules

- Only lowercase letters, numbers, and hyphens
- Special characters removed
- Multiple spaces/hyphens collapsed to single hyphen
- Duplicate slugs handled by appending numbers (e.g., `-1`, `-2`)

### 4. Backend API Changes

#### GET /api/properties/:identifier

Now accepts both UUID and slug:
```javascript
// UUID (backward compatible)
GET /api/properties/78269f70-6565-4a7a-95cf-1468205c85be

// Slug (SEO-friendly)
GET /api/properties/cozy-pg-for-students-bangalore-koramangala
```

The API automatically detects whether the identifier is a UUID or slug.

#### POST /api/properties/:identifier/claim

Also supports both UUID and slug for property claiming.

### 5. Frontend Changes

#### Route Configuration
```jsx
// Updated route parameter
<Route path="/pg/:identifier" element={<PGDetailPage />} />
```

#### Property Links
```jsx
// Prefers slug, falls back to UUID
navigate(`/pg/${property.slug || property.id}`)
```

## Migration

### Running the Migration

To generate slugs for existing properties:

```bash
cd projects/backend
node scripts/generatePropertySlugs.js
```

### Migration Process

1. Adds `slug` column if not exists
2. Fetches all properties without slugs
3. Generates unique slugs for each property
4. Handles duplicates by appending numbers
5. Updates properties with generated slugs

### Migration Output

```
🚀 Starting property slug generation...

📋 Checking if slug column exists...
✅ Slug column ready

📊 Found 150 properties without slugs

✅ [1/150] Cozy PG for Students → cozy-pg-for-students-bangalore-koramangala
✅ [2/150] Modern Hostel → modern-hostel-bangalore-indiranagar
...

============================================================
📈 Migration Summary:
   ✅ Success: 150
   ❌ Errors: 0
   📊 Total: 150
============================================================

🎉 All property slugs generated successfully!
```

## SEO Benefits

### 1. Improved Search Rankings
- Keywords in URL (property name, location)
- Better crawlability by search engines
- More relevant to search queries

### 2. Better User Experience
- Readable and memorable URLs
- Users can understand content before clicking
- Easier to share and reference

### 3. Social Media Sharing
- More attractive link previews
- Better click-through rates
- Professional appearance

### 4. Analytics
- Easier to track specific properties
- More meaningful URL patterns in reports
- Better understanding of user behavior

## Backward Compatibility

The system maintains full backward compatibility:

1. **Existing UUID links continue to work**
   - Old bookmarks remain valid
   - External links don't break
   - API accepts both formats

2. **Gradual migration**
   - New properties get slugs automatically
   - Old properties can be migrated at any time
   - No downtime required

3. **Fallback mechanism**
   - Frontend prefers slug but falls back to UUID
   - API detects format automatically
   - No breaking changes

## Best Practices

### For Property Owners

1. **Use descriptive names**
   - Include property type (PG, Hostel, etc.)
   - Mention key features
   - Add location details

2. **Keep names concise**
   - Avoid overly long names
   - Focus on key selling points
   - Use common search terms

### For Developers

1. **Always include slug in API responses**
   ```javascript
   {
     id: "uuid",
     slug: "property-name-city-area",
     name: "Property Name",
     // ...
   }
   ```

2. **Prefer slug in links**
   ```javascript
   // Good
   `/pg/${property.slug || property.id}`
   
   // Avoid
   `/pg/${property.id}`
   ```

3. **Handle both formats in routes**
   ```javascript
   // Check if UUID or slug
   const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
   ```

## Testing

### Manual Testing

1. **Test slug generation:**
   ```bash
   node scripts/generatePropertySlugs.js
   ```

2. **Test API with slug:**
   ```bash
   curl http://localhost:5000/api/properties/cozy-pg-bangalore-koramangala
   ```

3. **Test API with UUID:**
   ```bash
   curl http://localhost:5000/api/properties/78269f70-6565-4a7a-95cf-1468205c85be
   ```

4. **Test frontend navigation:**
   - Visit `/pgs` page
   - Click on a property
   - Verify URL uses slug
   - Check page loads correctly

### Automated Testing

Add tests for:
- Slug generation logic
- Duplicate slug handling
- API endpoint with both formats
- Frontend routing

## Troubleshooting

### Issue: Duplicate slugs

**Solution:** The migration script automatically handles duplicates by appending numbers. If you encounter issues:

```javascript
// Manual fix
const property = await Property.findByPk('property-id');
property.slug = 'new-unique-slug';
await property.save();
```

### Issue: Special characters in slugs

**Solution:** The slug generator removes special characters. If needed, update the generation logic:

```javascript
Property.generateSlug = function(name, city, area) {
  // Custom logic here
};
```

### Issue: Old links not working

**Solution:** Ensure the API route accepts both UUID and slug:

```javascript
const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
const where = isUUID ? { id: identifier } : { slug: identifier };
```

## Future Enhancements

1. **Custom slugs:** Allow property owners to customize their slugs
2. **Slug history:** Track slug changes for redirects
3. **Canonical URLs:** Implement 301 redirects from UUID to slug
4. **Sitemap generation:** Include slug-based URLs in sitemap
5. **Analytics integration:** Track slug performance in search results

## Related Files

- `projects/backend/models/Property.js` - Property model with slug field
- `projects/backend/routes/properties.js` - API routes supporting slugs
- `projects/backend/scripts/generatePropertySlugs.js` - Migration script
- `projects/website/src/pages/PGDetailPage.jsx` - Frontend detail page
- `projects/website/src/pages/PGListingPage.jsx` - Frontend listing page
- `projects/website/src/App.jsx` - Route configuration

## Support

For issues or questions:
1. Check this documentation
2. Review the migration script output
3. Test with both UUID and slug formats
4. Contact the development team

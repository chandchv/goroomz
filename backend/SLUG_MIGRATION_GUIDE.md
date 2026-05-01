# Property Slug Migration Guide

## Quick Start

Follow these steps to enable SEO-friendly URLs for your properties:

### Step 1: Backup Your Database

Before running any migration, always backup your database:

```bash
# PostgreSQL backup
pg_dump -U your_username -d goroomz > backup_before_slug_migration.sql

# Or use your preferred backup method
```

### Step 2: Run the Migration Script

```bash
cd projects/backend
node scripts/generatePropertySlugs.js
```

### Step 3: Verify the Migration

Check that slugs were generated successfully:

```sql
-- Check properties with slugs
SELECT id, name, slug FROM properties WHERE slug IS NOT NULL LIMIT 10;

-- Check properties without slugs (should be 0)
SELECT COUNT(*) FROM properties WHERE slug IS NULL;

-- Check for duplicate slugs (should be 0)
SELECT slug, COUNT(*) FROM properties 
WHERE slug IS NOT NULL 
GROUP BY slug 
HAVING COUNT(*) > 1;
```

### Step 4: Test the API

Test that both UUID and slug URLs work:

```bash
# Test with UUID (old format)
curl http://localhost:5000/api/properties/YOUR-PROPERTY-UUID

# Test with slug (new format)
curl http://localhost:5000/api/properties/property-name-city-area
```

### Step 5: Deploy Frontend Changes

The frontend changes are already in place and will automatically use slugs when available.

## What Gets Changed

### Database
- Adds `slug` column to `properties` table
- Generates unique slugs for all existing properties
- Creates unique index on `slug` column

### Backend
- Property model includes slug field
- API routes accept both UUID and slug
- Auto-generates slugs for new properties

### Frontend
- Routes accept both UUID and slug
- Property links prefer slug over UUID
- Backward compatible with old UUID links

## Rollback Plan

If you need to rollback the migration:

### Option 1: Remove Slug Column (Not Recommended)

```sql
ALTER TABLE properties DROP COLUMN IF EXISTS slug;
```

**Note:** This will break new slug-based URLs but UUID URLs will continue to work.

### Option 2: Keep Slug Column (Recommended)

Simply don't use slugs in your frontend links. The system will continue to work with UUIDs.

## Common Issues

### Issue: Migration Script Fails

**Symptoms:**
- Script exits with error
- Some properties don't get slugs

**Solutions:**
1. Check database connection in `.env`
2. Ensure you have write permissions
3. Check for properties with invalid names
4. Run script again (it's idempotent)

### Issue: Duplicate Slugs

**Symptoms:**
- Migration reports duplicate slugs
- Some properties can't be accessed by slug

**Solutions:**
The script automatically handles duplicates by appending numbers. If issues persist:

```javascript
// Manually fix in Node.js console
const { Property } = require('./models');

// Find duplicates
const properties = await Property.findAll({
  where: { slug: 'duplicate-slug' }
});

// Update manually
for (let i = 1; i < properties.length; i++) {
  properties[i].slug = `${properties[i].slug}-${i}`;
  await properties[i].save();
}
```

### Issue: Frontend Shows UUID Instead of Slug

**Symptoms:**
- URLs still show UUIDs
- Slugs not appearing in links

**Solutions:**
1. Verify slugs exist in database
2. Check API response includes `slug` field
3. Clear browser cache
4. Verify frontend code uses `property.slug || property.id`

## Performance Considerations

### Database Indexes

The migration creates a unique index on the `slug` column for fast lookups:

```sql
CREATE UNIQUE INDEX properties_slug_idx ON properties(slug);
```

### Query Performance

Slug-based queries are as fast as UUID queries due to the index:

```javascript
// Both queries have similar performance
await Property.findOne({ where: { id: uuid } });
await Property.findOne({ where: { slug: slug } });
```

## Monitoring

After migration, monitor:

1. **API Response Times**
   - Should remain similar to before
   - Slug queries should be fast (< 50ms)

2. **Error Rates**
   - Watch for 404 errors on property pages
   - Check logs for slug-related errors

3. **SEO Impact**
   - Monitor search engine rankings
   - Track organic traffic to property pages
   - Check Google Search Console for crawl errors

## Best Practices

### For New Properties

New properties automatically get slugs. Ensure:
- Property names are descriptive
- Location data (city, area) is accurate
- Names don't contain excessive special characters

### For Existing Properties

If you need to update slugs:

```javascript
const property = await Property.findByPk('property-id');
property.slug = 'new-custom-slug';
await property.save();
```

### For Property Updates

When updating property name or location:

```javascript
// Option 1: Keep existing slug (recommended)
await property.update({ name: 'New Name' });

// Option 2: Regenerate slug
const newSlug = Property.generateSlug(
  'New Name',
  property.location.city,
  property.location.area
);
await property.update({ name: 'New Name', slug: newSlug });
```

## Timeline

Recommended migration timeline:

1. **Day 1:** Run migration in development
2. **Day 2-3:** Test thoroughly
3. **Day 4:** Run migration in staging
4. **Day 5-7:** Monitor staging
5. **Day 8:** Run migration in production
6. **Day 9-14:** Monitor production closely

## Support

If you encounter issues:

1. Check this guide
2. Review migration script output
3. Check database logs
4. Test with both UUID and slug
5. Contact development team

## Success Criteria

Migration is successful when:

- ✅ All properties have unique slugs
- ✅ API accepts both UUID and slug
- ✅ Frontend uses slugs in new links
- ✅ Old UUID links still work
- ✅ No increase in error rates
- ✅ SEO improvements visible in analytics

## Next Steps

After successful migration:

1. Update sitemap to use slug URLs
2. Submit updated sitemap to search engines
3. Monitor SEO performance
4. Consider implementing 301 redirects from UUID to slug
5. Update marketing materials with new URL format

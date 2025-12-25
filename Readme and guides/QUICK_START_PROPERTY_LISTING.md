# Quick Start: Property Listing Feature

## For Developers

### Start the Backend
```bash
cd backend
npm install
npm start
```

The property routes will be registered at `/api/properties`

### Start the Frontend
```bash
npm install
npm run dev
```

### Test the Feature

1. **Register as Property Owner**
   - Go to http://localhost:5173/signup
   - Register with role "owner"

2. **List a Property**
   - Login and go to owner dashboard
   - Click "List Property" button
   - Fill out the wizard:
     - Select category (PG, Hotel Room, etc.)
     - Enter property details
     - Add location
     - Set pricing
     - Select amenities
     - Upload photos (optional)
   - Submit

3. **Verify Creation**
   - Property should appear in dashboard with "Pending" status
   - Check database:
     ```sql
     SELECT * FROM properties ORDER BY created_at DESC LIMIT 1;
     SELECT * FROM rooms WHERE property_id = 'PROPERTY_ID';
     ```

4. **Approve Property (Admin)**
   - Login as admin
   - Go to admin panel
   - Approve the property
   - Property should now appear in public listings

## API Quick Reference

### Create Property
```bash
POST /api/properties
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "name": "My PG",
  "description": "Comfortable accommodation",
  "type": "pg",
  "categoryId": "CATEGORY_UUID",
  "location": {
    "address": "123 Main St",
    "city": "Bangalore",
    "state": "Karnataka"
  },
  "amenities": ["wifi", "meals"],
  "images": [],
  "rules": [],
  "createRoom": true,
  "roomData": {
    "title": "Cozy Room",
    "price": 8000,
    "category": "PG",
    "roomType": "PG",
    "pricingType": "monthly"
  }
}
```

### Get All Properties
```bash
GET /api/properties
```

### Get My Properties
```bash
GET /api/properties/owner/my-properties
Authorization: Bearer TOKEN
```

## Database Setup

### Ensure Categories Exist
```sql
INSERT INTO categories (id, name, description, icon) VALUES
  (gen_random_uuid(), 'PG', 'Paying Guest accommodations', '🏠'),
  (gen_random_uuid(), 'Hotel Room', 'Hotel accommodations', '🏨'),
  (gen_random_uuid(), 'Home Stay', 'Home stay accommodations', '🏡'),
  (gen_random_uuid(), 'Independent Home', 'Independent homes', '🏘️')
ON CONFLICT (name) DO NOTHING;
```

### Run Test Script
```bash
cd backend
node scripts/testPropertyCreation.js
```

## Troubleshooting

### "Category not found" Error
**Solution:** Run the category seeder or insert categories manually

### "Not authorized" Error
**Solution:** Ensure user is logged in and has "owner" or "admin" role

### Property not appearing in public listings
**Solution:** Check approval status - only "approved" properties appear publicly

### Room not linked to property
**Solution:** Ensure `createRoom: true` and `roomData` are provided in request

## File Locations

- Backend API: `backend/routes/properties.js`
- Frontend Service: `src/services/propertyService.js`
- Owner Dashboard: `src/pages/OwnerDashboard.jsx`
- Property Wizard: `src/components/PropertyListingWizard.jsx`
- Test Script: `backend/scripts/testPropertyCreation.js`

## Environment Variables

Ensure these are set in `backend/.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/goroomz
JWT_SECRET=your-secret-key
PORT=5000
```

## Common Issues

1. **Port already in use**
   - Change PORT in .env or kill existing process

2. **Database connection failed**
   - Check DATABASE_URL is correct
   - Ensure PostgreSQL is running

3. **Categories not found**
   - Run category seeder
   - Check categories table has data

4. **Images not uploading**
   - Images are stored as base64 in database
   - For production, use cloud storage (S3, Cloudinary)

## Next Steps

1. Test the complete workflow
2. Add property approval UI in admin panel
3. Implement property search and filters
4. Add property analytics
5. Migrate existing standalone rooms

## Support

For issues or questions:
- Check documentation in `PROPERTY_LISTING_IMPLEMENTATION_SUMMARY.md`
- Review API endpoints in `backend/routes/properties.js`
- Run test script: `node backend/scripts/testPropertyCreation.js`

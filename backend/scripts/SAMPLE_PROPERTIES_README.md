# Sample Properties and Owners Seeder

This script creates sample property owners and their properties for testing the property management, onboarding, and internal user features.

## Usage

Run the script from the backend directory:

```bash
cd backend
node scripts/seedSamplePropertiesAndOwners.js
```

## Sample Data Created

### Property Owners (6 total)

All owners have:
- **Role**: `owner`
- **Status**: Active and verified
- **Default Password**: `Owner123!`

| Owner Name | Email | City | Properties |
|------------|-------|------|------------|
| Ramesh Gupta | ramesh.gupta@example.com | Mumbai | 2 |
| Priya Sharma | priya.sharma.owner@example.com | Bangalore | 1 |
| Amit Patel | amit.patel@example.com | Pune | 2 |
| Sunita Reddy | sunita.reddy@example.com | Hyderabad | 1 |
| Vikram Singh | vikram.singh.owner@example.com | Delhi | 1 |
| Meera Iyer | meera.iyer@example.com | Chennai | 2 |

### Properties (9 total)

#### Mumbai (2 properties)
1. **Cozy PG near Andheri Station** - ₹8,500/month
   - Type: Private Room (PG)
   - Beds: 4 total, 2 available
   - Amenities: WiFi, Meals, Laundry, AC, Security

2. **Luxury PG in Bandra** - ₹12,000/month
   - Type: Private Room (PG)
   - Beds: 6 total, 3 available
   - Amenities: WiFi, Meals, Parking, Laundry, AC, Gym, Security

#### Bangalore (1 property)
3. **Modern Studio Apartment in Koramangala** - ₹15,000/month
   - Type: Studio (Independent Home)
   - Beds: 1 total, 1 available
   - Amenities: WiFi, Parking, AC, Kitchen, Washing Machine, Refrigerator

#### Pune (2 properties)
4. **Budget-Friendly PG in Kothrud** - ₹6,000/month
   - Type: Shared Room (PG)
   - Beds: 8 total, 5 available
   - Amenities: WiFi, Meals, Laundry, Security

5. **Spacious 2BHK in Hinjewadi** - ₹18,000/month
   - Type: Entire Place (Independent Home)
   - Beds: 2 total, 2 available
   - Amenities: WiFi, Parking, AC, Kitchen, Washing Machine, Balcony

#### Hyderabad (1 property)
6. **Comfortable Hotel Room in Gachibowli** - ₹2,500/month
   - Type: Hotel Room
   - Beds: 1 total, 1 available
   - Amenities: WiFi, AC, TV, Parking, Laundry

#### Delhi (1 property)
7. **Premium PG in South Delhi** - ₹16,000/month
   - Type: Private Room (PG)
   - Beds: 10 total, 4 available
   - Amenities: WiFi, Meals, Parking, Laundry, AC, Gym, Security, TV

#### Chennai (2 properties)
8. **Cozy Home Stay in T Nagar** - ₹7,000/month
   - Type: Private Room (Home Stay)
   - Beds: 3 total, 2 available
   - Amenities: WiFi, Meals, Laundry, AC, TV

9. **Beachside Home Stay in ECR** - ₹9,000/month
   - Type: Entire Place (Home Stay)
   - Beds: 2 total, 2 available
   - Amenities: WiFi, Meals, Parking, Kitchen, Balcony

## Property Categories

- **PG**: 5 properties (55%)
- **Independent Home**: 3 properties (33%)
- **Home Stay**: 2 properties (22%)
- **Hotel Room**: 1 property (11%)

## Testing Scenarios

This sample data allows you to test:

### 1. Property Owner Management
- Login as property owners to manage their properties
- View property listings and availability
- Update property details

### 2. Internal User Access
- Agents can view and onboard properties
- Regional Managers can approve onboardings
- Operations Managers can access all properties
- Platform Admins can manage property owners

### 3. Property Search and Filtering
- Search by city (6 cities covered)
- Filter by category (4 types)
- Filter by price range (₹2,500 - ₹18,000)
- Filter by amenities

### 4. Booking Management
- Properties with available beds
- Various room types (Private, Shared, Entire Place, Studio)
- Different capacity (1-4 guests)

### 5. Commission Tracking
- Properties owned by different owners
- Various price points for commission calculation
- Multiple properties per owner

## Integration with Internal Users

The sample internal users created by `seedSampleInternalUsers.js` can interact with these properties:

- **Agents** (Aisha Patel, James Wilson, Rajesh Kumar, Vikram Singh):
  - Can onboard new properties
  - Earn commission on property bookings
  - Manage leads for property owners

- **Regional Managers** (Priya Sharma, Emily Rodriguez):
  - Approve property onboardings
  - Monitor agent performance on properties
  - Manage territory-based property assignments

- **Operations Managers** (David Martinez, Lisa Thompson):
  - Access all properties for support
  - Handle maintenance requests
  - Manage housekeeping schedules

- **Platform Admins** (Michael Chen, Sophie Anderson):
  - Full property management access
  - Can deactivate/reactivate properties
  - Manage property owner accounts

- **Superuser** (Sarah Johnson):
  - Complete system access
  - Can modify any property or owner
  - Access to all audit logs

## Cleanup

To remove all sample properties and owners:

```sql
-- Remove properties
DELETE FROM "rooms" WHERE "owner_id" IN (
  SELECT "id" FROM "users" WHERE "email" LIKE '%@example.com' AND "role" = 'owner'
);

-- Remove owners
DELETE FROM "users" WHERE "email" LIKE '%@example.com' AND "role" = 'owner';
```

## Notes

- All properties are marked as `isVerified: true` and `isActive: true`
- Properties have realistic locations with coordinates
- Amenities are validated against the allowed list
- Images are placeholder URLs (can be replaced with actual images)
- All owners are verified and active for immediate testing
- Properties have varying availability to test booking scenarios

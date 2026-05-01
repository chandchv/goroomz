# Lead Approval Property Creation Fix

## Issue
When approving a property lead through the lead workflow, the system was only updating the lead status to "approved" but NOT creating:
1. Property owner account
2. Property record in the database

This meant approved leads had no corresponding property owners or properties in the system.

## Root Cause
The lead approval endpoint (`POST /api/internal/leads/:id/approve`) had TODO comments indicating the functionality was never implemented:

```javascript
// TODO: Create property owner account and send credentials
// TODO: Create commission record for agent
// TODO: Send notification to agent
```

## Solution Implemented

### Updated: `backend/routes/internal/leads.js`

The lead approval endpoint now:

1. **Creates Property Owner Account**
   - Checks if owner already exists by email
   - If not, creates new User with role 'owner'
   - Generates random password
   - Sends welcome email with credentials

2. **Creates Property Record**
   - Finds or creates default category based on property type
   - Maps property type to correct enum value
   - Creates Property with:
     - Owner ID
     - Business name from lead
     - Description with estimated rooms
     - Location from lead (address, city, state, country)
     - Approval status set to 'approved'
     - Approved by current user

3. **Returns Complete Data**
   - Lead details
   - Property owner info
   - Property info
   - Generated credentials

## Data Flow

### Lead Fields Used:
- `propertyOwnerName` → User.name
- `email` → User.email
- `phone` → User.phone
- `businessName` → Property.name
- `propertyType` → Property.type (mapped to lowercase enum)
- `address` → Property.location.address
- `city` → Property.location.city
- `state` → Property.location.state
- `country` → Property.location.country
- `estimatedRooms` → Property.description

### Response Structure:
```json
{
  "success": true,
  "message": "Lead approved successfully. Property owner account and property have been created.",
  "data": {
    "lead": { /* lead details */ },
    "propertyOwner": {
      "id": "uuid",
      "name": "Owner Name",
      "email": "owner@example.com"
    },
    "property": {
      "id": "uuid",
      "name": "Property Name",
      "type": "pg"
    },
    "credentials": {
      "email": "owner@example.com",
      "password": "generated-password"
    }
  }
}
```

## Testing

### To test the fix:

1. **Create a new lead** (as Agent/Regional Manager):
   - Go to Property Onboarding page
   - Click "New Property Lead"
   - Fill in all required fields:
     - Property Owner Name
     - Email
     - Phone
     - Business Name
     - Property Type (Hotel/PG)
     - Address, City, State
     - Estimated Rooms
   - Submit

2. **Submit for approval** (if you're an agent)

3. **Approve the lead** (as Regional Manager or higher):
   - Go to Property Onboarding page
   - Find the lead in "Pending Approval" status
   - Click "Approve"

4. **Verify creation**:
   - Check that property owner account was created
   - Check that property was created
   - Owner should receive email with credentials
   - Property should appear in Properties list

### Database Verification:

```sql
-- Check if property owner was created
SELECT * FROM users WHERE email = 'owner-email@example.com' AND role = 'owner';

-- Check if property was created
SELECT p.*, u.name as owner_name, u.email as owner_email
FROM properties p
LEFT JOIN users u ON p.owner_id = u.id
WHERE u.email = 'owner-email@example.com';
```

### Script to check existing approved leads:
```bash
node backend/scripts/testLeadApproval.js
```

## For Existing Approved Leads

If you have existing approved leads that don't have property owners/properties, you'll need to:

1. Re-approve them (change status back to 'pending_approval' then approve again), OR
2. Manually create the property owner and property using the superuser interface

## Related Files
- `backend/routes/internal/leads.js` - Lead approval endpoint
- `backend/models/Lead.js` - Lead model with field definitions
- `backend/models/Property.js` - Property model
- `backend/models/User.js` - User model (property owners)
- `backend/scripts/testLeadApproval.js` - Testing script

## Next Steps (Still TODO)
- Create commission record for agent when lead is approved
- Send notification to agent about approval
- Add ability to bulk-approve leads
- Add ability to re-process failed approvals

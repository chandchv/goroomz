# Property Overview Dashboard

## Overview

The Property Overview Dashboard provides a real-time, floor-based grid view of all rooms in a property, allowing property owners, managers, and receptionists to monitor room status at a glance.

## Features

### 1. **Floor-Based Grid Layout**
- Rooms organized by floor number
- Compact grid view showing multiple rooms per row
- Color-coded status indicators for quick visual scanning
- Responsive design adapts to screen size

### 2. **Real-Time Status Monitoring**
- Auto-refresh every 30 seconds
- Manual refresh button
- Last updated timestamp
- Three status types:
  - **Green (✓)**: Vacant/Clean - Ready for new guests
  - **Yellow (●)**: Occupied - Currently in use
  - **Red (!)**: Vacant/Dirty - Needs housekeeping

### 3. **Property Statistics**
- Total Rooms count
- Total Beds count
- Room Occupancy Rate (%)
- Bed Occupancy Rate (%)

### 4. **Floor-Level Statistics**
- Room count per floor
- Status breakdown per floor (occupied/clean/dirty)
- Quick visual summary in floor headers

### 5. **Interactive Room Cards**
- Click any room to view details
- Update room status (if permitted)
- View bed occupancy for occupied rooms
- Hover for detailed tooltip information

## User Access

### Property Owners
- Can view all their properties
- Full access to room status updates
- Can manage property staff permissions

### Property Managers
- Can view assigned property
- Can update room status
- Can manage bookings and check-ins/check-outs

### Receptionists (Front Desk Staff)
- Can view assigned property
- Can update room status
- Can perform check-ins and check-outs

### Platform Staff
- Regional Managers: View properties in their territory
- Operations Managers: View all properties
- Platform Admins: View all properties
- Superusers: View all properties

## Routes

- `/property-overview` - Overview of all accessible properties
- `/property-overview/:propertyId` - Overview of specific property

## Navigation

### Property Owner/Staff Sidebar
- Located under "Property Management" section
- Icon: 🗂️
- Label: "Property Overview"

### Internal Staff Sidebar
- Located under "Property Management" section
- Available to: Regional Manager, Operations Manager, Platform Admin, Superuser
- Icon: 🗂️
- Label: "Property Overview"

## Technical Details

### Components

**PropertyOverviewPage** (`app/pages/PropertyOverviewPage.tsx`)
- Main dashboard page
- Handles data loading and auto-refresh
- Manages room status updates
- Calculates property and floor statistics

**RoomOverviewGrid** (`app/components/rooms/RoomOverviewGrid.tsx`)
- Reusable grid component
- Displays rooms organized by floor
- Supports compact and full view modes
- Color-coded status indicators

### Services

**roomService.getPropertyOverview()** (`app/services/roomService.ts`)
- Fetches rooms for property or all accessible properties
- Calculates statistics (occupancy rates, bed counts)
- Groups rooms by floor
- Returns structured data with stats and floor breakdowns

### API Endpoints

**GET /api/internal/rooms/status**
- Returns all rooms with current status
- Supports `propertyId` query parameter
- Applies data scoping based on user role
- Returns: room details, status, bed info, floor number

**PUT /api/internal/rooms/:id/status**
- Updates room status
- Requires `canUpdateRoomStatus` permission
- Creates audit trail in RoomStatus table
- Updates `lastCleanedAt` when status = vacant_clean

### Data Scoping

The dashboard automatically applies data scoping based on user type:

- **Property Owners**: Only their owned properties
- **Property Staff**: Only assigned property
- **Regional Managers**: Properties in their territory
- **Operations Managers**: All properties
- **Platform Admins**: All properties
- **Superusers**: All properties

## Usage Examples

### For Property Owners

1. Navigate to "Property Overview" from sidebar
2. View all your properties' room status
3. Click any room to update status or view details
4. Monitor occupancy rates in real-time
5. Use floor-level stats to identify housekeeping needs

### For Receptionists

1. Open "Property Overview" at start of shift
2. Check which rooms are clean and ready
3. Click rooms to update status after housekeeping
4. Monitor occupied rooms for check-outs
5. Use dashboard to assign rooms during check-in

### For Managers

1. Use overview to monitor property performance
2. Track occupancy rates throughout the day
3. Identify rooms needing housekeeping attention
4. Coordinate with housekeeping staff
5. Plan room assignments for incoming bookings

## Customization Options

### Auto-Refresh Interval
Default: 30 seconds
Can be modified in `PropertyOverviewPage.tsx`:
```typescript
const REFRESH_INTERVAL = 30000; // milliseconds
```

### Grid Density
Modify in `RoomOverviewGrid.tsx`:
- `compact={true}` - More rooms per row, minimal info
- `compact={false}` - Larger cards with more details

### Status Colors
Customize in `getStatusColor()` function:
- Green: `bg-green-500` (Vacant/Clean)
- Yellow: `bg-yellow-500` (Occupied)
- Red: `bg-red-500` (Vacant/Dirty)

## Future Enhancements

### Planned Features
- [ ] Filter by status (show only occupied, only dirty, etc.)
- [ ] Search rooms by number
- [ ] Export floor plan as PDF
- [ ] Print-friendly view
- [ ] Drag-and-drop room status updates
- [ ] Bulk status updates (select multiple rooms)
- [ ] Housekeeping task assignment from overview
- [ ] Maintenance request creation from room card
- [ ] Historical occupancy trends
- [ ] Predictive analytics for occupancy

### Integration Opportunities
- Link to booking system for occupied rooms
- Show guest names (with privacy controls)
- Display check-out times for occupied rooms
- Show housekeeping task status
- Integrate maintenance request status
- Real-time notifications for status changes

## Troubleshooting

### Dashboard not loading
- Check user permissions
- Verify property assignment for staff
- Check browser console for errors
- Ensure backend API is running

### Rooms not updating
- Check auto-refresh is enabled
- Verify user has `canUpdateRoomStatus` permission
- Check network connectivity
- Try manual refresh button

### Missing rooms
- Verify rooms have `isActive = true`
- Check data scoping is correct
- Ensure rooms have `propertyId` set
- Verify user has access to property

### Performance issues
- Reduce auto-refresh frequency
- Use compact grid mode
- Filter by specific property
- Check database indexes on rooms table

## Related Documentation

- [Room Management](./ROOM_MANAGEMENT.md)
- [Data Scoping](../backend/DATA_SCOPING.md)
- [Role-Based Access Control](./ROLE_BASED_NAVIGATION_FIX.md)
- [Property Management](./PROPERTIES_PAGE_OVERFLOW_FIX.md)

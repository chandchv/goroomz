# Property Switching Test Guide

This guide explains how to test the property switching functionality to ensure dashboard data refreshes when properties are changed.

## Test Setup

1. **Backend Server**: Running on http://localhost:5000
2. **Frontend Server**: Running on http://localhost:5174
3. **Test User**: `sekhar.iw@gmail.com` / `Sekhar@123` (superuser with access to multiple properties)

## Test Steps

### 1. Login and Initial Load
1. Navigate to http://localhost:5174/login
2. Login with test credentials
3. Navigate to the dashboard
4. **Expected**: Dashboard loads with data for the first property

### 2. Property Switching (Desktop)
1. Look for the property dropdown in the header (visible on desktop)
2. Note the current property name and dashboard data (KPIs, activities, alerts)
3. Click the dropdown and select a different property
4. **Expected**: 
   - Dashboard shows loading state
   - Console logs show: "Fetching dashboard data for property: [propertyId] [propertyName]"
   - Dashboard data updates with different values
   - Console logs show: "Dashboard data updated for property: [propertyName]"

### 3. Property Switching (Mobile)
1. Resize browser to mobile view (< 1024px width)
2. Look for the property name button in the header
3. Click the property name button
4. **Expected**: Modal opens with property list
5. Select a different property from the modal
6. **Expected**: 
   - Modal closes
   - Dashboard refreshes with new data
   - Header shows the new property name

### 4. Data Verification
After switching properties, verify that:
- **KPI Cards**: Show different occupancy rates, revenue, room counts
- **Activities**: Show different guest names, room numbers, check-in/out times
- **Alerts**: Show different overdue payments, maintenance requests, dirty rooms
- **Room Status**: Shows different room counts and statuses

## Backend Logging

The backend now logs property-specific requests:
```
Dashboard KPIs requested for propertyId: [propertyId] by user: [email]
Dashboard Activities requested for propertyId: [propertyId] by user: [email]
Dashboard Alerts requested for propertyId: [propertyId] by user: [email]
```

## Frontend Logging

The frontend logs property changes:
```
Fetching dashboard data for property: [propertyId] [propertyName]
Dashboard data updated for property: [propertyName]
Switching to property: [propertyName]
```

## Expected Behavior

### Property-Specific Data Generation
Each property generates different data based on:
- **Property ID**: Used as seed for generating consistent but different data
- **Room Numbers**: Different base room numbers (100 + propertyId seed)
- **Guest Names**: Different guest names based on property seed
- **Revenue**: Different revenue amounts based on property characteristics
- **Occupancy**: Different occupancy rates per property
- **Alerts**: Different maintenance issues and overdue payments

### Data Consistency
- Same property should always show the same data (deterministic)
- Different properties should show noticeably different data
- Data should update immediately when property is switched

## Troubleshooting

### Dashboard Not Refreshing
1. Check browser console for errors
2. Verify backend logs show property-specific requests
3. Check network tab for API calls with propertyId parameter

### No Property Selector Visible
1. Ensure user has multiple properties
2. Check if user role is 'owner' or 'superuser'
3. Verify PropertyContext is loading properties correctly

### Same Data for All Properties
1. Check backend logs to ensure propertyId is being received
2. Verify property seed generation is working
3. Check if property-specific calculations are being used

## Test Data Examples

### Property A (ID: abc-123)
- Rooms: 45 total, 32 occupied (71% occupancy)
- Revenue: ₹1,25,000
- Activities: Guest 3, Guest 4, Guest 5 in rooms 123, 124, 125
- Alerts: 2 overdue payments, 1 maintenance request

### Property B (ID: def-456)  
- Rooms: 38 total, 25 occupied (66% occupancy)
- Revenue: ₹98,000
- Activities: Guest 6, Guest 7, Guest 8 in rooms 145, 146, 147
- Alerts: 1 overdue payment, 2 dirty rooms

*Note: Actual values will vary based on property ID hash, but should be consistent for each property.*
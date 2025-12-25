# Implementation Tasks

## Overview

This document outlines the implementation tasks for the property-room hierarchy feature. The focus is on making existing components accessible and functional, rather than building from scratch. Most components already exist but need routing fixes and backend integration.

## Phase 1: Internal Management System - Routing & Integration

- [x] 1. Add Property Detail Route





  - Register route in `internal-management/app/routes.ts`: `route("properties/:propertyId", "routes/property-detail.tsx")`
  - Verify PropertyDetailPage component exists and is properly configured
  - Test navigation to `/properties/:propertyId` loads correctly
  - Add role-based protection using RoleProtectedRoute
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 2. Update PropertiesManagementPage with View Details Button





  - Add "View Details" button to each property card in PropertiesManagementPage
  - Implement navigation to `/properties/:propertyId` on click
  - Add loading state during navigation
  - Style button consistently with existing design
  - _Requirements: 1.1, 1.2_

- [x] 3. Test PropertyDetailPage Room Display





  - Verify PropertyDetailPage displays rooms grouped by floor
  - Check room information display (room number, sharing type, beds, status)
  - Test occupancy calculation logic
  - Add error handling for properties with no rooms
  - Fix any bugs in room display or data fetching
  - _Requirements: 1.3, 3.1, 3.2, 3.3_

- [x] 4. Create Bulk Room Creation Backend Endpoint





  - Create POST `/api/internal/superuser/bulk-create-rooms` in `backend/routes/internal/superuser.js`
  - Accept: propertyId, floorNumber, startRoom, endRoom, sharingType
  - Validate floor number (1-50), room range (max 100 per batch)
  - Generate room numbers using floor convention (e.g., 101, 102 for floor 1)
  - Create beds based on sharing type (single=1, double=2, triple=3, quad=4, dormitory=6)
  - Use transaction for all-or-nothing creation
  - Add audit logging
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4.1 Write property test for bulk room creation







  - **Property 2: Bulk creation completeness**
  - **Validates: Requirements 2.2**
  - For any valid bulk creation request, all rooms in the range should be created with correct bed counts
  - Test with fast-check, 100 iterations

- [x] 5. Connect BulkRoomCreationModal to Backend





  - Update `internal-management/app/components/BulkRoomCreationModal.tsx`
  - Wire form submission to new bulk creation endpoint
  - Add form validation matching backend requirements
  - Implement room preview generation
  - Add error handling and success messages
  - Refresh parent component on success
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6. Add "Add Rooms" Button to PropertyDetailPage





  - Add button to PropertyDetailPage header
  - Open BulkRoomCreationModal on click
  - Pass property context to modal
  - Refresh room list on successful creation
  - Add permission check (only for authorized users)
  - _Requirements: 1.4, 2.1_

- [ ] 7. Checkpoint - Internal Management System
  - Ensure all tests pass, ask the user if questions arise

## Phase 2: Property Owner Dashboard - Room Viewing

- [ ] 8. Create PropertyRoomView Component
  - Create `src/components/PropertyRoomView.jsx`
  - Implement floor-wise room display layout
  - Add room statistics cards (total, occupied, vacant)
  - Create room card component with occupancy indicators
  - Add filter bar (floor, status, sharing type)
  - Implement responsive design for mobile
  - _Requirements: 5.1, 5.2, 6.1, 6.2_

- [ ]* 8.1 Write property test for floor filter
  - **Property 3: Floor filter correctness**
  - **Validates: Requirements 6.1**
  - For any room list and floor filter, all returned rooms should match the selected floor
  - Test with fast-check, 100 iterations

- [ ] 9. Create RoomDetailModal Component
  - Create `src/components/RoomDetailModal.jsx`
  - Design bed grid layout showing occupancy status
  - Display booking information for occupied beds
  - Add room information section
  - Implement edit pricing functionality (if owner has permission)
  - Add booking history section
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 10. Create Public API Endpoints for Property Owners
  - Create `backend/routes/rooms.js` (public routes)
  - Add GET `/api/rooms/:propertyId/rooms` endpoint
  - Add GET `/api/rooms/:roomId/beds` endpoint
  - Add PUT `/api/rooms/:roomId/pricing` endpoint
  - Implement ownership validation middleware
  - Include occupancy calculations in responses
  - Add rate limiting
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ]* 10.1 Write property test for occupancy calculation
  - **Property 4: Occupancy calculation accuracy**
  - **Validates: Requirements 8.1, 8.2**
  - For any room with bed assignments, occupancy percentage should equal (occupied beds / total beds) * 100
  - Test with fast-check, 100 iterations

- [ ] 11. Update OwnerDashboard Integration
  - Open `src/pages/OwnerDashboard.jsx`
  - Add room count and occupancy to property cards
  - Add "View Rooms" button to each property
  - Integrate PropertyRoomView component
  - Update data fetching to include room statistics
  - Add upcoming check-ins/check-outs section
  - _Requirements: 5.1, 5.3, 5.4_

- [ ] 12. Implement Room Statistics and Calculations
  - Create `src/utils/roomStatistics.js`
  - Add occupancy calculation functions
  - Add revenue calculation based on bookings
  - Implement date range filtering
  - Create summary statistics across properties
  - Add trend indicators
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 13. Add Upcoming Events Display
  - Create UpcomingEvents component
  - Display check-ins and check-outs for next 7 days
  - Highlight today's events
  - Add click handler for booking details
  - Group events by date
  - Add refresh functionality
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 14. Checkpoint - Property Owner Dashboard
  - Ensure all tests pass, ask the user if questions arise

## Phase 3: Route Fixes

- [ ] 15. Audit Property Owner Dashboard Routes
  - Create inventory of all routes in `src/` application
  - Test each route manually
  - Document broken routes and error types
  - Check for missing route definitions
  - Verify route parameters handled correctly
  - Test deep linking (direct URL access)
  - Create `src/ROUTE_AUDIT_RESULTS.md` with findings
  - _Requirements: 13.1, 13.2_

- [ ] 16. Fix Broken Navigation Links
  - Fix route definitions in main router
  - Update navigation components with correct paths
  - Fix any missing route components
  - Update link components throughout application
  - Test navigation between all pages
  - Fix redirect loops or incorrect redirects
  - _Requirements: 13.1, 13.2_

- [ ] 17. Add Proper Error Pages
  - Create 404 Not Found page component
  - Create 403 Forbidden page component
  - Create generic error boundary component
  - Add navigation back to dashboard from error pages
  - Style error pages consistently
  - _Requirements: 13.3_

- [ ] 18. Fix API Endpoint Paths
  - Audit all API calls in frontend code
  - Verify endpoint paths match backend routes
  - Fix incorrect base URLs or paths
  - Update API service files
  - Test all API integrations
  - Fix authentication header issues
  - _Requirements: 13.4_

- [ ] 19. Test All Navigation Paths
  - Test navigation from every page to every other page
  - Test direct URL access for all routes
  - Test authentication redirects
  - Test session expiration handling
  - Verify browser back/forward buttons work
  - Test on different browsers and devices
  - _Requirements: 13.5_

- [ ] 20. Checkpoint - Route Fixes Complete
  - Ensure all tests pass, ask the user if questions arise

## Phase 4: Testing & Polish

- [ ]* 21. Write Property-Based Tests
  - Install fast-check testing library if not present
  - Create test generators for Room, Property, BedAssignment
  - Implement remaining property-based tests:
    - **Property 1: Sharing type to bed count mapping** (Requirements 3.3)
    - **Property 5: Filter clear round trip** (Requirements 6.2)
  - Configure tests to run 100 iterations each
  - Add tests to CI pipeline
  - Fix any bugs discovered by property tests
  - _Requirements: All correctness properties_

- [ ]* 22. Write Integration Tests
  - Create test for agent onboarding property with rooms
  - Create test for property owner viewing rooms
  - Create test for room status updates across systems
  - Create test for booking creation and occupancy updates
  - Test data consistency between internal and external systems
  - Add database cleanup between tests
  - _Requirements: Cross-system integration_

- [ ] 23. Performance Optimization
  - Add pagination for room lists (>100 rooms)
  - Implement lazy loading for bed details
  - Add caching for floor groupings
  - Optimize database queries with proper indexes
  - Add virtual scrolling for large room lists
  - Implement React Query for caching
  - _Requirements: Performance considerations_

- [ ] 24. Security Review and Hardening
  - Review all API endpoints for proper authorization
  - Validate property ownership on all room operations
  - Sanitize room numbers and user inputs
  - Add rate limiting to bulk creation endpoint
  - Review audit logging coverage
  - Test for SQL injection and XSS vulnerabilities
  - _Requirements: Security considerations_

- [ ] 25. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise

## Success Criteria

- Agents can view property details with room hierarchy
- Agents can bulk create rooms using floor conventions
- Property owners can view their rooms in dashboard
- Room occupancy calculations are accurate
- All navigation routes work correctly
- All property-based tests pass (100 iterations each)
- Performance acceptable for properties with 500+ rooms
- Security review passes with no critical issues

## Notes

- Most components already exist and just need routing/integration
- Focus on connecting existing pieces rather than building new ones
- PropertyDetailPage and BulkRoomCreationModal are already implemented
- Backend room endpoints exist, need bulk creation endpoint
- Property owner dashboard needs new components for room viewing

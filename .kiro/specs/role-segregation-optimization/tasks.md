# Implementation Plan

- [x] 1. Enhance User Model with Helper Methods





  - Add isPropertyOwner(), isPlatformStaff(), isPropertyStaff() methods to User model
  - Add getUserType() method that returns user type string
  - Add getAccessiblePropertyIds() async method
  - Ensure Sequelize model uses underscored: true for case conversion
  - _Requirements: 1.1, 8.3, 11.1, 11.2, 11.3, 11.4, 11.5, 13.3_

- [ ]* 1.1 Write property test for user type classification
  - **Property 1: User type classification**
  - **Validates: Requirements 1.1, 8.3**

- [ ]* 1.2 Write property test for accessible property IDs
  - **Property 21: Accessible property IDs calculation**
  - **Validates: Requirements 11.5**

- [x] 2. Create PropertyAssignment Model





  - Create new PropertyAssignment model for tracking user-property assignments
  - Add relationships to User and Property models
  - Create migration for property_assignments table
  - Add indexes on userId, propertyId, assignmentType
  - _Requirements: 3.3, 7.1, 7.4_

- [x] 3. Add Data Scoping Middleware





  - Create backend/middleware/dataScoping.js
  - Implement applyScopingMiddleware function
  - Implement applyScopeToWhere helper function
  - Add req.dataScope object with userType, propertyIds, canBypassScoping
  - Handle all user types: property owner, platform staff, property staff
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 7.2, 12.1, 12.2, 12.3, 12.5_

- [x] 3.1 Write property test for property owner data scoping


  - **Property 5: Property owner data scoping**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 4.2, 12.1**

- [x] 3.2 Write property test for superuser bypass


  - **Property 6: Superuser bypass**
  - **Validates: Requirements 3.1, 4.4, 12.5**


- [x] 3.3 Write property test for territory-based scoping


  - **Property 7: Territory-based scoping**
  - **Validates: Requirements 3.2, 4.3, 12.2**

- [x] 3.4 Write property test for agent assignment scoping


  - **Property 8: Agent assignment scoping**
  - **Validates: Requirements 3.3**


- [x] 3.5 Write property test for property staff scoping


  - **Property 14: Property staff scoping**
  - **Validates: Requirements 7.2, 7.3, 12.3**

- [x] 3.6 Write property test for filter merging


  - **Property 22: Filter merging**
  - **Validates: Requirements 12.4**

- [x] 4. Update Authentication Middleware





  - Update backend/middleware/internalAuth.js
  - Add requirePlatformRole middleware for platform routes
  - Add requirePropertyOwner middleware for owner routes
  - Add requirePropertyStaff middleware for staff routes
  - Ensure middleware chains properly: auth → role check → data scoping
  - _Requirements: 3.4, 3.5, 6.2, 6.3, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 4.1 Write property test for platform route protection






  - **Property 9: Platform route protection**
  - **Validates: Requirements 3.4, 6.2, 6.3, 6.5**

- [x] 4.2 Write property test for role priority enforcement






  - **Property 2: Role priority enforcement**
  - **Validates: Requirements 1.2**

- [ ] 4.3 Write property test for permission set selection

  - **Property 3: Permission set selection**
  - **Validates: Requirements 1.3**

- [ ] 5. Add Role Validation Logic





  - Add validation to prevent role conflicts (owner + internalRole)
  - Add validation for permission scope when updating staff
  - Add validation to prevent self-permission modification
  - Add validation to prevent property owners from assigning internalRole
  - Add hooks to User model for beforeCreate and beforeUpdate
  - _Requirements: 1.5, 7.5, 10.2, 10.4_

- [x] 5.1 Write property test for role conflict prevention


  - **Property 4: Role conflict prevention**
  - **Validates: Requirements 1.5, 8.4**

- [x] 5.2 Write property test for self-permission modification prevention


  - **Property 16: Self-permission modification prevention**
  - **Validates: Requirements 7.5**

- [x] 5.3 Write property test for staff permission scope validation


  - **Property 17: Staff permission scope validation**
  - **Validates: Requirements 10.2**

- [ ]* 5.4 Write property test for platform role creation prevention
  - **Property 19: Platform role creation prevention**
  - **Validates: Requirements 10.4**

- [x] 6. Create Platform Routes Structure





  - Create backend/routes/internal/platform/ directory
  - Move appropriate routes under /platform/ prefix
  - Create platform/properties.js for all-properties view
  - Create platform/owners.js for property owner management
  - Create platform/agents.js for agent management
  - Apply requirePlatformRole middleware to all platform routes
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Update Existing Routes with Data Scoping








  - Update backend/routes/internal/properties.js to use data scoping
  - Update backend/routes/internal/rooms.js to use data scoping
  - Update backend/routes/internal/bookings.js to use data scoping
  - Update backend/routes/internal/staff.js to use data scoping
  - Update backend/routes/internal/reports.js to use data scoping
  - Apply applyScopingMiddleware to all routes
  - Use applyScopeToWhere in query building
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.2, 7.3_

- [ ] 8. Add Scoping Bypass Prevention










  - Add logging for scoping bypass attempts
  - Add validation to reject queries that try to bypass scoping
  - Create audit log entries for bypass attempts
  - Add alerts for repeated bypass attempts
  - _Requirements: 4.5_

- [ ] 8.1 Write property test for scoping bypass prevention

  - **Property 10: Scoping bypass prevention**
  - **Validates: Requirements 4.5**

- [ ] 9. Update Frontend Route Guards











  - Create internal-management/app/components/PlatformRoute.tsx
  - Update ProtectedRoute.tsx to check user type
  - Add route guards for /platform/* routes
  - Add redirect logic for unauthorized access
  - Implement default dashboard determination based on user type
  - _Requirements: 5.4, 6.2, 6.3_

- [ ]* 9.1 Write property test for unauthorized route redirect
  - **Property 12: Unauthorized route redirect**
  - **Validates: Requirements 5.4**

- [x] 10. Update Navigation Components









  - Update Sidebar.tsx to filter menu items by user type
  - Update InternalSidebar.tsx to filter by internal role
  - Add logic to determine which sidebar to render
  - Implement navigation reactivity on role change
  - Update menu items to match new route structure
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [ ]* 10.1 Write property test for navigation reactivity
  - **Property 11: Navigation reactivity**
  - **Validates: Requirements 5.3**

- [ ]* 10.2 Write property test for sidebar component selection
  - **Property 13: Sidebar component selection**
  - **Validates: Requirements 5.5**

- [x] 11. Implement Property Staff Management






  - Add assignedPropertyId field to User model
  - Create API endpoints for property owners to manage staff
  - Add validation to ensure staff are assigned to owner's properties
  - Implement staff deactivation with immediate access revocation
  - Add audit logging for staff management actions
  - _Requirements: 7.1, 7.4, 10.1, 10.3, 10.5_

- [ ]* 11.1 Write property test for property staff assignment
  - **Property 15: Property staff assignment**
  - **Validates: Requirements 7.4, 10.1**

- [ ]* 11.2 Write property test for staff deactivation access revocation
  - **Property 18: Staff deactivation access revocation**
  - **Validates: Requirements 10.3**

- [ ]* 11.3 Write property test for owner audit log access
  - **Property 20: Owner audit log access**
  - **Validates: Requirements 10.5**

- [x] 12. Add Case Conversion Utilities






  - Verify Sequelize models use underscored: true
  - Add utility functions for manual case conversion if needed
  - Update API response serialization to ensure camelCase
  - Add tests for case conversion round-trips
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 12.1 Write property test for Sequelize case conversion






  - **Property 23: Sequelize case conversion**
  - **Validates: Requirements 13.3**

- [ ] 12.2 Write property test for API response case format

  - **Property 24: API response case format**
  - **Validates: Requirements 13.4**

- [x] 13. Create Documentation





  - Create CONVENTIONS.md documenting naming conventions
  - Update API documentation with new /platform/ routes
  - Document data scoping behavior for developers
  - Create user type decision tree diagram
  - Document migration strategy for existing data
  - _Requirements: 13.5_

- [x] 14. Create Test Data Generators




  - Create backend/tests/generators/userGenerator.js
  - Create generators for each user type
  - Create property and territory generators
  - Ensure generators produce valid role combinations
  - Add generators to support property-based tests
  - _Testing infrastructure_

- [x] 15. Database Migration Scripts




  - Create migration to add PropertyAssignment table
  - Create migration to add assignedPropertyId to User
  - Create migration to add indexes for performance
  - Create data migration script for existing users
  - Test migrations on copy of production data
  - _Requirements: All (infrastructure)_

- [x] 16. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

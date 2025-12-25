# Implementation Plan

## Overview

This implementation plan breaks down the Internal Management System into discrete, manageable tasks. Each task builds incrementally on previous work, ensuring the system remains functional throughout development. The plan follows an implementation-first approach where features are built before comprehensive testing.

**Current State:** The GoRoomz platform has a customer-facing website with basic Room, Booking, and User models. The internal management system needs to be built from scratch as a separate application with new models, API endpoints, and frontend.

## Task Breakdown

- [x] 1. Backend: Database schema and models





  - [x] 1.1 Create new database models (RoomStatus, BedAssignment, Payment, PaymentSchedule, SecurityDeposit, MaintenanceRequest, HousekeepingLog, RoomCategory)


    - Create Sequelize models with proper validations and relationships
    - Add indexes for performance optimization
    - Update backend/models/index.js to include new models and associations
    - _Requirements: 5.2, 7.1, 20.1, 21.1, 29.1, 30.1_
  - [x] 1.2 Extend existing models (Room, Booking, User)


    - Add floorNumber, roomNumber, customCategoryId, sharingType, totalBeds, currentStatus, lastCleanedAt, lastMaintenanceAt to Room model
    - Add bookingSource, bedId, actualCheckInTime, actualCheckOutTime, securityDepositId, checkedInBy, checkedOutBy to Booking model
    - Add staffRole and permissions JSONB field to User model
    - Create migration script to add new columns to existing tables
    - _Requirements: 1.1, 5.1, 17.2, 33.1_
  - [x] 1.3 Test database models and associations


    - Verify all models sync correctly
    - Test associations between models
    - Verify indexes are created
    - _Requirements: All data model requirements_
  - [x] 1.4 Write property test for bed assignment consistency






    - **Property 2: Bed assignment consistency**
    - **Validates: Requirements 5.2**

- [x] 2. Backend: Authentication and middleware for internal management




  - [x] 2.1 Create internal management authentication middleware


    - Create auth middleware to verify JWT tokens for internal users
    - Add role-based permission checking middleware
    - Create backend/middleware/internalAuth.js
    - _Requirements: 32.1, 33.1_
  - [x] 2.2 Create internal management authentication routes


    - POST /api/internal/auth/login - Staff login endpoint
    - POST /api/internal/auth/logout - Logout endpoint
    - GET /api/internal/auth/me - Get current user info
    - Create backend/routes/internal/auth.js
    - _Requirements: 32.1, 33.2, 33.3, 33.4, 33.5_

- [x] 3. Backend: Core API endpoints for room management




  - [x] 3.1 Implement room status management endpoints


    - GET /api/internal/rooms/status - Get all rooms with current status
    - PUT /api/internal/rooms/:id/status - Update room status
    - GET /api/internal/rooms/floor/:floorNumber - Get rooms by floor
    - Create backend/routes/internal/rooms.js
    - _Requirements: 1.1, 1.2, 7.1_
  - [x] 3.2 Implement room category management endpoints


    - GET /api/internal/categories - Get custom categories for property
    - POST /api/internal/categories - Create custom category
    - PUT /api/internal/categories/:id - Update category
    - DELETE /api/internal/categories/:id - Delete category (with validation)
    - POST /api/internal/rooms/:id/assign-category - Assign category to room
    - Create backend/routes/internal/categories.js
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 3.3 Implement bed management endpoints for PG rooms


    - GET /api/internal/rooms/:id/beds - Get all beds for a room
    - POST /api/internal/rooms/:id/beds - Create bed assignments when sharing type is set
    - PUT /api/internal/beds/:id/status - Update bed status
    - GET /api/internal/beds/:id/occupant - Get occupant info for a bed
    - Create backend/routes/internal/beds.js
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_
  - [ ]* 3.4 Write property test for room status consistency
    - **Property 1: Room status consistency**
    - **Validates: Requirements 7.1**
  - [ ]* 3.5 Write property test for double-booking prevention
    - **Property 4: Double-booking prevention**
    - **Validates: Requirements 14.1, 14.2, 19.1, 19.2**

- [x] 4. Backend: Booking management endpoints





  - [x] 4.1 Implement check-in/check-out endpoints


    - POST /api/internal/bookings/:id/checkin - Process check-in
    - POST /api/internal/bookings/:id/checkout - Process check-out
    - GET /api/internal/bookings/pending-checkin - Get today's pending check-ins
    - GET /api/internal/bookings/pending-checkout - Get today's pending check-outs
    - Create backend/routes/internal/bookings.js
    - _Requirements: 8.1, 8.2, 8.3, 9.1, 9.2, 9.3_
  - [x] 4.2 Extend booking creation to support offline bookings


    - POST /api/internal/bookings - Create offline booking
    - Add bookingSource field handling
    - Add bed selection for PG shared rooms
    - Implement availability checking across online and offline bookings
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 17.2_
  - [x] 4.3 Implement booking filtering and search


    - GET /api/internal/bookings - Get all bookings with filters
    - Add filters for status, date range, booking source
    - Add search by guest name and room number
    - _Requirements: 11.3, 11.4, 11.5_
  - [x] 4.4 Write property test for check-in status transition






    - **Property 10: Check-in status transition**
    - **Validates: Requirements 8.3**
  - [x] 4.5 Write property test for check-out status transition






    - **Property 11: Check-out status transition**
    - **Validates: Requirements 9.3**
  - [x] 4.6 Write property test for bed-level double-booking prevention






    - **Property 5: Bed-level double-booking prevention**
    - **Validates: Requirements 14.3, 19.4**

- [x] 5. Backend: Payment management endpoints





  - [x] 5.1 Implement payment recording endpoints


    - GET /api/internal/payments - Get all payments for property
    - POST /api/internal/payments - Record a payment
    - PUT /api/internal/payments/:id - Update payment
    - GET /api/internal/payments/overdue - Get overdue payments
    - Create backend/routes/internal/payments.js
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 22.1, 22.2_
  - [x] 5.2 Implement payment schedule management for PG


    - GET /api/internal/payments/schedule/:bookingId - Get payment schedule
    - POST /api/internal/payments/schedule - Create payment schedule on check-in
    - Implement automatic overdue calculation
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_


  - [x] 5.3 Implement security deposit endpoints

    - POST /api/internal/deposits - Record security deposit
    - PUT /api/internal/deposits/:id/refund - Process refund with deductions
    - GET /api/internal/deposits/:bookingId - Get deposit info
    - Create backend/routes/internal/deposits.js
    - _Requirements: 29.1, 29.2, 29.3, 29.4_
  - [ ]* 5.4 Write property test for payment schedule creation
    - **Property 15: Payment schedule creation**
    - **Validates: Requirements 20.1**
  - [ ]* 5.5 Write property test for payment status calculation
    - **Property 16: Payment status calculation**
    - **Validates: Requirements 20.4**
  - [ ]* 5.6 Write property test for security deposit refund calculation
    - **Property 19: Security deposit refund calculation**
    - **Validates: Requirements 29.4**

- [x] 6. Backend: Housekeeping and maintenance endpoints





  - [x] 6.1 Implement housekeeping endpoints


    - GET /api/internal/housekeeping/tasks - Get pending cleaning tasks
    - POST /api/internal/housekeeping/tasks/:roomId/complete - Mark room as clean
    - GET /api/internal/housekeeping/history/:roomId - Get cleaning history
    - Create backend/routes/internal/housekeeping.js
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - [x] 6.2 Implement maintenance endpoints


    - GET /api/internal/maintenance/requests - Get maintenance requests
    - POST /api/internal/maintenance/requests - Create maintenance request
    - PUT /api/internal/maintenance/requests/:id - Update request status
    - GET /api/internal/maintenance/requests/:roomId/history - Get maintenance history
    - Create backend/routes/internal/maintenance.js
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5_
  - [ ]* 6.3 Write property test for housekeeping task priority
    - **Property 24: Housekeeping task priority**
    - **Validates: Requirements 13.4**

- [x] 7. Backend: Reporting endpoints





  - [x] 7.1 Implement occupancy report endpoint


    - GET /api/internal/reports/occupancy - Generate occupancy report
    - Calculate occupancy percentage for date range
    - Break down by room category and floor
    - Create backend/routes/internal/reports.js
    - _Requirements: 23.1, 23.2, 23.3, 23.4_
  - [x] 7.2 Implement revenue report endpoint


    - GET /api/internal/reports/revenue - Generate revenue report
    - Calculate total revenue and breakdown by category/source
    - Include period comparison
    - _Requirements: 24.1, 24.2, 24.3, 24.4_
  - [x] 7.3 Implement booking report endpoint


    - GET /api/internal/reports/bookings - Generate booking report
    - Calculate booking statistics and trends
    - Include online vs offline distribution
    - _Requirements: 25.1, 25.2, 25.3, 25.4_
  - [x] 7.4 Implement housekeeping report endpoint


    - GET /api/internal/reports/housekeeping - Generate housekeeping report
    - Calculate cleaning efficiency metrics
    - _Requirements: 26.1, 26.2, 26.3, 26.4_
  - [x] 7.5 Implement payment collection report endpoint


    - GET /api/internal/reports/payments - Generate payment collection report
    - Calculate collection efficiency
    - List defaulters
    - _Requirements: 27.1, 27.2, 27.3, 27.4_
  - [x] 7.6 Implement report export functionality


    - POST /api/internal/reports/export - Export report to PDF/CSV
    - Install and configure PDF generation library (e.g., pdfkit or puppeteer)
    - _Requirements: 23.5, 24.5, 25.5, 26.5, 27.5_
  - [ ]* 7.7 Write property test for occupancy calculation
    - **Property 31: Occupancy calculation**
    - **Validates: Requirements 23.1**
  - [ ]* 7.8 Write property test for revenue calculation
    - **Property 32: Revenue calculation**
    - **Validates: Requirements 24.1**

- [x] 8. Backend: Dashboard and staff management





  - [x] 8.1 Implement dashboard KPI endpoint


    - GET /api/internal/dashboard/kpis - Get key performance indicators
    - GET /api/internal/dashboard/activities - Get today's activities
    - GET /api/internal/dashboard/alerts - Get alerts (overdue payments, maintenance, dirty rooms)
    - Create backend/routes/internal/dashboard.js
    - _Requirements: 31.1, 31.2, 31.3, 31.4_
  - [x] 8.2 Implement staff management endpoints


    - GET /api/internal/staff - Get all staff users
    - POST /api/internal/staff - Create staff user
    - PUT /api/internal/staff/:id - Update staff user
    - DELETE /api/internal/staff/:id - Delete staff user
    - PUT /api/internal/staff/:id/permissions - Update permissions
    - Create backend/routes/internal/staff.js
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5_
  - [-] 8.3 Write property test for role permission enforcement




    - **Property 28: Role permission enforcement**
    - **Validates: Requirements 33.2**

- [-] 9. Backend: Superuser management (Admin only)



  - [-] 9.1 Implement property owner management endpoints

    - GET /api/internal/superuser/property-owners - Get all property owners
    - POST /api/internal/superuser/property-owners - Create new property owner with credentials
    - GET /api/internal/superuser/property-owners/:id - Get property owner details
    - PUT /api/internal/superuser/property-owners/:id - Update property owner
    - PUT /api/internal/superuser/property-owners/:id/deactivate - Deactivate account
    - Implement email service to send credentials (using nodemailer or similar)
    - Create backend/routes/internal/superuser.js
    - _Requirements: 36.1, 36.2, 36.3, 36.4, 36.5_
  - [x] 9.2 Implement property management endpoints for superuser



    - POST /api/internal/superuser/properties - Create property for owner
    - PUT /api/internal/superuser/properties/:id - Update property
    - POST /api/internal/superuser/properties/:id/bulk-rooms - Bulk create rooms
    - PUT /api/internal/superuser/properties/:id/transfer-ownership - Transfer property
    - GET /api/internal/superuser/properties/:id/statistics - Get property stats
    - _Requirements: 37.1, 37.2, 37.3, 37.4, 37.5_
  - [x] 9.3 Write property test for property owner account creation






    - **Property 34: Property owner account creation**
    - **Validates: Requirements 36.2**
  - [x] 9.4 Write property test for bulk room creation consistency






    - **Property 36: Bulk room creation consistency**
    - **Validates: Requirements 37.3**

- [x] 10. Backend: Register internal routes in server.js




  - [x] 10.1 Update backend/server.js to include all internal management routes

    - Import and mount all /api/internal/* routes
    - Apply authentication middleware to internal routes
    - Test all endpoints are accessible
    - _Requirements: All backend requirements_

- [x] 11. Checkpoint - Backend API complete






  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Frontend: Project setup and authentication





  - [x] 12.1 Create new React app for internal management


    - Initialize Vite project in /internal-management folder
    - Install dependencies (React Router, Axios, Tailwind CSS, Radix UI, Recharts)
    - Configure environment variables for API URL
    - Set up Tailwind CSS configuration
    - Create basic folder structure (components, pages, services, contexts, hooks, utils)
    - _Requirements: 32.1_
  - [x] 12.2 Implement authentication flow


    - Create LoginPage component (internal-management/src/pages/LoginPage.jsx)
    - Create AuthContext for managing authentication state
    - Implement JWT token storage in localStorage
    - Create ProtectedRoute component for route protection
    - Create API service for authentication (internal-management/src/services/authService.js)
    - _Requirements: 32.1, 32.2_
  - [x] 12.3 Create main layout and navigation


    - Implement MainLayout component with sidebar navigation
    - Add property selector dropdown in header
    - Add connection status indicator
    - Implement role-based menu items (show/hide based on user role)
    - Create Header and Sidebar components
    - _Requirements: 15.5, 16.5, 32.2_

- [x] 13. Frontend: Dashboard implementation




  - [x] 13.1 Create Dashboard page and components


    - Create DashboardPage component (internal-management/src/pages/DashboardPage.jsx)
    - Create KPI cards component showing occupancy, revenue, pending payments
    - Create RoomStatusSummary component showing occupied/vacant/dirty counts
    - Create TodayActivities component showing check-ins, check-outs, payments due
    - Create AlertsSection component for overdue payments, maintenance, dirty rooms
    - Create API service for dashboard (internal-management/src/services/dashboardService.js)
    - _Requirements: 31.1, 31.2, 31.3, 31.4_
  - [x] 13.2 Implement auto-refresh functionality


    - Add 60-second auto-refresh for dashboard data using setInterval
    - Show last updated timestamp
    - Add manual refresh button
    - _Requirements: 31.5_

- [x] 14. Frontend: Floor view and room management





  - [x] 14.1 Create FloorView page and components


    - Create FloorViewPage component (internal-management/src/pages/FloorViewPage.jsx)
    - Implement floor selector/tabs component
    - Create RoomGrid component displaying rooms in grid layout
    - Create RoomCard component with room number, category, status
    - Use color-coded status indicators (green=vacant/clean, yellow=occupied, red=vacant/dirty)
    - Create API service for rooms (internal-management/src/services/roomService.js)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 14.2 Create RoomDetailModal component


    - Display room information (number, floor, category, amenities)
    - Show current status with update controls
    - Display booking history table
    - Show maintenance history
    - Add edit room button
    - _Requirements: 7.1, 12.1_
  - [x] 14.3 Create RoomCategoryManager component


    - Create CategoryManagementPage (internal-management/src/pages/CategoryManagementPage.jsx)
    - List custom categories in table
    - Add/edit/delete category forms
    - Assign category to rooms functionality
    - Create API service for categories (internal-management/src/services/categoryService.js)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 14.4 Implement room status update controls


    - Quick status change buttons in RoomDetailModal
    - Status history log display
    - Confirmation dialogs for status changes
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 15. Frontend: Booking management





  - [x] 15.1 Create BookingList page and components


    - Create BookingManagementPage (internal-management/src/pages/BookingManagementPage.jsx)
    - Implement tabbed view (All, Pending, Active, Completed, Cancelled)
    - Add filters component (date range, room, booking source)
    - Add search functionality by guest name or room number
    - Create BookingCard component displaying key information
    - Create API service for bookings (internal-management/src/services/bookingService.js)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - [x] 15.2 Create BookingDetailModal component


    - Display guest information (name, email, phone)
    - Display room information
    - Show payment status and history
    - Add status update controls
    - Show special requests
    - Add check-in/check-out buttons
    - _Requirements: 11.2_
  - [x] 15.3 Create CreateBookingForm component


    - Create CreateBookingPage or modal (internal-management/src/components/CreateBookingModal.jsx)
    - Guest information input fields
    - Room selection dropdown with availability check
    - Date selection (daily for Hotels, monthly for PGs)
    - Bed selection for PG shared rooms
    - Price calculation display
    - Submit button to create booking
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 15.4 Implement property type-specific UI


    - Show/hide fields based on Hotel vs PG property type
    - Different date pickers for daily vs monthly
    - Bed selection only for PG shared rooms
    - Conditional rendering based on property type
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 16. Frontend: Check-in and check-out





  - [x] 16.1 Create CheckInForm component


    - Create CheckInPage (internal-management/src/pages/CheckInPage.jsx)
    - Booking lookup by ID or guest name
    - Guest identity verification fields
    - Room assignment confirmation
    - Security deposit recording
    - Submit button to complete check-in
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 16.2 Create CheckOutForm component


    - Create CheckOutPage (internal-management/src/pages/CheckOutPage.jsx)
    - Booking lookup by ID or guest name
    - Final charges calculation display
    - Checkout time recording
    - Security deposit refund processing with deductions
    - Room inspection checklist
    - Submit button to complete check-out
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 17. Frontend: Payment management




  - [x] 17.1 Create PaymentDashboard page and components


    - Create PaymentDashboardPage (internal-management/src/pages/PaymentDashboardPage.jsx)
    - Summary cards showing collected, pending, overdue amounts
    - Overdue payments list with sorting
    - Filter by floor/room
    - Quick payment recording button
    - Create API service for payments (internal-management/src/services/paymentService.js)
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_
  - [x] 17.2 Create PaymentScheduleView component (PG-specific)


    - Create PaymentSchedulePage (internal-management/src/pages/PaymentSchedulePage.jsx)
    - Monthly payment calendar view
    - Per-bed payment status display
    - Upcoming due dates list
    - Payment history table
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_
  - [x] 17.3 Create PaymentRecordForm component


    - Create PaymentRecordModal (internal-management/src/components/PaymentRecordModal.jsx)
    - Amount input field
    - Payment method selection dropdown
    - Transaction reference input
    - Notes field
    - Submit button to record payment
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_
  - [x] 17.4 Create SecurityDepositManager component


    - Create SecurityDepositPage (internal-management/src/pages/SecurityDepositPage.jsx)
    - Deposit recording form at check-in
    - Deduction tracking with reasons
    - Refund processing form
    - Deposit history display
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5_

- [x] 18. Frontend: Housekeeping and maintenance





  - [x] 18.1 Create HousekeepingDashboard page and components


    - Create HousekeepingPage (internal-management/src/pages/HousekeepingPage.jsx)
    - Pending tasks list showing vacant/dirty rooms
    - Priority indicators (time since checkout)
    - Filter by floor
    - Mark as clean button for each room
    - Create API service for housekeeping (internal-management/src/services/housekeepingService.js)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  - [x] 18.2 Create MaintenanceRequestList page and components


    - Create MaintenancePage (internal-management/src/pages/MaintenancePage.jsx)
    - Tabbed view (Pending, In Progress, Completed)
    - Priority indicators (low, medium, high, urgent)
    - Filter options (room, floor, priority)
    - Create new request button
    - Create API service for maintenance (internal-management/src/services/maintenanceService.js)
    - _Requirements: 30.2_
  - [x] 18.3 Create MaintenanceRequestForm component


    - Create MaintenanceRequestModal (internal-management/src/components/MaintenanceRequestModal.jsx)
    - Room selection dropdown
    - Issue description textarea
    - Priority level selection
    - Photo upload functionality
    - Staff assignment dropdown
    - Submit button
    - _Requirements: 30.1, 30.3_
  - [x] 18.4 Create MaintenanceDetailView component


    - Create MaintenanceDetailModal (internal-management/src/components/MaintenanceDetailModal.jsx)
    - Request details display
    - Status update controls
    - Work performed log
    - Costs tracking input
    - Completion button
    - _Requirements: 30.4, 30.5_

- [x] 19. Frontend: Reporting





  - [x] 19.1 Create ReportSelector component and page


    - Create ReportsPage (internal-management/src/pages/ReportsPage.jsx)
    - Report type dropdown (Occupancy, Revenue, Booking, Housekeeping, Payment Collection)
    - Date range picker component
    - Filter options based on report type
    - Export format selection (PDF/CSV)
    - Generate report button
    - Create API service for reports (internal-management/src/services/reportService.js)
    - _Requirements: 23.5, 24.5, 25.5, 26.5, 27.5_
  - [x] 19.2 Create OccupancyReport component


    - Create OccupancyReportView (internal-management/src/components/reports/OccupancyReportView.jsx)
    - Occupancy percentage chart using Recharts
    - Breakdown by category table
    - Breakdown by floor table
    - _Requirements: 23.1, 23.2, 23.3, 23.4_
  - [x] 19.3 Create RevenueReport component


    - Create RevenueReportView (internal-management/src/components/reports/RevenueReportView.jsx)
    - Total revenue chart using Recharts
    - Revenue by category/source breakdown
    - Period comparison chart
    - Payment status breakdown
    - _Requirements: 24.1, 24.2, 24.3, 24.4_
  - [x] 19.4 Create BookingReport component


    - Create BookingReportView (internal-management/src/components/reports/BookingReportView.jsx)
    - Booking statistics cards
    - Online vs offline distribution pie chart
    - Trend charts (line chart)
    - Guest statistics table
    - _Requirements: 25.1, 25.2, 25.3, 25.4_
  - [x] 19.5 Create HousekeepingReport component


    - Create HousekeepingReportView (internal-management/src/components/reports/HousekeepingReportView.jsx)
    - Cleaning efficiency metrics cards
    - Room turnover time chart
    - Status distribution over time chart
    - _Requirements: 26.1, 26.2, 26.3, 26.4_
  - [x] 19.6 Create PaymentCollectionReport component (PG-specific)


    - Create PaymentCollectionReportView (internal-management/src/components/reports/PaymentCollectionReportView.jsx)
    - Collection efficiency percentage display
    - Payment trends chart
    - Defaulters list table
    - _Requirements: 27.1, 27.2, 27.3, 27.4_

- [x] 20. Frontend: Staff management




  - [x] 20.1 Create StaffUserList page and components


    - Create StaffManagementPage (internal-management/src/pages/StaffManagementPage.jsx)
    - List of staff accounts in table
    - Role indicators (badges)
    - Active/inactive status display
    - Create new staff button
    - Edit and delete buttons for each staff
    - Create API service for staff (internal-management/src/services/staffService.js)
    - _Requirements: 33.1_
  - [x] 20.2 Create StaffUserForm component


    - Create StaffUserModal (internal-management/src/components/StaffUserModal.jsx)
    - Name, email, phone input fields
    - Role selection dropdown (front_desk, housekeeping, maintenance, manager)
    - Permission checkboxes based on role
    - Password generation button
    - Submit button to create/update staff
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5_

- [x] 21. Frontend: Superuser management (Admin only)




  - [x] 21.1 Create PropertyOwnerList page and components


    - Create PropertyOwnerManagementPage (internal-management/src/pages/PropertyOwnerManagementPage.jsx)
    - List all property owners with search and filters
    - Show basic info (name, email, properties count, status)
    - Active/inactive indicators
    - Create new property owner button
    - View details button
    - Create API service for superuser (internal-management/src/services/superuserService.js)
    - _Requirements: 36.1_
  - [x] 21.2 Create PropertyOwnerForm component


    - Create PropertyOwnerModal (internal-management/src/components/PropertyOwnerModal.jsx)
    - Name, email, phone input fields
    - Property details section
    - Generate credentials button
    - Display generated credentials
    - Send credentials via email option
    - _Requirements: 36.2, 36.3_
  - [x] 21.3 Create PropertyOwnerDetailView component


    - Create PropertyOwnerDetailPage (internal-management/src/pages/PropertyOwnerDetailPage.jsx)
    - Display owner information
    - List of properties owned
    - Subscription status
    - Account activity log
    - Deactivate account button
    - _Requirements: 36.4, 36.5_
  - [x] 21.4 Create PropertyManagementForm component


    - Create PropertyManagementModal (internal-management/src/components/PropertyManagementModal.jsx)
    - Property name, type (Hotel/PG), address inputs
    - Owner assignment dropdown
    - Default settings based on type
    - Transfer ownership option
    - _Requirements: 37.1, 37.2, 37.5_
  - [x] 21.5 Create BulkRoomCreationForm component


    - Create BulkRoomCreationModal (internal-management/src/components/BulkRoomCreationModal.jsx)
    - Floor number input
    - Room number range (e.g., 101-110)
    - Room category selection
    - Sharing type for PG
    - Preview rooms before creation table
    - Submit button
    - _Requirements: 37.3_
  - [x] 21.6 Create PropertyStatisticsView component


    - Create PropertyStatisticsCard (internal-management/src/components/PropertyStatisticsCard.jsx)
    - Total rooms count display
    - Current occupancy percentage
    - Revenue statistics
    - Recent bookings list
    - _Requirements: 37.4_

- [x] 22. Frontend: Offline functionality and synchronization





  - [x] 22.1 Implement offline detection


    - Create useOnlineStatus hook (internal-management/src/hooks/useOnlineStatus.js)
    - Add connection status monitoring using navigator.onLine
    - Display offline indicator in Header component
    - _Requirements: 16.5, 35.2_
  - [x] 22.2 Implement local data caching with IndexedDB


    - Install and configure Dexie.js for IndexedDB
    - Create cache service (internal-management/src/services/cacheService.js)
    - Cache room status, bookings, guest info
    - Implement cache expiration logic (1 hour)
    - _Requirements: 35.1_
  - [x] 22.3 Implement offline queue


    - Create offline queue service (internal-management/src/services/offlineQueueService.js)
    - Queue changes made while offline
    - Store in IndexedDB
    - _Requirements: 35.3_
  - [x] 22.4 Implement synchronization logic


    - Create sync service (internal-management/src/services/syncService.js)
    - Auto-sync when connection restored
    - Handle sync conflicts with user prompts
    - Show sync status to user in UI
    - _Requirements: 35.4, 35.5_
  - [ ] 22.5 Write property test for offline queue integrity





    - **Property 23: Offline queue integrity**
    - **Validates: Requirements 35.3, 35.4**

- [x] 23. Frontend: Real-time updates




  - [x] 23.1 Implement polling for real-time updates


    - Create polling service (internal-management/src/services/pollingService.js)
    - Poll for new online bookings every 30 seconds
    - Poll for booking status changes
    - Show toast notifications for new bookings
    - _Requirements: 16.1, 16.2, 17.4_
  - [x] 23.2 Implement optimistic UI updates


    - Update UI immediately on user actions
    - Revert if API call fails
    - Show loading states during API calls
    - _Requirements: 16.3_

- [x] 24. Frontend: Responsive design and tablet/mobile optimization





  - [x] 24.1 Implement responsive layouts


    - Update Tailwind config for responsive breakpoints
    - Desktop-optimized layouts for large screens (lg: breakpoint)
    - Tablet-optimized layouts with larger touch targets (md: breakpoint)
    - Quick-access floating action buttons for common tasks
    - Test on different screen sizes
    - _Requirements: 34.1, 34.2, 34.3_
  - [x] 24.2 Implement touch gesture support


    - Install and configure react-swipeable or similar library
    - Swipe gestures for navigation between tabs
    - Long-press for context menus
    - _Requirements: 34.4, 34.5_

- [x] 25. Frontend: Setup routing and navigation




  - [x] 25.1 Configure React Router


    - Install react-router-dom
    - Create App.jsx with router configuration
    - Define all routes for pages
    - Implement protected routes for authenticated users
    - _Requirements: 32.1_

- [x] 26. Checkpoint - Frontend complete





  - Ensure we have created screens for all the features we created in the backend ,Ensure all tests pass, ask the user if questions arise.

- [ ] 27. Integration and end-to-end testing





  - [x]* 27.1 Write integration tests for critical flows


    - Complete booking flow (create → check-in → check-out)
    - Payment recording and tracking
    - Room status updates
    - Install and configure testing library (Vitest + React Testing Library)
    - _Requirements: All_
  - [ ]* 27.2 Write end-to-end tests
    - Test complete user journeys
    - Test across different roles
    - Test offline functionality
    - Install and configure Playwright or Cypress
    - _Requirements: All_

- [-] 28. Documentation and deployment



  - [ ] 28.1 Write API documentation


    - Document all internal management endpoints
    - Include request/response examples
    - Document authentication requirements
    - Create API_DOCUMENTATION.md file
  - [ ] 28.2 Write user guide
    - Create user manual for property owners
    - Create role-specific guides for staff
    - Include screenshots and workflows
    - Create USER_GUIDE.md file
  - [ ] 28.3 Set up deployment pipeline
    - Configure build process for internal-management app
    - Create production build script
    - Set up environment variables for production
    - Configure PWA manifest and service worker
  - [ ] 28.4 Deploy to staging environment
    - Deploy backend API to staging server
    - Deploy internal management frontend to staging
    - Test with real property data
    - Gather feedback from property owners

- [ ] 29. Final checkpoint - System complete
  - Ensure all tests pass, ask the user if questions arise.

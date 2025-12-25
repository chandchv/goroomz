# Implementation Plan

## Overview

This implementation plan breaks down the Internal User Role Management System into discrete, manageable tasks. Each task builds incrementally on previous work, ensuring the system remains functional throughout development. The plan follows an implementation-first approach where features are built before comprehensive testing.

**Current State:** The GoRoomz platform has an existing internal management system for property owners and staff. This new system extends it to support a hierarchy of internal platform users (agents, regional managers, operations managers, admins, superusers) who manage the platform itself.

## Task Breakdown

- [-] 1. Backend: Database schema and models for internal user roles




  - [x] 1.1 Extend User model with internal role fields


    - Add internalRole ENUM (agent, regional_manager, operations_manager, platform_admin, superuser)
    - Add internalPermissions JSONB with all permission flags
    - Add territoryId, managerId, commissionRate, isActive, lastLoginAt fields
    - Create migration script for new User fields
    - Update backend/models/User.js
    - _Requirements: 7.1, 7.2, 11.1_

  - [x] 1.2 Create InternalRole model


    - Create Sequelize model with name, displayName, description, defaultPermissions, isCustom
    - Add associations to User model
    - Create backend/models/InternalRole.js
    - _Requirements: 22.1, 22.2_

  - [x] 1.3 Create Lead model


    - Create model with property owner info, business details, status, agent/territory assignment
    - Add indexes for agentId, territoryId, status
    - Create backend/models/Lead.js
    - _Requirements: 1.1, 1.2, 2.2, 4.2_

  - [x] 1.4 Create LeadCommunication model


    - Create model for tracking communications (calls, emails, meetings, notes)
    - Associate with Lead and User models
    - Create backend/models/LeadCommunication.js
    - _Requirements: 12.1, 12.2_

  - [x] 1.5 Create Commission model


    - Create model with agentId, leadId, propertyId, amount, rate, status, payment details
    - Add indexes for agentId, status
    - Create backend/models/Commission.js
    - _Requirements: 1.4, 17.1, 17.2_

  - [x] 1.6 Create Territory model


    - Create model with name, description, regionalManagerId, boundaries (GeoJSON), cities, states
    - Create backend/models/Territory.js
    - _Requirements: 4.1, 4.4, 29.1_

  - [x] 1.7 Create AgentTarget model


    - Create model with agentId, period, dates, target/actual properties and revenue
    - Create backend/models/AgentTarget.js
    - _Requirements: 24.1, 24.2_

  - [x] 1.8 Create SupportTicket model


    - Create model with ticketNumber, propertyOwnerId, title, description, category, priority, status
    - Add indexes for status, assignedTo, propertyOwnerId
    - Create backend/models/SupportTicket.js
    - _Requirements: 25.1, 25.2_

  - [x] 1.9 Create TicketResponse model


    - Create model for ticket responses with message, isInternal, attachments
    - Associate with SupportTicket and User models
    - Create backend/models/TicketResponse.js
    - _Requirements: 25.4_

  - [x] 1.10 Create PropertyDocument model


    - Create model with leadId, documentType, fileName, fileUrl, status, review info
    - Create backend/models/PropertyDocument.js
    - _Requirements: 23.1, 23.2_

  - [x] 1.11 Create AuditLog model


    - Create model with userId, action, resourceType, resourceId, changes, ipAddress
    - Add indexes for userId, resourceType, createdAt
    - Create backend/models/AuditLog.js
    - _Requirements: 21.1, 21.2_

  - [x] 1.12 Create Announcement model


    - Create model with title, content, targetAudience, targetFilters, delivery info
    - Create backend/models/Announcement.js
    - _Requirements: 30.1, 30.2_

  - [x] 1.13 Update model associations in backend/models/index.js


    - Add all associations between new models
    - Test model sync and associations
    - _Requirements: All data model requirements_

  - [ ] 1.14 Write property test for role assignment applies correct permissions


    - **Property 2: Role assignment applies correct permissions**
    - **Validates: Requirements 7.2, 22.2**

- [x] 2. Backend: Authentication and authorization middleware





  - [x] 2.1 Extend internal auth middleware for internal roles


    - Update protectInternal to check internalRole field
    - Add authorizeInternalRoles middleware for role-based access
    - Add requireInternalPermissions middleware for permission checks
    - Update backend/middleware/internalAuth.js
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 2.2 Create audit logging middleware


    - Create middleware to log all internal user actions
    - Capture user ID, action, resource, changes, IP address
    - Create backend/middleware/auditLog.js
    - _Requirements: 21.1, 21.3_

  - [x] 2.3 Write property test for role-based permission enforcement


    - **Property 1: Role-based permission enforcement**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**

- [x] 3. Backend: Internal role management endpoints






  - [x] 3.1 Implement role management endpoints


    - GET /api/internal/roles - Get all roles
    - POST /api/internal/roles - Create custom role (superuser only)
    - PUT /api/internal/roles/:id - Update role permissions
    - DELETE /api/internal/roles/:id - Delete custom role
    - GET /api/internal/roles/:id/users - Get users with role
    - Create backend/routes/internal/roles.js
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

  - [x] 3.2 Write property test for custom role permission consistency


    - **Property 3: Custom role permission consistency**
    - **Validates: Requirements 22.4**

  - [x] 3.3 Write property test for role deletion protection


    - **Property 4: Role deletion protection**
    - **Validates: Requirements 22.5**

- [x] 4. Backend: Internal user management endpoints





  - [x] 4.1 Implement internal user CRUD endpoints


    - GET /api/internal/users - Get all internal users
    - POST /api/internal/users - Create internal user
    - GET /api/internal/users/:id - Get user details
    - PUT /api/internal/users/:id - Update user
    - DELETE /api/internal/users/:id - Deactivate user
    - Create backend/routes/internal/users.js
    - _Requirements: 7.1, 7.3, 7.4, 7.5_

  - [x] 4.2 Implement user permission and territory management


    - PUT /api/internal/users/:id/permissions - Update permissions
    - PUT /api/internal/users/:id/territory - Assign territory
    - GET /api/internal/users/:id/performance - Get performance metrics
    - _Requirements: 7.2, 4.1, 3.2_

  - [x] 4.3 Write property test for user deactivation access revocation


    - **Property 28: User deactivation access revocation**
    - **Validates: Requirements 7.5**

- [x] 5. Backend: Lead management endpoints






  - [x] 5.1 Implement lead CRUD endpoints


    - GET /api/internal/leads - Get all leads (filtered by role/territory)
    - POST /api/internal/leads - Create new lead
    - GET /api/internal/leads/:id - Get lead details
    - PUT /api/internal/leads/:id - Update lead
    - DELETE /api/internal/leads/:id - Delete lead
    - Create backend/routes/internal/leads.js
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

  - [x] 5.2 Implement lead status and communication endpoints

    - PUT /api/internal/leads/:id/status - Update lead status
    - POST /api/internal/leads/:id/communications - Add communication
    - GET /api/internal/leads/:id/communications - Get communication history
    - _Requirements: 2.4, 12.1, 12.2, 12.4_

  - [x] 5.3 Implement lead approval workflow endpoints

    - POST /api/internal/leads/:id/submit-approval - Submit for approval
    - POST /api/internal/leads/:id/approve - Approve onboarding (regional manager)
    - POST /api/internal/leads/:id/reject - Reject onboarding (regional manager)
    - _Requirements: 18.1, 18.3, 18.4_

  - [x] 5.4 Write property test for required field validation


    - **Property 5: Required field validation**
    - **Validates: Requirements 1.2, 1.5**

  - [x] 5.5 Write property test for agent attribution


    - **Property 6: Agent attribution**
    - **Validates: Requirements 1.4**

  - [x] 5.6 Write property test for lead status timestamp


    - **Property 8: Lead status timestamp**
    - **Validates: Requirements 2.4**

  - [x] 5.7 Write property test for approval workflow


    - **Property 12: Approval workflow**
    - **Validates: Requirements 18.1**

  - [x] 5.8 Write property test for rejection requires reason


    - **Property 13: Rejection requires reason**
    - **Validates: Requirements 18.4**

- [x] 6. Backend: Commission management endpoints





  - [x] 6.1 Implement commission endpoints


    - GET /api/internal/commissions - Get commissions (filtered by role)
    - GET /api/internal/commissions/:id - Get commission details
    - PUT /api/internal/commissions/:id - Update commission
    - POST /api/internal/commissions/:id/mark-paid - Mark as paid
    - GET /api/internal/commissions/agent/:agentId - Get agent commissions
    - Create backend/routes/internal/commissions.js
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [x] 6.2 Implement commission payment and configuration

    - GET /api/internal/commissions/pending - Get pending payments
    - POST /api/internal/commissions/bulk-pay - Process bulk payments
    - PUT /api/internal/commissions/rates - Configure commission rates
    - _Requirements: 8.1, 8.2, 17.5_

  - [x] 6.3 Write property test for commission lifecycle tracking


    - **Property 14: Commission lifecycle tracking**
    - **Validates: Requirements 1.4, 17.2**

  - [x] 6.4 Write property test for commission payment recording


    - **Property 15: Commission payment recording**
    - **Validates: Requirements 17.3**

  - [x] 6.5 Write property test for commission total calculation


    - **Property 16: Commission total calculation**
    - **Validates: Requirements 2.5**

  - [x] 6.6 Write property test for historical commission immutability


    - **Property 17: Historical commission immutability**
    - **Validates: Requirements 8.2**

- [x] 7. Backend: Territory management endpoints





  - [x] 7.1 Implement territory CRUD endpoints


    - GET /api/internal/territories - Get all territories
    - POST /api/internal/territories - Create territory
    - GET /api/internal/territories/:id - Get territory details
    - PUT /api/internal/territories/:id - Update territory
    - DELETE /api/internal/territories/:id - Delete territory
    - Create backend/routes/internal/territories.js
    - _Requirements: 4.1, 4.4, 8.3_

  - [x] 7.2 Implement territory agent and property management


    - GET /api/internal/territories/:id/agents - Get agents in territory
    - POST /api/internal/territories/:id/assign-agent - Assign agent
    - GET /api/internal/territories/:id/properties - Get properties in territory
    - GET /api/internal/territories/:id/statistics - Get territory stats
    - _Requirements: 3.1, 3.3, 4.1, 4.2_

  - [x] 7.3 Write property test for territory-based lead assignment


    - **Property 9: Territory-based lead assignment**
    - **Validates: Requirements 4.2, 28.1**


  - [x] 7.4 Write property test for territory overlap prevention

    - **Property 11: Territory overlap prevention**
    - **Validates: Requirements 4.5**

- [x] 8. Backend: Agent target management endpoints









  - [x] 8.1 Implement target management endpoints

    - GET /api/internal/targets - Get targets (filtered by role)
    - POST /api/internal/targets - Set target for agent
    - GET /api/internal/targets/:id - Get target details
    - PUT /api/internal/targets/:id - Update target
    - DELETE /api/internal/targets/:id - Delete target
    - GET /api/internal/targets/agent/:agentId - Get agent targets
    - Create backend/routes/internal/targets.js
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_

  - [x] 8.2 Write property test for target progress calculation


    - **Property 21: Target progress calculation**
    - **Validates: Requirements 24.2**

  - [x] 8.3 Write property test for team aggregation


    - **Property 22: Team aggregation**
    - **Validates: Requirements 24.5**

- [-] 9. Backend: Support ticket management endpoints





  - [x] 9.1 Implement ticket CRUD endpoints

    - GET /api/internal/tickets - Get all tickets (filtered by role)
    - POST /api/internal/tickets - Create ticket
    - GET /api/internal/tickets/:id - Get ticket details
    - PUT /api/internal/tickets/:id - Update ticket
    - Create backend/routes/internal/tickets.js
    - _Requirements: 25.1, 25.2, 25.3_

  - [x] 9.2 Implement ticket workflow endpoints





    - PUT /api/internal/tickets/:id/status - Update status
    - PUT /api/internal/tickets/:id/assign - Assign to user
    - POST /api/internal/tickets/:id/responses - Add response
    - GET /api/internal/tickets/:id/responses - Get responses
    - POST /api/internal/tickets/:id/resolve - Resolve ticket
    - POST /api/internal/tickets/:id/close - Close ticket
    - _Requirements: 25.3, 25.4, 25.5_

  - [ ] 9.3 Write property test for ticket creation completeness
    - **Property 38: Ticket creation completeness**
    - **Validates: Requirements 25.1**

  - [ ] 9.4 Write property test for ticket update tracking

    - **Property 39: Ticket update tracking**
    - **Validates: Requirements 25.4**

- [x] 10. Backend: Document management endpoints





  - [x] 10.1 Implement document upload and management


    - POST /api/internal/documents/upload - Upload document
    - GET /api/internal/documents/:id - Get document
    - DELETE /api/internal/documents/:id - Delete document
    - PUT /api/internal/documents/:id/review - Review document (approve/reject)
    - GET /api/internal/documents/lead/:leadId - Get lead documents
    - Create backend/routes/internal/documents.js
    - Configure file storage (S3 or local)
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

  - [x] 10.2 Write property test for document validation


    - **Property 31: Document validation**
    - **Validates: Requirements 23.2**

  - [x] 10.3 Write property test for document association


    - **Property 32: Document association**
    - **Validates: Requirements 23.5**

  - [x] 10.4 Write property test for required document enforcement


    - **Property 33: Required document enforcement**
    - **Validates: Requirements 23.4**

- [x] 11. Backend: Audit log endpoints





  - [x] 11.1 Implement audit log viewing and search


    - GET /api/internal/audit - Get audit logs (superuser/admin)
    - GET /api/internal/audit/:id - Get specific audit entry
    - GET /api/internal/audit/user/:userId - Get user activity
    - GET /api/internal/audit/resource/:resourceType/:resourceId - Get resource history
    - POST /api/internal/audit/export - Export audit logs
    - Create backend/routes/internal/audit.js
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

  - [x] 11.2 Write property test for comprehensive audit logging


    - **Property 26: Comprehensive audit logging**
    - **Validates: Requirements 6.3, 8.5, 21.1**

  - [x] 11.3 Write property test for critical action flagging


    - **Property 27: Critical action flagging**
    - **Validates: Requirements 21.3**

- [x] 12. Backend: Dashboard endpoints for each role





  - [x] 12.1 Implement role-specific dashboard endpoints


    - GET /api/internal/dashboard/agent - Get agent dashboard data
    - GET /api/internal/dashboard/regional-manager - Get regional manager dashboard
    - GET /api/internal/dashboard/operations-manager - Get operations dashboard
    - GET /api/internal/dashboard/platform-admin - Get admin dashboard
    - GET /api/internal/dashboard/superuser - Get superuser dashboard
    - Create backend/routes/internal/dashboards.js
    - _Requirements: 2.1, 3.1, 5.1, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 12.2 Write property test for regional agent filtering


    - **Property 18: Regional agent filtering**
    - **Validates: Requirements 3.1**

  - [x] 12.3 Write property test for performance metric accuracy


    - **Property 19: Performance metric accuracy**
    - **Validates: Requirements 3.2**

  - [x] 12.4 Write property test for regional aggregation


    - **Property 20: Regional aggregation**
    - **Validates: Requirements 3.3**

- [x] 13. Backend: Performance analytics and reporting endpoints





  - [x] 13.1 Implement analytics endpoints


    - GET /api/internal/analytics/agent/:agentId - Get agent performance
    - GET /api/internal/analytics/team/:territoryId - Get team performance
    - GET /api/internal/analytics/platform - Get platform-wide analytics
    - GET /api/internal/analytics/regional/:territoryId - Get regional analytics
    - POST /api/internal/analytics/export - Export analytics report
    - Create backend/routes/internal/analytics.js
    - _Requirements: 3.2, 3.4, 3.5, 5.2, 5.4, 13.1, 13.2, 13.3, 13.4_

- [x] 14. Backend: Alert and notification system





  - [x] 14.1 Implement alert generation logic


    - Create service to generate alerts for zero occupancy, payment failures, high-priority tickets
    - Create backend/services/alertService.js
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 14.2 Implement notification endpoints


    - GET /api/internal/notifications - Get user notifications
    - PUT /api/internal/notifications/:id/read - Mark as read
    - PUT /api/internal/notifications/settings - Configure notification preferences
    - Create backend/routes/internal/notifications.js
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 28.2_

  - [x] 14.3 Write property test for alert generation for criteria


    - **Property 35: Alert generation for criteria**
    - **Validates: Requirements 14.1, 14.2, 14.3**

  - [x] 14.4 Write property test for time-based reminder


    - **Property 36: Time-based reminder**
    - **Validates: Requirements 28.5**

  - [x] 14.5 Write property test for notification delivery


    - **Property 34: Notification delivery**
    - **Validates: Requirements 4.3, 14.3, 18.3, 25.5, 28.2**

- [x] 15. Backend: Announcement management endpoints




  - [x] 15.1 Implement announcement endpoints


    - GET /api/internal/announcements - Get all announcements
    - POST /api/internal/announcements - Create announcement
    - GET /api/internal/announcements/:id - Get announcement details
    - PUT /api/internal/announcements/:id - Update announcement
    - DELETE /api/internal/announcements/:id - Delete announcement
    - POST /api/internal/announcements/:id/send - Send announcement
    - GET /api/internal/announcements/:id/statistics - Get delivery stats
    - Create backend/routes/internal/announcements.js
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5_

  - [x] 15.2 Write property test for announcement targeting


    - **Property 46: Announcement targeting**
    - **Validates: Requirements 30.2, 30.3**

  - [x] 15.3 Write property test for announcement scheduling



    - **Property 47: Announcement scheduling**
    - **Validates: Requirements 30.5**

- [x] 16. Backend: Subscription and billing management endpoints






  - [x] 16.1 Implement subscription management endpoints


    - GET /api/internal/subscriptions - Get all subscriptions
    - GET /api/internal/subscriptions/:ownerId - Get owner subscription
    - PUT /api/internal/subscriptions/:id/upgrade - Upgrade subscription
    - PUT /api/internal/subscriptions/:id/discount - Apply discount
    - GET /api/internal/subscriptions/:id/billing-history - Get billing history
    - Create backend/routes/internal/subscriptions.js
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 16.2 Write property test for proration calculation


    - **Property 41: Proration calculation**
    - **Validates: Requirements 15.2**


  - [x] 16.3 Write property test for subscription expiration access restriction

    - **Property 42: Subscription expiration access restriction**
    - **Validates: Requirements 15.3**

- [x] 17. Backend: Search and filter functionality







  - [x] 17.1 Implement global search endpoint


    - GET /api/internal/search - Search properties, owners, leads
    - Support search by name, email, location
    - Create backend/routes/internal/search.js
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 17.2 Write property test for search result matching


    - **Property 23: Search result matching**
    - **Validates: Requirements 16.1, 16.2, 16.3, 6.1**

  - [x] 17.3 Write property test for filter result matching


    - **Property 24: Filter result matching**
    - **Validates: Requirements 5.5, 14.5, 29.3**

- [x] 18. Backend: API and integration management





  - [x] 18.1 Implement API key management endpoints


    - POST /api/internal/api-keys - Create API key
    - GET /api/internal/api-keys - Get all API keys
    - DELETE /api/internal/api-keys/:id - Revoke API key
    - GET /api/internal/api-keys/:id/usage - Get API usage stats
    - Create backend/routes/internal/api-keys.js
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

  - [x] 18.2 Write property test for API key generation


    - **Property 44: API key generation**
    - **Validates: Requirements 20.1**

  - [x] 18.3 Write property test for API key revocation


    - **Property 45: API key revocation**
    - **Validates: Requirements 20.3**

- [x] 19. Backend: Platform health monitoring endpoints









  - [x] 19.1 Implement platform health endpoints


    - GET /api/internal/health/metrics - Get platform health metrics
    - GET /api/internal/health/capacity - Get capacity metrics
    - GET /api/internal/health/activity - Get user activity metrics
    - GET /api/internal/health/infrastructure - Get infrastructure metrics
    - Create backend/routes/internal/health.js
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 20. Backend: Register all internal role routes in server.js





  - [x] 20.1 Update backend/server.js to include all new routes


    - Import and mount all /api/internal/* routes
    - Apply authentication and audit logging middleware
    - Test all endpoints are accessible
    - _Requirements: All backend requirements_

- [x] 21. Checkpoint - Backend API complete






  - Ensure all tests pass, ask the user if questions arise.

- [x] 22. Frontend: Extend authentication for internal roles





  - [x] 22.1 Update AuthContext to handle internal roles


    - Add internalRole and internalPermissions to user state
    - Update login flow to handle internal users
    - Update internal-management/app/contexts/AuthContext.tsx
    - _Requirements: 11.1, 11.5_

  - [x] 22.2 Create permission checking hooks


    - Create usePermissions hook for checking user permissions
    - Create useRole hook for checking user role
    - Create internal-management/app/hooks/usePermissions.ts
    - Create internal-management/app/hooks/useRole.ts
    - _Requirements: 11.1, 11.5_

  - [x] 22.3 Update Sidebar to show role-based menu items


    - Show/hide menu items based on user role
    - Add new menu items for internal role features
    - Update internal-management/app/components/Sidebar.tsx
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 23. Frontend: Agent Dashboard






  - [x] 23.1 Create AgentDashboard page


    - Create KPI cards (properties onboarded, pending leads, commission earned)
    - Create lead pipeline view (Kanban or list)
    - Create recent activities section
    - Create commission summary section
    - Create internal-management/app/pages/AgentDashboardPage.tsx
    - _Requirements: 2.1, 2.5, 10.1_

  - [x] 23.2 Create lead pipeline components


    - Create LeadPipelineView component with Kanban board
    - Create LeadCard component for pipeline
    - Support drag-and-drop status changes
    - Create internal-management/app/components/leads/LeadPipelineView.tsx
    - Create internal-management/app/components/leads/LeadCard.tsx
    - _Requirements: 2.2, 2.3_

  - [x] 23.3 Create lead management components


    - Create LeadCreationForm component
    - Create LeadDetailModal component
    - Create CommunicationTimeline component
    - Create internal-management/app/components/leads/LeadCreationForm.tsx
    - Create internal-management/app/components/leads/LeadDetailModal.tsx
    - Create internal-management/app/components/leads/CommunicationTimeline.tsx
    - _Requirements: 1.1, 1.2, 2.3, 12.1_

  - [x] 23.4 Create commission tracking components


    - Create CommissionDashboard component
    - Create CommissionBreakdownTable component
    - Create internal-management/app/components/commissions/CommissionDashboard.tsx
    - _Requirements: 2.5, 17.1, 17.4_

  - [x] 23.5 Create API services for agent features


    - Create leadService.ts for lead management
    - Create commissionService.ts for commission tracking
    - Create internal-management/app/services/leadService.ts
    - Create internal-management/app/services/commissionService.ts
    - _Requirements: 1.1, 2.1, 17.1_

- [x] 24. Frontend: Regional Manager Dashboard






  - [x] 24.1 Create RegionalManagerDashboard page


    - Create team overview section
    - Create regional statistics cards
    - Create pending approvals section
    - Create team performance charts
    - Create internal-management/app/pages/RegionalManagerDashboardPage.tsx
    - _Requirements: 3.1, 3.2, 3.3, 10.2_

  - [x] 24.2 Create territory management components


    - Create TerritoryMapView component with interactive map
    - Create TerritoryManagement component for CRUD
    - Create AgentAssignment component
    - Create internal-management/app/components/territories/TerritoryMapView.tsx
    - Create internal-management/app/components/territories/TerritoryManagement.tsx
    - _Requirements: 4.1, 4.4, 29.1, 29.2, 29.4_

  - [x] 24.3 Create onboarding approval components


    - Create OnboardingApprovalView component
    - Create OnboardingDetailModal for review
    - Create DocumentViewer component
    - Create internal-management/app/components/onboarding/OnboardingApprovalView.tsx
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 24.4 Create team performance components


    - Create AgentPerformanceView component
    - Create TeamPerformanceReport component
    - Create TargetSettingForm component
    - Create internal-management/app/components/performance/AgentPerformanceView.tsx
    - Create internal-management/app/components/performance/TeamPerformanceReport.tsx
    - _Requirements: 3.2, 3.4, 13.1, 13.2, 24.1_

  - [x] 24.5 Create API services for regional manager features


    - Create territoryService.ts
    - Create targetService.ts
    - Create internal-management/app/services/territoryService.ts
    - Create internal-management/app/services/targetService.ts
    - _Requirements: 4.1, 24.1_

- [x] 25. Frontend: Operations Manager Dashboard






  - [x] 25.1 Create OperationsManagerDashboard page



    - Create platform health overview
    - Create support tickets section
    - Create property health alerts
    - Create platform trends charts
    - Create internal-management/app/pages/OperationsManagerDashboardPage.tsx
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 10.3_

  - [x] 25.2 Create support ticket components


    - Create SupportTicketList component
    - Create TicketDetailView component
    - Create TicketCreationForm component
    - Create TicketResponseForm component
    - Create internal-management/app/components/tickets/SupportTicketList.tsx
    - Create internal-management/app/components/tickets/TicketDetailView.tsx
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

  - [x] 25.3 Create property access components


    - Create PropertySearchBar component
    - Create PropertyAccessModal component
    - Integrate with existing property management interface
    - Create internal-management/app/components/properties/PropertySearchBar.tsx
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 25.4 Create platform analytics components


    - Create PlatformAnalytics component
    - Create AlertsPanel component
    - Create internal-management/app/components/analytics/PlatformAnalytics.tsx
    - Create internal-management/app/components/analytics/AlertsPanel.tsx
    - _Requirements: 5.4, 14.1, 14.5_

  - [x] 25.5 Create announcement management components


    - Create AnnouncementCreationForm component
    - Create AnnouncementList component
    - Create AnnouncementStatistics component
    - Create internal-management/app/components/announcements/AnnouncementCreationForm.tsx
    - _Requirements: 30.1, 30.2, 30.3, 30.4_

  - [x] 25.6 Create API services for operations manager features


    - Create ticketService.ts
    - Create announcementService.ts
    - Create analyticsService.ts
    - Create internal-management/app/services/ticketService.ts
    - Create internal-management/app/services/announcementService.ts
    - Create internal-management/app/services/analyticsService.ts
    - _Requirements: 25.1, 30.1, 5.4_

- [x] 26. Frontend: Platform Administrator Dashboard








  - [x] 26.1 Create PlatformAdminDashboard page


    - Create user management overview
    - Create system configuration section
    - Create subscription management section
    - Create API usage section
    - Create internal-management/app/pages/PlatformAdminDashboardPage.tsx
    - _Requirements: 7.1, 8.1, 15.1, 20.1, 10.4_

  - [x] 26.2 Create internal user management components



    - Create InternalUserList component
    - Create InternalUserForm component
    - Create PermissionEditor component
    - Create internal-management/app/components/users/InternalUserList.tsx
    - Create internal-management/app/components/users/InternalUserForm.tsx
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 26.3 Create system configuration components


    - Create CommissionRateConfig component
    - Create RegionalSettingsConfig component
    - Create PlatformPoliciesConfig component
    - Create internal-management/app/components/config/CommissionRateConfig.tsx
    - Create internal-management/app/components/config/RegionalSettingsConfig.tsx
    - _Requirements: 8.1, 8.2, 8.3, 8.4_


  - [x] 26.4 Create subscription management components

    - Create SubscriptionList component
    - Create SubscriptionDetailView component
    - Create BillingHistoryView component
    - Create internal-management/app/components/subscriptions/SubscriptionList.tsx
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 26.5 Create notification configuration components


    - Create NotificationSettings component
    - Create NotificationRules component
    - Create internal-management/app/components/notifications/NotificationSettings.tsx
    - _Requirements: 26.1, 26.2_

  - [x] 26.6 Create API services for platform admin features


    - Create internalUserService.ts
    - Create configService.ts
    - Create subscriptionService.ts
    - Create internal-management/app/services/internalUserService.ts
    - Create internal-management/app/services/configService.ts
    - Create internal-management/app/services/subscriptionService.ts
    - _Requirements: 7.1, 8.1, 15.1_

- [x] 27. Frontend: Superuser Dashboard










  - [x] 27.1 Create SuperuserDashboard page

    - Create complete platform overview
    - Create audit logs section
    - Create financial summary
    - Create system health section
    - Create role management section
    - Create internal-management/app/pages/SuperuserDashboardPage.tsx
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.5_

  - [x] 27.2 Create role management components


    - Create RoleManagement component
    - Create CustomRoleForm component
    - Create RoleHierarchyView component
    - Create internal-management/app/components/roles/RoleManagement.tsx
    - Create internal-management/app/components/roles/CustomRoleForm.tsx
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

  - [x] 27.3 Create audit log components


    - Create AuditLogViewer component
    - Create UserActivityLog component
    - Create AuditLogFilters component
    - Create internal-management/app/components/audit/AuditLogViewer.tsx
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_


  - [x] 27.4 Create financial overview components

    - Create FinancialSummary component
    - Create RevenueBreakdown component
    - Create CommissionOverview component
    - Create internal-management/app/components/financial/FinancialSummary.tsx
    - _Requirements: 9.4_

  - [x] 27.5 Create API services for superuser features

    - Create roleService.ts
    - Create auditService.ts
    - Create internal-management/app/services/roleService.ts
    - Create internal-management/app/services/auditService.ts
    - _Requirements: 22.1, 21.1_

- [x] 28. Frontend: Document management






  - [x] 28.1 Create document upload components


    - Create DocumentUploadComponent with drag-and-drop
    - Create DocumentList component
    - Create DocumentViewer component
    - Create internal-management/app/components/documents/DocumentUploadComponent.tsx
    - Create internal-management/app/components/documents/DocumentList.tsx
    - _Requirements: 23.1, 23.2, 23.3_

  - [x] 28.2 Create API service for documents


    - Create documentService.ts with upload, download, delete functions
    - Create internal-management/app/services/documentService.ts
    - _Requirements: 23.1, 23.5_

- [x] 29. Frontend: Search and global navigation





  - [x] 29.1 Create global search component


    - Create GlobalSearchBar component in header
    - Create SearchResults component
    - Support search by property, owner, lead
    - Create internal-management/app/components/search/GlobalSearchBar.tsx
    - Create internal-management/app/components/search/SearchResults.tsx
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 29.2 Create API service for search


    - Create searchService.ts
    - Create internal-management/app/services/searchService.ts
    - _Requirements: 16.1_

- [x] 30. Frontend: Notification system





  - [x] 30.1 Create notification components

    - Create NotificationCenter component
    - Create NotificationBadge component
    - Create NotificationItem component
    - Create internal-management/app/components/notifications/NotificationCenter.tsx
    - _Requirements: 26.3, 26.4, 26.5, 28.2_

  - [x] 30.2 Create notification context and hooks


    - Create NotificationContext for managing notifications
    - Create useNotifications hook
    - Create internal-management/app/contexts/NotificationContext.tsx
    - Create internal-management/app/hooks/useNotifications.ts
    - _Requirements: 26.3, 28.2_

  - [x] 30.3 Create API service for notifications




    - Create notificationService.ts
    - Create internal-management/app/services/notificationService.ts
    - _Requirements: 26.1, 28.2_

- [x] 31. Frontend: Mobile responsiveness






  - [x] 31.1 Ensure all dashboards are mobile responsive


    - Update all dashboard pages with responsive layouts
    - Prioritize key metrics for mobile view
    - Test on various screen sizes
    - _Requirements: 27.1, 27.2_

  - [x] 31.2 Add touch-optimized controls


    - Update buttons and controls for touch
    - Add swipe gestures where appropriate
    - Simplify workflows for mobile
    - _Requirements: 27.3_

  - [x] 31.3 Implement offline caching for mobile


    - Extend existing offline functionality for internal roles
    - Cache essential data for each role
    - Update internal-management/app/services/cacheService.ts
    - _Requirements: 27.4, 27.5_

- [x] 32. Frontend: Routing and navigation





  - [x] 32.1 Create routes for all new pages


    - Add routes for agent, regional manager, operations manager, admin, superuser dashboards
    - Add routes for lead management, territory management, tickets, etc.
    - Update internal-management/app/routes.ts
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 32.2 Implement role-based route protection


    - Create RoleProtectedRoute component
    - Redirect users to appropriate dashboard based on role
    - Update internal-management/app/components/RoleProtectedRoute.tsx
    - _Requirements: 11.1, 11.5_

- [x] 33. Frontend: Data visualization and charts






  - [x] 33.1 Create reusable chart components


    - Create PerformanceChart component
    - Create TrendChart component
    - Create PieChart component for distributions
    - Create internal-management/app/components/charts/PerformanceChart.tsx
    - _Requirements: 3.5, 5.4, 13.5_

  - [x] 33.2 Integrate charts into dashboards


    - Add charts to agent dashboard (commission trends)
    - Add charts to regional manager dashboard (team performance)
    - Add charts to operations dashboard (platform trends)
    - _Requirements: 2.1, 3.2, 5.4_

- [x] 34. Frontend: Export and reporting






  - [x] 34.1 Create export functionality


    - Create ExportButton component
    - Support PDF and CSV export
    - Integrate with backend export endpoints
    - Create internal-management/app/components/export/ExportButton.tsx
    - _Requirements: 13.4, 21.5_

  - [x] 34.2 Create report generation components


    - Create ReportGenerator component
    - Create ReportPreview component
    - Create internal-management/app/components/reports/ReportGenerator.tsx
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 35. Testing: Property-based tests





  - [x] 35.1 Set up fast-check testing framework


    - Install fast-check library
    - Create test utilities and generators
    - Create backend/tests/properties/internalRoles/generators.js
    - _Requirements: All property testing requirements_

  - [x] 35.2 Create custom generators for domain models

    - Create userGenerator for internal users
    - Create leadGenerator for leads
    - Create commissionGenerator for commissions
    - Create territoryGenerator for territories
    - _Requirements: All property testing requirements_

  - [x] 35.3 Write remaining property tests


    - Write tests for all properties marked with * in previous tasks
    - Ensure 100+ iterations per test
    - Tag each test with property number
    - _Requirements: All property testing requirements_

- [x] 36. Testing: Integration tests






  - [x] 36.1 Write integration tests for onboarding workflow


    - Test complete flow: create lead → upload docs → submit → approve → activate
    - Test rejection workflow
    - Create backend/tests/integration/onboardingWorkflow.test.js
    - _Requirements: 1.1, 18.1, 18.3, 18.4_

  - [x] 36.2 Write integration tests for commission lifecycle


    - Test flow: onboarding → commission earned → payment → paid
    - Create backend/tests/integration/commissionLifecycle.test.js
    - _Requirements: 1.4, 17.2, 17.3_

  - [x] 36.3 Write integration tests for support ticket workflow


    - Test flow: create → assign → respond → resolve
    - Create backend/tests/integration/ticketWorkflow.test.js
    - _Requirements: 25.1, 25.3, 25.4, 25.5_

  - [x] 36.4 Write integration tests for territory and lead assignment


    - Test territory creation and agent assignment
    - Test automatic lead assignment
    - Create backend/tests/integration/territoryAssignment.test.js
    - _Requirements: 4.1, 4.2, 28.1_

- [x] 37. Documentation and deployment






  - [x] 37.1 Create API documentation


    - Document all new API endpoints
    - Include request/response examples
    - Create backend/INTERNAL_ROLES_API.md
    - _Requirements: All API requirements_

  - [x] 37.2 Create user guide for each role


    - Create guide for agents
    - Create guide for regional managers
    - Create guide for operations managers
    - Create guide for platform admins
    - Create internal-management/ROLE_GUIDES.md
    - _Requirements: All role-specific requirements_

  - [x] 37.3 Create database migration scripts


    - Create migration for all new tables
    - Create migration for User model extensions
    - Create seed data for testing
    - Create backend/migrations/add-internal-roles.js
    - _Requirements: All data model requirements_


  - [x] 37.4 Update deployment configuration

    - Update environment variables for file storage
    - Configure email service for credential delivery
    - Set up scheduled jobs for alerts and reminders
    - Update ecosystem.config.js or deployment scripts
    - _Requirements: 1.3, 14.1, 28.5_

- [-] 38. Database cleanup and schema validation



  - [x] 38.1 Audit all database models for schema consistency



    - Review all models added in internal-user-roles spec
    - Review all models added in internal-management-system spec
    - Check for missing columns, incorrect data types, or index issues
    - Create backend/scripts/auditDatabaseSchema.js
    - _Requirements: All data model requirements_

  - [x] 38.2 Create comprehensive migration for missing columns






    - Identify all columns that exist in models but not in database
    - Create migration to add missing columns (like PaymentSchedule.status)
    - Handle ENUM types, indexes, and constraints properly
    - Create backend/migrations/fix-all-missing-columns.js
    - _Requirements: All data model requirements_

  - [x] 38.3 Validate and fix model indexes




    - Check all model indexes match database indexes
    - Remove duplicate or conflicting indexes
    - Add missing indexes for foreign keys and frequently queried columns
    - Create backend/scripts/validateIndexes.js
    - _Requirements: All data model requirements_

  - [x] 38.4 Test database sync with force:false





    - Ensure database can sync without dropping tables
    - Fix any sync errors related to existing data
    - Verify all associations work correctly
    - Document any manual migration steps needed
    - _Requirements: All data model requirements_

  - [x] 38.5 Create database health check script




    - Check all tables exist
    - Verify all columns match model definitions
    - Validate all foreign key constraints
    - Check for orphaned records
    - Create backend/scripts/checkDatabaseHealth.js
    - assign all the backup, restore and check database health for superuser dashboard 
    - _Requirements: All data model requirements_

- [x] 39. Final checkpoint - Complete system testing






  - Ensure all tests pass
  - Test all role-specific dashboards
  - Test complete workflows end-to-end
  - Verify permission enforcement
  - Test on mobile devices
  - Verify database is in healthy state
  - Ask the user if questions arise

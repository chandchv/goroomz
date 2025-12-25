# Role Segregation Optimization Spec

## Overview

This spec optimizes and clarifies the role-based access control system for GoRoomz, establishing clear separation between three user ecosystems while maintaining a single internal-management application.

## User Types

1. **External Users** (`role: 'user'`) - Website visitors who browse and book
2. **Property Owners** (`role: 'owner'/'admin'`) - Manage their properties and staff
3. **Property Staff** (`staffRole: 'front_desk'/'housekeeping'/etc.`) - Work at specific properties
4. **Platform Staff** (`internalRole: 'agent'/'regional_manager'/etc.`) - Internal company employees

## Key Features

### Data Scoping
- Property owners see only their properties
- Property staff see only their assigned property
- Platform staff see data based on role (territory, assignments, or all)
- Superusers bypass all scoping

### Route Organization
- Property management routes at root level: `/properties`, `/rooms`, `/bookings`
- Platform operations under `/platform/` prefix: `/platform/owners`, `/platform/agents`
- Automatic route protection based on user type

### Naming Conventions
- Database: `snake_case` (internal_role, staff_role, created_at)
- JavaScript: `camelCase` (internalRole, staffRole, createdAt)
- Sequelize handles automatic conversion

## Implementation Approach

The implementation follows a phased approach:

1. **Phase 1**: User model enhancements (helper methods)
2. **Phase 2**: Data scoping middleware
3. **Phase 3**: Route restructuring
4. **Phase 4**: Frontend updates
5. **Phase 5**: Migration and deployment

## Testing Strategy

- **Property-Based Tests**: 20 properties covering all access control scenarios
- **Unit Tests**: Helper methods, utilities, validation logic
- **Integration Tests**: End-to-end flows for each user type

## Files

- `requirements.md` - 13 requirements with 65 acceptance criteria
- `design.md` - Complete architecture, 24 correctness properties, testing strategy
- `tasks.md` - 16 implementation tasks with optional test sub-tasks

## Getting Started

To begin implementation:

1. Open `tasks.md` in the internal-management app
2. Click "Start task" next to task 1
3. Follow the implementation plan sequentially
4. Optional test tasks can be skipped for faster MVP

## Status

✅ Requirements Complete
✅ Design Complete  
✅ Tasks Complete
⏳ Implementation Pending

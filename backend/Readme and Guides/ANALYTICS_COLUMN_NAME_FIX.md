# Analytics Column Name Fix

## Issue
The analytics route was failing with error: `column Lead.createdAt does not exist`

## Root Cause
The Lead model (and other models) have `underscored: true` in their Sequelize configuration, which means all column names in the database use snake_case (e.g., `created_at`, `updated_at`). However, the analytics queries were using camelCase names (e.g., `createdAt`, `updatedAt`).

## Solution
Updated all queries in `backend/routes/internal/analytics.js` to use snake_case column names to match the database schema:

### Lead Model Columns Fixed:
- `createdAt` → `created_at`
- `approvedAt` → `approved_at`
- `agentId` → `agent_id`
- `territoryId` → `territory_id`
- `propertyType` → `property_type`

### User Model Columns Fixed:
- `createdAt` → `created_at`
- `internalRole` → `internal_role`
- `isActive` → `is_active`
- `territoryId` → `territory_id`
- `commissionRate` → `commission_rate`

### Territory Model Columns Fixed:
- `isActive` → `is_active`
- `regionalManagerId` → `regional_manager_id`

### Commission Model Columns Fixed:
- `agentId` → `agent_id`
- `earnedDate` → `earned_date`

### AgentTarget Model Columns Fixed:
- `agentId` → `agent_id`
- `startDate` → `start_date`
- `endDate` → `end_date`

### Booking Model Columns Fixed:
- `createdAt` → `created_at`

### SupportTicket Model Columns Fixed:
- `createdAt` → `created_at`

## Testing
Run the analytics endpoints to verify they work correctly:
- GET `/api/internal/analytics/agent/:agentId`
- GET `/api/internal/analytics/team/:territoryId`
- GET `/api/internal/analytics/platform`
- GET `/api/internal/analytics/regional/:territoryId`

## Note
When using Sequelize models with `underscored: true`, always use snake_case column names in:
- WHERE clauses
- Raw queries
- Sequelize.literal() expressions
- Result property access (when using `raw: true`)

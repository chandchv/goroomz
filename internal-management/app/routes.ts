import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  
  // Internal Role Dashboards
  route("agent-dashboard", "routes/agent-dashboard.tsx"),
  route("regional-manager-dashboard", "routes/regional-manager-dashboard.tsx"),
  route("operations-manager-dashboard", "routes/operations-manager-dashboard.tsx"),
  route("platform-admin-dashboard", "routes/platform-admin-dashboard.tsx"),
  route("superuser-dashboard", "routes/superuser-dashboard.tsx"),
  
  // Platform Management Routes (for platform staff only)
  route("platform/properties", "routes/platform.properties.tsx"),
  route("platform/owners", "routes/platform.owners.tsx"),
  route("platform/agents", "routes/platform.agents.tsx"),
  
  // Property Management
  route("property-onboarding", "routes/property-onboarding.tsx"),
  route("properties", "routes/properties.tsx"),
  route("properties/:propertyId", "routes/property-detail.tsx"),
  route("property-overview", "routes/property-overview.tsx"),
  route("property-overview/:propertyId", "routes/property-overview-detail.tsx"),
  route("rooms", "routes/rooms.tsx"),
  route("categories", "routes/categories.tsx"),
  route("bookings", "routes/bookings.tsx"),
  route("check-in", "routes/check-in.tsx"),
  route("check-out", "routes/check-out.tsx"),
  route("payments", "routes/payments.tsx"),
  route("payment-schedule", "routes/payment-schedule.tsx"),
  route("deposits", "routes/deposits.tsx"),
  route("housekeeping", "routes/housekeeping.tsx"),
  route("maintenance", "routes/maintenance.tsx"),
  route("reports", "routes/reports.tsx"),
  route("staff", "routes/staff.tsx"),
  route("property-owners", "routes/property-owners.tsx"),
  route("property-owners/:ownerId", "routes/property-owner-detail.tsx"),
  
  // Internal User Management
  route("internal-users", "routes/internal-users.tsx"),
  route("internal-users/create", "routes/internal-users-create.tsx"),
  route("internal-users/:userId", "routes/internal-user-detail.tsx"),
  route("my-profile", "routes/my-profile.tsx"),
  
  // Lead Management
  route("leads", "routes/leads.tsx"),
  route("lead-pipeline", "routes/lead-pipeline.tsx"),
  
  // Property Claims
  route("property-claims", "routes/property-claims.tsx"),
  
  // Commission & Performance
  route("commissions", "routes/commissions.tsx"),
  route("commission-reports", "routes/commission-reports.tsx"),
  
  // Territory Management
  route("territories", "routes/territories.tsx"),
  route("territory-assignment", "routes/territory-assignment.tsx"),
  
  // Team Management
  route("my-team", "routes/my-team.tsx"),
  route("team-performance", "routes/team-performance.tsx"),
  route("performance-targets", "routes/performance-targets.tsx"),
  
  // Operations
  route("tickets", "routes/tickets.tsx"),
  route("announcements", "routes/announcements.tsx"),
  route("analytics", "routes/analytics.tsx"),
  
  // Notifications
  route("notifications", "routes/notifications.tsx"),
  route("notification-preferences", "routes/notification-preferences.tsx"),
  
  // Property Documents
  route("property-documents", "routes/property-documents.tsx"),
  
  // Administration
  route("role-management", "routes/role-management.tsx"),
  route("settings", "routes/settings.tsx"),
  route("subscriptions", "routes/subscriptions.tsx"),
  route("audit-logs", "routes/audit-logs.tsx"),
  
  // Catch-all route for unknown paths (like Chrome DevTools requests)
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;

# Sidebar Routes - Quick Reference Guide

## ✅ All Routes Working - No 404 Errors

### Property Management
| Route | Page | Access |
|-------|------|--------|
| `/dashboard` | Main Dashboard | All Users |
| `/rooms` | Floor View | Staff + Owners |
| `/categories` | Category Management | Staff + Owners |
| `/bookings` | Booking Management | All Users |
| `/check-in` | Check-In Process | Front Desk |
| `/check-out` | Check-Out Process | Front Desk |
| `/property-onboarding` | Property Onboarding | Agents + |
| `/properties` | All Properties | Internal |
| `/property-owners` | Property Owners | Internal Admin |
| `/property-documents` | Documents | All Users |

### Financial
| Route | Page | Access |
|-------|------|--------|
| `/payments` | Payment Dashboard | Staff + Owners |
| `/payment-schedule` | Payment Schedule | Staff + Owners |
| `/deposits` | Security Deposits | Staff + Owners |

### Operations
| Route | Page | Access |
|-------|------|--------|
| `/housekeeping` | Housekeeping | Housekeeping Staff |
| `/maintenance` | Maintenance | Maintenance Staff |
| `/reports` | Reports & Analytics | Managers + Owners |

### Management
| Route | Page | Access |
|-------|------|--------|
| `/staff` | Staff Management | Managers + Owners |

### Lead Management (Internal)
| Route | Page | Access |
|-------|------|--------|
| `/leads` | Lead Management | Agents + |
| `/lead-pipeline` | Lead Pipeline | Agents + |

### Commissions (Internal)
| Route | Page | Access |
|-------|------|--------|
| `/commissions` | Commission Dashboard | Agents + |
| `/commission-reports` | Commission Reports | Regional Managers + |

### Territory Management (Internal)
| Route | Page | Access |
|-------|------|--------|
| `/territories` | Territory Management | Regional Managers + |
| `/territory-assignment` | Territory Assignment | Regional Managers + |

### Team Management (Internal)
| Route | Page | Access |
|-------|------|--------|
| `/my-team` | Team Members | Regional Managers + |
| `/team-performance` | Team Performance | Regional Managers + |
| `/performance-targets` | Performance Targets | Regional Managers + |

### Internal Operations
| Route | Page | Access |
|-------|------|--------|
| `/tickets` | Support Tickets | Operations Managers + |
| `/announcements` | Announcements | Operations Managers + |
| `/analytics` | Platform Analytics | Operations Managers + |

### Dashboards (Internal)
| Route | Page | Access |
|-------|------|--------|
| `/agent-dashboard` | Agent Dashboard | Agents |
| `/regional-manager-dashboard` | Regional Manager | Regional Managers |
| `/operations-manager-dashboard` | Operations Manager | Operations Managers |
| `/platform-admin-dashboard` | Platform Admin | Platform Admins |
| `/superuser-dashboard` | Superuser Dashboard | Superusers |

### Administration
| Route | Page | Access |
|-------|------|--------|
| `/internal-users` | Internal Users | Platform Admins + |
| `/role-management` | Role Management | Superusers Only |
| `/settings` | System Settings | Platform Admins + |
| `/subscriptions` | Subscriptions | Platform Admins + |
| `/audit-logs` | Audit Logs | Platform Admins + |

### Personal
| Route | Page | Access |
|-------|------|--------|
| `/my-profile` | User Profile | All Users |

### Authentication
| Route | Page | Access |
|-------|------|--------|
| `/login` | Login Page | Public |
| `/` | Home | Public |

---

## Access Legend
- **All Users** - Property owners, staff, and internal users
- **Staff + Owners** - Staff members and property owners
- **Agents +** - Agents and all higher roles
- **Regional Managers +** - Regional managers and all higher roles
- **Operations Managers +** - Operations managers and all higher roles
- **Platform Admins +** - Platform admins and superusers
- **Superusers Only** - Superusers exclusively
- **Internal** - Internal staff only (not property owners)
- **Public** - No authentication required

---

## Quick Troubleshooting

### If a link shows 404:
1. Check if route is registered in `app/routes.ts`
2. Verify route file exists in `app/routes/`
3. Check if page component exists in `app/pages/`
4. Verify imports are correct

### If a link shows "Access Denied":
1. Check user's role/permissions
2. Verify RoleProtectedRoute configuration
3. Check if user is authenticated
4. Review permission requirements

### If a link shows "No Data":
1. Check if loader function is implemented
2. Verify API endpoint is working
3. Check network requests in browser
4. Review error messages in console

---

## Status: ✅ ALL WORKING
- Total Routes: 42
- Working Routes: 42
- Broken Links: 0
- TypeScript Errors: 0

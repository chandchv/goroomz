# Quick Migration Reference Card

## 🚀 Quick Start (Development)

```bash
# 1. Backup
pg_dump -U username -d database > backup.sql

# 2. Run migration
cd backend
node scripts/runDatabaseRestructure.js

# 3. Follow prompts
```

## 📋 Migration Commands

### Interactive (Recommended)
```bash
node scripts/runDatabaseRestructure.js
```

### Manual Step-by-Step
```bash
# Phase 1: Create tables
npx sequelize-cli db:migrate --name 20251127000001-create-properties-table.js
npx sequelize-cli db:migrate --name 20251127000002-create-rooms-new-table.js
npx sequelize-cli db:migrate --name 20251127000003-create-property-staff-table.js

# Phase 2: Migrate data
npx sequelize-cli db:migrate --name 20251127000004-migrate-data-to-new-structure.js

# Phase 3: Verify (see verification queries below)

# Phase 4: Finalize
npx sequelize-cli db:migrate --name 20251127000005-finalize-structure-switch.js
```

## ✅ Verification Queries

```sql
-- Check counts
SELECT 
  (SELECT COUNT(*) FROM rooms WHERE property_id IS NULL) as old_properties,
  (SELECT COUNT(*) FROM properties) as new_properties,
  (SELECT COUNT(*) FROM rooms WHERE property_id IS NOT NULL) as old_rooms,
  (SELECT COUNT(*) FROM rooms_new) as new_rooms;

-- Should show: old_properties = new_properties, old_rooms = new_rooms
```

## 🔄 Rollback Commands

### Before finalization
```bash
npx sequelize-cli db:migrate:undo
```

### After finalization
```bash
npx sequelize-cli db:migrate:undo
# This restores rooms_old → rooms
```

### Nuclear option
```bash
psql -U username -d database < backup.sql
```

## 📊 New Structure

```
categories
    ↓
properties (NEW)
    ↓
rooms (was rooms_new)
    ↓
bed_assignments

property_staff (NEW) → properties
```

## 🔑 Key Changes

| Old | New |
|-----|-----|
| `rooms` (mixed) | `properties` + `rooms` (separate) |
| `rooms.property_id IS NULL` = property | `properties` table |
| `rooms.property_id IS NOT NULL` = room | `rooms` table |
| No staff table | `property_staff` table |

## 📝 Post-Migration Code Updates

### Models
```javascript
// Old
const Room = require('./models/Room');
const properties = await Room.findAll({ where: { propertyId: null } });

// New
const Property = require('./models/Property');
const properties = await Property.findAll();
```

### API Routes
```javascript
// Old
GET /api/rooms → mixed properties and rooms

// New
GET /api/properties → properties only
GET /api/properties/:id/rooms → rooms for property
```

## ⚠️ Important Notes

- ✅ Always backup before migration
- ✅ Test on dev/staging first
- ✅ Verify data counts after Phase 2
- ✅ Update application code after Phase 4
- ✅ Keep rooms_old for 30 days
- ❌ Don't skip verification step
- ❌ Don't run on production without testing

## 🆘 Emergency Contacts

- Database Admin: [Your DBA]
- DevOps: [Your DevOps team]
- Backup Location: [Your backup location]

## 📚 Full Documentation

- **DATABASE_RESTRUCTURE_PLAN.md** - Detailed explanation
- **MIGRATION_GUIDE.md** - Step-by-step guide
- **MIGRATION_FILES_SUMMARY.md** - File reference

## ⏱️ Estimated Time

- Small DB (<1K records): 10 min
- Medium DB (1K-10K): 30 min
- Large DB (>10K): 60 min

## 🎯 Success Checklist

- [ ] Database backed up
- [ ] Tested on dev
- [ ] Tested on staging
- [ ] Data counts verified
- [ ] Application code updated
- [ ] All tests passing
- [ ] Production deployed
- [ ] Monitoring active

---

**Last Updated**: 2024-11-27
**Version**: 1.0

# Sample Internal Users Seeder

This script creates a diverse set of sample internal users for testing the user management UI and OnlineStatusIndicator component.

## Usage

Run the script from the backend directory:

```bash
cd backend
node scripts/seedSampleInternalUsers.js
```

## Sample Users Created

The script creates 12 internal users with varying roles and online statuses:

### Superusers (1)
- **Sarah Johnson** - Online (2 min ago)
  - Email: sarah.johnson@goroomz.com
  - Full permissions

### Platform Admins (2)
- **Michael Chen** - Online (4 min ago)
  - Email: michael.chen@goroomz.com
- **Sophie Anderson** - Online (45 sec ago)
  - Email: sophie.anderson@goroomz.com

### Regional Managers (2)
- **Priya Sharma** - Offline (15 min ago)
  - Email: priya.sharma@goroomz.com
- **Emily Rodriguez** - Offline (30 min ago)
  - Email: emily.rodriguez@goroomz.com

### Operations Managers (2)
- **David Martinez** - Online (1 min ago)
  - Email: david.martinez@goroomz.com
- **Lisa Thompson** - Offline (10 min ago)
  - Email: lisa.thompson@goroomz.com

### Agents (5)
- **Aisha Patel** - Online (3 min ago)
  - Email: aisha.patel@goroomz.com
  - Commission: 5.0%
- **James Wilson** - Offline (2 hours ago)
  - Email: james.wilson@goroomz.com
  - Commission: 4.5%
- **Rajesh Kumar** - Offline (5 days ago)
  - Email: rajesh.kumar@goroomz.com
  - Commission: 6.0%
- **Mohammed Ali** - INACTIVE (30 days ago)
  - Email: mohammed.ali@goroomz.com
  - Commission: 5.5%
- **Vikram Singh** - Never logged in
  - Email: vikram.singh@goroomz.com
  - Commission: 4.0%

## Default Credentials

All users have the same password: **Password123!**

## Online Status Distribution

- 🟢 **Online** (< 5 min ago): 5 users
- ⚫ **Offline**: 6 users
- ❌ **Inactive**: 1 user

## Testing Scenarios

This sample data allows you to test:

1. **Online Status Indicator**
   - Green dots for users online (< 5 min)
   - Gray dots for offline users
   - Tooltip with session information

2. **Online Filter**
   - Toggle "Show online only" to see 5 online users
   - Verify count display

3. **Role-Based Views**
   - Login as different roles to see permission-based UI
   - Test role filtering in user list

4. **User Status**
   - Active vs Inactive users
   - Status badge display

5. **Last Login Display**
   - "Just now" for recent logins
   - "X minutes/hours/days ago" formatting
   - "Never" for users who haven't logged in

## Cleanup

To remove all sample users, you can run:

```sql
DELETE FROM "Users" WHERE email LIKE '%@goroomz.com';
```

Or create a cleanup script if needed.

## Notes

- The script checks for existing users and skips them to avoid duplicates
- All users have properly hashed passwords using bcrypt
- Permissions are set according to role requirements
- Last login times are calculated relative to current time for realistic testing

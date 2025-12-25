# Superuser Setup Guide

This guide explains how to create an admin/superuser account for the GoRoomz Internal Management System.

## What is a Superuser?

A superuser (also called admin) is an account with full permissions to:
- Access all features in the internal management system
- Manage property owners and their properties
- Create and manage staff accounts
- View all reports and analytics
- Perform all operations (check-in, check-out, payments, etc.)

## Prerequisites

Before creating a superuser, ensure:
1. The database is set up and running
2. You're in the `backend` directory
3. Environment variables are configured (`.env` file)

## Method 1: Interactive Creation (Recommended)

This method prompts you for each field interactively:

```bash
npm run createsuperuser
```

You'll be asked to provide:
- Full Name
- Email (must be unique)
- Phone (optional)
- Password (minimum 8 characters)
- Password confirmation

**Example:**
```
=== Create Superuser Account ===

This will create an admin account with full permissions.
You can use this account to log into the internal management system.

✓ Database connection established

Full Name: Admin User
Email: admin@goroomz.com
Phone (optional): +1234567890
Password: ********
Confirm Password: ********

✅ Superuser created successfully!

Account Details:
  Name:  Admin User
  Email: admin@goroomz.com
  Role:  admin
  ID:    1

You can now log in to the internal management system with these credentials.
```

## Method 2: Quick Creation (Non-Interactive)

For automated setups or scripts, use the quick method:

```bash
npm run createsuperuser:quick <email> <password> <name>
```

**Example:**
```bash
npm run createsuperuser:quick admin@goroomz.com Admin123! "Admin User"
```

**Output:**
```
✓ Database connection established

✅ Superuser created successfully!

Account Details:
  Name:  Admin User
  Email: admin@goroomz.com
  Role:  admin
  ID:    1

You can now log in to the internal management system.
```

## Method 3: Direct Script Execution

You can also run the scripts directly:

**Interactive:**
```bash
node scripts/createSuperuser.js
```

**Quick:**
```bash
node scripts/createSuperuserQuick.js admin@goroomz.com Admin123! "Admin User"
```

## Superuser Permissions

A superuser account is created with the following permissions:

```json
{
  "canCheckIn": true,
  "canCheckOut": true,
  "canManageRooms": true,
  "canRecordPayments": true,
  "canViewReports": true,
  "canManageStaff": true,
  "canUpdateRoomStatus": true,
  "canManageMaintenance": true
}
```

**Role:** `admin`  
**Staff Role:** `manager`

## Using the Superuser Account

After creating the superuser:

1. Navigate to the internal management system URL
2. Click "Login" or go to `/login`
3. Enter the email and password you created
4. You'll be redirected to the dashboard with full access

## Common Issues

### "A user with this email already exists"

**Solution:** The email is already registered. Either:
- Use a different email
- Delete the existing user from the database
- Reset the database with `npm run reset`

### "Password must be at least 8 characters long"

**Solution:** Use a stronger password with at least 8 characters.

### "Database connection failed"

**Solution:** 
- Check your `.env` file has correct database credentials
- Ensure PostgreSQL is running
- Verify the database exists

### "Cannot find module 'bcryptjs'"

**Solution:** Install dependencies:
```bash
npm install
```

## Security Best Practices

1. **Use Strong Passwords:** Minimum 8 characters with mix of letters, numbers, and symbols
2. **Keep Credentials Secure:** Don't share superuser credentials
3. **Use Unique Emails:** Each admin should have their own account
4. **Regular Audits:** Review admin accounts periodically
5. **Limit Superusers:** Only create superuser accounts when necessary

## Next Steps

After creating your superuser:

1. **Log in** to the internal management system
2. **Create Property Owners** from the Property Owners page
3. **Set up Properties** for each owner
4. **Create Staff Accounts** with appropriate permissions
5. **Configure Categories** for room classification

## Troubleshooting

If you encounter issues:

1. Check the console output for specific error messages
2. Verify database connection: `npm run setup`
3. Check logs in the terminal
4. Ensure all environment variables are set correctly

## Additional Resources

- [Internal Management System Setup](./SETUP.md)
- [API Documentation](./INTERNAL_AUTH_IMPLEMENTATION.md)
- [Database Models](./INTERNAL_MANAGEMENT_MODELS.md)

## Support

For issues or questions:
- Check the error message in the console
- Review the database logs
- Verify your environment configuration

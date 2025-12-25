# Quick Start Guide - GoRoomz Internal Management System

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure Environment
```bash
cp env.example .env
# Edit .env with your database credentials
```

### Step 3: Setup Database
```bash
npm run setup
```

### Step 4: Create Admin Account
```bash
npm run createsuperuser
```

Follow the prompts:
- **Email:** admin@goroomz.com
- **Password:** (your secure password)
- **Name:** Admin User

### Step 5: Start the Server
```bash
npm start
```

### Step 6: Access Internal Management System
1. Open browser to internal management URL
2. Login with your admin credentials
3. Start managing properties!

## 📋 Available Commands

### Database
- `npm run setup` - Initialize database and tables
- `npm run reset` - Reset database (⚠️ deletes all data)
- `npm run seed` - Add sample data

### Superuser
- `npm run createsuperuser` - Interactive admin creation
- `npm run createsuperuser:quick <email> <password> <name>` - Quick admin creation

### Server
- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode

## 🎯 First Steps After Login

1. **Create Property Owners**
   - Navigate to "Property Owners" page
   - Click "Add Property Owner"
   - Fill in details and generate credentials

2. **Set Up Properties**
   - Click on a property owner
   - Add their properties
   - Use bulk room creation for efficiency

3. **Create Staff Accounts**
   - Go to "Staff" page
   - Add staff with appropriate roles:
     - Front Desk
     - Housekeeping
     - Maintenance
     - Manager

4. **Configure Categories**
   - Go to "Categories" page
   - Create custom room categories
   - Assign categories to rooms

## 🔑 Default Permissions

Your superuser account has **all permissions**:
- ✅ Check-in/Check-out
- ✅ Room Management
- ✅ Payment Recording
- ✅ Reports Access
- ✅ Staff Management
- ✅ Property Owner Management

## 📚 Documentation

- [Superuser Setup Guide](./SUPERUSER_SETUP.md)
- [API Documentation](./INTERNAL_AUTH_IMPLEMENTATION.md)
- [Database Models](./INTERNAL_MANAGEMENT_MODELS.md)

## ⚠️ Troubleshooting

**Database connection failed?**
```bash
# Check PostgreSQL is running
# Verify .env credentials
npm run setup
```

**Can't create superuser?**
```bash
# Email already exists - use different email
# Or reset database
npm run reset
npm run setup
npm run createsuperuser
```

**Server won't start?**
```bash
# Check port 5000 is available
# Verify all dependencies installed
npm install
npm start
```

## 🎉 You're Ready!

Your GoRoomz Internal Management System is now set up and ready to use.

Happy managing! 🏨

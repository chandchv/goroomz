# Port Configuration Guide

## Current Setup

Your project now has separate ports for each application:

### Backend
- **Port:** 5000
- **URL:** http://localhost:5000
- **Start:** `cd backend && npm run dev`

### Customer Frontend (Main App)
- **Port:** 3000
- **URL:** http://localhost:3000
- **Start:** `npm run dev` (from root)
- **Location:** Root directory

### Internal Management System
- **Port:** 3001
- **URL:** http://localhost:3001
- **Start:** `cd internal-management && npm run dev`
- **Location:** `internal-management/` folder

## Running All Applications

### Option 1: Separate Terminals (Recommended)

Open 3 terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Customer Frontend:**
```bash
npm run dev
```

**Terminal 3 - Internal Management:**
```bash
cd internal-management
npm run dev
```

### Option 2: Using PM2 (Production-like)

Install PM2 globally:
```bash
npm install -g pm2
```

Start all services:
```bash
# Backend
cd backend
pm2 start npm --name "goroomz-backend" -- run dev

# Customer Frontend
cd ..
pm2 start npm --name "goroomz-frontend" -- run dev

# Internal Management
cd internal-management
pm2 start npm --name "goroomz-internal" -- run dev

# View all processes
pm2 list

# View logs
pm2 logs

# Stop all
pm2 stop all

# Restart all
pm2 restart all
```

## Quick Access URLs

Once all services are running:

- **Customer Website:** http://localhost:3000
- **Internal Management:** http://localhost:3001
- **Backend API:** http://localhost:5000

## Port Summary

| Service | Port | Purpose |
|---------|------|---------|
| Backend API | 5000 | REST API for both frontends |
| Customer Frontend | 3000 | Public-facing booking website |
| Internal Management | 3001 | Staff/admin dashboard |

## Troubleshooting

### Port Already in Use

If you get "port already in use" error:

**Windows:**
```bash
# Find process using port
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5000

# Kill process by PID
taskkill /PID <PID> /F
```

**Linux/Mac:**
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
lsof -ti:5000 | xargs kill -9
```

### Change Ports

If you need different ports, update these files:

**Backend (port 5000):**
- `backend/server.js` - Change `PORT` variable

**Customer Frontend (port 3000):**
- `package.json` - Update `--port 3000` in dev script
- `vite.config.js` - Update `server.port`

**Internal Management (port 3001):**
- `internal-management/package.json` - Update `PORT=3001`
- `internal-management/react-router.config.ts` - Update `dev.port`

## Development Workflow

### Working on Customer Frontend Only
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
npm run dev
```
Access: http://localhost:3000

### Working on Internal Management Only
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd internal-management && npm run dev
```
Access: http://localhost:3001

### Working on Both Frontends
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
npm run dev

# Terminal 3
cd internal-management && npm run dev
```
Access both:
- http://localhost:3000 (Customer)
- http://localhost:3001 (Internal)

## Notes

- Both frontends connect to the same backend (port 5000)
- Both frontends use the same database
- Customer frontend uses Firebase auth + backend
- Internal management uses backend auth only
- You can run them simultaneously without conflicts

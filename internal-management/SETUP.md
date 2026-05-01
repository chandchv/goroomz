# Internal Management System - Setup Guide

## Overview

This is the internal management application for GoRoomz, built with React Router v7, TypeScript, and Tailwind CSS.

## Project Structure

```
internal-management/
├── app/
│   ├── components/       # Reusable UI components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MainLayout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/         # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   │   ├── LoginPage.tsx
│   │   └── DashboardPage.tsx
│   ├── routes/           # Route definitions
│   │   ├── home.tsx
│   │   ├── login.tsx
│   │   └── dashboard.tsx
│   ├── services/         # API services
│   │   ├── api.ts
│   │   └── authService.ts
│   ├── utils/            # Utility functions
│   ├── app.css           # Global styles
│   ├── root.tsx          # Root component
│   └── routes.ts         # Route configuration
├── public/               # Static assets
├── .env                  # Environment variables
└── package.json
```

## Environment Variables

Create a `.env` file in the root directory:

```
VITE_API_URL=http://localhost:5000
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript type checking

## Features Implemented

### Authentication
- JWT-based authentication
- Login page with email/password
- Token storage in localStorage
- Automatic token refresh
- Protected routes

### Layout
- Main layout with header and sidebar
- Role-based navigation menu
- Connection status indicator
- Property selector dropdown
- User profile menu

### Components
- **Header**: Top navigation with property selector and user menu
- **Sidebar**: Left navigation with role-based menu items
- **MainLayout**: Wrapper component for authenticated pages
- **ProtectedRoute**: Route guard for authentication and permissions

### Services
- **API Service**: Axios instance with interceptors for auth
- **Auth Service**: Login, logout, and user management

## Next Steps

1. Implement additional pages (Floor View, Bookings, etc.)
2. Add real-time updates with polling or WebSocket
3. Implement offline functionality with IndexedDB
4. Add more comprehensive error handling
5. Implement property management features

## Development

To start development:

```bash
cd internal-management
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

## Backend Integration

The app expects the backend API to be running at the URL specified in `VITE_API_URL`.

Required backend endpoints:
- `POST /api/internal/auth/login` - Staff login
- `POST /api/internal/auth/logout` - Logout
- `GET /api/internal/auth/me` - Get current user info

## Technologies Used

- **React Router v7**: Routing and navigation
- **TypeScript**: Type safety
- **Tailwind CSS v4**: Styling
- **Axios**: HTTP client
- **Radix UI**: Accessible UI components
- **Recharts**: Charts and visualizations
- **Dexie**: IndexedDB wrapper for offline storage

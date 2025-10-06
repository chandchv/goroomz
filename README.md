# GoRoomz - Room Booking Platform

A comprehensive room booking platform built with React, Node.js, Express, and PostgreSQL. Features include user authentication, room management, booking system, and admin panel.

## 🚀 Features

- **User Authentication** - JWT-based authentication with role-based access control
- **Room Management** - CRUD operations for room listings with advanced filtering
- **Booking System** - Complete booking management with date conflict validation
- **Admin Panel** - Room and booking management for property owners and admins
- **Responsive Design** - Modern UI with Tailwind CSS and Framer Motion
- **Real-time Data** - PostgreSQL database with Sequelize ORM
- **Mobile Ready** - Built with Expo for cross-platform mobile development

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL with Sequelize ORM
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcryptjs
- **Validation:** express-validator
- **Security:** Helmet, CORS, Rate Limiting

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI + Custom Components
- **Animations:** Framer Motion
- **Routing:** React Router DOM
- **HTTP Client:** Fetch API with custom service layer

### Mobile (Coming Soon)
- **Framework:** React Native with Expo
- **Navigation:** Expo Router
- **State Management:** React Context + Hooks

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **PostgreSQL** (v13 or higher) - [Download here](https://www.postgresql.org/download/)
- **npm** or **yarn** package manager
- **Git** - [Download here](https://git-scm.com/)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd goroomz
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Environment Configuration
```bash
cp env.example .env
```

Edit the `.env` file with your PostgreSQL credentials:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=goroomz
DB_USER=postgres
DB_PASSWORD=your-postgres-password
DATABASE_URL=postgresql://postgres:your-postgres-password@localhost:5432/goroomz

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Database Setup
```bash
# Setup database tables
npm run setup

# Seed with initial data
npm run seed
```

#### Start Backend Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The backend will be available at `http://localhost:5000` (or `http://localhost:5001` if 5000 is in use)

### 3. Frontend Setup

#### Install Dependencies
```bash
# From the root directory
npm install
```

#### Environment Configuration
```bash
cp env.example .env
```

Edit the `.env` file:
```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# App Configuration
VITE_APP_NAME=GoRoomz
VITE_APP_VERSION=1.0.0
```

**Note:** If your backend is running on port 5001, update the API URL:
```env
VITE_API_URL=http://localhost:5001/api
```

#### Start Frontend Server
```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The frontend will be available at `http://localhost:3000`

## 🔑 Demo Accounts

The application comes with pre-configured demo accounts:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Admin** | admin@goroomz.com | admin123 | Full system access |
| **Property Owner** | owner@goroomz.com | owner123 | Room management, booking management |
| **Regular User** | user@goroomz.com | user123 | Browse rooms, make bookings |

## 📁 Project Structure

```
goroomz/
├── backend/                 # Backend API server
│   ├── config/             # Database configuration
│   ├── middleware/         # Express middleware
│   ├── models/             # Sequelize models
│   ├── routes/             # API routes
│   ├── scripts/            # Database scripts
│   └── server.js           # Main server file
├── src/                    # Frontend React app
│   ├── components/         # Reusable components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utility functions
│   ├── pages/              # Page components
│   ├── services/           # API service layer
│   └── main.jsx            # App entry point
├── .env                    # Frontend environment variables
├── .env.example           # Environment variables template
└── README.md              # This file
```

## 🔧 Available Scripts

### Backend Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run setup      # Setup database tables
npm run reset      # Reset database (drop and recreate tables)
npm run seed       # Seed database with initial data
npm test           # Run tests
npm run test:watch # Run tests in watch mode
```

### Frontend Scripts
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password
- `POST /api/auth/logout` - Logout user

### Rooms
- `GET /api/rooms` - Get all rooms (with filtering)
- `GET /api/rooms/:id` - Get single room
- `POST /api/rooms` - Create room (Owner/Admin)
- `PUT /api/rooms/:id` - Update room (Owner/Admin)
- `DELETE /api/rooms/:id` - Delete room (Owner/Admin)

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user's bookings
- `GET /api/bookings/:id` - Get single booking
- `PUT /api/bookings/:id/status` - Update booking status

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get single category

### Health Check
- `GET /api/health` - Server health status

## 🗄️ Database Schema

### Users
- Personal information (name, email, phone)
- Role-based access (user, owner, admin)
- Authentication and preferences

### Rooms
- Detailed room information
- Location data with coordinates
- Amenities and rules
- Owner reference and availability

### Bookings
- User and room references
- Check-in/check-out dates
- Status management
- Payment information

### Categories
- Room categories (PG, Hotel, Independent Home, Home Stay)
- Default amenities per category
- Sorting and organization

## 🚀 Deployment

### Backend Deployment

1. **Environment Variables**
   ```env
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=your-production-database-url
   JWT_SECRET=your-production-jwt-secret
   FRONTEND_URL=https://your-frontend-domain.com
   ```

2. **Build and Start**
   ```bash
   npm install --production
   npm start
   ```

### Frontend Deployment

1. **Environment Variables**
   ```env
   VITE_API_URL=https://your-api-domain.com/api
   ```

2. **Build**
   ```bash
   npm run build
   ```

3. **Deploy** the `dist` folder to your hosting service

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

#### Port Already in Use
If you get `EADDRINUSE` error:
```bash
# Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

# Or use different port
PORT=5001 npm run dev
```

#### Database Connection Issues
1. Ensure PostgreSQL is running
2. Check database credentials in `.env`
3. Verify database exists: `createdb goroomz`

#### Frontend API Connection Issues
1. Ensure backend is running
2. Check `VITE_API_URL` in frontend `.env`
3. Verify CORS settings in backend

#### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the API documentation

## 🔮 Roadmap

- [ ] Mobile app with Expo
- [ ] Payment integration
- [ ] Real-time notifications
- [ ] Advanced search and filters
- [ ] Image upload and management
- [ ] Review and rating system
- [ ] Multi-language support

---

**Happy Coding! 🎉**

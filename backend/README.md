# GoRoomz Backend API

A comprehensive backend API for the GoRoomz room booking platform built with Node.js, Express, and PostgreSQL.

## Features

- 🔐 **Secure Authentication** - JWT-based authentication with bcrypt password hashing
- 🏠 **Room Management** - CRUD operations for room listings with advanced filtering
- 📅 **Booking System** - Complete booking management with date conflict validation
- 👥 **User Management** - Role-based access control (User, Owner, Admin)
- 📊 **Category Management** - Organized room categories with custom amenities
- 🛡️ **Security** - Rate limiting, CORS, Helmet security headers
- ✅ **Validation** - Comprehensive input validation with express-validator
- 📝 **Logging** - Structured error handling and logging

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=goroomz
   DB_USER=postgres
   DB_PASSWORD=your-postgres-password
   DATABASE_URL=postgresql://postgres:your-postgres-password@localhost:5432/goroomz
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start PostgreSQL**
   Make sure PostgreSQL is running on your system.

5. **Setup the database**
   ```bash
   npm run setup
   ```

6. **Seed the database**
   ```bash
   npm run seed
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password
- `POST /api/auth/logout` - Logout user

### Rooms
- `GET /api/rooms` - Get all rooms (with filtering and pagination)
- `GET /api/rooms/:id` - Get single room
- `POST /api/rooms` - Create new room (Owner/Admin)
- `PUT /api/rooms/:id` - Update room (Owner/Admin)
- `DELETE /api/rooms/:id` - Delete room (Owner/Admin)
- `GET /api/rooms/owner/my-rooms` - Get owner's rooms

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings` - Get user's bookings
- `GET /api/bookings/:id` - Get single booking
- `PUT /api/bookings/:id/status` - Update booking status
- `GET /api/bookings/owner/my-bookings` - Get owner's bookings

### Users
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id/role` - Update user role (Admin)
- `PUT /api/users/:id/deactivate` - Deactivate user (Admin)
- `GET /api/users/stats/overview` - Get user statistics (Admin)

### Categories
- `GET /api/categories` - Get all active categories
- `GET /api/categories/:id` - Get single category
- `POST /api/categories` - Create category (Admin)
- `PUT /api/categories/:id` - Update category (Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)
- `GET /api/categories/admin/all` - Get all categories (Admin)

## Database Models

### User
- Personal information (name, email, phone)
- Role-based access (user, owner, admin)
- Authentication and preferences

### Room
- Detailed room information
- Location data with coordinates
- Amenities and rules
- Owner reference and availability

### Booking
- User and room references
- Check-in/check-out dates
- Status management
- Payment information

### Category
- Room categories (PG, Hotel, Independent Home, Home Stay)
- Default amenities per category
- Sorting and organization

## Authentication & Authorization

### Roles
- **User**: Can browse rooms and make bookings
- **Owner**: Can create and manage their own rooms, view their bookings
- **Admin**: Full system access, user management, category management

### Security Features
- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- CORS protection
- Input validation and sanitization
- Helmet security headers

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run setup` - Setup database tables
- `npm run seed` - Seed database with initial data

### Environment Variables
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DATABASE_URL` - Complete PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRE` - JWT token expiration time
- `FRONTEND_URL` - Frontend URL for CORS

## API Response Format

All API responses follow a consistent format:

```json
{
  "success": true|false,
  "message": "Response message",
  "data": {}, // Response data (if any)
  "count": 0, // Number of items (for lists)
  "total": 0, // Total items (for pagination)
  "page": 1, // Current page (for pagination)
  "pages": 1 // Total pages (for pagination)
}
```

## Error Handling

The API includes comprehensive error handling:
- Validation errors with detailed messages
- Authentication and authorization errors
- Database errors with appropriate HTTP status codes
- Rate limiting responses
- Structured error responses

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

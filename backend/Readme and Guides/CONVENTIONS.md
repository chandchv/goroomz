# GoRoomz Naming Conventions

This document defines the naming conventions used throughout the GoRoomz codebase to ensure consistency and avoid case conversion errors.

**Validates**: Requirements 13.5 (Role Segregation Optimization)

## Overview

The GoRoomz platform uses different naming conventions for different layers of the application:

- **Database Layer**: `snake_case`
- **JavaScript/TypeScript Layer**: `camelCase`
- **API Responses**: `camelCase`

## Database Naming Conventions (Requirement 13.1)

All database column names and table names use `snake_case`:

### Table Names
```sql
users
rooms
property_assignments
internal_roles
lead_communications
```

### Column Names
```sql
internal_role
staff_role
territory_id
manager_id
commission_rate
is_active
last_login_at
created_at
updated_at
assigned_property_id
```

## JavaScript/TypeScript Naming Conventions (Requirement 13.2)

All JavaScript and TypeScript variables, object properties, and function parameters use `camelCase`:

### Variables and Properties
```javascript
const internalRole = 'agent';
const userId = user.id;
const createdAt = new Date();
const assignedPropertyId = property.id;
```

### Object Properties
```javascript
const user = {
  internalRole: 'agent',
  staffRole: 'manager',
  territoryId: '123',
  managerId: '456',
  commissionRate: 5.5,
  isActive: true,
  lastLoginAt: new Date()
};
```

## Sequelize Model Configuration (Requirement 13.3)

All Sequelize models MUST use the `underscored: true` option to enable automatic case conversion:

```javascript
const User = sequelize.define('User', {
  // Model attributes in camelCase
  internalRole: {
    type: DataTypes.STRING,
    allowNull: true
  },
  staffRole: {
    type: DataTypes.ENUM('front_desk', 'housekeeping', 'maintenance', 'manager'),
    allowNull: true
  },
  territoryId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'users',
  underscored: true,  // REQUIRED: Enables automatic camelCase <-> snake_case conversion
  timestamps: true
});
```

### How `underscored: true` Works

When `underscored: true` is set:

1. **Model Definition**: Define attributes in `camelCase`
2. **Database Columns**: Sequelize automatically maps to `snake_case` columns
3. **Queries**: Use `camelCase` in your code
4. **Database**: Sequelize translates to `snake_case` for SQL queries
5. **Results**: Sequelize returns data with `camelCase` keys

Example:
```javascript
// In your code (camelCase)
const user = await User.findOne({
  where: { internalRole: 'agent' }
});

// Sequelize generates SQL (snake_case)
// SELECT * FROM users WHERE internal_role = 'agent'

// Result has camelCase keys
console.log(user.internalRole); // 'agent'
console.log(user.createdAt);    // Date object
```

## API Response Format (Requirement 13.4)

All API responses MUST use `camelCase` for JSON field names:

### Correct API Response
```json
{
  "success": true,
  "data": {
    "id": "123",
    "internalRole": "agent",
    "staffRole": "manager",
    "territoryId": "456",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Incorrect API Response (DO NOT USE)
```json
{
  "success": true,
  "data": {
    "id": "123",
    "internal_role": "agent",      // ❌ Wrong: snake_case
    "staff_role": "manager",        // ❌ Wrong: snake_case
    "territory_id": "456",          // ❌ Wrong: snake_case
    "created_at": "2024-01-01",     // ❌ Wrong: snake_case
    "updated_at": "2024-01-01"      // ❌ Wrong: snake_case
  }
}
```

## Case Conversion Utilities

The `backend/utils/caseConversion.js` module provides utilities for manual case conversion when needed:

### String Conversion
```javascript
const { toSnakeCase, toCamelCase } = require('./utils/caseConversion');

toSnakeCase('internalRole');  // 'internal_role'
toCamelCase('internal_role'); // 'internalRole'
```

### Object Conversion
```javascript
const { objectToSnakeCase, objectToCamelCase } = require('./utils/caseConversion');

// Shallow conversion
const snakeObj = objectToSnakeCase({ internalRole: 'agent', userId: '123' });
// { internal_role: 'agent', user_id: '123' }

const camelObj = objectToCamelCase({ internal_role: 'agent', user_id: '123' });
// { internalRole: 'agent', userId: '123' }
```

### Deep Object Conversion
```javascript
const { deepObjectToSnakeCase, deepObjectToCamelCase } = require('./utils/caseConversion');

// Deep conversion (handles nested objects and arrays)
const deepSnake = deepObjectToSnakeCase({
  userId: '123',
  userProfile: {
    firstName: 'John',
    contactInfo: { phoneNumber: '555-1234' }
  }
});
// {
//   user_id: '123',
//   user_profile: {
//     first_name: 'John',
//     contact_info: { phone_number: '555-1234' }
//   }
// }
```

### Model Serialization
```javascript
const { serializeModelToCamelCase } = require('./utils/caseConversion');

// Serialize Sequelize model to camelCase JSON
const user = await User.findByPk(userId);
const json = serializeModelToCamelCase(user);
// Returns camelCase JSON (same as user.toJSON() when underscored: true)
```

### Validation
```javascript
const { isObjectCamelCase, isObjectSnakeCase } = require('./utils/caseConversion');

isObjectCamelCase({ userId: '123', userName: 'John' });  // true
isObjectCamelCase({ user_id: '123' });                   // false

isObjectSnakeCase({ user_id: '123', user_name: 'John' }); // true
isObjectSnakeCase({ userId: '123' });                     // false
```

## Common Patterns

### Creating Records
```javascript
// Use camelCase in your code
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  internalRole: 'agent',
  territoryId: territory.id,
  isActive: true
});

// Sequelize handles the conversion to snake_case for the database
```

### Querying Records
```javascript
// Use camelCase in where clauses
const users = await User.findAll({
  where: {
    internalRole: 'agent',
    isActive: true
  },
  order: [['createdAt', 'DESC']]
});
```

### Updating Records
```javascript
// Use camelCase for updates
await user.update({
  internalRole: 'regional_manager',
  territoryId: newTerritory.id,
  lastLoginAt: new Date()
});
```

### API Responses
```javascript
// Sequelize models automatically return camelCase JSON
router.get('/users/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  
  // user.toJSON() returns camelCase
  res.json({
    success: true,
    data: user.toJSON()  // Already in camelCase
  });
});
```

## Migration Best Practices

When creating migrations, use `snake_case` for column names:

```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'internal_role', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    await queryInterface.addColumn('users', 'territory_id', {
      type: Sequelize.UUID,
      allowNull: true
    });
  },
  
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'internal_role');
    await queryInterface.removeColumn('users', 'territory_id');
  }
};
```

## Testing Conventions

When writing tests, use `camelCase` for all JavaScript code:

```javascript
describe('User Model', () => {
  it('should create user with internal role', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      internalRole: 'agent',
      territoryId: territory.id
    });
    
    expect(user.internalRole).toBe('agent');
    expect(user.territoryId).toBe(territory.id);
  });
});
```

## Common Mistakes to Avoid

### ❌ Don't: Mix case conventions
```javascript
// Wrong: Using snake_case in JavaScript
const user = {
  internal_role: 'agent',  // ❌ Wrong
  territory_id: '123'      // ❌ Wrong
};
```

### ✅ Do: Use camelCase consistently
```javascript
// Correct: Using camelCase in JavaScript
const user = {
  internalRole: 'agent',   // ✅ Correct
  territoryId: '123'       // ✅ Correct
};
```

### ❌ Don't: Forget underscored: true
```javascript
// Wrong: Model without underscored option
const User = sequelize.define('User', {
  internalRole: DataTypes.STRING
}, {
  tableName: 'users'
  // ❌ Missing: underscored: true
});
```

### ✅ Do: Always include underscored: true
```javascript
// Correct: Model with underscored option
const User = sequelize.define('User', {
  internalRole: DataTypes.STRING
}, {
  tableName: 'users',
  underscored: true  // ✅ Correct
});
```

## Summary

1. **Database**: Always use `snake_case` for table and column names
2. **JavaScript/TypeScript**: Always use `camelCase` for variables and properties
3. **Sequelize Models**: Always set `underscored: true` for automatic conversion
4. **API Responses**: Always return `camelCase` JSON (Sequelize handles this automatically)
5. **Manual Conversion**: Use utilities from `backend/utils/caseConversion.js` when needed

Following these conventions ensures consistency across the codebase and prevents case conversion errors.

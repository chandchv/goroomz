# User Role Validation Guide

## Overview

The User model now includes comprehensive role validation logic to enforce the role segregation requirements. This guide explains how to use the validation features in your route handlers and controllers.

## Validation Features

### 1. Role Conflict Prevention (Requirement 1.5)

**What it does:** Prevents users from having both property owner roles (owner/admin/category_owner) and internal platform roles (internalRole) simultaneously.

**When it triggers:** Automatically during user creation and updates when role or internalRole fields change.

**Example:**
```javascript
// This will throw an error
await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'owner',
  internalRole: 'agent' // ❌ Conflict!
});
// Error: Role conflict: A user cannot have both property owner role...
```

### 2. Permission Scope Validation (Requirement 10.2)

**What it does:** Ensures property staff only have permissions within the allowed scope and don't have internal platform permissions.

**Allowed property staff permissions:**
- canCheckIn
- canCheckOut
- canManageRooms
- canRecordPayments
- canViewReports
- canManageStaff
- canUpdateRoomStatus
- canManageMaintenance

**When it triggers:** Automatically during user creation and updates when permissions or staffRole fields change.

**Example:**
```javascript
// This will throw an error
await User.create({
  name: 'Front Desk Staff',
  email: 'staff@example.com',
  role: 'user',
  staffRole: 'front_desk',
  permissions: {
    canCheckIn: true,
    invalidPermission: true // ❌ Not allowed!
  }
});
// Error: Invalid permissions for property staff: invalidPermission...

// This will also throw an error
await User.create({
  name: 'Property Staff',
  email: 'staff2@example.com',
  role: 'user',
  staffRole: 'housekeeping',
  internalPermissions: {
    canOnboardProperties: true // ❌ Property staff can't have internal permissions!
  }
});
// Error: Property staff cannot have internal platform permissions...
```

### 3. Self-Permission Modification Prevention (Requirement 7.5)

**What it does:** Prevents property staff from modifying their own permissions.

**When it triggers:** During user updates when permissions change and requesting user context is set.

**How to use in route handlers:**
```javascript
// In your route handler
router.put('/staff/:id', protectInternal, async (req, res) => {
  try {
    const staff = await User.findByPk(req.params.id);
    
    // Set the requesting user context before making changes
    staff.setRequestingUserContext(req.user.id, req.user.getUserType());
    
    // Update permissions
    staff.permissions = req.body.permissions;
    
    // This will throw if staff is trying to modify their own permissions
    await staff.save();
    
    res.json({ success: true, user: staff });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
```

### 4. Platform Role Creation Prevention (Requirement 10.4)

**What it does:** Prevents property owners from creating or assigning internal platform roles.

**When it triggers:** During user creation and updates when internalRole changes and requesting user context is set.

**How to use in route handlers:**
```javascript
// In your route handler for creating staff
router.post('/staff', protectInternal, async (req, res) => {
  try {
    const newUser = User.build(req.body);
    
    // Set the requesting user context
    newUser.setRequestingUserContext(req.user.id, req.user.getUserType());
    
    // This will throw if property owner tries to assign internalRole
    await newUser.save();
    
    res.json({ success: true, user: newUser });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});
```

## Helper Method: setRequestingUserContext

This method should be called before saving user changes to enable context-aware validation.

**Signature:**
```javascript
user.setRequestingUserContext(requestingUserId, requestingUserType)
```

**Parameters:**
- `requestingUserId` (string): The ID of the user making the request
- `requestingUserType` (string): The type of the user making the request ('property_owner', 'platform_staff', 'property_staff', 'external_user')

**Example:**
```javascript
const user = await User.findByPk(userId);
user.setRequestingUserContext(req.user.id, req.user.getUserType());
user.permissions = newPermissions;
await user.save(); // Validation will check if self-modification is allowed
```

## Best Practices

### 1. Always Set Context for User Modifications

When updating users through API endpoints, always set the requesting user context:

```javascript
router.put('/users/:id', protectInternal, async (req, res) => {
  const user = await User.findByPk(req.params.id);
  user.setRequestingUserContext(req.user.id, req.user.getUserType());
  // ... make changes
  await user.save();
});
```

### 2. Handle Validation Errors Gracefully

Validation errors are thrown as standard JavaScript errors. Catch them and return appropriate HTTP responses:

```javascript
try {
  await user.save();
} catch (error) {
  if (error.message.includes('Role conflict')) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid role combination',
      details: error.message 
    });
  }
  // Handle other errors...
}
```

### 3. Use getUserType() for Authorization Checks

The `getUserType()` method is useful for determining what a user can do:

```javascript
const userType = req.user.getUserType();

if (userType === 'property_owner') {
  // Allow property owner actions
} else if (userType === 'platform_staff') {
  // Allow platform staff actions
}
```

### 4. Validation Happens Automatically

You don't need to manually call validation functions. They're triggered automatically by Sequelize hooks during:
- `User.create()`
- `user.save()`
- `user.update()`

## Error Messages

The validation logic provides clear error messages:

| Validation | Error Message |
|------------|---------------|
| Role Conflict | "Role conflict: A user cannot have both property owner role (owner/admin/category_owner) and internal platform role (internalRole). These roles are mutually exclusive." |
| Invalid Permissions | "Invalid permissions for property staff: [list]. Property staff can only have: [allowed list]" |
| Internal Permissions on Staff | "Property staff cannot have internal platform permissions. Only platform staff (users with internalRole) can have internalPermissions." |
| Self-Permission Modification | "Property staff cannot modify their own permissions. Permission changes must be made by a property owner or administrator." |
| Platform Role Creation | "Property owners cannot create or assign platform staff roles (internalRole). Only platform administrators can manage internal roles." |

## Testing

Comprehensive tests are available in:
- `backend/tests/userRoleValidation.test.js` - Unit tests for validation logic
- `backend/tests/userRoleValidationIntegration.test.js` - Integration tests with actual User model
- `backend/tests/userHelperMethods.test.js` - Tests for helper methods

Run tests with:
```bash
npm test -- userRoleValidation
```

## Implementation Details

The validation logic is implemented in `backend/models/User.js` using Sequelize hooks:

- **beforeCreate**: Validates role conflicts, permission scope, and platform role creation
- **beforeUpdate**: Validates role conflicts, permission scope, self-permission modification, and platform role creation

The validation functions are:
- `validateRoleConflicts(user)`
- `validatePermissionScope(user)`
- `validateSelfPermissionModification(user)`
- `validatePlatformRoleCreation(user)`

These functions are called automatically by the hooks and throw errors when validation fails.

const { User } = require('../models');

describe('User Model Case Conversion', () => {
  it('should have underscored: true configured', () => {
    // Check that the model options include underscored: true
    expect(User.options.underscored).toBe(true);
  });

  it('should convert camelCase to snake_case for database columns', () => {
    // Verify that field names are properly configured
    const rawAttributes = User.rawAttributes;
    
    // Check that camelCase fields exist in the model definition
    expect(rawAttributes.internalRole).toBeDefined();
    expect(rawAttributes.staffRole).toBeDefined();
    expect(rawAttributes.internalPermissions).toBeDefined();
    expect(rawAttributes.territoryId).toBeDefined();
    expect(rawAttributes.managerId).toBeDefined();
    expect(rawAttributes.commissionRate).toBeDefined();
    expect(rawAttributes.isActive).toBeDefined();
    expect(rawAttributes.lastLoginAt).toBeDefined();
  });

  it('should map camelCase to snake_case field names', () => {
    // Verify the field name mapping
    const rawAttributes = User.rawAttributes;
    
    // These should have field names in snake_case for the database
    expect(rawAttributes.internalRole.field).toBe('internal_role');
    expect(rawAttributes.staffRole.field).toBe('staff_role');
    expect(rawAttributes.internalPermissions.field).toBe('internal_permissions');
    expect(rawAttributes.territoryId.field).toBe('territory_id');
    expect(rawAttributes.managerId.field).toBe('manager_id');
    expect(rawAttributes.commissionRate.field).toBe('commission_rate');
    expect(rawAttributes.isActive.field).toBe('is_active');
    expect(rawAttributes.lastLoginAt.field).toBe('last_login_at');
  });

  it('should use snake_case for table name', () => {
    expect(User.tableName).toBe('users');
  });
});

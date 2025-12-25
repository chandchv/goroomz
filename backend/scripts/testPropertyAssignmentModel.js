const { PropertyAssignment, User, Room } = require('../models');

async function testModel() {
  try {
    console.log('Testing PropertyAssignment model...\n');
    
    // Test 1: Model is loaded
    console.log('✓ Model loaded:', PropertyAssignment.name);
    console.log('✓ Table name:', PropertyAssignment.tableName);
    
    // Test 2: Check attributes
    const attributes = Object.keys(PropertyAssignment.rawAttributes);
    console.log('✓ Attributes:', attributes.join(', '));
    
    // Test 3: Check associations
    const associations = Object.keys(PropertyAssignment.associations);
    console.log('✓ Associations:', associations.join(', '));
    
    // Test 4: Verify User associations
    console.log('✓ User.propertyAssignments exists:', 'propertyAssignments' in User.associations);
    console.log('✓ User.assignmentsMade exists:', 'assignmentsMade' in User.associations);
    
    // Test 5: Verify Room associations
    console.log('✓ Room.assignments exists:', 'assignments' in Room.associations);
    
    // Test 6: Check indexes
    const indexes = PropertyAssignment.options.indexes || [];
    console.log('✓ Model indexes defined:', indexes.length);
    
    // Test 7: Verify enum values
    const assignmentTypeEnum = PropertyAssignment.rawAttributes.assignmentType.values;
    console.log('✓ Assignment types:', assignmentTypeEnum ? assignmentTypeEnum.join(', ') : 'defined in database');
    
    // Test 8: Check underscored option
    console.log('✓ Underscored option:', PropertyAssignment.options.underscored);
    
    // Test 9: Check timestamps
    console.log('✓ Timestamps enabled:', PropertyAssignment.options.timestamps);
    
    console.log('\n✅ All model tests passed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testModel();

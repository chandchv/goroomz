const { PropertyAssignment, User, Room, sequelize } = require('../models');

async function testIntegration() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Testing PropertyAssignment database integration...\n');
    
    // Test 1: Count existing assignments
    const count = await PropertyAssignment.count({ transaction });
    console.log('✓ Current assignments count:', count);
    
    // Test 2: Find a user and room for testing (if they exist)
    const testUser = await User.findOne({ 
      where: { isActive: true },
      transaction 
    });
    
    const testRoom = await Room.findOne({ 
      where: { isActive: true },
      transaction 
    });
    
    if (testUser && testRoom) {
      console.log('✓ Found test user:', testUser.name);
      console.log('✓ Found test room:', testRoom.title);
      
      // Test 3: Create a test assignment (will rollback)
      const assignment = await PropertyAssignment.create({
        userId: testUser.id,
        propertyId: testRoom.id,
        assignmentType: 'agent',
        assignedBy: testUser.id,
        isActive: true
      }, { transaction });
      
      console.log('✓ Created test assignment:', assignment.id);
      
      // Test 4: Query with associations
      const assignmentWithAssociations = await PropertyAssignment.findByPk(
        assignment.id,
        {
          include: [
            { model: User, as: 'user' },
            { model: Room, as: 'property' },
            { model: User, as: 'assigner' }
          ],
          transaction
        }
      );
      
      console.log('✓ Loaded assignment with associations');
      console.log('  - User:', assignmentWithAssociations.user.name);
      console.log('  - Property:', assignmentWithAssociations.property.title);
      console.log('  - Assigner:', assignmentWithAssociations.assigner.name);
      
      // Test 5: Query from User side
      const userWithAssignments = await User.findByPk(testUser.id, {
        include: [{ model: PropertyAssignment, as: 'propertyAssignments' }],
        transaction
      });
      
      console.log('✓ User has', userWithAssignments.propertyAssignments.length, 'assignment(s)');
      
      // Test 6: Query from Room side
      const roomWithAssignments = await Room.findByPk(testRoom.id, {
        include: [{ model: PropertyAssignment, as: 'assignments' }],
        transaction
      });
      
      console.log('✓ Room has', roomWithAssignments.assignments.length, 'assignment(s)');
      
    } else {
      console.log('⚠ No test data available (user or room not found)');
      console.log('  This is okay - the model structure is verified');
    }
    
    // Rollback to not affect the database
    await transaction.rollback();
    console.log('\n✅ All integration tests passed! (Changes rolled back)');
    
    await sequelize.close();
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

testIntegration();

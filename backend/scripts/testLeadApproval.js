const { sequelize } = require('../config/database');
const { Lead, User, Property } = require('../models');

async function testLeadApproval() {
  try {
    console.log('🔍 Testing lead approval and property creation...\n');

    // Find an approved lead
    const approvedLead = await Lead.findOne({
      where: { status: 'approved' },
      order: [['approvedAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!approvedLead) {
      console.log('❌ No approved leads found');
      return;
    }

    console.log('✅ Found approved lead:');
    console.log(`   ID: ${approvedLead.id}`);
    console.log(`   Owner: ${approvedLead.propertyOwnerName}`);
    console.log(`   Email: ${approvedLead.email}`);
    console.log(`   Business: ${approvedLead.businessName}`);
    console.log(`   Type: ${approvedLead.propertyType}`);
    console.log(`   Approved At: ${approvedLead.approvedAt}\n`);

    // Check if property owner was created
    const propertyOwner = await User.findOne({
      where: { email: approvedLead.email, role: 'owner' }
    });

    if (propertyOwner) {
      console.log('✅ Property owner account exists:');
      console.log(`   ID: ${propertyOwner.id}`);
      console.log(`   Name: ${propertyOwner.name}`);
      console.log(`   Email: ${propertyOwner.email}`);
      console.log(`   Verified: ${propertyOwner.isVerified}\n`);

      // Check if property was created
      const property = await Property.findOne({
        where: { ownerId: propertyOwner.id }
      });

      if (property) {
        console.log('✅ Property exists:');
        console.log(`   ID: ${property.id}`);
        console.log(`   Name: ${property.name}`);
        console.log(`   Type: ${property.type}`);
        console.log(`   Location: ${JSON.stringify(property.location)}`);
        console.log(`   Active: ${property.isActive}`);
        console.log(`   Approval Status: ${property.approvalStatus}\n`);
      } else {
        console.log('❌ No property found for this owner\n');
      }
    } else {
      console.log('❌ Property owner account not found\n');
    }

    // List all approved leads and their property status
    console.log('📊 All approved leads:\n');
    const allApprovedLeads = await Lead.findAll({
      where: { status: 'approved' },
      order: [['approvedAt', 'DESC']],
      limit: 10
    });

    for (const lead of allApprovedLeads) {
      const owner = await User.findOne({
        where: { email: lead.email, role: 'owner' }
      });
      
      const property = owner ? await Property.findOne({
        where: { ownerId: owner.id }
      }) : null;

      console.log(`Lead: ${lead.propertyOwnerName} (${lead.email})`);
      console.log(`  Business: ${lead.businessName || 'N/A'}`);
      console.log(`  Owner Account: ${owner ? '✅ Created' : '❌ Missing'}`);
      console.log(`  Property: ${property ? `✅ ${property.name}` : '❌ Missing'}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

testLeadApproval();

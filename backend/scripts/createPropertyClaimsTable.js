/**
 * Script to create the property_claims table
 */

require('dotenv').config();
const { sequelize } = require('../config/database');

async function createPropertyClaimsTable() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Create the property_claims table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS property_claims (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        claimant_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        claimant_name VARCHAR(255) NOT NULL,
        claimant_email VARCHAR(255) NOT NULL,
        claimant_phone VARCHAR(20) NOT NULL,
        business_name VARCHAR(255),
        documents JSONB DEFAULT '[]',
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'cancelled')),
        verification_notes TEXT,
        rejection_reason TEXT,
        reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        proof_of_ownership TEXT,
        additional_info JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ property_claims table created');

    // Create indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_property_claims_property_id ON property_claims(property_id);
      CREATE INDEX IF NOT EXISTS idx_property_claims_claimant_user_id ON property_claims(claimant_user_id);
      CREATE INDEX IF NOT EXISTS idx_property_claims_claimant_email ON property_claims(claimant_email);
      CREATE INDEX IF NOT EXISTS idx_property_claims_status ON property_claims(status);
      CREATE INDEX IF NOT EXISTS idx_property_claims_created_at ON property_claims(created_at);
    `);
    console.log('✅ Indexes created');

    console.log('\n🎉 Property claims table setup complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createPropertyClaimsTable();

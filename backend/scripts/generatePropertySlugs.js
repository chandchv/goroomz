/**
 * Migration Script: Generate SEO-friendly slugs for all properties
 * 
 * This script:
 * 1. Adds slug column to properties table if not exists
 * 2. Generates unique slugs for all existing properties
 * 3. Handles duplicate slugs by appending numbers
 */

const { sequelize } = require('../config/database');
const { Property } = require('../models');

async function generatePropertySlugs() {
  console.log('🚀 Starting property slug generation...\n');

  try {
    // Step 1: Add slug column if it doesn't exist
    console.log('📋 Checking if slug column exists...');
    await sequelize.query(`
      ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
    `);
    console.log('✅ Slug column ready\n');

    // Step 2: Fetch all properties without slugs
    const properties = await Property.findAll({
      where: {
        slug: null
      },
      order: [['createdAt', 'ASC']]
    });

    console.log(`📊 Found ${properties.length} properties without slugs\n`);

    if (properties.length === 0) {
      console.log('✨ All properties already have slugs!');
      return;
    }

    // Step 3: Generate slugs
    let successCount = 0;
    let errorCount = 0;
    const slugTracker = new Set();

    for (const property of properties) {
      try {
        const city = property.location?.city || '';
        const area = property.location?.area || '';
        
        // Generate base slug
        let baseSlug = Property.generateSlug(property.name, city, area);
        let slug = baseSlug;
        let counter = 1;

        // Handle duplicates by appending numbers
        while (slugTracker.has(slug)) {
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Check if slug exists in database
        const existing = await Property.findOne({ where: { slug } });
        if (existing) {
          // Find next available number
          while (await Property.findOne({ where: { slug: `${baseSlug}-${counter}` } })) {
            counter++;
          }
          slug = `${baseSlug}-${counter}`;
        }

        // Update property
        await property.update({ slug });
        slugTracker.add(slug);
        
        successCount++;
        console.log(`✅ [${successCount}/${properties.length}] ${property.name} → ${slug}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to generate slug for property ${property.id}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Migration Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${properties.length}`);
    console.log('='.repeat(60));

    if (errorCount === 0) {
      console.log('\n🎉 All property slugs generated successfully!');
    } else {
      console.log('\n⚠️  Some properties failed. Please review errors above.');
    }

  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generatePropertySlugs()
    .then(() => {
      console.log('\n✨ Migration complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { generatePropertySlugs };

/**
 * Seed scraped PG data from JSON file into the database.
 * Usage: node scripts/seedScrapedPGs.js [path-to-json]
 *
 * Defaults to scripts/scraped-pg-data.json
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { sequelize } = require('../config/database');
const { Property, User } = require('../models');

async function main() {
  const jsonPath = process.argv[2] || path.join(__dirname, 'scraped-pg-data.json');

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  console.log(`📄 Loaded ${data.length} properties from ${jsonPath}`);

  // Find an owner to assign
  let owner = await User.findOne({ where: { email: 'scraped@goroomz.com' } });
  if (!owner) owner = await User.findOne({ where: { role: 'admin' } });
  if (!owner) owner = await User.findOne({ where: { role: 'owner' } });
  if (!owner) {
    console.error('❌ No user found to assign as owner.');
    process.exit(1);
  }
  console.log(`👤 Owner: ${owner.name} (${owner.email})\n`);

  let created = 0, skipped = 0, errors = 0;

  for (const entry of data) {
    try {
      const existing = await Property.findOne({ where: { slug: entry.slug } });
      if (existing) { skipped++; continue; }

      await Property.create({
        ...entry,
        ownerId: owner.id,
        approvedAt: new Date(),
      });
      created++;
      if (created % 100 === 0) console.log(`  … ${created} created`);
    } catch (err) {
      errors++;
      if (errors <= 5) console.error(`  ❌ ${entry.name}: ${err.message}`);
    }
  }

  console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}, Errors: ${errors}\n`);
  await sequelize.close();
}

main().catch(err => { console.error(err); process.exit(1); });

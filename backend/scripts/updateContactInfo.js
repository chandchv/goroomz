/**
 * Updates properties' contact_info from the scraped CSV data.
 * Matches by property name (fuzzy) and updates the phone number.
 *
 * Usage: node scripts/updateContactInfo.js
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const Property = require('../models/Property');
require('dotenv').config();

// Simple CSV parser for this specific format
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (values[i] || '').trim(); });
    return row;
  }).filter(r => r.PG_Name);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

// Normalize name for matching
function normalize(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected\n');

    // Load CSV data
    const csvPath = path.join(__dirname, 'pg_data_with_images_2025-10-24_1761327559464.csv');
    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found:', csvPath);
      process.exit(1);
    }

    const csvData = parseCSV(csvPath);
    console.log(`Loaded ${csvData.length} rows from CSV\n`);

    // Build a lookup map: normalized name -> { phone, address }
    const contactMap = {};
    csvData.forEach(row => {
      const phone = (row.Contact || '').replace(/\D/g, '');
      if (phone.length >= 10) {
        const key = normalize(row.PG_Name);
        contactMap[key] = {
          phone: phone.slice(-10), // last 10 digits
          name: row.PG_Name
        };
      }
    });

    console.log(`Found ${Object.keys(contactMap).length} entries with phone numbers\n`);

    // Get all properties
    const properties = await Property.findAll();
    console.log(`Total properties in DB: ${properties.length}\n`);

    let updated = 0;
    let alreadyHasContact = 0;
    let noMatch = 0;

    for (const prop of properties) {
      // Skip if already has a phone number
      if (prop.contactInfo?.phone) {
        alreadyHasContact++;
        continue;
      }

      const propName = normalize(prop.name);

      // Try exact match first
      let match = contactMap[propName];

      // Try partial match if no exact match
      if (!match) {
        for (const [csvName, data] of Object.entries(contactMap)) {
          // Check if one contains the other (at least 60% overlap)
          if (propName.includes(csvName) || csvName.includes(propName)) {
            match = data;
            break;
          }
          // Check word overlap
          const propWords = propName.split(' ').filter(w => w.length > 2);
          const csvWords = csvName.split(' ').filter(w => w.length > 2);
          const overlap = propWords.filter(w => csvWords.includes(w)).length;
          if (overlap >= Math.min(propWords.length, csvWords.length) * 0.6 && overlap >= 2) {
            match = data;
            break;
          }
        }
      }

      if (match) {
        await prop.update({
          contactInfo: {
            ...(prop.contactInfo || {}),
            phone: '+91' + match.phone
          }
        });
        console.log(`✅ Updated: ${prop.name} -> ${match.phone}`);
        updated++;
      } else {
        noMatch++;
      }
    }

    console.log(`\n=============================`);
    console.log(`Updated:        ${updated}`);
    console.log(`Already had #:  ${alreadyHasContact}`);
    console.log(`No match:       ${noMatch}`);
    console.log(`=============================\n`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();

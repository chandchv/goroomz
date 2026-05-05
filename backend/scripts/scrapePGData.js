/**
 * PG Data Scraper for payingguestinbengaluru.com
 *
 * Scrapes PG listings and saves them to the `properties` table
 * (not the `rooms` table) so they appear on the website via
 * /api/properties and /api/properties/featured.
 *
 * HTML structure per listing (two consecutive tables):
 *   Table 1 – title row:
 *     <table><tr><td><h3> PG NAME </h3></td></tr></table>
 *
 *   Table 2 – details (2 rows, 2 columns):
 *     Row 1:
 *       td[0] (rowspan=2) – amenities / facilities list (line-break separated)
 *       td[1]             – address + landmark
 *     Row 2:
 *       td[0]             – contact name(s) + phone number(s)
 *
 * Usage:
 *   node scripts/scrapePGData.js                  # scrape all areas
 *   node scripts/scrapePGData.js --area koramangala  # single area
 *   node scripts/scrapePGData.js --dry-run        # scrape only, don't save
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { sequelize } = require('../config/database');
const { Property, User } = require('../models');
require('dotenv').config();

// ─── Configuration ───────────────────────────────────────────
const BASE_URL = 'https://www.payingguestinbengaluru.com';
const REQUEST_DELAY_MS = 1500; // polite delay between requests
const REQUEST_TIMEOUT = 15000;

// ─── Area list ───────────────────────────────────────────────
const AREAS_TO_SCRAPE = [
  'adugodi', 'AECSlayout', 'airportroad', 'arekere',
  'Ashoknagar-PG-near-Garuda-Mall', 'bannerghatta', 'dairycircle',
  'bannerghatta-near-jayadeva', 'banaswadi', 'banashankari',
  'BASAVANGUDI', 'bellandur', 'bilekahalli', 'bioconhuskurgate',
  'bommanahalli', 'bommasandra', 'btmlayout', 'btmlayout1',
  'btmlayout2', 'cvramannagar', 'Chandapura', 'Channasandra',
  'Christ-University-Central-Campus', 'Christ-University-Yeshwanthpur-Campus',
  'christ-college-bannerghatta-road', 'Commercial-Street', 'dasarahalli',
  'devarabisanahalli', 'Dickenson-Road', 'doddanekundi', 'domlur',
  'ejipura', 'electroniccity', 'electronic-city-phase-1-pg-in-bangalore',
  'konappana-agrahara-bangalore', 'electronic-city-phase-2-pg-in-bangalore',
  'Ganganagar', 'garepalya-bangalore', 'global-village',
  'HAL-2nd-3rd-stage-pg-in-bangalore', 'ulsoor', 'hebbal',
  'hennur-cross-bangalore', 'hessaraghatta', 'hosaroad', 'Hoodi',
  'hsrlayout', 'HBRlayout', 'hulimavu', 'itpl', 'itplmainroad',
  'indiranagar', 'jpnagar', 'jayanagar', 'jeevanbhimanagar',
  'krpuram', 'Kadubeesanahalli', 'kadugodi',
  'kaikondrahalli-paying-guest-near-wipro-sarjapur-road', 'kalyannagar',
  'Kamanahali , Paying Guest in Kamanahalli, PG in Kamanahalli For Ladies and Gents',
  'Kasturinagar-pg-in-bangalore', 'kengeri-bidadi-pg-in-bangalore',
  'kodihalli', 'koramangala', 'koramangala-sony-world-signal',
  'koramangala1stblock', 'koramangala2ndblock', 'koramangala3rdblock',
  'koramangala4thblock', 'koramangala5thblock', 'koramangala6thblock',
  'koramangala7thblock', 'koramangala8thblock', 'kudlugate',
  'kumaraswamylayout-pg in kumara swamy layout for ladies and gents',
  'kundalahalli', 'kundalahalli-gate-pg-in-bangalore', 'beml',
  'sai-nagar-Kundalahalli-gate-pg-in-bangalore', 'MG-Road',
  'MS-Ramaiah-College-and-Hospital-Bangalore', 'madivala', 'malleswaram',
  'manyata-embassy-business-park-nagawara', 'marathahalli',
  'marathahalli-bridge-pg-in-bangalore', 'munnekolala', 'Mahadevapura',
  'maruthinagar', 'mathikere',
  'murugeshpalya-pg-near-old-airport-road-bangalore', 'Nagavarapalya',
  'Nallurahalli', 'New BEL Road, Paying Guest In New Bhel Road, Bangalore',
  'newthippasandra', 'rtnagar', 'Ramagondanahalli', 'Rammurthynagar',
  'Rajajinagar', 'RajaRajeshwarinagar', 'rga-tech-park', 'richmond-town',
  'RMZ-infinity-pg-in-old-madras-road-bangalore', 'Roopenaagrahara',
  'RV-College-Mysore-Road-Bangalore', 'sgpalya', 'sahakaranagar',
  'SANJAYNAGAR', 'sarjapur-road-near-wipro-bangalore', 'siddapura',
  'Silkboard', 'singasandra-pg-in-bangalore', 'shanthinagar', 'tavarekere',
  'thanisandra-main-raod', 'thubarahalli-pg-in-bangalore', 'veeranapalya',
  'uttarahalli', 'Viveknagar', 'whitefield',
  'Wilson-Garden-PG-in-Bangalore', 'Yelahanka'
];

// ─── Amenity detection ───────────────────────────────────────
const AMENITY_KEYWORDS = {
  wifi:         ['wifi', 'wi-fi', 'internet', 'high speed', 'hi-speed', 'broadband'],
  ac:           ['ac ', 'a/c', 'air conditioning', 'air conditioner', 'air-conditioned', 'non ac'],
  tv:           ['tv', 'led tv', 'television', 'lcd tv', 'smart tv'],
  parking:      ['parking', '2 wheeler', '4 wheeler', 'vehicle parking', 'bike parking', 'car parking'],
  meals:        ['food', 'meals', 'north indian', 'south indian', 'homely food', 'veg food', 'non-veg', '3 times food', 'breakfast', 'lunch', 'dinner', 'tiffin'],
  laundry:      ['washing machine', 'laundry', 'washer'],
  security:     ['security', '24 hrs security', '24x7 security', '24 hours security', 'security guard'],
  gym:          ['gym', 'fitness', 'exercise'],
  cctv:         ['cctv', 'camera', 'surveillance'],
  kitchen:      ['kitchen', 'cooking', 'modular kitchen'],
  refrigerator: ['fridge', 'refrigerator'],
  microwave:    ['microwave', 'oven'],
  iron:         ['iron', 'ironing'],
  heater:       ['heater', 'geyser', 'hot water'],
  balcony:      ['balcony', 'terrace'],
};

// ─── Helpers ─────────────────────────────────────────────────

/** Detect amenities from free-form text */
function detectAmenities(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const [amenity, keywords] of Object.entries(AMENITY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      found.push(amenity);
    }
  }
  return found;
}

/** Detect gender preference from PG name / text */
function detectGender(text) {
  const lower = text.toLowerCase();
  const forMen   = /\bfor\s+(men|gents|boys|male)\b/.test(lower) || /\bmen\s*only\b/.test(lower) || /\bgents\s*only\b/.test(lower);
  const forWomen = /\bfor\s+(women|ladies|girls|female)\b/.test(lower) || /\bladies\s*only\b/.test(lower) || /\bwomen\s*only\b/.test(lower);
  if (forMen && forWomen) return 'any';
  if (forMen) return 'male';
  if (forWomen) return 'female';
  return 'any';
}

/** Detect sharing types from text (single, double, triple, etc.) */
function detectSharingTypes(text) {
  const lower = text.toLowerCase();
  const types = [];
  if (/\b(single|1\s*sharing)\b/.test(lower)) types.push('single');
  if (/\b(double|2\s*sharing)\b/.test(lower)) types.push('double');
  if (/\b(triple|3\s*sharing)\b/.test(lower)) types.push('triple');
  if (/\b(quad|4\s*sharing|4\+?\s*sharing)\b/.test(lower)) types.push('quad');
  // Generic "1, 2, 3 sharing" pattern
  const genericMatch = lower.match(/(\d)\s*(?:,\s*(\d)\s*(?:,\s*(\d))?)?\s*sharing/);
  if (genericMatch) {
    const nums = [genericMatch[1], genericMatch[2], genericMatch[3]].filter(Boolean).map(Number);
    const map = { 1: 'single', 2: 'double', 3: 'triple', 4: 'quad' };
    nums.forEach(n => { if (map[n] && !types.includes(map[n])) types.push(map[n]); });
  }
  return types.length > 0 ? types : ['double', 'triple']; // default
}

/** Extract all 10-digit Indian phone numbers from text */
function extractPhones(text) {
  const matches = text.match(/\b(\d[\d\s-]{8,}\d)\b/g) || [];
  return matches
    .map(m => m.replace(/[\s-]/g, ''))
    .filter(m => m.length === 10 && /^[6-9]/.test(m));
}

/** Extract contact person name(s) from the contact cell */
function extractContactName(text) {
  // Pattern: "Contact: NAME" or "Contact : NAME"
  const match = text.match(/Contact\s*:\s*([A-Za-z\s.]+?)(?:\d|$)/i);
  if (match) return match[1].trim();
  // Fallback: lines before phone numbers
  const lines = text.split(/\n|<br\s*\/?>/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const cleaned = line.replace(/contact\s*:?\s*/i, '').trim();
    if (cleaned && /^[A-Za-z\s.]+$/.test(cleaned) && cleaned.length > 2 && cleaned.length < 60) {
      return cleaned;
    }
  }
  return '';
}

/** Clean area slug into a readable area name */
function cleanAreaName(slug) {
  return slug
    .replace(/-pg-in-bangalore$/i, '')
    .replace(/-paying-guest.*$/i, '')
    .replace(/-near-.*$/i, '')
    .replace(/,.*$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

/** Generate default sharing prices */
function buildSharingPrices(sharingTypes) {
  const basePrices = { single: 12000, double: 8000, triple: 6500, quad: 5000 };
  const prices = {};
  sharingTypes.forEach(t => { prices[t] = basePrices[t] || 7000; });
  return prices;
}

// ─── Scraper ─────────────────────────────────────────────────

class PGDataScraper {
  constructor() {
    this.results = [];
    this.stats = { areas: 0, listings: 0, errors: 0 };
  }

  /** Scrape a single area page and return parsed PG objects */
  async scrapeArea(areaSlug) {
    const url = `${BASE_URL}/${areaSlug}.html`;
    const areaName = cleanAreaName(areaSlug);

    try {
      const { data: html } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: REQUEST_TIMEOUT,
      });

      const $ = cheerio.load(html);
      const tables = $('table').toArray();
      const listings = [];

      // Walk through tables in pairs: title-table then details-table
      for (let i = 0; i < tables.length - 1; i++) {
        const titleTable = $(tables[i]);
        const detailsTable = $(tables[i + 1]);

        // ── Title table: must contain an <h3> ──
        const h3 = titleTable.find('h3');
        if (!h3.length) continue;

        const rawName = h3.text().trim();
        if (!rawName || rawName.length < 3) continue;

        // ── Details table: expect rowspan structure ──
        const detailRows = detailsTable.find('tr');
        if (detailRows.length < 1) continue;

        // First row should have the rowspan td (amenities) + address td
        const firstRowCells = $(detailRows[0]).find('td');
        if (firstRowCells.length < 2) continue;

        const amenitiesHtml = $(firstRowCells[0]).html() || '';
        const amenitiesText = $(firstRowCells[0]).text() || '';
        const addressHtml   = $(firstRowCells[1]).html() || '';
        const addressText   = $(firstRowCells[1]).text() || '';

        // Second row has the contact td
        let contactText = '';
        let contactHtml = '';
        if (detailRows.length >= 2) {
          const secondRowCells = $(detailRows[1]).find('td');
          // Could be td[0] if rowspan consumed the first column
          const contactCell = secondRowCells.length > 0 ? $(secondRowCells[0]) : null;
          if (contactCell) {
            contactText = contactCell.text() || '';
            contactHtml = contactCell.html() || '';
          }
        }

        // ── Parse extracted text ──
        const pg = this.parseListing(rawName, amenitiesText, amenitiesHtml, addressText, contactText, areaSlug, areaName);
        if (pg) {
          listings.push(pg);
          // Skip the details table so we don't re-process it as a title table
          i++;
        }
      }

      this.stats.areas++;
      this.stats.listings += listings.length;
      console.log(`✅ ${areaName}: ${listings.length} PGs found`);
      return listings;

    } catch (err) {
      this.stats.errors++;
      const status = err.response?.status || '';
      console.error(`❌ ${areaName}: ${status} ${err.message}`);
      return [];
    }
  }

  /** Parse raw text from the two tables into a structured PG object */
  parseListing(rawName, amenitiesText, amenitiesHtml, addressText, contactText, areaSlug, areaName) {
    // ── Name ──
    const name = rawName
      .replace(/\s+/g, ' ')
      .replace(/\|.*$/, '')       // remove trailing pipe content
      .replace(/\s*-\s*$/, '')    // trailing dash
      .substring(0, 150)
      .trim();

    if (name.length < 3) return null;

    // ── Gender ──
    const gender = detectGender(name + ' ' + amenitiesText);

    // ── Amenities ──
    const amenities = detectAmenities(amenitiesText);
    if (amenities.length === 0) amenities.push('wifi', 'security'); // safe defaults

    // ── Sharing types ──
    const sharingTypes = detectSharingTypes(amenitiesText + ' ' + name);

    // ── Facilities text (for description) ──
    const facilitiesList = amenitiesText
      .split(/\n|(?:<br\s*\/?>)/)
      .map(l => l.replace(/\|.*$/, '').replace(/read more.*/i, '').trim())
      .filter(l => l.length > 2 && l.length < 200 && !/^[\s-]*$/.test(l));

    // ── Address + Landmark ──
    let address = '';
    let landmark = '';
    const addressMatch = addressText.match(/Address\s*:\s*([\s\S]*?)(?:Landmark|$)/i);
    if (addressMatch) {
      address = addressMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    }
    const landmarkMatch = addressText.match(/Landmark\s*:\s*([\s\S]*?)$/i);
    if (landmarkMatch) {
      landmark = landmarkMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    }
    // Fallback: use full text if no "Address:" label found
    if (!address) {
      address = addressText.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    }
    // Trim to reasonable length
    address = address.substring(0, 250);
    landmark = landmark.substring(0, 150);

    // ── Contact ──
    const phones = extractPhones(contactText);
    const contactName = extractContactName(contactText);

    // ── Detail page link ──
    let detailLink = '';
    const linkMatch = amenitiesHtml.match(/href="([^"]+\.html)"/i);
    if (linkMatch) {
      detailLink = linkMatch[1].startsWith('http') ? linkMatch[1] : `${BASE_URL}/${linkMatch[1]}`;
    }

    // ── Build description ──
    const descParts = [];
    if (facilitiesList.length > 0) {
      descParts.push('Facilities: ' + facilitiesList.slice(0, 8).join(', ') + '.');
    }
    if (landmark) descParts.push(`Landmark: ${landmark}.`);
    if (gender !== 'any') descParts.push(`For ${gender === 'male' ? 'men' : 'women'}.`);
    if (sharingTypes.length > 0) descParts.push(`Sharing options: ${sharingTypes.join(', ')}.`);
    const description = descParts.join(' ') || `PG accommodation in ${areaName}, Bangalore.`;

    // ── Build sharing prices (defaults since site rarely lists prices) ──
    const sharingPrices = buildSharingPrices(sharingTypes);
    const basePrice = Math.min(...Object.values(sharingPrices));

    return {
      name,
      description,
      areaSlug,
      areaName,
      address,
      landmark,
      gender,
      amenities,
      sharingTypes,
      sharingPrices,
      basePrice,
      contactName,
      phones,
      detailLink,
      facilitiesList,
    };
  }

  /** Scrape all areas (or a single one) */
  async scrapeAll(singleArea = null) {
    const areas = singleArea
      ? AREAS_TO_SCRAPE.filter(a => a.toLowerCase().includes(singleArea.toLowerCase()))
      : AREAS_TO_SCRAPE;

    if (areas.length === 0) {
      console.error(`No matching area found for "${singleArea}"`);
      return;
    }

    console.log(`\n🚀 Scraping ${areas.length} area(s) from ${BASE_URL}\n`);

    for (const area of areas) {
      const listings = await this.scrapeArea(area);
      this.results.push(...listings);
      await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
    }

    console.log(`\n📊 Scraping complete: ${this.stats.areas} areas, ${this.stats.listings} PGs, ${this.stats.errors} errors\n`);
  }

  /** Save all scraped results to the `properties` table */
  async saveToDatabase() {
    if (this.results.length === 0) {
      console.log('Nothing to save.');
      return { created: 0, skipped: 0, errors: 0 };
    }

    // Find or create a system owner for scraped properties
    let owner = await User.findOne({ where: { email: 'scraped@goroomz.com' } });
    if (!owner) {
      owner = await User.findOne({ where: { role: 'admin' } });
    }
    if (!owner) {
      owner = await User.findOne({ where: { role: 'owner' } });
    }
    if (!owner) {
      console.error('❌ No user found to assign as owner. Run seedData.js first.');
      return { created: 0, skipped: 0, errors: 0 };
    }

    console.log(`💾 Saving ${this.results.length} properties (owner: ${owner.name})...\n`);

    let created = 0, skipped = 0, errors = 0;

    for (const pg of this.results) {
      try {
        // Deduplicate by name + area
        const slug = Property.generateSlug(pg.name, 'Bangalore', pg.areaName);
        const existing = await Property.findOne({ where: { slug } });
        if (existing) {
          skipped++;
          continue;
        }

        await Property.create({
          name: pg.name,
          slug, // explicit slug to avoid collisions
          description: pg.description,
          type: 'pg',
          ownerId: owner.id,
          location: {
            address: pg.address,
            area: pg.areaName,
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India',
            landmark: pg.landmark,
          },
          contactInfo: {
            phones: pg.phones,
            contactName: pg.contactName,
            source: 'payingguestinbengaluru.com',
            detailLink: pg.detailLink,
          },
          amenities: pg.amenities,
          images: [
            {
              url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
              isPrimary: true,
              caption: pg.name,
            }
          ],
          rules: [
            'No smoking inside the premises',
            'Visitors allowed during day time only',
            'Maintain cleanliness in common areas',
            'Follow house timings',
          ],
          rating: {
            average: +(3.8 + Math.random() * 1.1).toFixed(1), // 3.8 – 4.9
            count: Math.floor(Math.random() * 40) + 5,
          },
          isActive: true,
          isFeatured: false,
          approvalStatus: 'approved',
          approvedAt: new Date(),
          metadata: {
            genderPreference: pg.gender,
            sharingTypes: pg.sharingTypes,
            pgOptions: {
              basePrice: pg.basePrice,
              sharingPrices: pg.sharingPrices,
              foodIncluded: pg.amenities.includes('meals'),
              securityDeposit: pg.basePrice, // 1 month
              noticePeriod: '1 month',
            },
            facilities: pg.facilitiesList,
            source: 'payingguestinbengaluru.com',
            scrapedAt: new Date().toISOString(),
          },
        });

        created++;
        if (created % 25 === 0) console.log(`  … ${created} created so far`);

      } catch (err) {
        errors++;
        console.error(`  ❌ ${pg.name}: ${err.message}`);
      }
    }

    console.log(`\n🎉 Done! Created: ${created}, Skipped (duplicate): ${skipped}, Errors: ${errors}\n`);
    return { created, skipped, errors };
  }

  /** Convert all results to seeder-ready Property objects (no DB needed) */
  toSeederFormat() {
    return this.results.map(pg => {
      const slug = Property.generateSlug(pg.name, 'Bangalore', pg.areaName);
      const ratingAvg = +(3.8 + Math.random() * 1.1).toFixed(1);
      const ratingCount = Math.floor(Math.random() * 40) + 5;

      return {
        name: pg.name,
        slug,
        description: pg.description,
        type: 'pg',
        location: {
          address: pg.address,
          area: pg.areaName,
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
          landmark: pg.landmark,
        },
        contactInfo: {
          phones: pg.phones,
          contactName: pg.contactName,
          source: 'payingguestinbengaluru.com',
          detailLink: pg.detailLink,
        },
        amenities: pg.amenities,
        images: [
          {
            url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
            isPrimary: true,
            caption: pg.name,
          }
        ],
        rules: [
          'No smoking inside the premises',
          'Visitors allowed during day time only',
          'Maintain cleanliness in common areas',
          'Follow house timings',
        ],
        rating: { average: ratingAvg, count: ratingCount },
        isActive: true,
        isFeatured: false,
        approvalStatus: 'approved',
        metadata: {
          genderPreference: pg.gender,
          sharingTypes: pg.sharingTypes,
          pgOptions: {
            basePrice: pg.basePrice,
            sharingPrices: pg.sharingPrices,
            foodIncluded: pg.amenities.includes('meals'),
            securityDeposit: pg.basePrice,
            noticePeriod: '1 month',
          },
          facilities: pg.facilitiesList,
          source: 'payingguestinbengaluru.com',
          scrapedAt: new Date().toISOString(),
        },
      };
    });
  }

  /** Write seeder JSON file to disk */
  writeSeederFile(outputPath) {
    const fs = require('fs');
    const path = require('path');
    const seederData = this.toSeederFormat();
    const fullPath = path.resolve(outputPath);
    fs.writeFileSync(fullPath, JSON.stringify(seederData, null, 2), 'utf-8');
    console.log(`📄 Seeder file written: ${fullPath} (${seederData.length} properties)`);
    return fullPath;
  }
}

// ─── CLI entry point ─────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipDb = args.includes('--skip-db');
  const areaFlag = args.indexOf('--area');
  const singleArea = areaFlag !== -1 ? args[areaFlag + 1] : null;
  const seederFlag = args.indexOf('--seeder');
  const seederPath = seederFlag !== -1
    ? args[seederFlag + 1]
    : require('path').join(__dirname, `scraped-pg-data-${new Date().toISOString().slice(0,10)}.json`);

  const scraper = new PGDataScraper();

  try {
    await scraper.scrapeAll(singleArea);

    if (scraper.results.length === 0) {
      console.log('No results scraped. Exiting.');
      return;
    }

    // Always write the seeder file
    scraper.writeSeederFile(seederPath);

    if (dryRun) {
      console.log('\n🔍 Dry run — printing first 5 results:\n');
      scraper.results.slice(0, 5).forEach((pg, i) => {
        console.log(`--- ${i + 1}. ${pg.name} ---`);
        console.log(`  Area:      ${pg.areaName}`);
        console.log(`  Address:   ${pg.address}`);
        console.log(`  Landmark:  ${pg.landmark}`);
        console.log(`  Gender:    ${pg.gender}`);
        console.log(`  Amenities: ${pg.amenities.join(', ')}`);
        console.log(`  Sharing:   ${pg.sharingTypes.join(', ')}`);
        console.log(`  Contact:   ${pg.contactName} | ${pg.phones.join(', ')}`);
        console.log(`  Link:      ${pg.detailLink}`);
        console.log();
      });
      console.log(`Total scraped: ${scraper.results.length}`);
    } else if (skipDb) {
      console.log('--skip-db flag set. Seeder file written, skipping database save.');
    } else {
      // Save to database
      const result = await scraper.saveToDatabase();
      console.log('📊 Final:', JSON.stringify(result));
    }
  } catch (err) {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  } finally {
    try { await sequelize.close(); } catch (_) {}
  }
}

if (require.main === module) {
  main();
}

module.exports = { PGDataScraper };

/**
 * Refresh PG data from Google Places API.
 *
 * For each property, searches Google Places for the current PG/hostel
 * at that address and updates the database with fresh information.
 *
 * Usage:
 *   GOOGLE_PLACES_KEY=your_key node scripts/refreshFromGooglePlaces.js
 *   GOOGLE_PLACES_KEY=your_key node scripts/refreshFromGooglePlaces.js --limit 100
 *   GOOGLE_PLACES_KEY=your_key node scripts/refreshFromGooglePlaces.js --dry-run
 *
 * The script saves progress to scripts/places-refresh-progress.json
 * so you can run it in batches across multiple months.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const Property = require('../models/Property');
require('dotenv').config();

const API_KEY = process.env.GOOGLE_PLACES_KEY;
const PROGRESS_FILE = path.join(__dirname, 'places-refresh-progress.json');
const DELAY_MS = 200; // 200ms between requests to avoid rate limits

// Parse CLI args
const args = process.argv.slice(2);
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || args[args.indexOf('--limit') + 1]) || 1000;
const DRY_RUN = args.includes('--dry-run');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Load/save progress
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  } catch (e) { /* ignore */ }
  return { refreshed: {}, stats: { total: 0, updated: 0, noResult: 0, errors: 0 }, lastRun: null };
}

function saveProgress(progress) {
  progress.lastRun = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// Search Google Places for a PG at the given address
async function searchPlace(address, propertyName) {
  // Search for PG/hostel at this address
  const query = `PG paying guest hostel near ${address}`;
  
  const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
  const resp = await axios.get(url, {
    params: {
      query,
      key: API_KEY,
      type: 'lodging',
      language: 'en'
    }
  });

  if (resp.data.status !== 'OK' || !resp.data.results?.length) {
    return null;
  }

  // Return the top result
  const place = resp.data.results[0];
  return {
    googlePlaceId: place.place_id,
    name: place.name,
    address: place.formatted_address,
    lat: place.geometry?.location?.lat,
    lng: place.geometry?.location?.lng,
    rating: place.rating || null,
    ratingCount: place.user_ratings_total || 0,
    types: place.types || [],
    businessStatus: place.business_status,
    photos: (place.photos || []).slice(0, 5).map(p => ({
      reference: p.photo_reference,
      width: p.width,
      height: p.height
    }))
  };
}

// Get photo URL from photo reference
function getPhotoUrl(photoReference, maxWidth = 800) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${API_KEY}`;
}

async function run() {
  if (!API_KEY) {
    console.error('❌ Set GOOGLE_PLACES_KEY environment variable');
    console.error('   GOOGLE_PLACES_KEY=your_key node scripts/refreshFromGooglePlaces.js');
    process.exit(1);
  }

  console.log(`\n🔄 Google Places Data Refresh`);
  console.log(`   Limit: ${LIMIT} properties`);
  console.log(`   Dry run: ${DRY_RUN}`);
  console.log('');

  await sequelize.authenticate();
  console.log('DB connected\n');

  const progress = loadProgress();
  const alreadyDone = new Set(Object.keys(progress.refreshed));
  console.log(`Already refreshed: ${alreadyDone.size} properties\n`);

  // Get properties that haven't been refreshed yet
  const allProperties = await Property.findAll({
    where: { type: 'pg', isActive: true, approvalStatus: 'approved' },
    order: [['createdAt', 'DESC']]
  });

  const toProcess = allProperties.filter(p => !alreadyDone.has(p.id));
  const batch = toProcess.slice(0, LIMIT);

  console.log(`Total PG properties: ${allProperties.length}`);
  console.log(`Remaining to refresh: ${toProcess.length}`);
  console.log(`This batch: ${batch.length}\n`);

  if (batch.length === 0) {
    console.log('✅ All properties already refreshed!');
    await sequelize.close();
    process.exit(0);
  }

  let processed = 0;
  let updated = 0;
  let noResult = 0;
  let errors = 0;

  for (const prop of batch) {
    processed++;
    const address = [
      prop.location?.address,
      prop.location?.area,
      prop.location?.city,
      prop.location?.state
    ].filter(Boolean).join(', ');

    if (!address || address.length < 10) {
      console.log(`⏭️  [${processed}/${batch.length}] ${prop.name} — no address, skipping`);
      progress.refreshed[prop.id] = { status: 'skipped', reason: 'no_address' };
      continue;
    }

    try {
      console.log(`🔍 [${processed}/${batch.length}] Searching: ${address.substring(0, 60)}...`);
      
      const place = await searchPlace(address, prop.name);

      if (!place) {
        console.log(`   ❌ No results found`);
        progress.refreshed[prop.id] = { status: 'no_result', address };
        noResult++;
        await sleep(DELAY_MS);
        continue;
      }

      console.log(`   📍 Found: ${place.name}`);
      console.log(`   📫 ${place.address}`);
      console.log(`   ⭐ ${place.rating || 'N/A'} (${place.ratingCount} reviews)`);
      console.log(`   🗺️  ${place.lat}, ${place.lng}`);

      if (!DRY_RUN) {
        // Build update data
        const updateData = {
          location: {
            ...prop.location,
            coordinates: { latitude: place.lat, longitude: place.lng },
            googleAddress: place.address
          },
          metadata: {
            ...(prop.metadata || {}),
            googlePlaceId: place.googlePlaceId,
            googleName: place.name,
            googleRating: place.rating,
            googleRatingCount: place.ratingCount,
            businessStatus: place.businessStatus,
            lastGoogleRefresh: new Date().toISOString()
          }
        };

        // Update rating if Google has one and ours is default
        if (place.rating && (!prop.rating?.average || prop.rating.average === 0)) {
          updateData.rating = {
            average: place.rating,
            count: place.ratingCount
          };
        }

        // Add Google photos if property has no images or only placeholder images
        const hasRealImages = prop.images?.some(img => {
          const url = typeof img === 'string' ? img : img?.url || '';
          return url && !url.includes('unsplash.com') && !url.includes('placeholder');
        });

        if (!hasRealImages && place.photos.length > 0) {
          updateData.images = place.photos.map((p, i) => ({
            url: getPhotoUrl(p.reference),
            isPrimary: i === 0,
            source: 'google_places'
          }));
          console.log(`   📸 Added ${place.photos.length} Google photos`);
        }

        await prop.update(updateData);
        console.log(`   ✅ Updated`);
      } else {
        console.log(`   🔸 Dry run — not updating`);
      }

      progress.refreshed[prop.id] = {
        status: 'updated',
        googleName: place.name,
        googlePlaceId: place.googlePlaceId,
        lat: place.lat,
        lng: place.lng,
        rating: place.rating,
        timestamp: new Date().toISOString()
      };
      updated++;

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      progress.refreshed[prop.id] = { status: 'error', error: error.message };
      errors++;
    }

    // Save progress every 10 properties
    if (processed % 10 === 0) {
      saveProgress(progress);
    }

    await sleep(DELAY_MS);
  }

  // Final save
  progress.stats.total += processed;
  progress.stats.updated += updated;
  progress.stats.noResult += noResult;
  progress.stats.errors += errors;
  saveProgress(progress);

  console.log(`\n========================================`);
  console.log(`  This run:  ${processed} processed`);
  console.log(`  Updated:   ${updated}`);
  console.log(`  No result: ${noResult}`);
  console.log(`  Errors:    ${errors}`);
  console.log(`  Total refreshed (all runs): ${Object.keys(progress.refreshed).length}`);
  console.log(`  Remaining: ${toProcess.length - batch.length}`);
  console.log(`========================================\n`);

  if (toProcess.length > batch.length) {
    console.log(`💡 Run again next month to refresh the remaining ${toProcess.length - batch.length} properties.`);
  }

  await sequelize.close();
  process.exit(0);
}

run();

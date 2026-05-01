/**
 * Seed script to populate the `properties` table with sample data
 * for Hotels, Home Stays, and Independent Homes.
 *
 * Usage:  node scripts/seedProperties.js
 */

const { syncDatabase } = require('../models');
const Property = require('../models/Property');
const User = require('../models/User');
require('dotenv').config();

const connectDB = async () => {
  try {
    await syncDatabase(false);
    console.log('✅ Connected to PostgreSQL');
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error);
    process.exit(1);
  }
};

const sampleProperties = [
  // ─── HOTELS ────────────────────────────────────────────────
  {
    name: 'The Grand Orchid Hotel',
    description: 'Premium business hotel on MG Road with rooftop restaurant, conference halls, and spa. Walking distance to metro and shopping districts.',
    type: 'hotel',
    location: {
      address: '14, MG Road',
      area: 'MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
      coordinates: { latitude: 12.9753, longitude: 77.6066 }
    },
    contactInfo: { phone: '9900100100', email: 'reservations@grandorchid.in' },
    amenities: ['wifi', 'ac', 'tv', 'parking', 'gym', 'security', 'laundry'],
    images: [
      { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80' }
    ],
    rules: ['Check-in 2 PM / Check-out 11 AM', 'Valid ID required', 'No smoking in rooms'],
    totalFloors: 8,
    totalRooms: 60,
    checkInTime: '14:00',
    checkOutTime: '11:00',
    rating: { average: 4.6, count: 142 },
    isFeatured: true,
    metadata: { priceRange: { min: 4500, max: 12000 }, starRating: 4 }
  },
  {
    name: 'Lemon Tree Express',
    description: 'Affordable business hotel near Electronic City with complimentary breakfast, free airport shuttle, and 24-hour front desk.',
    type: 'hotel',
    location: {
      address: 'Hosur Road, Electronic City Phase 1',
      area: 'Electronic City',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560100',
      coordinates: { latitude: 12.8456, longitude: 77.6603 }
    },
    contactInfo: { phone: '9900200200', email: 'ecity@lemontreehotels.in' },
    amenities: ['wifi', 'ac', 'tv', 'parking', 'meals', 'laundry'],
    images: [
      { url: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80', isPrimary: true }
    ],
    rules: ['Check-in 1 PM / Check-out 11 AM', 'Breakfast included', 'Airport shuttle on request'],
    totalFloors: 5,
    totalRooms: 40,
    checkInTime: '13:00',
    checkOutTime: '11:00',
    rating: { average: 4.3, count: 87 },
    isFeatured: false,
    metadata: { priceRange: { min: 2800, max: 6000 }, starRating: 3 }
  },
  {
    name: 'Taj West End',
    description: 'Heritage luxury hotel set in 20 acres of tropical gardens. Fine dining, outdoor pool, and world-class spa in the heart of Bangalore.',
    type: 'hotel',
    location: {
      address: '25, Race Course Road',
      area: 'Race Course Road',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
      coordinates: { latitude: 12.9716, longitude: 77.5868 }
    },
    contactInfo: { phone: '9900300300', email: 'westend.bangalore@tajhotels.com' },
    amenities: ['wifi', 'ac', 'tv', 'parking', 'gym', 'security', 'laundry', 'kitchen'],
    images: [
      { url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80' }
    ],
    rules: ['Check-in 3 PM / Check-out 12 PM', 'Smart casual dress code at restaurants', 'Pool hours 6 AM – 9 PM'],
    totalFloors: 4,
    totalRooms: 117,
    checkInTime: '15:00',
    checkOutTime: '12:00',
    rating: { average: 4.9, count: 312 },
    isFeatured: true,
    metadata: { priceRange: { min: 9000, max: 35000 }, starRating: 5 }
  },
  {
    name: 'FabHotel Koramangala',
    description: 'Budget-friendly hotel in Koramangala with clean rooms, fast WiFi, and proximity to restaurants and pubs on 5th Block.',
    type: 'hotel',
    location: {
      address: '80 Feet Road, Koramangala 4th Block',
      area: 'Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560034',
      coordinates: { latitude: 12.9352, longitude: 77.6245 }
    },
    contactInfo: { phone: '9900400400', email: 'koramangala@fabhotels.com' },
    amenities: ['wifi', 'ac', 'tv', 'security'],
    images: [
      { url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80', isPrimary: true }
    ],
    rules: ['Check-in 12 PM / Check-out 11 AM', 'ID proof mandatory', 'No outside food in rooms'],
    totalFloors: 3,
    totalRooms: 24,
    checkInTime: '12:00',
    checkOutTime: '11:00',
    rating: { average: 4.1, count: 56 },
    isFeatured: false,
    metadata: { priceRange: { min: 1500, max: 3500 }, starRating: 2 }
  },
  {
    name: 'Radisson Blu Atria',
    description: 'Upscale hotel on Palace Road with panoramic city views, multiple dining options, and a rooftop infinity pool.',
    type: 'hotel',
    location: {
      address: '1, Palace Road',
      area: 'Palace Road',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560001',
      coordinates: { latitude: 12.9850, longitude: 77.5870 }
    },
    contactInfo: { phone: '9900500500', email: 'info@radissonbluatria.com' },
    amenities: ['wifi', 'ac', 'tv', 'parking', 'gym', 'security', 'laundry'],
    images: [
      { url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80', isPrimary: true }
    ],
    rules: ['Check-in 2 PM / Check-out 12 PM', 'Pool access for guests only', 'Valet parking available'],
    totalFloors: 10,
    totalRooms: 120,
    checkInTime: '14:00',
    checkOutTime: '12:00',
    rating: { average: 4.7, count: 198 },
    isFeatured: true,
    metadata: { priceRange: { min: 6000, max: 18000 }, starRating: 5 }
  },

  // ─── HOME STAYS ────────────────────────────────────────────
  {
    name: 'Amma\'s Traditional Homestay',
    description: 'Authentic South Indian homestay in Malleshwaram. Home-cooked meals, filter coffee, and a warm family atmosphere. Walking distance to temples and markets.',
    type: 'apartment',
    location: {
      address: '3rd Cross, Malleshwaram',
      area: 'Malleshwaram',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560003',
      coordinates: { latitude: 12.9997, longitude: 77.5636 }
    },
    contactInfo: { phone: '9900600600', email: 'ammas.homestay@gmail.com' },
    amenities: ['wifi', 'meals', 'parking', 'tv'],
    images: [
      { url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80', isPrimary: true }
    ],
    rules: ['Vegetarian meals only', 'Quiet hours after 10 PM', 'Shoes off indoors', 'Respect family customs'],
    totalFloors: 2,
    totalRooms: 3,
    checkInTime: '12:00',
    checkOutTime: '11:00',
    rating: { average: 4.9, count: 67 },
    isFeatured: true,
    metadata: { homeStayType: 'traditional', mealsIncluded: true, genderPreference: 'any', priceRange: { min: 1500, max: 3000 } }
  },
  {
    name: 'Green Acres Farmstay',
    description: 'Escape to a working organic farm near Nandi Hills. Fresh produce, bonfire nights, nature walks, and stargazing. Perfect weekend retreat.',
    type: 'apartment',
    location: {
      address: 'Muddenahalli Road',
      area: 'Nandi Hills',
      city: 'Chikkaballapur',
      state: 'Karnataka',
      country: 'India',
      pincode: '562101',
      coordinates: { latitude: 13.3702, longitude: 77.6835 }
    },
    contactInfo: { phone: '9900700700', email: 'stay@greenacresfarm.in' },
    amenities: ['wifi', 'meals', 'parking'],
    images: [
      { url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1499793983394-e58fc2a8a42f?w=800&q=80' }
    ],
    rules: ['Eco-friendly stay', 'No plastic bottles', 'Bonfire till 11 PM only', 'Pets welcome on request'],
    totalFloors: 1,
    totalRooms: 5,
    checkInTime: '13:00',
    checkOutTime: '11:00',
    rating: { average: 4.8, count: 93 },
    isFeatured: true,
    metadata: { homeStayType: 'farmstay', mealsIncluded: true, priceRange: { min: 2500, max: 5000 } }
  },
  {
    name: 'Heritage House Basavanagudi',
    description: 'Century-old heritage bungalow converted into a charming homestay. Antique furniture, courtyard garden, and stories from three generations.',
    type: 'apartment',
    location: {
      address: 'Bull Temple Road',
      area: 'Basavanagudi',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560004',
      coordinates: { latitude: 12.9431, longitude: 77.5738 }
    },
    contactInfo: { phone: '9900800800', email: 'heritage.basavanagudi@gmail.com' },
    amenities: ['wifi', 'meals', 'parking', 'tv'],
    images: [
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', isPrimary: true }
    ],
    rules: ['No smoking indoors', 'Photography of interiors with permission', 'Breakfast included', 'Quiet after 10 PM'],
    totalFloors: 2,
    totalRooms: 4,
    checkInTime: '14:00',
    checkOutTime: '11:00',
    rating: { average: 4.7, count: 45 },
    isFeatured: false,
    metadata: { homeStayType: 'heritage', mealsIncluded: true, priceRange: { min: 2000, max: 4000 } }
  },
  {
    name: 'Coorg Coffee Estate Stay',
    description: 'Wake up to misty mountains and the aroma of fresh coffee. Private cottage on a 50-acre coffee plantation with guided estate tours.',
    type: 'apartment',
    location: {
      address: 'Pollibetta Road',
      area: 'Madikeri',
      city: 'Coorg',
      state: 'Karnataka',
      country: 'India',
      pincode: '571201',
      coordinates: { latitude: 12.4244, longitude: 75.7382 }
    },
    contactInfo: { phone: '9900900900', email: 'bookings@coorgcoffeestay.com' },
    amenities: ['wifi', 'meals', 'parking'],
    images: [
      { url: 'https://images.unsplash.com/photo-1587381420270-0e80f6a6b1e6?w=800&q=80', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80' }
    ],
    rules: ['Plantation tour at 7 AM', 'Campfire till 10 PM', 'No littering on estate', 'Leech socks provided for treks'],
    totalFloors: 1,
    totalRooms: 6,
    checkInTime: '13:00',
    checkOutTime: '11:00',
    rating: { average: 4.9, count: 128 },
    isFeatured: true,
    metadata: { homeStayType: 'plantation', mealsIncluded: true, priceRange: { min: 3500, max: 7000 } }
  },
  {
    name: 'Lakeside Homestay Yelahanka',
    description: 'Peaceful homestay overlooking Yelahanka Lake. Home-cooked North Karnataka cuisine, terrace garden, and bird-watching from your window.',
    type: 'apartment',
    location: {
      address: 'Lake View Road',
      area: 'Yelahanka',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560064',
      coordinates: { latitude: 13.1007, longitude: 77.5963 }
    },
    contactInfo: { phone: '9901000100', email: 'lakeside.yelahanka@gmail.com' },
    amenities: ['wifi', 'meals', 'parking', 'tv'],
    images: [
      { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80', isPrimary: true }
    ],
    rules: ['Breakfast and dinner included', 'Bird-watching binoculars available', 'No loud music', 'Terrace open till 9 PM'],
    totalFloors: 2,
    totalRooms: 3,
    checkInTime: '12:00',
    checkOutTime: '11:00',
    rating: { average: 4.6, count: 34 },
    isFeatured: false,
    metadata: { homeStayType: 'lakeside', mealsIncluded: true, priceRange: { min: 1800, max: 3500 } }
  },

  // ─── INDEPENDENT HOMES ────────────────────────────────────
  {
    name: 'Skyline 2BHK Apartment',
    description: 'Fully furnished 2BHK in a gated community with swimming pool, clubhouse, and 24/7 security. Close to Manyata Tech Park.',
    type: 'apartment',
    location: {
      address: 'Thanisandra Main Road',
      area: 'Thanisandra',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560077',
      coordinates: { latitude: 13.0569, longitude: 77.6238 }
    },
    contactInfo: { phone: '9901100100', email: 'skyline.apartments@gmail.com' },
    amenities: ['wifi', 'ac', 'tv', 'parking', 'gym', 'security', 'kitchen', 'washing-machine'],
    images: [
      { url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80' }
    ],
    rules: ['No smoking', 'No pets without approval', 'Maintain common areas', 'Parking in designated spots only'],
    totalFloors: 1,
    totalRooms: 2,
    rating: { average: 4.7, count: 23 },
    isFeatured: true,
    metadata: { bedrooms: 2, bathrooms: 2, propertyType: 'apartment', furnishing: 'fully_furnished', priceRange: { min: 25000, max: 25000 } }
  },
  {
    name: 'Garden Villa JP Nagar',
    description: 'Spacious 3BHK independent villa with private garden, covered parking, and modular kitchen. Quiet residential neighborhood.',
    type: 'apartment',
    location: {
      address: '15th Cross, JP Nagar Phase 2',
      area: 'JP Nagar',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560078',
      coordinates: { latitude: 12.8941, longitude: 77.5866 }
    },
    contactInfo: { phone: '9901200200', email: 'gardenvilla.jpnagar@gmail.com' },
    amenities: ['wifi', 'ac', 'tv', 'parking', 'security', 'kitchen', 'washing-machine'],
    images: [
      { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80' }
    ],
    rules: ['Family-friendly', 'Garden maintenance by owner', 'No commercial use', 'Quiet hours after 10 PM'],
    totalFloors: 2,
    totalRooms: 3,
    rating: { average: 4.8, count: 31 },
    isFeatured: true,
    metadata: { bedrooms: 3, bathrooms: 3, propertyType: 'villa', furnishing: 'fully_furnished', priceRange: { min: 45000, max: 45000 } }
  },
  {
    name: 'Studio Loft Indiranagar',
    description: 'Trendy studio loft on 12th Main with exposed brick walls, high ceilings, and a private terrace. Walk to 100 Feet Road nightlife.',
    type: 'apartment',
    location: {
      address: '12th Main, HAL 2nd Stage',
      area: 'Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560038',
      coordinates: { latitude: 12.9784, longitude: 77.6408 }
    },
    contactInfo: { phone: '9901300300', email: 'studioloft.indiranagar@gmail.com' },
    amenities: ['wifi', 'ac', 'tv', 'kitchen', 'washing-machine'],
    images: [
      { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80', isPrimary: true }
    ],
    rules: ['No parties', 'No smoking indoors', 'Terrace furniture stays on terrace', 'Garbage segregation mandatory'],
    totalFloors: 1,
    totalRooms: 1,
    rating: { average: 4.5, count: 18 },
    isFeatured: false,
    metadata: { bedrooms: 1, bathrooms: 1, propertyType: 'studio', furnishing: 'fully_furnished', priceRange: { min: 22000, max: 22000 } }
  },
  {
    name: 'Prestige Lakeside 3BHK',
    description: 'Premium 3BHK apartment in Prestige Lakeside Habitat with lake view, infinity pool, and world-class amenities.',
    type: 'apartment',
    location: {
      address: 'Varthur Road',
      area: 'Whitefield',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560066',
      coordinates: { latitude: 12.9372, longitude: 77.7410 }
    },
    contactInfo: { phone: '9901400400', email: 'prestige.lakeside@gmail.com' },
    amenities: ['wifi', 'ac', 'tv', 'parking', 'gym', 'security', 'kitchen', 'washing-machine'],
    images: [
      { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80' }
    ],
    rules: ['Gated community rules apply', 'Clubhouse booking required', 'No alterations to interiors', 'Visitor registration at gate'],
    totalFloors: 1,
    totalRooms: 3,
    rating: { average: 4.9, count: 42 },
    isFeatured: true,
    metadata: { bedrooms: 3, bathrooms: 3, propertyType: 'apartment', furnishing: 'fully_furnished', priceRange: { min: 55000, max: 55000 } }
  },
  {
    name: 'Budget 1BHK Marathahalli',
    description: 'Clean and affordable 1BHK near Marathahalli bridge. Semi-furnished with essential appliances. Close to ORR and tech parks.',
    type: 'apartment',
    location: {
      address: 'Marathahalli Bridge Road',
      area: 'Marathahalli',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      pincode: '560037',
      coordinates: { latitude: 12.9591, longitude: 77.6974 }
    },
    contactInfo: { phone: '9901500500', email: 'budget1bhk.marathahalli@gmail.com' },
    amenities: ['wifi', 'ac', 'kitchen', 'parking'],
    images: [
      { url: 'https://images.unsplash.com/photo-1555854877-bab0ef1e3a5e?w=800&q=80', isPrimary: true }
    ],
    rules: ['No smoking', 'Water and electricity extra', 'One month advance deposit', 'No subletting'],
    totalFloors: 1,
    totalRooms: 1,
    rating: { average: 4.2, count: 14 },
    isFeatured: false,
    metadata: { bedrooms: 1, bathrooms: 1, propertyType: 'apartment', furnishing: 'semi_furnished', priceRange: { min: 14000, max: 14000 } }
  }
];

const seedProperties = async () => {
  try {
    await connectDB();

    // Find or create an owner user for the sample properties
    let owner = await User.findOne({ where: { email: 'owner@goroomz.com' } });
    if (!owner) {
      owner = await User.findOne({ where: { role: 'owner' } });
    }
    if (!owner) {
      owner = await User.findOne({ where: { role: 'admin' } });
    }
    if (!owner) {
      console.error('❌ No owner or admin user found. Run seedData.js first.');
      process.exit(1);
    }

    console.log(`\n🌱 Seeding properties using owner: ${owner.name} (${owner.email})\n`);

    let created = 0;
    let skipped = 0;

    for (const data of sampleProperties) {
      const existing = await Property.findOne({ where: { name: data.name } });
      if (existing) {
        console.log(`⚠️  Already exists: ${data.name}`);
        skipped++;
        continue;
      }

      await Property.create({
        ...data,
        ownerId: owner.id,
        isActive: true,
        approvalStatus: 'approved',
        approvedAt: new Date()
      });

      console.log(`✅ Created: ${data.name}  (${data.type})`);
      created++;
    }

    console.log(`\n🎉 Done! Created ${created}, skipped ${skipped} (already existed)\n`);

    const { sequelize } = require('../models');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedProperties();

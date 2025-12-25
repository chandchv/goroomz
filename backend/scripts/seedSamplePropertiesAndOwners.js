/**
 * Seed Sample Property Owners and Properties
 * 
 * Creates property owners (role: 'owner') and their associated properties
 * for testing the property management and onboarding features.
 */

const { User, Room } = require('../models');
const bcrypt = require('bcryptjs');

const samplePropertyOwners = [
  {
    name: 'Ramesh Gupta',
    email: 'ramesh.gupta@example.com',
    phone: '+919876501234',
    password: 'Owner123!',
    role: 'owner',
    isActive: true,
    isVerified: true,
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    properties: [
      {
        title: 'Cozy PG near Andheri Station',
        description: 'Well-maintained PG accommodation with all modern amenities. Close to metro station and shopping areas. Perfect for working professionals.',
        price: 8500,
        location: {
          address: '123 Andheri West',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          pincode: '400053',
          latitude: 19.1136,
          longitude: 72.8697
        },
        roomType: 'Private Room',
        category: 'PG',
        maxGuests: 2,
        amenities: ['wifi', 'meals', 'laundry', 'ac', 'security'],
        images: [
          { url: 'https://example.com/room1.jpg', caption: 'Main room' },
          { url: 'https://example.com/room2.jpg', caption: 'Common area' }
        ],
        isAvailable: true,
        totalBeds: 4,
        availableBeds: 2
      },
      {
        title: 'Luxury PG in Bandra',
        description: 'Premium PG with attached bathrooms, AC rooms, and 24/7 security. Ideal location near Bandra station.',
        price: 12000,
        location: {
          address: '456 Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          pincode: '400050',
          latitude: 19.0596,
          longitude: 72.8295
        },
        roomType: 'Private Room',
        category: 'PG',
        maxGuests: 1,
        amenities: ['wifi', 'meals', 'parking', 'laundry', 'ac', 'gym', 'security'],
        images: [
          { url: 'https://example.com/luxury1.jpg', caption: 'Bedroom' }
        ],
        isAvailable: true,
        totalBeds: 6,
        availableBeds: 3
      }
    ]
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma.owner@example.com',
    phone: '+919876501235',
    password: 'Owner123!',
    role: 'owner',
    isActive: true,
    isVerified: true,
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    properties: [
      {
        title: 'Modern Studio Apartment in Koramangala',
        description: 'Fully furnished studio apartment with kitchen, perfect for singles or couples. Walking distance to restaurants and cafes.',
        price: 15000,
        location: {
          address: '789 Koramangala 5th Block',
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
          pincode: '560095',
          latitude: 12.9352,
          longitude: 77.6245
        },
        roomType: 'Studio',
        category: 'Independent Home',
        maxGuests: 2,
        amenities: ['wifi', 'parking', 'ac', 'kitchen', 'washing-machine', 'refrigerator'],
        images: [
          { url: 'https://example.com/studio1.jpg', caption: 'Living area' },
          { url: 'https://example.com/studio2.jpg', caption: 'Kitchen' }
        ],
        isAvailable: true,
        totalBeds: 1,
        availableBeds: 1
      }
    ]
  },
  {
    name: 'Amit Patel',
    email: 'amit.patel@example.com',
    phone: '+919876501236',
    password: 'Owner123!',
    role: 'owner',
    isActive: true,
    isVerified: true,
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    properties: [
      {
        title: 'Budget-Friendly PG in Kothrud',
        description: 'Affordable PG accommodation for students and working professionals. Basic amenities provided.',
        price: 6000,
        location: {
          address: '321 Kothrud',
          city: 'Pune',
          state: 'Maharashtra',
          country: 'India',
          pincode: '411038',
          latitude: 18.5074,
          longitude: 73.8077
        },
        roomType: 'Shared Room',
        category: 'PG',
        maxGuests: 3,
        amenities: ['wifi', 'meals', 'laundry', 'security'],
        images: [
          { url: 'https://example.com/budget1.jpg', caption: 'Room' }
        ],
        isAvailable: true,
        totalBeds: 8,
        availableBeds: 5
      },
      {
        title: 'Spacious 2BHK in Hinjewadi',
        description: 'Well-maintained 2BHK apartment near IT parks. Suitable for small families or working professionals.',
        price: 18000,
        location: {
          address: '654 Hinjewadi Phase 2',
          city: 'Pune',
          state: 'Maharashtra',
          country: 'India',
          pincode: '411057',
          latitude: 18.5912,
          longitude: 73.7389
        },
        roomType: 'Entire Place',
        category: 'Independent Home',
        maxGuests: 4,
        amenities: ['wifi', 'parking', 'ac', 'kitchen', 'washing-machine', 'balcony'],
        images: [
          { url: 'https://example.com/2bhk1.jpg', caption: 'Living room' },
          { url: 'https://example.com/2bhk2.jpg', caption: 'Bedroom' }
        ],
        isAvailable: true,
        totalBeds: 2,
        availableBeds: 2
      }
    ]
  },
  {
    name: 'Sunita Reddy',
    email: 'sunita.reddy@example.com',
    phone: '+919876501237',
    password: 'Owner123!',
    role: 'owner',
    isActive: true,
    isVerified: true,
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    properties: [
      {
        title: 'Comfortable Hotel Room in Gachibowli',
        description: 'Clean and comfortable hotel room with daily housekeeping. Perfect for business travelers.',
        price: 2500,
        location: {
          address: '987 Gachibowli',
          city: 'Hyderabad',
          state: 'Telangana',
          country: 'India',
          pincode: '500032',
          latitude: 17.4399,
          longitude: 78.3489
        },
        roomType: 'Hotel Room',
        category: 'Hotel Room',
        maxGuests: 2,
        amenities: ['wifi', 'ac', 'tv', 'parking', 'laundry'],
        images: [
          { url: 'https://example.com/hotel1.jpg', caption: 'Room view' }
        ],
        isAvailable: true,
        totalBeds: 1,
        availableBeds: 1
      }
    ]
  },
  {
    name: 'Vikram Singh',
    email: 'vikram.singh.owner@example.com',
    phone: '+919876501238',
    password: 'Owner123!',
    role: 'owner',
    isActive: true,
    isVerified: true,
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    properties: [
      {
        title: 'Premium PG in South Delhi',
        description: 'High-end PG with all modern facilities. Gym, swimming pool, and recreational areas available.',
        price: 16000,
        location: {
          address: '147 Greater Kailash',
          city: 'Delhi',
          state: 'Delhi',
          country: 'India',
          pincode: '110048',
          latitude: 28.5494,
          longitude: 77.2426
        },
        roomType: 'Private Room',
        category: 'PG',
        maxGuests: 1,
        amenities: ['wifi', 'meals', 'parking', 'laundry', 'ac', 'gym', 'security', 'tv'],
        images: [
          { url: 'https://example.com/premium1.jpg', caption: 'Bedroom' },
          { url: 'https://example.com/premium2.jpg', caption: 'Gym' }
        ],
        isAvailable: true,
        totalBeds: 10,
        availableBeds: 4
      }
    ]
  },
  {
    name: 'Meera Iyer',
    email: 'meera.iyer@example.com',
    phone: '+919876501239',
    password: 'Owner123!',
    role: 'owner',
    isActive: true,
    isVerified: true,
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    properties: [
      {
        title: 'Cozy Home Stay in T Nagar',
        description: 'Traditional home stay experience with home-cooked meals. Family-friendly environment.',
        price: 7000,
        location: {
          address: '258 T Nagar',
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India',
          pincode: '600017',
          latitude: 13.0418,
          longitude: 80.2341
        },
        roomType: 'Private Room',
        category: 'Home Stay',
        maxGuests: 2,
        amenities: ['wifi', 'meals', 'laundry', 'ac', 'tv'],
        images: [
          { url: 'https://example.com/homestay1.jpg', caption: 'Room' }
        ],
        isAvailable: true,
        totalBeds: 3,
        availableBeds: 2
      },
      {
        title: 'Beachside Home Stay in ECR',
        description: 'Beautiful home stay near the beach. Perfect for weekend getaways and relaxation.',
        price: 9000,
        location: {
          address: '369 ECR Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India',
          pincode: '600119',
          latitude: 12.8406,
          longitude: 80.2462
        },
        roomType: 'Entire Place',
        category: 'Home Stay',
        maxGuests: 4,
        amenities: ['wifi', 'meals', 'parking', 'kitchen', 'balcony'],
        images: [
          { url: 'https://example.com/beach1.jpg', caption: 'Beach view' },
          { url: 'https://example.com/beach2.jpg', caption: 'Living area' }
        ],
        isAvailable: true,
        totalBeds: 2,
        availableBeds: 2
      }
    ]
  }
];

async function seedPropertiesAndOwners() {
  try {
    console.log('🏠 Starting to seed property owners and properties...\n');

    let ownersCreated = 0;
    let ownersSkipped = 0;
    let propertiesCreated = 0;

    for (const ownerData of samplePropertyOwners) {
      // Extract properties from owner data
      const { properties, ...userData } = ownerData;

      // Check if owner already exists
      const existingOwner = await User.findOne({ where: { email: userData.email } });

      let owner;
      if (existingOwner) {
        console.log(`⏭️  Skipped owner: ${userData.name} (${userData.email}) - already exists`);
        owner = existingOwner;
        ownersSkipped++;
      } else {
        // Create owner (password will be hashed automatically by the model's beforeCreate hook)
        owner = await User.create({
          ...userData,
        });

        console.log(`✅ Created owner: ${userData.name.padEnd(25)} | ${userData.city.padEnd(15)} | ${properties.length} properties`);
        ownersCreated++;
      }

      // Create properties for this owner
      for (const propertyData of properties) {
        // Check if property already exists (by title and owner)
        const existingProperty = await Room.findOne({
          where: {
            title: propertyData.title,
            ownerId: owner.id
          }
        });

        if (existingProperty) {
          console.log(`   ⏭️  Property exists: ${propertyData.title}`);
          continue;
        }

        // Create property
        await Room.create({
          ...propertyData,
          ownerId: owner.id,
          isVerified: true,
          status: 'active'
        });

        console.log(`   ✅ Property: ${propertyData.title.padEnd(40)} | ₹${propertyData.price}/month`);
        propertiesCreated++;
      }

      console.log(''); // Empty line between owners
    }

    console.log('='.repeat(80));
    console.log(`✨ Seeding complete!`);
    console.log(`   Owners created: ${ownersCreated}`);
    console.log(`   Owners skipped: ${ownersSkipped} (already exist)`);
    console.log(`   Properties created: ${propertiesCreated}`);
    console.log(`   Total owners: ${samplePropertyOwners.length}`);
    console.log('='.repeat(80));
    console.log('\n📝 Default password for all owners: Owner123!');
    console.log('\n🏠 Property breakdown by city:');
    console.log(`   - Mumbai: 2 properties`);
    console.log(`   - Bangalore: 1 property`);
    console.log(`   - Pune: 2 properties`);
    console.log(`   - Hyderabad: 1 property`);
    console.log(`   - Delhi: 1 property`);
    console.log(`   - Chennai: 2 properties`);
    console.log('\n📊 Property types:');
    console.log(`   - PG: 5 properties`);
    console.log(`   - Independent Home: 3 properties`);
    console.log(`   - Home Stay: 2 properties`);
    console.log(`   - Hotel Room: 1 property`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding properties and owners:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the seeder
seedPropertiesAndOwners();

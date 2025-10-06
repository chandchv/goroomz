const bcrypt = require('bcryptjs');
const { User, Category, Room, syncDatabase } = require('../models');
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

const seedCategories = async () => {
  const categories = [
    {
      name: 'PG',
      description: 'Paying Guest accommodations with shared facilities',
      icon: 'building',
      roomTypes: ['Private Room', 'Shared Room'],
      defaultAmenities: ['wifi', 'meals', 'laundry', 'security'],
      sortOrder: 1
    },
    {
      name: 'Hotel Room',
      description: 'Hotel rooms for short-term stays',
      icon: 'bed',
      roomTypes: ['Private Room'],
      defaultAmenities: ['wifi', 'tv', 'ac'],
      sortOrder: 2
    },
    {
      name: 'Independent Home',
      description: 'Complete independent houses and apartments',
      icon: 'home',
      roomTypes: ['Entire Place', 'Studio'],
      defaultAmenities: ['wifi', 'kitchen', 'parking'],
      sortOrder: 3
    },
    {
      name: 'Home Stay',
      description: 'Homely accommodations with local experience',
      icon: 'heart',
      roomTypes: ['Private Room', 'Entire Place'],
      defaultAmenities: ['wifi', 'meals'],
      sortOrder: 4
    }
  ];

  for (const categoryData of categories) {
    const existingCategory = await Category.findOne({ where: { name: categoryData.name } });
    if (!existingCategory) {
      await Category.create(categoryData);
      console.log(`✅ Created category: ${categoryData.name}`);
    } else {
      console.log(`⚠️  Category already exists: ${categoryData.name}`);
    }
  }
};

const seedUsers = async () => {
  const users = [
    {
      name: 'Admin User',
      email: 'admin@goroomz.com',
      password: 'admin123',
      role: 'admin',
      isVerified: true
    },
    {
      name: 'Property Owner',
      email: 'owner@goroomz.com',
      password: 'owner123',
      role: 'owner',
      phone: '9876543210',
      isVerified: true
    },
    {
      name: 'Regular User',
      email: 'user@goroomz.com',
      password: 'user123',
      role: 'user',
      phone: '9876543211',
      isVerified: true
    }
  ];

  for (const userData of users) {
    const existingUser = await User.findOne({ where: { email: userData.email } });
    if (!existingUser) {
      // Password will be hashed automatically by the model hook
      await User.create(userData);
      console.log(`✅ Created user: ${userData.name}`);
    } else {
      console.log(`⚠️  User already exists: ${userData.email}`);
    }
  }
};

const seedRooms = async () => {
  const owner = await User.findOne({ where: { role: 'owner' } });
  if (!owner) {
    console.log('❌ No owner user found. Please create an owner first.');
    return;
  }

  const rooms = [
    // PG Accommodations
    {
      title: 'Cozy Private Room in Koramangala',
      description: 'A comfortable private room with attached bathroom in the heart of Koramangala. Perfect for working professionals. Close to tech parks and metro station.',
      price: 8500,
      location: {
        address: '5th Block, Koramangala',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560034',
        coordinates: { latitude: 12.9352, longitude: 77.6245 }
      },
      roomType: 'Private Room',
      category: 'PG',
      maxGuests: 1,
      amenities: ['wifi', 'meals', 'parking', 'laundry', 'ac'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
          alt: 'Cozy private room',
          isPrimary: true
        }
      ],
      rules: [
        'No smoking inside the room',
        'Visitors allowed till 9 PM',
        'Maintain cleanliness',
        'No loud music after 10 PM'
      ],
      rating: { average: 4.8, count: 12 },
      ownerId: owner.id,
      featured: true
    },
    {
      title: 'Spacious Shared Room Near Metro',
      description: 'Well-maintained shared accommodation for 2 people. Fully furnished with modern amenities. Walking distance from metro station.',
      price: 5500,
      location: {
        address: 'Indiranagar Metro Station',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560038',
        coordinates: { latitude: 12.9716, longitude: 77.6412 }
      },
      roomType: 'Shared Room',
      category: 'PG',
      maxGuests: 2,
      amenities: ['wifi', 'meals', 'laundry', 'security'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
          alt: 'Shared room',
          isPrimary: true
        }
      ],
      rules: [
        'No pets allowed',
        'Quiet hours after 10 PM',
        'Keep common areas clean',
        'Respect roommate privacy'
      ],
      rating: { average: 4.5, count: 8 },
      ownerId: owner.id
    },
    {
      title: 'Modern PG for Girls - HSR Layout',
      description: 'Exclusive ladies PG with 24/7 security, CCTV surveillance, and all modern amenities. Located in premium HSR Layout.',
      price: 12000,
      location: {
        address: 'HSR Layout, Sector 7',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560102',
        coordinates: { latitude: 12.9115, longitude: 77.6456 }
      },
      roomType: 'Private Room',
      category: 'PG',
      maxGuests: 1,
      amenities: ['wifi', 'meals', 'security', 'cctv', 'ac', 'parking'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
          alt: 'Modern PG for girls',
          isPrimary: true
        }
      ],
      rules: [
        'Ladies only accommodation',
        'No male visitors allowed',
        'Curfew time: 10 PM',
        'Maintain decorum'
      ],
      rating: { average: 4.9, count: 18 },
      ownerId: owner.id,
      featured: true
    },
    {
      title: 'Budget PG Near ITPL',
      description: 'Affordable PG accommodation for working professionals. Clean rooms with basic amenities. Close to IT companies.',
      price: 4500,
      location: {
        address: 'ITPL Road, Whitefield',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560066',
        coordinates: { latitude: 12.9698, longitude: 77.7500 }
      },
      roomType: 'Shared Room',
      category: 'PG',
      maxGuests: 3,
      amenities: ['wifi', 'meals', 'laundry'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1555854877-bab0ef1e3a5e?w=800&q=80',
          alt: 'Budget PG room',
          isPrimary: true
        }
      ],
      rules: [
        'Shared accommodation',
        'Keep room clean',
        'No smoking',
        'Respect other residents'
      ],
      rating: { average: 4.2, count: 6 },
      ownerId: owner.id
    },

    // Hotel Rooms
    {
      title: 'Boutique Hotel Room Downtown',
      description: 'Elegant hotel room in the heart of the city. Perfect for business travelers and tourists. Includes room service and concierge.',
      price: 12000,
      location: {
        address: 'MG Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        coordinates: { latitude: 12.9716, longitude: 77.5946 }
      },
      roomType: 'Private Room',
      category: 'Hotel Room',
      maxGuests: 2,
      amenities: ['wifi', 'ac', 'tv', 'parking'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
          alt: 'Hotel room',
          isPrimary: true
        }
      ],
      rules: [
        'Check-in: 2 PM, Check-out: 11 AM',
        'No smoking in the room',
        'Room service available 24/7',
        'ID required for check-in'
      ],
      rating: { average: 4.7, count: 25 },
      ownerId: owner.id,
      featured: true
    },
    {
      title: 'Luxury Suite - Marriott',
      description: 'Premium suite with city view, king-size bed, and premium amenities. Perfect for special occasions and business stays.',
      price: 25000,
      location: {
        address: 'Marriott Hotel, Whitefield',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560066',
        coordinates: { latitude: 12.9698, longitude: 77.7500 }
      },
      roomType: 'Entire Place',
      category: 'Hotel Room',
      maxGuests: 4,
      amenities: ['wifi', 'ac', 'tv', 'parking', 'gym'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80',
          alt: 'Luxury suite',
          isPrimary: true
        }
      ],
      rules: [
        'Check-in: 3 PM, Check-out: 12 PM',
        'Premium amenities included',
        '24/7 concierge service',
        'Spa and gym access'
      ],
      rating: { average: 4.9, count: 45 },
      ownerId: owner.id,
      featured: true
    },
    {
      title: 'Budget Hotel Near Airport',
      description: 'Comfortable budget hotel near Kempegowda International Airport. Perfect for transit stays and early morning flights.',
      price: 3500,
      location: {
        address: 'Airport Road, Devanahalli',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '562110',
        coordinates: { latitude: 13.1979, longitude: 77.7063 }
      },
      roomType: 'Private Room',
      category: 'Hotel Room',
      maxGuests: 2,
      amenities: ['wifi', 'ac', 'tv', 'parking'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
          alt: 'Budget hotel room',
          isPrimary: true
        }
      ],
      rules: [
        'Check-in: 1 PM, Check-out: 11 AM',
        'Airport shuttle available',
        'No smoking',
        'ID required'
      ],
      rating: { average: 4.3, count: 12 },
      ownerId: owner.id
    },
    {
      title: 'Business Hotel - Electronic City',
      description: 'Modern business hotel in Electronic City with conference facilities, business center, and high-speed internet.',
      price: 8000,
      location: {
        address: 'Electronic City Phase 1',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560100',
        coordinates: { latitude: 12.8456, longitude: 77.6603 }
      },
      roomType: 'Private Room',
      category: 'Hotel Room',
      maxGuests: 2,
      amenities: ['wifi', 'ac', 'tv', 'parking'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80',
          alt: 'Business hotel room',
          isPrimary: true
        }
      ],
      rules: [
        'Business facilities included',
        'High-speed internet',
        'Conference room booking available',
        'Professional environment'
      ],
      rating: { average: 4.6, count: 28 },
      ownerId: owner.id
    },

    // Independent Homes
    {
      title: 'Luxury Studio Apartment',
      description: 'Premium studio apartment with all modern amenities. Ideal for professionals seeking privacy and comfort. Includes gym and swimming pool access.',
      price: 15000,
      location: {
        address: 'Whitefield Tech Park',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560066',
        coordinates: { latitude: 12.9698, longitude: 77.7500 }
      },
      roomType: 'Entire Place',
      category: 'Independent Home',
      maxGuests: 2,
      amenities: ['wifi', 'parking', 'ac', 'tv', 'gym', 'security'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
          alt: 'Luxury studio',
          isPrimary: true
        }
      ],
      rules: [
        'No smoking',
        'No parties',
        'Maintain apartment cleanliness',
        'Report maintenance issues promptly'
      ],
      rating: { average: 4.9, count: 15 },
      ownerId: owner.id,
      featured: true
    },
    {
      title: 'Spacious 2BHK Villa',
      description: 'Beautiful 2-bedroom villa with garden and parking. Perfect for families or groups. Located in peaceful residential area.',
      price: 22000,
      location: {
        address: 'JP Nagar Phase 2',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560078',
        coordinates: { latitude: 12.8941, longitude: 77.5866 }
      },
      roomType: 'Entire Place',
      category: 'Independent Home',
      maxGuests: 6,
      amenities: ['wifi', 'parking', 'ac', 'tv', 'kitchen', 'security'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
          alt: '2BHK villa',
          isPrimary: true
        }
      ],
      rules: [
        'Family-friendly accommodation',
        'No parties after 10 PM',
        'Maintain garden',
        'Kitchen available for cooking'
      ],
      rating: { average: 4.8, count: 22 },
      ownerId: owner.id,
      featured: true
    },
    {
      title: 'Modern 1BHK Apartment',
      description: 'Contemporary 1-bedroom apartment with modern fixtures and appliances. Located in prime residential area.',
      price: 18000,
      location: {
        address: 'Koramangala 5th Block',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560034',
        coordinates: { latitude: 12.9352, longitude: 77.6245 }
      },
      roomType: 'Entire Place',
      category: 'Independent Home',
      maxGuests: 3,
      amenities: ['wifi', 'parking', 'ac', 'tv', 'kitchen', 'washing-machine'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
          alt: 'Modern 1BHK',
          isPrimary: true
        }
      ],
      rules: [
        'No smoking inside',
        'Keep apartment clean',
        'Kitchen available',
        'Respect neighbors'
      ],
      rating: { average: 4.7, count: 18 },
      ownerId: owner.id
    },
    {
      title: 'Budget 1BHK Near Metro',
      description: 'Affordable 1-bedroom apartment near metro station. Basic amenities included. Perfect for budget-conscious travelers.',
      price: 12000,
      location: {
        address: 'Majestic Metro Station',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560023',
        coordinates: { latitude: 12.9774, longitude: 77.5711 }
      },
      roomType: 'Entire Place',
      category: 'Independent Home',
      maxGuests: 2,
      amenities: ['wifi', 'ac', 'kitchen'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1555854877-bab0ef1e3a5e?w=800&q=80',
          alt: 'Budget 1BHK',
          isPrimary: true
        }
      ],
      rules: [
        'Basic amenities only',
        'Metro station nearby',
        'Keep apartment clean',
        'No smoking'
      ],
      rating: { average: 4.4, count: 8 },
      ownerId: owner.id
    },

    // Home Stays
    {
      title: 'Traditional Homestay - Malleshwaram',
      description: 'Authentic South Indian homestay experience with traditional home-cooked meals. Experience local culture and hospitality.',
      price: 6000,
      location: {
        address: 'Malleshwaram, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560003',
        coordinates: { latitude: 12.9997, longitude: 77.5636 }
      },
      roomType: 'Private Room',
      category: 'Home Stay',
      maxGuests: 2,
      amenities: ['wifi', 'meals', 'parking'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
          alt: 'Traditional homestay',
          isPrimary: true
        }
      ],
      rules: [
        'Traditional home experience',
        'Home-cooked meals included',
        'Respect local customs',
        'Family environment'
      ],
      rating: { average: 4.8, count: 32 },
      ownerId: owner.id,
      featured: true
    },
    {
      title: 'Farmhouse Homestay - Nandi Hills',
      description: 'Peaceful farmhouse homestay near Nandi Hills. Organic farming experience with fresh air and nature. Perfect weekend getaway.',
      price: 8000,
      location: {
        address: 'Nandi Hills Road, Chikkaballapur',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '562101',
        coordinates: { latitude: 13.4871, longitude: 77.6936 }
      },
      roomType: 'Entire Place',
      category: 'Home Stay',
      maxGuests: 4,
      amenities: ['wifi', 'meals', 'parking'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
          alt: 'Farmhouse homestay',
          isPrimary: true
        }
      ],
      rules: [
        'Organic farming experience',
        'Nature-friendly stay',
        'Fresh organic meals',
        'Respect nature'
      ],
      rating: { average: 4.9, count: 28 },
      ownerId: owner.id,
      featured: true
    },
    {
      title: 'Cultural Homestay - Basavanagudi',
      description: 'Cultural immersion homestay in traditional Bangalore neighborhood. Learn local traditions, cuisine, and heritage.',
      price: 7000,
      location: {
        address: 'Basavanagudi, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560004',
        coordinates: { latitude: 12.9431, longitude: 77.5738 }
      },
      roomType: 'Private Room',
      category: 'Home Stay',
      maxGuests: 2,
      amenities: ['wifi', 'meals'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80',
          alt: 'Cultural homestay',
          isPrimary: true
        }
      ],
      rules: [
        'Cultural learning experience',
        'Traditional meals included',
        'Participate in local activities',
        'Respect traditions'
      ],
      rating: { average: 4.7, count: 24 },
      ownerId: owner.id
    },
    {
      title: 'Cozy Family Homestay - Jayanagar',
      description: 'Warm family homestay with home-cooked meals and personal attention. Experience authentic Bangalore hospitality.',
      price: 5500,
      location: {
        address: 'Jayanagar 4th Block',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560011',
        coordinates: { latitude: 12.9269, longitude: 77.5878 }
      },
      roomType: 'Private Room',
      category: 'Home Stay',
      maxGuests: 2,
      amenities: ['wifi', 'meals'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
          alt: 'Family homestay',
          isPrimary: true
        }
      ],
      rules: [
        'Family environment',
        'Home-cooked meals',
        'Personal attention',
        'Respect family privacy'
      ],
      rating: { average: 4.6, count: 19 },
      ownerId: owner.id
    }
  ];

  for (const roomData of rooms) {
    const existingRoom = await Room.findOne({ where: { title: roomData.title } });
    if (!existingRoom) {
      await Room.create(roomData);
      console.log(`✅ Created room: ${roomData.title}`);
    } else {
      console.log(`⚠️  Room already exists: ${roomData.title}`);
    }
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('🌱 Starting database seeding...');
    
    await seedCategories();
    await seedUsers();
    await seedRooms();
    
    console.log('✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, seedCategories, seedUsers, seedRooms };

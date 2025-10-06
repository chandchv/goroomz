export const initializeRooms = () => {
    return [
      {
        id: '1',
        title: 'Cozy Private Room in Koramangala',
        description: 'A comfortable private room with attached bathroom in the heart of Koramangala. Perfect for working professionals. Close to tech parks and metro station.',
        price: 8500,
        location: 'Koramangala',
        city: 'Bangalore',
        maxGuests: 1,
        roomType: 'Private Room',
        category: 'PG',
        amenities: ['wifi', 'meals', 'parking', 'laundry', 'ac'],
        rating: 4.8,
        image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
        rules: [
          'No smoking inside the room',
          'Visitors allowed till 9 PM',
          'Maintain cleanliness',
          'No loud music after 10 PM'
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Spacious Shared Room Near Metro',
        description: 'Well-maintained shared accommodation for 2 people. Fully furnished with modern amenities. Walking distance from metro station.',
        price: 5500,
        location: 'Indiranagar',
        city: 'Bangalore',
        maxGuests: 2,
        roomType: 'Shared Room',
        category: 'PG',
        amenities: ['wifi', 'meals', 'laundry', 'security'],
        rating: 4.5,
        image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
        rules: [
          'No pets allowed',
          'Quiet hours after 10 PM',
          'Keep common areas clean',
          'Respect roommate privacy'
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        title: 'Luxury Studio Apartment',
        description: 'Premium studio apartment with all modern amenities. Ideal for professionals seeking privacy and comfort. Includes gym and swimming pool access.',
        price: 15000,
        location: 'Whitefield',
        city: 'Bangalore',
        maxGuests: 2,
        roomType: 'Entire Place',
        category: 'Independent Home',
        amenities: ['wifi', 'parking', 'ac', 'tv', 'gym', 'security'],
        rating: 4.9,
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
        rules: [
          'No smoking',
          'No parties',
          'Maintain apartment cleanliness',
          'Report maintenance issues promptly'
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: '4',
        title: 'Boutique Hotel Room Downtown',
        description: 'Affordable accommodation perfect for students. Close to colleges and universities. Includes study table and good internet connectivity.',
        price: 4000,
        location: 'BTM Layout',
        city: 'Bangalore',
        maxGuests: 1,
        roomType: 'Private Room',
        category: 'Hotel Room',
        amenities: ['wifi', 'meals', 'laundry'],
        rating: 4.3,
        image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
        rules: [
          'Students only',
          'No overnight guests',
          'Study hours respected',
          'Keep room tidy'
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: '5',
        title: 'Quaint Home Stay with Garden',
        description: 'Beautiful room with private balcony overlooking the city. Fully furnished with contemporary decor. Perfect for those who love natural light.',
        price: 9500,
        location: 'HSR Layout',
        city: 'Bangalore',
        maxGuests: 1,
        roomType: 'Private Room',
        category: 'Home Stay',
        amenities: ['wifi', 'meals', 'parking', 'ac', 'tv'],
        rating: 4.7,
        image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
        rules: [
          'No smoking on balcony',
          'Respect quiet hours',
          'Keep balcony clean',
          'No hanging clothes outside'
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: '6',
        title: 'Premium PG with All Facilities',
        description: 'Top-notch paying guest accommodation with housekeeping, laundry, and meals included. Security and CCTV surveillance 24/7.',
        price: 12000,
        location: 'Electronic City',
        city: 'Bangalore',
        maxGuests: 1,
        roomType: 'Private Room',
        category: 'PG',
        amenities: ['wifi', 'meals', 'parking', 'laundry', 'ac', 'tv', 'gym', 'security'],
        rating: 4.9,
        image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
        rules: [
          'ID proof mandatory',
          'No guests after 9 PM',
          'Meals at fixed timings',
          'Maintain discipline'
        ],
        createdAt: new Date().toISOString()
      }
    ];
  };
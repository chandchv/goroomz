const express = require('express');
const request = require('supertest');
const { BedAssignment, Room } = require('../models');

async function testBedsEndpoint() {
  try {
    console.log('🧪 Testing beds endpoint directly...\n');

    // Get a Room 301 ID
    const room301 = await Room.findOne({
      where: {
        roomNumber: '301',
        floorNumber: 3
      }
    });

    if (!room301) {
      console.log('❌ Room 301 not found');
      return;
    }

    console.log(`Testing with Room 301 ID: ${room301.id}\n`);

    // Simulate the beds endpoint logic
    const beds = await BedAssignment.findAll({
      where: { roomId: room301.id },
      attributes: ['id', 'bedNumber', 'status', 'bookingId'],
      order: [['bedNumber', 'ASC']]
    });

    console.log(`Found ${beds.length} beds:`);
    beds.forEach(bed => {
      console.log(`  - Bed ${bed.bedNumber}: ${bed.id} (${bed.status})`);
    });

    // Simulate the frontend filtering
    const vacantBeds = beds.filter(bed => bed.status === 'vacant');
    console.log(`\nVacant beds after filtering: ${vacantBeds.length}`);
    
    if (vacantBeds.length === 0) {
      console.log('❌ This would show "No vacant beds available in this room"');
    } else {
      console.log('✅ Beds should be available for selection:');
      vacantBeds.forEach(bed => {
        console.log(`  - Bed ${bed.bedNumber}: ${bed.id}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testBedsEndpoint();
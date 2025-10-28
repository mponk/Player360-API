// Quick seed script to create test players
require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('./models/Player');

const testPlayers = [
  { name: "Asep", number: 7, sport: "football", positionOrStyle: "FW", birthdate: new Date('2010-05-15') },
  { name: "Bimo", number: 10, sport: "football", positionOrStyle: "MF", birthdate: new Date('2010-08-22') },
  { name: "Rafi", number: 4, sport: "football", positionOrStyle: "DF", birthdate: new Date('2010-03-10') },
  { name: "Dani", number: 9, sport: "football", positionOrStyle: "FW", birthdate: new Date('2010-11-05') },
  { name: "Eko", number: 6, sport: "football", positionOrStyle: "MF", birthdate: new Date('2010-07-18') }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing players
    await Player.deleteMany({});
    console.log('Cleared existing players');
    
    // Insert test players
    const result = await Player.insertMany(testPlayers);
    console.log(`Created ${result.length} test players`);
    
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();

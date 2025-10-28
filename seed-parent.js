// Seed script to create a parent user linked to a player
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Player = require('./models/Player');
const { hashPassword } = require('./utils/hash');

async function seedParent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find first player (Asep)
    const player = await Player.findOne({ name: 'Asep' });
    if (!player) {
      console.error('No player found. Run seed-players.js first.');
      process.exit(1);
    }
    
    console.log(`Found player: ${player.name} (${player._id})`);
    
    // Create parent user
    const passwordHash = await hashPassword('parent123');
    
    const existingParent = await User.findOne({ email: 'parent@test.com' });
    if (existingParent) {
      console.log('Parent user already exists, updating...');
      existingParent.athleteId = player._id;
      await existingParent.save();
    } else {
      await User.create({
        name: 'Parent of Asep',
        email: 'parent@test.com',
        passwordHash,
        role: 'parent',
        athleteId: player._id
      });
      console.log('Created parent user: parent@test.com / parent123');
    }
    
    console.log(`Parent linked to player: ${player.name}`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seedParent();

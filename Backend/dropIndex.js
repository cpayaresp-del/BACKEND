const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
require('dotenv').config();

async function dropOldIndex() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/DayliShop');

    const db = mongoose.connection.db;
    const collection = db.collection('categoryconfigs');

    // Drop the old unique index on name
    try {
      await collection.dropIndex('name_1');
      console.log('Dropped old unique index on name');
    } catch (error) {
      console.log('Old index may not exist:', error.message);
    }

    // The new compound index will be created automatically when the model is loaded
    console.log('New compound index on name and parentCategory will be created');

    await mongoose.disconnect();
    console.log('Done');
  } catch (error) {
    console.error('Error:', error);
  }
}

dropOldIndex();
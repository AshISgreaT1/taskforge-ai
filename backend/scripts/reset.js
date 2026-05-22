const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const resetDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
      console.log(`Cleared collection: ${collection.name}`);
    }

    console.log('\n--- Database Reset Complete ---');
    console.log('All collections have been cleared');
    console.log('-------------------------------');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Reset error:', error);
    process.exit(1);
  }
};

resetDB();
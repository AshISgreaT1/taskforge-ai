const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const backupDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', 'backups', timestamp);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const collections = await db.listCollections().toArray();
    const stats = { collections: 0, documents: 0 };

    for (const collection of collections) {
      const data = await db.collection(collection.name).find({}).toArray();
      const filePath = path.join(backupDir, `${collection.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      stats.collections++;
      stats.documents += data.length;
      console.log(`Backed up ${data.length} documents from ${collection.name}`);
    }

    const manifest = {
      timestamp: new Date().toISOString(),
      collections: stats.collections,
      totalDocuments: stats.documents
    };
    fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    console.log(`\n--- Backup Complete ---`);
    console.log(`Location: ${backupDir}`);
    console.log(`Collections: ${stats.collections}`);
    console.log(`Total Documents: ${stats.documents}`);
    console.log('------------------------');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Backup error:', error);
    process.exit(1);
  }
};

backupDB();
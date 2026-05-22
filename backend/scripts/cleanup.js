const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const cleanupDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const oldTasks = await db.collection('tasks').deleteMany({
      status: 'completed',
      completedAt: { $lt: thirtyDaysAgo }
    });
    console.log(`Removed ${oldTasks.deletedCount} old completed tasks`);

    const archivedProjects = await db.collection('projects').deleteMany({
      status: 'archived',
      updatedAt: { $lt: thirtyDaysAgo }
    });
    console.log(`Removed ${archivedProjects.deletedCount} old archived projects`);

    const pipeline = [
      { $match: { isSubtask: true, status: 'completed' } },
      { $group: { _id: '$parentTask', count: { $sum: 1 } } },
      { $match: { count: { $gte: 1 } } }
    ];
    const completedSubtaskGroups = await db.collection('tasks').aggregate(pipeline).toArray();
    const parentIds = completedSubtaskGroups.map(g => g._id).filter(Boolean);

    if (parentIds.length > 0) {
      const mainCompleted = await db.collection('tasks').deleteMany({
        _id: { $in: parentIds },
        status: 'completed'
      });
      console.log(`Removed ${mainCompleted.deletedCount} completed parent tasks with completed subtasks`);
    }

    const backupDir = require('path').join(__dirname, '..', 'backups');
    const fs = require('fs');
    if (fs.existsSync(backupDir)) {
      const backups = fs.readdirSync(backupDir).sort().reverse();
      const maxBackups = 5;
      if (backups.length > maxBackups) {
        const toRemove = backups.slice(maxBackups);
        for (const backup of toRemove) {
          const backupPath = require('path').join(backupDir, backup);
          fs.rmSync(backupPath, { recursive: true, force: true });
          console.log(`Removed old backup: ${backup}`);
        }
      }
    }

    const stats = await db.collection('tasks').aggregate([
      { $group: { _id: '$projectId', count: { $sum: 1 } } }
    ]).toArray();

    for (const stat of stats) {
      if (stat._id) {
        const completed = await db.collection('tasks').countDocuments({
          projectId: stat._id,
          status: 'completed'
        });
        const progress = stat.count > 0 ? Math.round((completed / stat.count) * 100) : 0;
        await db.collection('projects').updateOne(
          { _id: stat._id },
          { $set: { progress, updatedAt: new Date() } }
        );
      }
    }
    console.log('Updated project progress values');

    console.log('\n--- Cleanup Complete ---');
    console.log('Database has been cleaned up');
    console.log('------------------------');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup error:', error);
    process.exit(1);
  }
};

cleanupDB();
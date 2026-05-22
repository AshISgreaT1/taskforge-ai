const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const showAnalytics = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;

    const userCount = await db.collection('users').countDocuments();
    const projectCount = await db.collection('projects').countDocuments();
    const taskCount = await db.collection('tasks').countDocuments();

    const completedTasks = await db.collection('tasks').countDocuments({ status: 'completed' });
    const inProgressTasks = await db.collection('tasks').countDocuments({ status: 'in-progress' });
    const todoTasks = await db.collection('tasks').countDocuments({ status: 'todo' });

    const activeProjects = await db.collection('projects').countDocuments({ status: 'active' });
    const completedProjects = await db.collection('projects').countDocuments({ status: 'completed' });

    const now = new Date();
    const overdueTasks = await db.collection('tasks').countDocuments({
      dueDate: { $lt: now },
      status: { $ne: 'completed' }
    });

    const pipeline = [
      { $group: { _id: null, avgProgress: { $avg: '$progress' } } }
    ];
    const avgProgressResult = await db.collection('projects').aggregate(pipeline).toArray();
    const avgProgress = avgProgressResult[0]?.avgProgress || 0;

    const priorityPipeline = [
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ];
    const priorityStats = await db.collection('tasks').aggregate(priorityPipeline).toArray();
    const priorityMap = {};
    priorityStats.forEach(p => { priorityMap[p._id] = p.count; });

    console.log('╔══════════════════════════════════════════╗');
    console.log('║       TASKFORGE AI ANALYTICS            ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Users:        ${userCount.toString().padStart(25)}║`);
    console.log(`║  Projects:    ${projectCount.toString().padStart(25)}║`);
    console.log(`║  Tasks:       ${taskCount.toString().padStart(25)}║`);
    console.log('╠══════════════════════════════════════════╣');
    console.log('║  TASK STATUS                            ║');
    console.log(`║  - Completed: ${completedTasks.toString().padStart(22)}║`);
    console.log(`║  - In Progress:${inProgressTasks.toString().padStart(22)}║`);
    console.log(`║  - To Do:      ${todoTasks.toString().padStart(22)}║`);
    console.log('╠══════════════════════════════════════════╣');
    console.log('║  PROJECT STATUS                         ║');
    console.log(`║  - Active:     ${activeProjects.toString().padStart(22)}║`);
    console.log(`║  - Completed:  ${completedProjects.toString().padStart(22)}║`);
    console.log('╠══════════════════════════════════════════╣');
    console.log('║  METRICS                                ║');
    console.log(`║  - Overdue:    ${overdueTasks.toString().padStart(22)}║`);
    console.log(`║  - Avg Progress:${Math.round(avgProgress).toString().padStart(21)}%║`);
    console.log('╠══════════════════════════════════════════╣');
    console.log('║  PRIORITY DISTRIBUTION                  ║');
    console.log(`║  - Critical:   ${(priorityMap.critical || 0).toString().padStart(22)}║`);
    console.log(`║  - High:       ${(priorityMap.high || 0).toString().padStart(22)}║`);
    console.log(`║  - Medium:     ${(priorityMap.medium || 0).toString().padStart(22)}║`);
    console.log(`║  - Low:        ${(priorityMap.low || 0).toString().padStart(22)}║`);
    console.log('╚══════════════════════════════════════════╝');

    const completionRate = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;
    console.log(`\nCompletion Rate: ${completionRate}%`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Analytics error:', error);
    process.exit(1);
  }
};

showAnalytics();
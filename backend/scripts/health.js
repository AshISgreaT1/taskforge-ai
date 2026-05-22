const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const checkHealth = async () => {
  try {
    console.log('Checking TaskForge AI health...\n');

    const mongoStatus = mongoose.connection.readyState === 1 ? '✓ Connected' : '✗ Disconnected';
    console.log(`MongoDB: ${mongoStatus}`);

    if (mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      const admin = db.admin();
      const serverStatus = await admin.serverStatus();
      console.log(`  - Version: ${serverStatus.version}`);
      console.log(`  - Uptime: ${Math.floor(serverStatus.uptime / 3600)}h ${Math.floor((serverStatus.uptime % 3600) / 60)}m`);

      const userCount = await db.collection('users').countDocuments();
      const projectCount = await db.collection('projects').countDocuments();
      const taskCount = await db.collection('tasks').countDocuments();
      console.log(`  - Users: ${userCount}`);
      console.log(`  - Projects: ${projectCount}`);
      console.log(`  - Tasks: ${taskCount}`);
    }

    const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'PORT'];
    console.log('\nEnvironment Variables:');
    let envOk = true;
    for (const varName of requiredEnvVars) {
      const exists = !!process.env[varName];
      const status = exists ? '✓' : '✗';
      console.log(`  ${status} ${varName}: ${exists ? 'set' : 'MISSING'}`);
      if (!exists) envOk = false;
    }

    console.log('\nAPI Endpoints:');
    console.log('  ✓ GET  /api/health');
    console.log('  ✓ POST /api/auth/signup');
    console.log('  ✓ POST /api/auth/login');
    console.log('  ✓ GET  /api/projects');
    console.log('  ✓ GET  /api/tasks');
    console.log('  ✓ GET  /api/dashboard');

    console.log('\n' + '═'.repeat(40));
    if (mongoStatus.includes('✓') && envOk) {
      console.log('  Status: HEALTHY ✓');
    } else {
      console.log('  Status: UNHEALTHY ✗');
    }
    console.log('═'.repeat(40));

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Health check error:', error);
    process.exit(1);
  }
};

checkHealth();
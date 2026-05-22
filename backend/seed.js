const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');

dotenv.config();

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    console.log('Connecting to MongoDB with URI:', mongoUri ? 'URI exists' : 'MISSING URI');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    console.log('Cleared existing data');

    const adminUser = await User.create({
      name: 'Alex Johnson',
      email: 'admin@taskforge.ai',
      password: 'password123',
      role: 'admin',
      jobRole: 'team-lead'
    });

    const member1 = await User.create({
      name: 'Sarah Chen',
      email: 'sarah@taskforge.ai',
      password: 'password123',
      role: 'member',
      jobRole: 'frontend-dev'
    });

    const member2 = await User.create({
      name: 'Mike Williams',
      email: 'mike@taskforge.ai',
      password: 'password123',
      role: 'member',
      jobRole: 'backend-dev'
    });

    const member3 = await User.create({
      name: 'Emily Davis',
      email: 'emily@taskforge.ai',
      password: 'password123',
      role: 'member',
      jobRole: 'designer'
    });

    console.log('Created users with hashed passwords');

    const project1 = await Project.create({
      title: 'TaskForge AI Platform',
      description: 'AI-powered project management platform with smart task breakdown and delay prediction.',
      createdBy: adminUser._id,
      members: [
        { user: member1._id, role: 'frontend-dev', addedBy: adminUser._id },
        { user: member2._id, role: 'backend-dev', addedBy: adminUser._id }
      ],
      progress: 65,
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    });

    const project2 = await Project.create({
      title: 'Mobile App Development',
      description: 'Cross-platform mobile application for team collaboration.',
      createdBy: adminUser._id,
      members: [
        { user: member1._id, role: 'frontend-dev', addedBy: adminUser._id },
        { user: member3._id, role: 'designer', addedBy: adminUser._id }
      ],
      progress: 40,
      status: 'active',
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    const project3 = await Project.create({
      title: 'Website Redesign',
      description: 'Modern redesign of company website with improved UX.',
      createdBy: adminUser._id,
      members: [
        { user: member2._id, role: 'backend-dev', addedBy: adminUser._id },
        { user: member3._id, role: 'designer', addedBy: adminUser._id }
      ],
      progress: 85,
      status: 'active',
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    console.log('Created projects');

    const tasksData = [
      {
        title: 'Design System Implementation',
        description: 'Create comprehensive design system with tokens and components',
        projectId: project1._id,
        createdBy: adminUser._id,
        assignedTo: member1._id,
        priority: 'high',
        status: 'completed',
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Backend API Development',
        description: 'Build RESTful API with Express and MongoDB',
        projectId: project1._id,
        createdBy: adminUser._id,
        assignedTo: member2._id,
        priority: 'critical',
        status: 'in-progress',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Frontend Dashboard',
        description: 'Create main dashboard with analytics and charts',
        projectId: project1._id,
        createdBy: adminUser._id,
        assignedTo: member1._id,
        priority: 'high',
        status: 'in-progress',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'User Authentication',
        description: 'Implement JWT auth with role-based access control',
        projectId: project1._id,
        createdBy: adminUser._id,
        assignedTo: member2._id,
        priority: 'critical',
        status: 'completed',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'AI Task Breakdown Feature',
        description: 'Smart subtask generation based on main task',
        projectId: project1._id,
        createdBy: adminUser._id,
        assignedTo: member1._id,
        priority: 'medium',
        status: 'todo',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'iOS App Setup',
        description: 'Initialize iOS project with React Native',
        projectId: project2._id,
        createdBy: adminUser._id,
        assignedTo: member1._id,
        priority: 'high',
        status: 'completed',
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Android App Setup',
        description: 'Initialize Android project with React Native',
        projectId: project2._id,
        createdBy: adminUser._id,
        assignedTo: member3._id,
        priority: 'high',
        status: 'completed',
        dueDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Push Notifications',
        description: 'Implement push notification system',
        projectId: project2._id,
        createdBy: adminUser._id,
        assignedTo: member1._id,
        priority: 'medium',
        status: 'in-progress',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'UI Wireframes',
        description: 'Create wireframes for all app screens',
        projectId: project2._id,
        createdBy: adminUser._id,
        assignedTo: member3._id,
        priority: 'high',
        status: 'completed',
        dueDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Homepage Redesign',
        description: 'Modern homepage with hero section and features',
        projectId: project3._id,
        createdBy: adminUser._id,
        assignedTo: member2._id,
        priority: 'critical',
        status: 'completed',
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'About Page',
        description: 'Create company about page',
        projectId: project3._id,
        createdBy: adminUser._id,
        assignedTo: member3._id,
        priority: 'medium',
        status: 'completed',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'Contact Form',
        description: 'Implement contact form with validation',
        projectId: project3._id,
        createdBy: adminUser._id,
        assignedTo: member2._id,
        priority: 'medium',
        status: 'in-progress',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'SEO Optimization',
        description: 'Improve search engine optimization',
        projectId: project3._id,
        createdBy: adminUser._id,
        assignedTo: member3._id,
        priority: 'low',
        status: 'todo',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      }
    ];

    await Task.insertMany(tasksData);
    console.log('Created tasks');

    console.log('\n=== Seed Data Created Successfully ===');
    console.log('\nDemo Accounts:');
    console.log('Admin: admin@taskforge.ai / password123');
    console.log('Member: sarah@taskforge.ai / password123');
    console.log('Member: mike@taskforge.ai / password123');
    console.log('Member: emily@taskforge.ai / password123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();

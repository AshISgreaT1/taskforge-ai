const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  jobRole: { type: String, enum: ['team-lead', 'frontend-dev', 'backend-dev', 'qa', 'designer', 'member'], default: 'member' },
  avatar: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const projectMemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'team-lead', 'frontend-dev', 'backend-dev', 'qa', 'designer', 'member'], default: 'member' },
  addedAt: { type: Date, default: Date.now },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const projectSchema = new mongoose.Schema({
  title: String,
  description: String,
  members: [projectMemberSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  progress: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
  title: String,
  description: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['todo', 'in-progress', 'pending-approval', 'completed'], default: 'todo' },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: null },
  approvalNote: String,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: Date,
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isSubtask: { type: Boolean, default: false },
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  completedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    console.log('Cleared existing data');

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@taskforge.ai',
      password: 'admin123',
      role: 'admin',
      jobRole: 'team-lead'
    });

    const member1 = await User.create({
      name: 'John Developer',
      email: 'john@taskforge.ai',
      password: 'password123',
      role: 'member',
      jobRole: 'frontend-dev'
    });

    const member2 = await User.create({
      name: 'Sarah Designer',
      email: 'sarah@taskforge.ai',
      password: 'password123',
      role: 'member',
      jobRole: 'designer'
    });

    const member3 = await User.create({
      name: 'Mike Manager',
      email: 'mike@taskforge.ai',
      password: 'password123',
      role: 'member',
      jobRole: 'backend-dev'
    });

    console.log('Created users');

    const project1 = await Project.create({
      title: 'Website Redesign',
      description: 'Complete redesign of company website with modern UI/UX',
      members: [
        { user: member1._id, role: 'frontend-dev', addedBy: admin._id },
        { user: member2._id, role: 'designer', addedBy: admin._id }
      ],
      createdBy: admin._id,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    const project2 = await Project.create({
      title: 'Mobile App Development',
      description: 'Build cross-platform mobile application',
      members: [
        { user: member1._id, role: 'frontend-dev', addedBy: admin._id },
        { user: member3._id, role: 'backend-dev', addedBy: admin._id }
      ],
      createdBy: admin._id,
      status: 'active',
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    });

    const project3 = await Project.create({
      title: 'API Integration',
      description: 'Integrate third-party APIs for enhanced functionality',
      members: [
        { user: member1._id, role: 'frontend-dev', addedBy: admin._id }
      ],
      createdBy: admin._id,
      status: 'active',
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    });

    console.log('Created projects');

    const tasks = [
      { title: 'Design homepage mockup', description: 'Create initial wireframes', priority: 'high', status: 'completed', projectId: project1._id, assignedTo: member2._id, createdBy: admin._id, dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
      { title: 'Implement navigation component', description: 'Build responsive navbar', priority: 'high', status: 'in-progress', projectId: project1._id, assignedTo: member1._id, createdBy: admin._id, dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
      { title: 'Build hero section', description: 'Create animated hero with CTAs', priority: 'medium', status: 'todo', projectId: project1._id, assignedTo: member1._id, createdBy: admin._id, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      { title: 'Create about page', description: 'Design and implement about page', priority: 'medium', status: 'todo', projectId: project1._id, assignedTo: member2._id, createdBy: admin._id, dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
      { title: 'Setup CI/CD pipeline', description: 'Configure automated deployments', priority: 'critical', status: 'in-progress', projectId: project2._id, assignedTo: member1._id, createdBy: admin._id, dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      { title: 'Design app screens', description: 'Create all mobile app screens', priority: 'high', status: 'completed', projectId: project2._id, assignedTo: member2._id, createdBy: admin._id, dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) },
      { title: 'Implement authentication', description: 'User login and registration', priority: 'critical', status: 'todo', projectId: project2._id, assignedTo: member1._id, createdBy: admin._id, dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000) },
      { title: 'Setup database schema', description: 'Design MongoDB collections', priority: 'high', status: 'completed', projectId: project2._id, assignedTo: member3._id, createdBy: admin._id, dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      { title: 'Integrate payment API', description: 'Connect Stripe for payments', priority: 'high', status: 'todo', projectId: project3._id, assignedTo: member1._id, createdBy: admin._id, dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
      { title: 'Add analytics tracking', description: 'Implement event tracking', priority: 'medium', status: 'todo', projectId: project3._id, assignedTo: member1._id, createdBy: admin._id, dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000) }
    ];

    await Task.insertMany(tasks);
    console.log('Created tasks');

    const progress = { project1: 25, project2: 37, project3: 0 };
    await Project.findByIdAndUpdate(project1._id, { progress: progress.project1 });
    await Project.findByIdAndUpdate(project2._id, { progress: progress.project2 });
    await Project.findByIdAndUpdate(project3._id, { progress: progress.project3 });

    console.log('\n--- Seed Complete ---');
    console.log('Users created: 4 (admin@taskforge.ai / admin123, john@taskforge.ai / password123, etc.)');
    console.log('Projects created: 3');
    console.log('Tasks created: 10');
    console.log('------------------------');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JOB_ROLES = ['team-lead', 'frontend-dev', 'backend-dev', 'qa', 'designer', 'member'];

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

exports.signup = async (req, res) => {
  try {
    console.log('SIGNUP REQUEST:', {
      body: req.body,
      authHeader: req.headers.authorization
    });
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'member',
      jobRole: 'member'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        jobRole: user.jobRole,
        isActive: user.isActive,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    console.log('LOGIN REQUEST:', {
      body: req.body,
      authHeader: req.headers.authorization
    });
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        jobRole: user.jobRole,
        isActive: user.isActive,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
      authHeader: req.headers.authorization
    });
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        jobRole: user.jobRole,
        isActive: user.isActive,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error getting user',
      error: error.message
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, jobRole, isActive } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update user roles'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (role && !['admin', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account role'
      });
    }

    if (jobRole && !JOB_ROLES.includes(jobRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job role'
      });
    }

    if (role) user.role = role;
    if (jobRole) user.jobRole = jobRole;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        jobRole: user.jobRole,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
      error: error.message
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create users'
      });
    }

    const { name, email, password, role, jobRole, isActive } = req.body;

    if (role && !['admin', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account role'
      });
    }

    if (jobRole && !JOB_ROLES.includes(jobRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job role'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'member',
      jobRole: jobRole || 'member',
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        jobRole: user.jobRole,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

exports.disableUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can disable users'
      });
    }

    const { userId } = req.params;
    const { isActive } = req.body;

    if (userId === req.user.id && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot disable your own account'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: isActive !== undefined ? isActive : false },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: user.isActive ? 'User enabled successfully' : 'User disabled successfully',
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error updating account status',
      error: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete users'
      });
    }

    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

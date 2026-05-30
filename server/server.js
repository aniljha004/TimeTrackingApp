const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ==================== JWT AUTH MIDDLEWARE ====================
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('✗ JWT_SECRET environment variable is not set. Refusing to start.');
  process.exit(1);
}

// All /api routes require a valid JWT except /api/login
app.use('/api', (req, res, next) => {
  if (req.path === '/login') return next(); // login is public

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7);

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: no token provided.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized: invalid or expired token.' });
  }
});

// MongoDB Connection with environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://timetrackingApp:Super%401234%23@cluster0.tvcloza.mongodb.net/timetracking';

console.log('Attempting to connect to MongoDB...');
console.log('Database:', MONGODB_URI.split('@')[1]?.split('/')[0]);

mongoose.connect(MONGODB_URI).then(() => {
  console.log('✓ MongoDB Connected Successfully');
}).catch(err => {
  console.error('✗ MongoDB Connection Failed:', err.message);
  console.error('Connection String:', MONGODB_URI.substring(0, 40) + '...');
  console.error('Full Error:', err);
  process.exit(1);
});

// Import models
const User = require('./models/User');
const Task = require('./models/Task');

// ==================== USER ROUTES ====================

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().populate('tasks');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('tasks');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new user
app.post('/api/users', async (req, res) => {
  const user = new User({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role || 'user'
  });

  try {
    const newUser = await user.save();
    res.status(201).json(newUser);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A user with that email already exists.' });
    }
    res.status(400).json({ message: error.message });
  }
});

// Login — issues a JWT on success
app.post('/api/login', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account does not have ${role} access.` });
    }

    const userObj = user.toObject();
    delete userObj.password;

    // Sign a token valid for 8 hours
    const token = jwt.sign(
      { id: user._id.toString(), role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ ...userObj, token });
  } catch (error) {
    console.error('Login error', error);
    res.status(500).json({ message: 'Login failed.' });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.password) user.password = req.body.password;
    if (req.body.role) user.role = req.body.role;
    
    user.updatedAt = Date.now();
    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Delete all tasks associated with the user
    await Task.deleteMany({ userId: req.params.id });
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User and associated tasks deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== TASK ROUTES ====================

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await Task.find().populate('userId', 'name email');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get tasks by user ID
app.get('/api/users/:userId/tasks', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.params.userId });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get task by ID
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('userId', 'name email');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new task
app.post('/api/tasks', async (req, res) => {
  const task = new Task({
    title: req.body.title,
    description: req.body.description || '',
    userId: req.body.userId,
    status: req.body.status || 'todo',
    priority: req.body.priority || 'medium',
    dueDate: req.body.dueDate || null,
    estimatedTime: req.body.estimatedTime || 0
  });

  try {
    const newTask = await task.save();
    
    // Add task to user's tasks array
    const user = await User.findById(req.body.userId);
    if (user) {
      user.tasks.push(newTask._id);
      await user.save();
    }

    const populatedTask = await Task.findById(newTask._id).populate('userId', 'name email');
    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.title !== undefined)         updates.title = req.body.title;
    if (req.body.description !== undefined)   updates.description = req.body.description;
    if (req.body.status !== undefined)        updates.status = req.body.status;
    if (req.body.priority !== undefined)      updates.priority = req.body.priority;
    if (req.body.dueDate !== undefined)       updates.dueDate = req.body.dueDate;
    if (req.body.timeSpent !== undefined)     updates.timeSpent = req.body.timeSpent;
    if (req.body.estimatedTime !== undefined) updates.estimatedTime = req.body.estimatedTime;
    updates.updatedAt = Date.now();

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: false }
    ).populate('userId', 'name email');

    if (!updatedTask) return res.status(404).json({ message: 'Task not found' });
    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error.message);
    res.status(400).json({ message: error.message });
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Remove task from user's tasks array
    await User.findByIdAndUpdate(task.userId, { $pull: { tasks: req.params.id } });
    
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==================== STATS ROUTES ====================

// Get user statistics
app.get('/api/users/:userId/stats', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const tasks = await Task.find({ userId: req.params.userId });
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    const totalTasks = tasks.length;
    const totalTimeSpent = tasks.reduce((sum, t) => sum + t.timeSpent, 0);

    res.json({
      userId: req.params.userId,
      totalTasks,
      completedTasks,
      inProgressTasks,
      totalTimeSpent,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(2) : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Serve index.html for root and all non-API routes (SPA fallback)
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, '../index.html')));
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'Not found' });
  res.sendFile(path.resolve(__dirname, '../index.html'));
});

// ==================== START SERVER ====
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ MongoDB: Connected`);
  console.log(`✓ API Base: https://timeflow-app-production.up.railway.app`);
});
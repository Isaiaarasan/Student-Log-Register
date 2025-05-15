const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Student = require('../models/Student');
require('dotenv').config();

// Middleware for logging requests
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    body: req.method === 'POST' ? { ...req.body, password: '[REDACTED]' } : undefined,
    query: req.query,
    params: req.params
  });
  next();
});

// Register route
router.post('/register', async (req, res) => {
  try {
    console.log("auth register")
    console.log("Registration request received:", req.body);
    const { username, password, name, email, role, rollNumber, class: studentClass } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.username === username ? "Username already taken" : "Email already registered" 
      });
    }

    // For students, check if roll number already exists
    if (role === 'student') {
      const existingStudent = await Student.findOne({ rollNumber });
      if (existingStudent) {
        return res.status(400).json({ message: "Roll number already registered" });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with class field instead of className
    const newUser = new User({ 
      username, 
      password: hashedPassword, 
      name, 
      email, 
      role, 
      rollNumber, 
      class: studentClass // Use class instead of className
    });
    
    console.log("Attempting to save user:", { username, name, email, role });
    await newUser.save();
    console.log("User saved successfully");

    // If student, also create student record
    // if (role === 'student') {
    //   const newStudent = new Student({
    //     name,
    //     rollNumber,
    //     class: studentClass,
    //     email
    //   });
    //   console.log("Attempting to save student:", { name, rollNumber, class: studentClass });
    //   await newStudent.save();
    //   console.log("Student saved successfully");
    // }

    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    console.error("Registration Error:", error);
    // Log more details about the error
    if (error.name === 'ValidationError') {
      console.error("Validation Error Details:", error.errors);
      return res.status(400).json({ 
        message: "Validation error", 
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: "An unexpected error occurred. Please try again later." });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login attempt for username:", username);

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      console.log("User not found:", username);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Compare passwords using bcrypt
    // const isMatch = await bcrypt.compare(password, user.password);/
    const isMatch = await bcrypt.compare(password, user.password);

    console.log("Password match:", isMatch);
    
    if (!isMatch) {
      console.log("Password mismatch for user:", username);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log("Login successful for user:", username);
    res.json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
};

// Get current user info (Protected)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId) || await Student.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        rollNumber: user.rollNumber,
        class: user.class,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user data', error: error.message });
  }
});

module.exports = router;

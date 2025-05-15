require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("./models/Student");

const app = express(); 

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === "POST") {
    console.log("Request body:", req.body);
  }
  next();
});

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB Atlas successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

connectDB();

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ["student", "admin"], default: "student" },
  rollNumber: { type: String, required: function () { return this.role === "student"; } },
  class: { type: String, required: function () { return this.role === "student"; } }
});

const User = mongoose.model("User", UserSchema);

// Signup Route
app.post("/api/signup", async (req, res) => {
  try {
    console.log("Signup request received:", req.body);
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

    // Create user
    const newUser = new User({ 
      username, 
      password: hashedPassword, 
      name, 
      email, 
      role, 
      rollNumber, 
      class: studentClass 
    });
    await newUser.save();

    // If student, also create student record
    if (role === 'student') {
      const newStudent = new Student({
        name,
        rollNumber,
        class: studentClass,
        email
      });
      await newStudent.save();
    }

    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server error, please try again" });
  }
});

// Login Route
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate Token
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Test Route
app.post("/api/test", (req, res) => {
  console.log("Test route hit with body:", req.body);
  res.status(200).json({ message: "Test successful", data: req.body });
});

// Simple student registration route
app.post("/api/student/register", async (req, res) => {
  console.log("student register")
  console.log('Student registration route hit with body:', req.body); 
  
  try {
    
    // Create a new student including additional details.
    const student = new Student({
      name: req.body.name,
      rollNumber: req.body.rollNumber,
      class: req.body.class,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      parentName: req.body.parentName,
      parentContact: req.body.parentContact // These details are now stored in the Student model.
    });
    console.log('New student object:', student); // Debug log
    // Save the student to the database
    const savedStudent = await student.save();
    
    // Remove password from response
    const studentResponse = savedStudent.toObject();
    delete studentResponse.password;
    
    res.status(201).json({ 
      message: 'Student registration successful',
      data: studentResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error in registration', error: error.message });
  }
});

// Load additional routes
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/student");
const attendanceRoutes = require("./routes/attendance");
const marksRoutes = require("./routes/marks");
const reportsRoutes = require("./routes/reports");

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/marks", marksRoutes);
app.use("/api/reports", reportsRoutes);

// Basic route for testing
app.get("/", (req, res) => {
  res.json({ message: "Backend server is running" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

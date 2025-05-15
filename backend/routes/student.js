const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const auth = require('../middleware/auth');

// Debug middleware
router.use((req, res, next) => {
  console.log(`[Student Router] ${req.method} ${req.originalUrl}`);
  next();
});

// Public route - Student registration
router.post('/register', async (req, res) => {
  console.log("student register")
  console.log('Student registration route hit with body:', req.body);
  
  try {
    // Check if student with this email already exists
    console.log('Checking for existing student with email:', req.body);
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

// Protected routes below this line
router.use(auth);

// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find().select('_id name rollNumber class email');
    console.log('Fetched students:', students); // Debug log
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
});

// Get students by class
router.get('/class/:className', async (req, res) => {
  try {
    const students = await Student.find({ class: req.params.className })
      .select('_id name rollNumber class email')
      .sort({ name: 1 });
    console.log('Fetched students by class:', students); // Debug log
    
    // Ensure we always return an array with _id field
    const studentsWithId = students.map(student => ({
      _id: student._id,
      name: student.name,
      rollNumber: student.rollNumber,
      class: student.class,
      email: student.email
    }));
    
    res.json(studentsWithId);
  } catch (error) {
    console.error('Error fetching students by class:', error);
    res.status(500).json({ 
      message: 'Error fetching students by class', 
      error: error.message,
      students: [] // Return empty array on error
    });
  }
});

// Get student by ID
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ message: 'Error fetching student', error: error.message });
  }
});

// Add new student
router.post('/', async (req, res) => {
  try {
    const { name, rollNumber, class: className, email } = req.body;
    
    if (!name || !rollNumber || !className || !email) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    const existingStudent = await Student.findOne({ rollNumber });
    if (existingStudent) {
      return res.status(400).json({ message: 'Student with this roll number already exists' });
    }
    
    const student = new Student({ name, rollNumber, class: className, email });
    const newStudent = await student.save();
    res.status(201).json({ message: 'Student added successfully', student: newStudent });
  } catch (error) {
    console.error('Error adding new student:', error);
    res.status(400).json({ message: 'Error adding student', error: error.message });
  }
});

// Update student
router.patch('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ message: 'Error updating student', error: error.message });
  }
});

// Delete student
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    await student.deleteOne();
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Error deleting student', error: error.message });
  }
});

module.exports = router;

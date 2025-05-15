const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const adminAuth = require('../middleware/adminAuth');

// Helper function to validate and parse date
const parseDate = (dateStr) => {
  // Check for YYYY-MM-DD format
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  // Check for DD-MM-YYYY format
  const euRegex = /^\d{2}-\d{2}-\d{4}$/;
  let parts, date;
  if (isoRegex.test(dateStr)) {
    date = new Date(dateStr);
  } else if (euRegex.test(dateStr)) {
    parts = dateStr.split("-");
    // Convert DD-MM-YYYY to YYYY-MM-DD format
    date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  } else {
    throw new Error('Invalid date format. Please use either DD-MM-YYYY or YYYY-MM-DD format');
  }
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date. Please use either DD-MM-YYYY or YYYY-MM-DD format');
  }
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

// Get attendance by date and class
router.get('/:date/:class', adminAuth, async (req, res) => {
  try {
    const attendanceDate = parseDate(req.params.date);
    const attendance = await Attendance.find({ date: attendanceDate, class: req.params.class });
    res.json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get attendance by date and class
router.get('/date/:date/class/:class', adminAuth, async (req, res) => {
  try {
    const attendanceDate = parseDate(req.params.date);
    const className = req.params.class;
    
    console.log(`Fetching attendance for date: ${attendanceDate}, class: ${className}`);
    
    const attendance = await Attendance.find({ 
      date: attendanceDate, 
      class: className 
    });
    
    console.log(`Found ${attendance.length} attendance records`);
    
    res.json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Error fetching attendance by date and class:', error);
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Mark single attendance
router.post('/', adminAuth, async (req, res) => {
  try {
    const { rollNumber, date, ...otherData } = req.body;
    if (!rollNumber || !date) {
      return res.status(400).json({ error: 'rollNumber and date fields are required.' });
    }
    const attendanceDate = parseDate(date);

    // Check for existing attendance record
    const existingRecord = await Attendance.findOne({ rollNumber, date: attendanceDate });
    if (existingRecord) {
      return res.status(400).json({ error: 'Attendance record already exists for this roll number on the specified date.' });
    }

    const attendance = new Attendance({ rollNumber, date: attendanceDate, ...otherData });
    await attendance.save();
    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ error: 'Server error.', details: error.message });
  }
});

// Update attendance
router.patch('/:id', adminAuth, async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance not found' });
    }
    if (req.body.status) attendance.status = req.body.status;
    await attendance.save();
    res.json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk mark attendance
router.post('/bulk', adminAuth, async (req, res) => {
  try {
    const { date, class: className, records } = req.body;
    
    // Debug log the incoming request
    console.log('Received bulk attendance request:', {
      date,
      className,
      recordsCount: records?.length,
      records: JSON.stringify(records).substring(0, 200) + '...' // Log a portion to avoid huge logs
    });

    if (!date || !className || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid data: date, class, and records array are required.',
        received: { date, className, recordsCount: records?.length }
      });
    }

    let attendanceDate;
    try {
      attendanceDate = parseDate(date);
      console.log('Parsed date:', attendanceDate);
    } catch (error) {
      console.error('Date parsing error:', error);
      return res.status(400).json({ 
        message: 'Invalid date format',
        error: error.message,
        receivedDate: date
      });
    }

    // Validate records format
    const invalidRecords = records.filter(record => !record.rollNumber || !record.name || !record.status);
    if (invalidRecords.length > 0) {
      console.error('Invalid records found:', invalidRecords);
      return res.status(400).json({
        message: 'Some records are missing required fields (rollNumber, name, status)',
        invalidRecords
      });
    }

    // Get unique roll numbers
    const rollNumbers = [...new Set(records.map(record => record.rollNumber))];
    console.log('Processing roll numbers:', rollNumbers);

    // Find all students by roll numbers
    console.log('Searching for students with roll numbers:', rollNumbers);
    try {
      const students = await Student.find({ rollNumber: { $in: rollNumbers } });
      console.log(`Found ${students.length} students out of ${rollNumbers.length} roll numbers`);
      
      if (students.length === 0) {
        console.error('No students found for the provided roll numbers');
        return res.status(400).json({
          message: 'No students found for the provided roll numbers',
          rollNumbers
        });
      }

      if (students.length !== rollNumbers.length) {
        const foundRollNumbers = students.map(s => s.rollNumber);
        const missingRollNumbers = rollNumbers.filter(r => !foundRollNumbers.includes(r));
        console.error('Missing students:', missingRollNumbers);
        return res.status(400).json({ 
          message: 'Some students not found',
          missingRollNumbers
        });
      }

      // Create a map of roll numbers to student names
      const studentMap = {};
      students.forEach(student => {
        studentMap[student.rollNumber] = student.name;
      });

      // Create bulk operations
      console.log('Creating bulk operations...');
      const operations = records.map(record => {
        const rollNum = record.rollNumber;
        const studentName = studentMap[rollNum];

        if (!studentName) {
          console.error(`Student name not found for roll number: ${rollNum}`);
          throw new Error(`Student name not found for roll number: ${rollNum}`);
        }

        // Find the corresponding student document
        const student = students.find(s => s.rollNumber === rollNum);
        
        if (!student) {
          console.error(`Student not found for roll number: ${rollNum}`);
          throw new Error(`Student not found for roll number: ${rollNum}`);
        }

        console.log(`Creating operation for student: ${rollNum}, date: ${attendanceDate}`);
        return {
          updateOne: {
            filter: { 
              studentId: rollNum, // Use rollNumber as studentId since that's what we're using in the schema
              date: attendanceDate 
            },
            update: { 
              $set: { 
                studentId: rollNum, // Use rollNumber as studentId
                studentName: studentName,
                rollNumber: rollNum,
                status: record.status,
                class: className,
                date: attendanceDate
              } 
            },
            upsert: true
          }
        };
      });

      console.log(`Executing ${operations.length} attendance operations`);
      try {
        // First check for existing records to avoid duplicates
        const existingRecords = [];
        for (const record of records) {
          const exists = await Attendance.findOne({
            studentId: record.rollNumber,
            date: attendanceDate
          });
          
          if (exists) {
            existingRecords.push({
              rollNumber: record.rollNumber,
              name: record.name,
              date: date
            });
          }
        }
        
        if (existingRecords.length > 0) {
          console.log('Found existing attendance records:', existingRecords);
          return res.status(400).json({
            message: 'Some attendance records already exist for the selected date',
            existingRecords
          });
        }
        
        // If no duplicates, proceed with bulk write
        const result = await Attendance.bulkWrite(operations, { ordered: false });
        console.log('Bulk write result:', result);
        
        res.json({ 
          message: 'Bulk attendance recorded successfully',
          result: {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            upsertedCount: result.upsertedCount
          }
        });
      } catch (bulkError) {
        console.error('Bulk write error:', bulkError);
        console.error('Error code:', bulkError.code);
        console.error('Error message:', bulkError.message);
        
        // Handle specific error cases
        if (bulkError.message.includes('duplicate key error')) {
          // Extract the date from the error message to provide better context
          let errorDate = 'the selected date';
          try {
            const dateMatch = bulkError.message.match(/date: new Date\((\d+)\)/);
            if (dateMatch && dateMatch[1]) {
              const timestamp = parseInt(dateMatch[1]);
              errorDate = new Date(timestamp).toISOString().split('T')[0];
            }
          } catch (e) {
            console.error('Error parsing date from error message:', e);
          }
          
          return res.status(400).json({
            message: `Attendance records already exist for ${errorDate}. Please update existing records instead of creating new ones.`,
            error: 'Duplicate attendance records detected'
          });
        }
        
        throw bulkError; // Re-throw to be caught by the outer catch block
      }
    } catch (studentError) {
      console.error('Error finding students:', studentError);
      return res.status(400).json({
        message: 'Error finding students',
        error: studentError.message
      });
    }
  } catch (error) {
    console.error('Error in bulk attendance:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Alternative bulk attendance endpoint
router.post('/bulk-alt', async (req, res) => {
  try {
    const validRecords = req.body.filter(record => record.student && record.date);
    if (validRecords.length === 0) {
      return res.status(400).json({ message: 'Invalid data: Missing student or date' });
    }
    await Attendance.insertMany(validRecords);
    res.status(200).json({ message: 'Attendance saved successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', details: error.message });
  }
});

// Attendance report
router.get('/report', adminAuth, async (req, res) => {
  try {
    const { className, startDate, endDate } = req.query;
    if (!className || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing parameters' });
    }
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    const attendance = await Attendance.find({
      class: className,
      date: { $gte: start, $lte: end }
    }).sort({ date: 1, rollNumber: 1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error.', details: error.message });
  }
});

module.exports = router;

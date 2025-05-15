const express = require('express');
const router = express.Router();
const Marks = require('../models/Marks');
const adminAuth = require('../middleware/adminAuth');

// Get marks by class and exam type
router.get('/:class/:examType', adminAuth, async (req, res) => {
  try {
    const marks = await Marks.find({
      class: req.params.class,
      examType: req.params.examType
    }).sort({ studentName: 1, subject: 1 });
    
    res.json(marks);
  } catch (error) {
    console.error('Error fetching marks:', error);
    res.status(500).json({ message: 'Failed to fetch marks records' });
  }
});

// Add single marks record
router.post('/', adminAuth, async (req, res) => {
  try {
    const { studentName, subject, marks, class: className, examType } = req.body;
    if (!studentName || !subject || marks == null || !className || !examType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newMarks = new Marks({ studentName, subject, marks, class: className, examType });
    await newMarks.save();

    res.status(201).json(newMarks);
  } catch (error) {
    console.error('Error adding marks:', error);
    res.status(400).json({ message: 'Failed to add marks' });
  }
});

// Update marks record
router.patch('/:id', adminAuth, async (req, res) => {
  try {
    const allowedUpdates = ['marks', 'subject', 'examType'];
    const updates = Object.keys(req.body).filter(key => allowedUpdates.includes(key));
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const updatedMarks = await Marks.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedMarks) {
      return res.status(404).json({ message: 'Marks record not found' });
    }

    res.json(updatedMarks);
  } catch (error) {
    console.error('Error updating marks:', error);
    res.status(400).json({ message: 'Failed to update marks record' });
  }
});

// Bulk add marks
router.post('/bulk', adminAuth, async (req, res) => {
  try {
    const { subject, class: className, examType, records } = req.body;

    if (!subject || !className || !examType || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    const marksRecords = records.map(record => ({
      studentName: record.name,
      subject,
      marks: record.marks,
      class: className,
      examType
    }));

    const result = await Marks.insertMany(marksRecords, { ordered: false });
    res.status(201).json({ message: 'Marks added successfully', result });
  } catch (error) {
    console.error('Error adding bulk marks:', error);
    res.status(400).json({ message: 'Failed to add bulk marks' });
  }
});

// Get marks report
router.get('/report', adminAuth, async (req, res) => {
  try {
    const { className, examType } = req.query;

    if (!className || !examType) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    const marks = await Marks.find({ class: className, examType }).sort({ subject: 1, studentName: 1 });
    res.json(marks);
  } catch (error) {
    console.error('Error generating marks report:', error);
    res.status(500).json({ message: 'Failed to generate marks report' });
  }
});

module.exports = router; 
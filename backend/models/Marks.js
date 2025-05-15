const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  marks: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  class: {
    type: String,
    required: true
  },
  examType: {
    type: String,
    required: true,
    enum: ['midterm', 'final', 'assignment', 'quiz']
  }
}, {
  timestamps: true
});

// Updated compound index to include all relevant fields that make a marks entry unique
marksSchema.index({ studentName: 1, subject: 1, class: 1, examType: 1 }, { 
  unique: true,
  name: 'unique_student_marks',
  // Add a custom error message for duplicate entries
  partialFilterExpression: { studentName: { $exists: true }, subject: { $exists: true }, class: { $exists: true }, examType: { $exists: true } }
});

const Marks = mongoose.model('Marks', marksSchema);
module.exports = Marks;

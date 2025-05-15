const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  rollNumber: {
    type: String,
    required: [true, 'Roll number is required'],
    unique: true,
    trim: true
  },
  class: {
    type: String,
    required: [true, 'Class is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  parentName: {
    type: String,
    trim: true
  },
  parentContact: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Create indexes for unique fields
studentSchema.index({ email: 1 }, { 
  unique: true,
  name: 'unique_email'
});

studentSchema.index({ rollNumber: 1 }, { 
  unique: true,
  name: 'unique_rollnumber'
});

const Student = mongoose.model('Student', studentSchema);
module.exports = Student;

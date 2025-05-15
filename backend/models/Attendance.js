const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: String,  // Using String to match the rollNumber
    required: true,
    trim: true
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  rollNumber: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true,
    default: 'present'
  },
  class: {
    type: String,
    required: true,
    enum: ['1', '2', '3', '4', '5']
  }
}, {
  timestamps: true
});

// Ensure studentId is never null
attendanceSchema.pre('save', function(next) {
  if (!this.studentId) {
    next(new Error('StudentId is required'));
  }
  next();
});

// Drop existing indexes to avoid conflicts
mongoose.connection.once('open', async () => {
  try {
    // Only run this in development to avoid production issues
    if (process.env.NODE_ENV !== 'production') {
      console.log('Checking and updating attendance indexes...');
      const collections = await mongoose.connection.db.listCollections().toArray();
      const attendanceCollection = collections.find(c => c.name === 'attendances');
      
      if (attendanceCollection) {
        const indexes = await mongoose.connection.db.collection('attendances').indexes();
        const hasOldIndex = indexes.some(idx => idx.name === 'student_1_date_1');
        
        if (hasOldIndex) {
          console.log('Dropping old index student_1_date_1...');
          await mongoose.connection.db.collection('attendances').dropIndex('student_1_date_1');
          console.log('Old index dropped successfully');
        }
      }
    }
  } catch (error) {
    console.error('Error managing indexes:', error);
  }
});

// Compound index to prevent duplicate attendance records
attendanceSchema.index(
  { studentId: 1, date: 1 },
  { 
    unique: true,
    name: 'unique_student_attendance',
    sparse: true,
    message: 'Attendance record already exists for this student on this date'
  }
);

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;

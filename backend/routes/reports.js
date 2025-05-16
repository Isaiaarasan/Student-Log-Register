const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const Student = require('../models/Student');
const adminAuth = require('../middleware/adminAuth');

router.get('/attendance', adminAuth, async (req, res) => {
  try {
    const { className, startDate, endDate } = req.query;

    // Add debug logging
    console.log('Received query params:', { className, startDate, endDate });

    if (!className || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide class name, start date, and end date',
        received: { className, startDate, endDate } // Add received values to error response
      });
    }

    // Convert and validate dates
    const convertDate = (dateStr) => {
      if (!dateStr || typeof dateStr !== 'string') {
        return null;
      }

      // Check if date is in DD-MM-YYYY format
      const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
      const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/;
      
      if (ddmmyyyy.test(dateStr)) {
        const [day, month, year] = dateStr.split('-');
        return `${year}-${month}-${day}`;
      } else if (yyyymmdd.test(dateStr)) {
        return dateStr;
      }
      return null;
    };

    const convertedStartDate = convertDate(startDate);
    const convertedEndDate = convertDate(endDate);

    if (!convertedStartDate || !convertedEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use either DD-MM-YYYY or YYYY-MM-DD format'
      });
    }

    const start = new Date(convertedStartDate + 'T00:00:00.000Z');
    const end = new Date(convertedEndDate + 'T23:59:59.999Z');
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid date values. Please check your dates'
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // First check if students exist in the class
    const studentsInClass = await Student.find({ class: className });
    if (!studentsInClass.length) {
      return res.status(404).json({
        success: false,
        message: `No students found in class ${className}`
      });
    }

    const attendance = await Attendance.find({
      class: className,
      date: {
        $gte: start,
        $lte: end
      }
    }).sort({ date: 1, studentName: 1 });

    // Format the dates and calculate statistics
    const formattedAttendance = attendance.map(record => ({
      studentName: record.studentName,
      date: record.date.toISOString().split('T')[0],
      status: record.status,
      class: record.class
    }));

    // Calculate attendance statistics
    const statistics = {
      totalStudents: studentsInClass.length,
      totalDays: 0,
      averageAttendance: 0
    };

    const uniqueDates = [...new Set(attendance.map(a => a.date.toISOString().split('T')[0]))];
    statistics.totalDays = uniqueDates.length;

    if (statistics.totalDays > 0) {
      const presentCount = attendance.filter(a => a.status === 'present').length;
      statistics.averageAttendance = Math.round((presentCount / (statistics.totalStudents * statistics.totalDays)) * 100);
    }

    res.json({
      success: true,
      data: {
        records: formattedAttendance,
        statistics
      }
    });
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate attendance report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/marks', adminAuth, async (req, res) => {
  try {
    const { className, examType } = req.query;
    console.log(`Fetching marks report for class ${className} and exam type ${examType}`);

    if (!className || !examType) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide both class name and exam type' 
      });
    }

    // First check if students exist in the class
    const studentsInClass = await Student.find({ class: className });
    console.log(`Found ${studentsInClass.length} students in class ${className}`);
    
    if (!studentsInClass.length) {
      return res.status(404).json({
        success: false,
        message: `No students found in class ${className}`
      });
    }

    const marks = await Marks.find({
      class: className,
      examType: examType
    }).sort({ subject: 1, studentName: 1 });
    
    console.log(`Found ${marks.length} marks records for class ${className} and exam type ${examType}`);

    // If no marks found, return empty data instead of 404
    if (!marks.length) {
      return res.json({
        success: true,
        data: {
          records: [],
          statistics: {},
          message: `No marks found for class ${className} and exam type ${examType}`
        }
      });
    }

    // Calculate statistics for each subject
    const subjectStats = {};
    marks.forEach(record => {
      if (!subjectStats[record.subject]) {
        subjectStats[record.subject] = {
          total: 0,
          count: 0,
          max: -Infinity,
          min: Infinity,
          passCount: 0,
          failCount: 0
        };
      }
      
      const stats = subjectStats[record.subject];
      stats.total += record.marks;
      stats.count++;
      stats.max = Math.max(stats.max, record.marks);
      stats.min = Math.min(stats.min, record.marks);
      
      // Assuming passing marks is 35%
      if (record.marks >= 45) {
        stats.passCount++;
      } else {
        stats.failCount++;
      }
    });

    // Calculate averages and pass percentages
    Object.keys(subjectStats).forEach(subject => {
      const stats = subjectStats[subject];
      stats.average = Math.round((stats.total / stats.count) * 100) / 100;
      stats.passPercentage = Math.round((stats.passCount / stats.count) * 100);
    });

    res.json({
      success: true,
      data: {
        records: marks,
        statistics: subjectStats
      }
    });
  } catch (error) {
    console.error('Marks report error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate marks report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get combined report
router.get('/combined', adminAuth, async (req, res) => {
  try {
    const { className, examType, startDate, endDate } = req.query;

    if (!className || !examType || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide class name, exam type, start date, and end date' 
      });
    }

    // Convert and validate dates
    const convertDate = (dateStr) => {
      const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/;
      const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/;
      
      if (ddmmyyyy.test(dateStr)) {
        const [day, month, year] = dateStr.split('-');
        return `${year}-${month}-${day}`;
      } else if (yyyymmdd.test(dateStr)) {
        return dateStr;
      }
      return null;
    };

    const convertedStartDate = convertDate(startDate);
    const convertedEndDate = convertDate(endDate);

    if (!convertedStartDate || !convertedEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use either DD-MM-YYYY or YYYY-MM-DD format'
      });
    }

    const start = new Date(convertedStartDate + 'T00:00:00.000Z');
    const end = new Date(convertedEndDate + 'T23:59:59.999Z');

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid date values. Please check your dates'
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // First check if students exist in the class
    const studentsInClass = await Student.find({ class: className });
    if (!studentsInClass.length) {
      return res.status(404).json({
        success: false,
        message: `No students found in class ${className}`
      });
    }

    // Get attendance data
    const attendance = await Attendance.find({
      class: className,
      date: {
        $gte: start,
        $lte: end
      }
    }).sort({ studentName: 1, date: 1 });

    // Get marks data
    const marks = await Marks.find({
      class: className,
      examType: examType
    }).sort({ studentName: 1, subject: 1 });

    if (!marks.length && !attendance.length) {
      return res.status(404).json({
        success: false,
        message: `No data found for class ${className}`
      });
    }

    // Process attendance data
    const attendanceByStudent = {};
    attendance.forEach(record => {
      if (!attendanceByStudent[record.studentName]) {
        attendanceByStudent[record.studentName] = {
          totalDays: 0,
          presentDays: 0
        };
      }
      
      attendanceByStudent[record.studentName].totalDays++;
      if (record.status === 'present') {
        attendanceByStudent[record.studentName].presentDays++;
      }
    });

    // Process marks data
    const marksByStudent = {};
    marks.forEach(record => {
      if (!marksByStudent[record.studentName]) {
        marksByStudent[record.studentName] = {
          subjects: {}
        };
      }
      marksByStudent[record.studentName].subjects[record.subject] = record.marks;
    });

    // Combine the data
    const uniqueStudentNames = new Set([
      ...Object.keys(attendanceByStudent),
      ...Object.keys(marksByStudent)
    ]);

    const combinedReport = Array.from(uniqueStudentNames).map(studentName => {
      const attendance = attendanceByStudent[studentName] || { totalDays: 0, presentDays: 0 };
      const marks = marksByStudent[studentName] || { subjects: {} };

      return {
        studentName,
        attendance: {
          totalDays: attendance.totalDays,
          presentDays: attendance.presentDays,
          attendancePercentage: attendance.totalDays 
            ? Math.round((attendance.presentDays / attendance.totalDays) * 100)
            : 0
        },
        marks: marks.subjects
      };
    });

    res.json({
      success: true,
      data: {
        records: combinedReport,
        summary: {
          totalStudents: studentsInClass.length,
          studentsWithData: uniqueStudentNames.size,
          dateRange: {
            start: startDate,
            end: endDate
          },
          examType
        }
      }
    });
  } catch (error) {
    console.error('Combined report error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate combined report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

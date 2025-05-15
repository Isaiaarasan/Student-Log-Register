import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { attendance, students } from '../services/api';

const Attendance = () => {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState('');
 
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [studentList, setStudentList] = useState([]);

  // Fetch students when class is selected
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) return;
      
      try {
        setLoading(true);
        setError('');
        const response = await students.getByClass(selectedClass);
        
        // Debug log the raw student data
        console.log('Raw student data:', response.data);
        
        // Map student data with attendance status
        const studentData = response.data.map(student => {
          // Ensure we have a valid student ID
          if (!student._id) {
            console.error('Student missing _id:', student);
            throw new Error('Student data is missing ID');
          }
          
          return {
            id: student._id,
            name: student.name,
            rollNumber: student.rollNumber,
            status: 'present' // Default status
          };
        });

        setStudentList(studentData);
        
        // Format date for API request
        const formattedDate = new Date(date).toISOString().split('T')[0];
        
        // Fetch existing attendance for the selected date and class
        const attendanceResponse = await attendance.getByDateAndClass(formattedDate, selectedClass);
        if (attendanceResponse.data && attendanceResponse.data.length > 0) {
          console.log('Existing attendance:', attendanceResponse.data);
          const updatedStudentData = studentData.map(student => {
            const existingAttendance = attendanceResponse.data.find(
              a => a.studentId === student.id
            );
            return {
              ...student,
              status: existingAttendance ? existingAttendance.status : 'present'
            };
          });
          setAttendanceData(updatedStudentData);
        } else {
          setAttendanceData(studentData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.message || 'Failed to fetch student data');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClass, date]);

  const toggleAttendance = (index) => {
    setAttendanceData(prev => {
      const newData = [...prev];
      newData[index] = {
        ...newData[index],
        status: newData[index].status === 'present' ? 'absent' : 'present'
      };
      return newData;
    });
  };

  const handleSaveAttendance = async () => {
    try {
      setLoading(true);
      setError('');

      if (!selectedClass || !date) {
        setError('Please select both class and date');
        return;
      }

      // Format date for API request
      const formattedDate = new Date(date).toISOString().split('T')[0];

      // Validate attendance data before sending
      if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
        throw new Error('No attendance data to save');
      }

      // Format attendance records
      const records = attendanceData.map(student => {
        // Validate student data
        if (!student.name || !student.rollNumber || !student.status) {
          console.error('Invalid student data:', student);
          throw new Error(`Invalid student data for ${student.name || 'unknown student'}`);
        }
        
        return {
          name: student.name,
          rollNumber: student.rollNumber,
          status: student.status
        };
      });

      // Debug log the request payload
      console.log('Sending attendance data:', {
        date: formattedDate,
        class: selectedClass,
        records: records
      });

      // Send attendance data
      const response = await attendance.bulkMark({
        date: formattedDate,
        class: selectedClass,
        records: records
      });

      if (response.data) {
        console.log('Attendance saved successfully:', response.data);
        alert('Attendance saved successfully!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save attendance';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Dashboard
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6 animate-fade-in" role="alert">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value);
                  if (!isNaN(selectedDate.getTime())) {
                    setDate(e.target.value);
                  }
                }}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
    <div>
              <label htmlFor="class" className="block text-sm font-medium text-gray-700">
                Class
              </label>
              <select
                id="class"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                required
              >
        <option value="">Select Class</option>
                {['1', '2', '3', '4', '5'].map((classNum) => (
                  <option key={`class-${classNum}`} value={classNum}>
                    Class {classNum}
                  </option>
                ))}
      </select>
            </div>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-8">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}

          {!loading && selectedClass && attendanceData.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">No students are registered for this class.</p>
            </div>
          )}

          {!loading && attendanceData.length > 0 && (
            <>
              <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Roll Number
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceData.map((student, index) => (
                      <tr key={`student-${student.id}-${student.rollNumber}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.rollNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => toggleAttendance(index)}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              student.status === 'present'
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            } transition-colors duration-200`}
                          >
                            <span className={`h-2 w-2 mr-2 rounded-full ${
                              student.status === 'present' ? 'bg-green-400' : 'bg-red-400'
                            }`}></span>
                            {student.status === 'present' ? 'Present' : 'Absent'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveAttendance}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Attendance'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
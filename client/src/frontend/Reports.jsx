import React, { useState } from 'react';
import { reports } from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports = () => {
  const [selectedClass, setSelectedClass] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [examType, setExamType] = useState('');
  const [reportType, setReportType] = useState('attendance');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError('');
      setReportData(null);

      if (!selectedClass) {
        setError('Please select a class');
        return;
      }

      if (reportType === 'attendance' && (!startDate || !endDate)) {
        setError('Please select both start and end dates for attendance report');
        return;
      }

      if (reportType === 'marks' && !examType) {
        setError('Please select an exam type for marks report');
        return;
      }

      console.log('Fetching report with params:', {
        reportType,
        selectedClass,
        startDate,
        endDate,
        examType
      });

      let response;
      if (reportType === 'attendance') {
        // Make sure we're passing the date strings directly
        response = await reports.getAttendanceReport(selectedClass, startDate, endDate);
      } else {
        response = await reports.getMarksReport(selectedClass, examType);
      }

      console.log('Report API response:', response);

      if (response.data && !response.data.success) {
        setError(response.data.message || 'Failed to fetch report data');
        return;
      }

      setReportData(response.data.data);
    } catch (error) {
      console.error('Error fetching report:', error);
      setError(error.message || 'Failed to fetch report data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!reportData) return;

    const csvRows = [];
    let headers, rows;

    if (reportType === 'attendance') {
      headers = ['Student Name', 'Date', 'Status', 'Class'];
      rows = reportData.records.map(record => [
        record.studentName,
        record.date,
        record.status.charAt(0).toUpperCase() + record.status.slice(1),
        record.class
      ]);

      csvRows.push([]);
      csvRows.push(['Statistics']);
      csvRows.push(['Total Students', reportData.statistics.totalStudents]);
      csvRows.push(['Total Days', reportData.statistics.totalDays]);
      csvRows.push(['Average Attendance', `${reportData.statistics.averageAttendance}%`]);
    } else {
      headers = ['Student Name', 'Subject', 'Marks', 'Class'];
      rows = reportData.records.map(record => [
        record.studentName,
        record.subject,
        record.marks,
        record.class
      ]);

      csvRows.push([]);
      csvRows.push(['Statistics']);
      csvRows.push(['Subject', 'Average', 'Maximum', 'Minimum', 'Pass %']);
      Object.entries(reportData.statistics).forEach(([subject, stats]) => {
        csvRows.push([
          subject,
          stats.average.toFixed(2),
          stats.max,
          stats.min,
          `${stats.passPercentage}%`
        ]);
      });
    }

    // Add headers and data rows
    csvRows.unshift(headers);
    rows.forEach(row => csvRows.push(row));

    const csvContent = csvRows.map(row => 
      row.map(cell => 
        typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell
      ).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${reportType}_report_${selectedClass}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadPDF = () => {
    if (!reportData || !reportData.records) {
      alert('No report data available to generate PDF.');
      return;
    }

    try {
      // Initialize PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Set document properties
      doc.setProperties({
        title: `${reportType} Report - Class ${selectedClass}`,
        subject: 'Student Report',
        creator: 'Log Register System'
      });

      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;

      // Add title
      doc.setFontSize(16);
      doc.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`, pageWidth / 2, margin, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`Class ${selectedClass}`, pageWidth / 2, margin + 8, { align: 'center' });

      // Add date range or exam type
      doc.setFontSize(12);
      if (reportType === 'attendance') {
        doc.text(`Period: ${startDate} to ${endDate}`, pageWidth / 2, margin + 16, { align: 'center' });
      } else if (reportType === 'marks') {
        doc.text(`Exam Type: ${examType}`, pageWidth / 2, margin + 16, { align: 'center' });
      }

      let yPos = margin + 25;

      if (reportType === 'attendance') {
        // Format attendance data
        const tableData = reportData.records.map(record => [
          record.studentName || '',
          record.date || '',
          (record.status || '').charAt(0).toUpperCase() + (record.status || '').slice(1),
          record.class || ''
        ]);

        // Add attendance table
        doc.autoTable({
          head: [['Student Name', 'Date', 'Status', 'Class']],
          body: tableData,
          startY: yPos,
          theme: 'grid',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [63, 81, 181] },
          margin: { left: margin, right: margin }
        });

        yPos = doc.lastAutoTable.finalY + 10;

        // Add statistics if available
        if (reportData.statistics) {
          doc.setFontSize(14);
          doc.text('Attendance Statistics', pageWidth / 2, yPos, { align: 'center' });

          const statsData = [
            ['Total Students', reportData.statistics.totalStudents?.toString() || '0'],
            ['Total Days', reportData.statistics.totalDays?.toString() || '0'],
            ['Average Attendance', `${reportData.statistics.averageAttendance || 0}%`]
          ];

          doc.autoTable({
            head: [['Metric', 'Value']],
            body: statsData,
            startY: yPos + 5,
            theme: 'grid',
            styles: { fontSize: 10 },
            headStyles: { fillColor: [63, 81, 181] },
            margin: { left: 40, right: 40 }
          });
        }
      } else if (reportType === 'marks') {
        // Format marks data
        const tableData = reportData.records.map(record => [
          record.studentName || '',
          record.subject || '',
          record.marks?.toString() || '0',
          record.class || ''
        ]);

        // Add marks table
        doc.autoTable({
          head: [['Student Name', 'Subject', 'Marks', 'Class']],
          body: tableData,
          startY: yPos,
          theme: 'grid',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [63, 81, 181] },
          margin: { left: margin, right: margin }
        });

        yPos = doc.lastAutoTable.finalY + 10;

        // Add statistics if available
        if (reportData.statistics) {
          doc.setFontSize(14);
          doc.text('Subject-wise Statistics', pageWidth / 2, yPos, { align: 'center' });

          const statsData = Object.entries(reportData.statistics).map(([subject, stats]) => [
            subject || '',
            (stats.average || 0).toFixed(2),
            stats.max?.toString() || '0',
            stats.min?.toString() || '0',
            `${stats.passPercentage || 0}%`
          ]);

          doc.autoTable({
            head: [['Subject', 'Average', 'Maximum', 'Minimum', 'Pass %']],
            body: statsData,
            startY: yPos + 5,
            theme: 'grid',
            styles: { fontSize: 10 },
            headStyles: { fillColor: [63, 81, 181] },
            margin: { left: margin, right: margin }
          });
        }
      }

      // Add footer
      doc.setFontSize(10);
      doc.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );

      // Save the PDF
      const fileName = `${reportType}_report_class${selectedClass}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check console for details.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow px-6 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Generate Reports</h1>

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  disabled={loading}
                >
                  <option value="attendance">Attendance Report</option>
                  <option value="marks">Marks Report</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  disabled={loading}
                >
                  <option value="">Select Class</option>
                  <option value="1">Class 1</option>
                  <option value="2">Class 2</option>
                  <option value="3">Class 3</option>
                  <option value="4">Class 4</option>
                  <option value="5">Class 5</option>
                </select>
              </div>

              {reportType === 'attendance' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      disabled={loading}
                      min={startDate}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Type
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    disabled={loading}
                  >
                    <option value="">Select Exam Type</option>
                    <option value="midterm">Midterm</option>
                    <option value="final">Final</option>
                    <option value="quiz">Quiz</option>
                    <option value="quiz">Assignment</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={fetchReportData}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>

              {reportData && (
                <>
                  <button
                    onClick={downloadCSV}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Download CSV
                  </button>
                  <button
                    onClick={downloadPDF}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Download PDF
                  </button>
                </>
              )}
            </div>
          </div>

          {reportData && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Report Preview</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {reportType === 'attendance' ? (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                        </>
                      ) : (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marks</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.records.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.studentName}</td>
                        {reportType === 'attendance' ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.date}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                record.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.subject}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.marks}</td>
                          </>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.class}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Statistics Section */}
              <div className="mt-8 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Statistics</h3>
                {reportType === 'attendance' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow">
                      <p className="text-sm text-gray-500">Total Students</p>
                      <p className="text-2xl font-bold">{reportData.statistics.totalStudents}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                      <p className="text-sm text-gray-500">Total Days</p>
                      <p className="text-2xl font-bold">{reportData.statistics.totalDays}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                      <p className="text-sm text-gray-500">Average Attendance</p>
                      <p className="text-2xl font-bold">{reportData.statistics.averageAttendance}%</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {Object.entries(reportData.statistics).map(([subject, stats]) => (
                      <div key={subject} className="bg-white p-4 rounded-lg shadow">
                        <h4 className="font-semibold mb-2">{subject}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Average</p>
                            <p className="text-xl font-bold">{stats.average.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Maximum</p>
                            <p className="text-xl font-bold">{stats.max}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Minimum</p>
                            <p className="text-xl font-bold">{stats.min}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Pass Percentage</p>
                            <p className="text-xl font-bold">{stats.passPercentage}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
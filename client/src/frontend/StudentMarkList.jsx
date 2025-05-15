import React, { useState, useEffect } from "react";
import axios from 'axios';

const StudentMarkList = () => {
  const [marks, setMarks] = useState([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      const response = await fetch('/api/students');
      const data = await response.json();

      // Added safeguard to ensure that data is an array
      const studentsData = Array.isArray(data) ? data : [];

      const studentList = studentsData.map(student => {
        return student;
      });
      setMarks(studentList);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-3">Student Marks</h2>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Name</th>
            <th className="border p-2">Subject</th>
            <th className="border p-2">Marks</th>
          </tr>
        </thead>
        <tbody>
          {marks.map((student) => (
            <tr key={student.id} className="text-center">
              <td className="border p-2">{student.name}</td>
              <td className="border p-2">{student.subject}</td>
              <td className="border p-2">{student.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StudentMarkList;

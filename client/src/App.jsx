import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './frontend/LandingPage';
import Login from './frontend/Login';
import Signup from './frontend/Signup';
import StudentRegistration from './frontend/StudentRegistration';
import Dashboard from './frontend/Dashboard';
import Marks from './frontend/Marks';
import Attendance from './frontend/Attendance';
import Reports from './frontend/Reports';


const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/student-register" element={<StudentRegistration />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/marks" element={<Marks />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Router>
  );
};

export default App;
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const get = async (url) => {
  const response = await axios.get(`${API_BASE_URL}${url}`, {
    withCredentials: true
  });
  return response.data;
};

export const getAttendanceReport = async (className, startDate, endDate) => {
  const formatDateString = (date) => {
    if (!date || !(date instanceof Date)) {
      throw new Error('Invalid date value');
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  try {
    const formattedStartDate = formatDateString(startDate);
    const formattedEndDate = formatDateString(endDate);
    return await get(`/reports/attendance?className=${className}&startDate=${formattedStartDate}&endDate=${formattedEndDate}`);
  } catch (error) {
    throw error;
  }
};

export const getMarksReport = async (className, examType) => {
  return await get(`/reports/marks?className=${className}&examType=${examType}`);
};

export const getCombinedReport = async (className, examType, startDate, endDate) => {
  const formatDateString = (date) => {
    if (!date || !(date instanceof Date)) {
      throw new Error('Invalid date value');
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  try {
    const formattedStartDate = formatDateString(startDate);
    const formattedEndDate = formatDateString(endDate);
    return await get(`/reports/combined?className=${className}&examType=${examType}&startDate=${formattedStartDate}&endDate=${formattedEndDate}`);
  } catch (error) {
    throw error;
  }
};

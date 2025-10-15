import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);
  const [faculty, setFaculty] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Dashboard state
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [editingMarks, setEditingMarks] = useState({});
  const [saveMessage, setSaveMessage] = useState('');

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedFaculty = localStorage.getItem('faculty');
    if (savedToken && savedFaculty) {
      setToken(savedToken);
      setFaculty(JSON.parse(savedFaculty));
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      setToken(data.token);
      setFaculty(data.faculty);
      setIsLoggedIn(true);
      localStorage.setItem('token', data.token);
      localStorage.setItem('faculty', JSON.stringify(data.faculty));
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken(null);
    setFaculty(null);
    setEmail('');
    setPassword('');
    setSelectedClass('');
    setSelectedSubject('');
    setStudents([]);
    localStorage.removeItem('token');
    localStorage.removeItem('faculty');
  };

  const fetchStudents = async (className, subject) => {
    if (!className || !subject) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/students?class_name=${encodeURIComponent(className)}&subject=${encodeURIComponent(subject)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }

      const data = await response.json();
      setStudents(data);
      
      // Initialize editing marks
      const initialMarks = {};
      data.forEach(item => {
        initialMarks[item.student.id] = {
          ct1: item.marks?.ct1 ?? '',
          insem: item.marks?.insem ?? '',
          ct2: item.marks?.ct2 ?? '',
        };
      });
      setEditingMarks(initialMarks);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (className) => {
    setSelectedClass(className);
    setSelectedSubject('');
    setStudents([]);
  };

  const handleSubjectChange = (subject) => {
    setSelectedSubject(subject);
    fetchStudents(selectedClass, subject);
  };

  const handleMarksChange = (studentId, field, value) => {
    setEditingMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  const calculateTotal = (marks) => {
    const ct1 = parseFloat(marks.ct1) || 0;
    const insem = parseFloat(marks.insem) || 0;
    const ct2 = parseFloat(marks.ct2) || 0;
    return ct1 + insem + ct2;
  };

  const handleSaveMarks = async (studentId) => {
    setSaveMessage('');
    const marks = editingMarks[studentId];
    
    try {
      const response = await fetch(`${API_URL}/api/marks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_id: studentId,
          class_name: selectedClass,
          subject: selectedSubject,
          ct1: marks.ct1 !== '' ? parseFloat(marks.ct1) : null,
          insem: marks.insem !== '' ? parseFloat(marks.insem) : null,
          ct2: marks.ct2 !== '' ? parseFloat(marks.ct2) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save marks');
      }

      setSaveMessage('Marks saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
      
      // Refresh the students list
      fetchStudents(selectedClass, selectedSubject);
    } catch (error) {
      setSaveMessage(`Error: ${error.message}`);
    }
  };

  // Get unique classes from faculty assignments
  const getClasses = () => {
    if (!faculty) return [];
    const classes = [...new Set(faculty.assignments.map(a => a.class_name))];
    return classes;
  };

  // Get subjects for selected class
  const getSubjectsForClass = (className) => {
    if (!faculty || !className) return [];
    return faculty.assignments
      .filter(a => a.class_name === className)
      .map(a => a.subject);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Grade Management</h1>
            <p className="text-gray-600 mt-2">Faculty Login Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="faculty@university.edu"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Enter your password"
                required
              />
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 font-semibold mb-2">Demo Credentials:</p>
            <p className="text-xs text-gray-600">rajesh@university.edu / password123</p>
            <p className="text-xs text-gray-600">priya@university.edu / password123</p>
            <p className="text-xs text-gray-600">amit@university.edu / password123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Grade Management System</h1>
              <p className="text-sm text-gray-600">Welcome, {faculty?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Faculty Info Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Assignments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {faculty?.assignments.map((assignment, index) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-800">{assignment.subject}</p>
                <p className="text-sm text-blue-600">{assignment.class_name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Class and Subject Selection */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Class & Subject</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Choose a class --</option>
                {getClasses().map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                disabled={!selectedClass}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Choose a subject --</option>
                {getSubjectsForClass(selectedClass).map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Students and Marks Table */}
        {selectedClass && selectedSubject && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Student Marks - {selectedSubject} ({selectedClass})
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  CT1: 30 marks | Insem: 30 marks | CT2: 70 marks | Total: 130 marks
                </p>
              </div>
              {saveMessage && (
                <div className={`px-4 py-2 rounded-lg ${saveMessage.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {saveMessage}
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-600">Loading students...</div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No students found for this class-subject combination.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="px-4 py-3 text-left rounded-tl-lg">Student ID</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-center">CT1 (30)</th>
                      <th className="px-4 py-3 text-center">Insem (30)</th>
                      <th className="px-4 py-3 text-center">CT2 (70)</th>
                      <th className="px-4 py-3 text-center">Total (130)</th>
                      <th className="px-4 py-3 text-center rounded-tr-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((item, index) => {
                      const marks = editingMarks[item.student.id] || {};
                      const total = calculateTotal(marks);
                      return (
                        <tr key={item.student.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="px-4 py-3 font-medium text-gray-800">{item.student.student_id}</td>
                          <td className="px-4 py-3 text-gray-700">{item.student.name}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max="30"
                              step="0.5"
                              value={marks.ct1}
                              onChange={(e) => handleMarksChange(item.student.id, 'ct1', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                              placeholder="-"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max="30"
                              step="0.5"
                              value={marks.insem}
                              onChange={(e) => handleMarksChange(item.student.id, 'insem', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                              placeholder="-"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max="70"
                              step="0.5"
                              value={marks.ct2}
                              onChange={(e) => handleMarksChange(item.student.id, 'ct2', e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                              placeholder="-"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                              {total > 0 ? total.toFixed(1) : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleSaveMarks(item.student.id)}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium text-sm"
                            >
                              Save
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!selectedClass && !selectedSubject && (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Select Class & Subject</h3>
            <p className="text-gray-600">Choose a class and subject from the dropdown above to view and manage student marks.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
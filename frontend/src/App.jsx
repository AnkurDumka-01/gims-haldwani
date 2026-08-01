import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import Professors from './pages/admin/Professors';
import Hods from './pages/admin/Hods';
import Students from './pages/admin/Students';
import AttendanceReview from './pages/admin/AttendanceReview';
import StudentAnnualReport from './pages/admin/StudentAnnualReport';
import AdminMonthlyReport from './pages/admin/MonthlyReport';
import IndividualStipendReport from './pages/admin/IndividualStipendReport';
import BatchStipendReport from './pages/admin/BatchStipendReport';
import MyStudents from './pages/professor/MyStudents';
import SubmitAttendance from './pages/professor/SubmitAttendance';
import MySubmissions from './pages/professor/MySubmissions';
import ProfessorStudentAnnualReport from './pages/professor/StudentAnnualReport';
import HodAttendanceReview from './pages/hod/AttendanceReview';
import HodMonthlyReport from './pages/hod/MonthlyReport';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/professors', label: 'Professors' },
  { to: '/admin/hods', label: 'HoDs' },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/attendance', label: 'Attendance' },
  { to: '/admin/monthly-report', label: 'Monthly Report' },
  { to: '/admin/salary/individual', label: 'Individual Stipend' },
  { to: '/admin/salary/batch', label: 'Batch Stipend' },
];

const professorLinks = [
  { to: '/professor', label: 'My Students', end: true },
  { to: '/professor/submit', label: 'Submit Attendance' },
  { to: '/professor/submissions', label: 'My Submissions' },
];

const hodLinks = [
  { to: '/hod', label: 'Attendance Review', end: true },
  { to: '/hod/monthly-report', label: 'Monthly Report' },
];

const HOME_BY_ROLE = { admin: '/admin', professor: '/professor', hod: '/hod' };

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={HOME_BY_ROLE[user.role] || '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/admin" element={
        <ProtectedRoute role="admin"><Layout links={adminLinks}><AdminDashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/professors" element={
        <ProtectedRoute role="admin"><Layout links={adminLinks}><Professors /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/hods" element={
        <ProtectedRoute role="admin"><Layout links={adminLinks}><Hods /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/students" element={
        <ProtectedRoute role="admin"><Layout links={adminLinks}><Students /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/attendance" element={
        <ProtectedRoute role="admin"><Layout links={adminLinks}><AttendanceReview /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/students/:id/report" element={
        <ProtectedRoute role="admin"><Layout links={adminLinks}><StudentAnnualReport /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/monthly-report" element={
        <ProtectedRoute role="admin"><Layout links={adminLinks}><AdminMonthlyReport /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/salary/individual" element={
        <ProtectedRoute role="admin"><Layout links={adminLinks}><IndividualStipendReport /></Layout></ProtectedRoute>
      } />
      <Route path="/admin/salary/batch" element={
        <ProtectedRoute role="admin"><Layout links={adminLinks}><BatchStipendReport /></Layout></ProtectedRoute>
      } />

      <Route path="/professor" element={
        <ProtectedRoute role="professor"><Layout links={professorLinks}><MyStudents /></Layout></ProtectedRoute>
      } />
      <Route path="/professor/submit" element={
        <ProtectedRoute role="professor"><Layout links={professorLinks}><SubmitAttendance /></Layout></ProtectedRoute>
      } />
      <Route path="/professor/submissions" element={
        <ProtectedRoute role="professor"><Layout links={professorLinks}><MySubmissions /></Layout></ProtectedRoute>
      } />
      <Route path="/professor/students/:id/report" element={
        <ProtectedRoute role="professor"><Layout links={professorLinks}><ProfessorStudentAnnualReport /></Layout></ProtectedRoute>
      } />

      <Route path="/hod" element={
        <ProtectedRoute role="hod"><Layout links={hodLinks}><HodAttendanceReview /></Layout></ProtectedRoute>
      } />
      <Route path="/hod/monthly-report" element={
        <ProtectedRoute role="hod"><Layout links={hodLinks}><HodMonthlyReport /></Layout></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={3000} />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

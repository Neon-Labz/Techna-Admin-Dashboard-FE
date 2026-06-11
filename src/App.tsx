import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import TeachersPage from './pages/TeachersPage';
import StudentsPage from './pages/StudentsPage';
import ModulesPage from './pages/ModulesPage';
import PaymentsPage from './pages/PaymentsPage';
import ExamsPage from './pages/ExamsPage';
import AttendancePage from './pages/AttendancePage';
import ProfilePage from './pages/ProfilePage';
import QRScanPage from './pages/QRScanPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><DashboardHome /></DashboardLayout></ProtectedRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="modules" element={<ModulesPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="qr-scan" element={<QRScanPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

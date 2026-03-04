import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MarkAttendance from './pages/MarkAttendance';
import CheshtaPage from './pages/Cheshta';
import LeavePage from './pages/Leave';

function Layout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mark"
            element={
              <ProtectedRoute>
                <Layout><MarkAttendance /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cheshta"
            element={
              <ProtectedRoute>
                <Layout><CheshtaPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave"
            element={
              <ProtectedRoute>
                <Layout><LeavePage /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

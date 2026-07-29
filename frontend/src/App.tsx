import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { StudentListPage } from './pages/StudentListPage'
import { StudentProfilePage } from './pages/StudentProfilePage'
import { GradeProgressPage } from './pages/GradeProgressPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/students" element={<StudentListPage />} />
            <Route path="/students/:studentId" element={<StudentProfilePage />} />
            <Route path="/grade-progress" element={<GradeProgressPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/students" replace />} />
          <Route path="*" element={<Navigate to="/students" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

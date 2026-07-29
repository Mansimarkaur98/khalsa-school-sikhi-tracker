import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { StudentListPage } from './pages/StudentListPage'
import { StudentProfilePage } from './pages/StudentProfilePage'
import { GradeProgressPage } from './pages/GradeProgressPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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

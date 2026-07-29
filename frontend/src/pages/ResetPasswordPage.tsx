import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { resetPassword } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import khalsaLogo from '../assets/khalsa-logo.jpeg'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('This reset link is missing its token.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const { access_token } = await resetPassword({ token, new_password: newPassword })
      loginWithToken(access_token)
      navigate('/students', { replace: true })
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        const detail = err.response.data.detail
        setError(Array.isArray(detail) ? detail[0]?.msg ?? 'Unable to reset password.' : String(detail))
      } else {
        setError('Unable to reset password. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 380 }}>
        <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Box
              component="img"
              src={khalsaLogo}
              alt="Khalsa School"
              sx={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }}
            />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Reset password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a new password for your account.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error">
              {error}
              {(error.includes('expired') || error.includes('Invalid')) && (
                <Box sx={{ mt: 1 }}>
                  <RouterLink to="/forgot-password">Request a new reset link</RouterLink>
                </Box>
              )}
            </Alert>
          )}

          <TextField
            label="New password"
            type="password"
            helperText="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoFocus
            required
            fullWidth
          />
          <TextField
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>
            {submitting ? 'Resetting…' : 'Reset password'}
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}

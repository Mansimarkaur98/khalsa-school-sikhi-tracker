import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { verifyEmail } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const ranOnce = useRef(false)

  useEffect(() => {
    if (ranOnce.current) return
    ranOnce.current = true

    if (!token) {
      setStatus('error')
      setError('This activation link is missing its token.')
      return
    }

    verifyEmail(token)
      .then(({ access_token }) => {
        loginWithToken(access_token)
        setStatus('success')
        setTimeout(() => navigate('/students', { replace: true }), 1500)
      })
      .catch((err) => {
        setStatus('error')
        if (isAxiosError(err) && err.response?.data?.detail) {
          setError(String(err.response.data.detail))
        } else {
          setError('Unable to verify this link. Please try again.')
        }
      })
  }, [token, loginWithToken, navigate])

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Stack spacing={2} sx={{ textAlign: 'center', maxWidth: 420 }}>
        {status === 'loading' && (
          <>
            <CircularProgress sx={{ alignSelf: 'center' }} />
            <Typography variant="body1" color="text.secondary">
              Activating your account…
            </Typography>
          </>
        )}
        {status === 'success' && (
          <>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Account activated
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Taking you to the student list…
            </Typography>
          </>
        )}
        {status === 'error' && (
          <>
            <Alert severity="error">{error}</Alert>
            <Button component={RouterLink} to="/login" variant="contained">
              Back to login
            </Button>
          </>
        )}
      </Stack>
    </Box>
  )
}

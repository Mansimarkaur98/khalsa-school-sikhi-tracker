import { useState, type FormEvent } from 'react'
import { Alert, Box, Button, Link as MuiLink, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { forgotPassword } from '../api/auth'
import khalsaLogo from '../assets/khalsa-logo.jpeg'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await forgotPassword({ email })
      setSubmitted(true)
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        setError('No account found for that email.')
      } else if (isAxiosError(err) && err.response?.status === 422) {
        setError('Invalid email address.')
      } else {
        setError('Unable to send reset link. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 380 }}>
        {submitted ? (
          <Stack spacing={2} sx={{ textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Check your email
            </Typography>
            <Typography variant="body1" color="text.secondary">
              If an account exists for <strong>{email}</strong>, a password reset link has been
              sent. It expires in 1 hour.
            </Typography>
            <Button component={RouterLink} to="/login" variant="contained" size="large" fullWidth>
              Back to login
            </Button>
          </Stack>
        ) : (
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
                Forgot password
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your email and we'll send you a reset link.
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => {
                e.target.setCustomValidity('')
                setEmail(e.target.value)
              }}
              onInvalid={(e) => {
                const target = e.target as HTMLInputElement
                if (target.validity.typeMismatch) {
                  target.setCustomValidity('Invalid email address')
                }
              }}
              autoFocus
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              <MuiLink component={RouterLink} to="/login">Back to login</MuiLink>
            </Typography>
          </Stack>
        )}
      </Box>
    </Box>
  )
}

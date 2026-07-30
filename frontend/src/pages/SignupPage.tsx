import { useState, type FormEvent } from 'react'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { signup } from '../api/auth'
import khalsaLogo from '../assets/khalsa-logo.jpeg'
import gurdwaraHall from '../assets/gurdwara-hall.jpg'

const SCHOOL_OPTIONS = ['Khalsa School Newton', 'Khalsa School Old Yale Road', 'Khalsa School Fraser Valley']

export function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [school, setSchool] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { email: confirmedEmail } = await signup({
        first_name: firstName,
        last_name: lastName,
        school,
        email,
        password,
      })
      setSubmittedEmail(confirmedEmail)
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError('An account with this email already exists.')
      } else if (isAxiosError(err) && err.response?.data?.detail) {
        const detail = err.response.data.detail
        const msg = Array.isArray(detail) ? detail[0]?.msg ?? 'Unable to sign up.' : String(detail)
        setError(msg.replace(/^Value error,\s*/, ''))
      } else {
        setError('Unable to sign up. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          position: 'relative',
          overflow: 'hidden',
          p: 6,
          backgroundImage: `url(${gurdwaraHall})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: '#fff',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(160deg, rgba(7,42,102,0.92) 0%, rgba(11,61,145,0.88) 55%, rgba(58,99,172,0.85) 100%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.15,
            backgroundImage:
              'radial-gradient(circle at 15% 20%, #fff 0, transparent 40%), radial-gradient(circle at 85% 75%, #fff 0, transparent 45%), radial-gradient(circle at 50% 50%, #C9A227 0, transparent 55%)',
          }}
        />
        <Box
          component="img"
          src={khalsaLogo}
          alt="Khalsa School"
          sx={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            objectFit: 'cover',
            bgcolor: '#fff',
            p: 1.5,
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
            position: 'relative',
            zIndex: 1,
          }}
        />
        <Stack spacing={1} sx={{ textAlign: 'center', position: 'relative', zIndex: 1, maxWidth: 420 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
            Sikhi Progress Tracker
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.85 }}>
            <i>Track every milestone in a student's Sikhi journey</i>
          </Typography>
        </Stack>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.6,
            backgroundImage:
              'radial-gradient(circle at 88% 8%, rgba(11,61,145,0.10) 0, transparent 38%), radial-gradient(circle at 8% 92%, rgba(201,162,39,0.14) 0, transparent 42%)',
          }}
        />

        <Paper
          sx={{
            width: '100%',
            maxWidth: 520,
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            position: 'relative',
            zIndex: 1,
            boxShadow: '0 12px 40px rgba(11,61,145,0.10), 0 2px 8px rgba(20,20,20,0.05)',
          }}
        >
          {submittedEmail ? (
            <Stack spacing={2} sx={{ textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Check your email
              </Typography>
              <Typography variant="body1" color="text.secondary">
                We've sent an activation link to <strong>{submittedEmail}</strong>. Click it to
                activate your account, then come back and log in.
              </Typography>
              <Button component={RouterLink} to="/login" variant="contained" size="large" fullWidth>
                Back to login
              </Button>
            </Stack>
          ) : (
            <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
              <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 1 }}>
                <Box
                  component="img"
                  src={khalsaLogo}
                  alt="Khalsa School"
                  sx={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }}
                />
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1.5 }}>
                  Khalsa School
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Create an account
                </Typography>
                <Box
                  sx={{
                    width: 48,
                    height: 3,
                    borderRadius: 999,
                    mx: 'auto',
                    mt: 1.5,
                    backgroundImage: 'linear-gradient(90deg, #0B3D91 0%, #C9A227 100%)',
                  }}
                />
              </Box>

              {error && <Alert severity="error">{error}</Alert>}

              <Stack direction="row" spacing={2}>
                <TextField
                  label="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                  required
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlineIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  label="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlineIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Stack>
              <TextField
                select
                label="School"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                required
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SchoolOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              >
                {SCHOOL_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Email"
                type="email"
                helperText="Enter your khalsa school email address"
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
                required
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                helperText="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                          size="small"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>
                {submitting ? 'Creating account…' : 'Create account'}
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Already have an account? <MuiLink component={RouterLink} to="/login">Log in</MuiLink>
              </Typography>
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  )
}

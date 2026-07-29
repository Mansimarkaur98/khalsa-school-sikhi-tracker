import LogoutIcon from '@mui/icons-material/Logout'
import PeopleIcon from '@mui/icons-material/People'
import InsightsIcon from '@mui/icons-material/Insights'
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import khalsaLogo from '../assets/khalsa-logo.jpeg'

export function Layout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="static"
        color="primary"
        elevation={0}
        sx={{ boxShadow: '0 2px 12px rgba(7,42,102,0.25)' }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <Box
            component={Link}
            to="/students"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <Box
              component="img"
              src={khalsaLogo}
              alt="Khalsa School"
              sx={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', bgcolor: '#fff', p: 0.25, flexShrink: 0 }}
            />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Sikhi Progress Tracker
            </Typography>
          </Box>
          <Button
            component={NavLink}
            to="/students"
            color="inherit"
            startIcon={<PeopleIcon />}
            sx={{ '&.active': { fontWeight: 700, textDecoration: 'underline', textDecorationColor: 'secondary.main', textUnderlineOffset: '6px' } }}
          >
            Students
          </Button>
          <Button
            component={NavLink}
            to="/grade-progress"
            color="inherit"
            startIcon={<InsightsIcon />}
            sx={{ '&.active': { fontWeight: 700, textDecoration: 'underline', textDecorationColor: 'secondary.main', textUnderlineOffset: '6px' } }}
          >
            Grade Progress
          </Button>
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  )
}

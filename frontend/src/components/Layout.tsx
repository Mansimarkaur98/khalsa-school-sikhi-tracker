import { useState } from 'react'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import LogoutIcon from '@mui/icons-material/Logout'
import PeopleIcon from '@mui/icons-material/People'
import InsightsIcon from '@mui/icons-material/Insights'
import { AppBar, Box, Button, Container, Menu, MenuItem, Toolbar, Typography } from '@mui/material'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import khalsaLogo from '../assets/khalsa-logo.jpeg'

export function Layout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [studentsMenuAnchor, setStudentsMenuAnchor] = useState<HTMLElement | null>(null)
  const isArchivedView = new URLSearchParams(location.search).get('view') === 'archived'

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
        <Toolbar sx={{ gap: 2.5 }}>
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
            color="inherit"
            startIcon={<PeopleIcon />}
            endIcon={<KeyboardArrowDownIcon />}
            onClick={(e) => setStudentsMenuAnchor(e.currentTarget)}
            sx={
              location.pathname.startsWith('/students')
                ? { fontWeight: 700, textDecoration: 'underline', textDecorationColor: 'secondary.main', textUnderlineOffset: '6px' }
                : undefined
            }
          >
            Students
          </Button>
          <Menu
            anchorEl={studentsMenuAnchor}
            open={Boolean(studentsMenuAnchor)}
            onClose={() => setStudentsMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem
              component={Link}
              to="/students"
              selected={!isArchivedView}
              onClick={() => setStudentsMenuAnchor(null)}
            >
              <PeopleIcon fontSize="small" sx={{ mr: 1.5 }} />
              Active Students
            </MenuItem>
            <MenuItem
              component={Link}
              to="/students?view=archived"
              selected={isArchivedView}
              onClick={() => setStudentsMenuAnchor(null)}
            >
              <ArchiveOutlinedIcon fontSize="small" sx={{ mr: 1.5 }} />
              Archived Students
            </MenuItem>
          </Menu>
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

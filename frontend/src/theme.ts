import { createTheme } from '@mui/material/styles'

// Sikhi blue/gold palette, derived from the school's logo colors.
export const theme = createTheme({
  palette: {
    primary: {
      main: '#0B3D91',
      light: '#3A63AC',
      dark: '#072a66',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#C9A227',
      light: '#DABE5F',
      dark: '#96791C',
      contrastText: '#1a1a1a',
    },
    background: {
      default: '#F2EEE3',
      paper: '#ffffff',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: [
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: '1px solid #E7E1D2',
          boxShadow: '0 1px 3px rgba(20,20,20,0.06), 0 1px 2px rgba(20,20,20,0.04)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          backgroundImage: 'linear-gradient(120deg, #072a66 0%, #0B3D91 60%, #3A63AC 100%)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          transition: 'box-shadow 0.2s ease, transform 0.15s ease',
        },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            backgroundImage: 'linear-gradient(135deg, #0B3D91 0%, #1a56b8 100%)',
            boxShadow: '0 2px 8px rgba(11,61,145,0.28)',
            '&:hover': {
              backgroundImage: 'linear-gradient(135deg, #0d47a3 0%, #1f60c9 100%)',
              boxShadow: '0 4px 14px rgba(11,61,145,0.38)',
              transform: 'translateY(-1px)',
            },
          },
        },
        {
          props: { variant: 'contained', color: 'secondary' },
          style: {
            backgroundImage: 'linear-gradient(135deg, #C9A227 0%, #ddb43c 100%)',
            boxShadow: '0 2px 8px rgba(201,162,39,0.32)',
            '&:hover': {
              backgroundImage: 'linear-gradient(135deg, #b8931f 0%, #ddb43c 100%)',
              boxShadow: '0 4px 14px rgba(201,162,39,0.42)',
              transform: 'translateY(-1px)',
            },
          },
        },
      ],
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
})

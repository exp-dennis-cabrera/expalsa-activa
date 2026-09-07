import { createTheme } from '@mui/material/styles';

// Paleta inspirada en la interfaz real de Atlas CMMS (indigo/purpura + sidebar navy),
// sin usar su marca, logo ni textos ("Powered by Intelloop", etc).
export const theme = createTheme({
  palette: {
    primary: {
      main: '#5b6df8',
      dark: '#4451d6',
      light: '#8891fa',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0f1b3d',
    },
    background: {
      default: '#f4f5f9',
      paper: '#ffffff',
    },
    success: { main: '#2fa86f' },
    warning: { main: '#f2a93b' },
    error: { main: '#e2554e' },
    info: { main: '#2f9bd6' },
    text: {
      primary: '#1c2333',
      secondary: '#6b7590',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, fontSize: 35 },
    h2: { fontWeight: 700, fontSize: 30 },
    h3: { fontWeight: 700, fontSize: 25, lineHeight: 1.4 },
    h4: { fontWeight: 700, fontSize: 16 },
    h5: { fontWeight: 700, fontSize: 14 },
    h6: { fontWeight: 600, fontSize: 15 },
    body1: { fontSize: 14 },
    body2: { fontSize: 14 },
    button: { textTransform: 'none', fontWeight: 600 },
    // El tema real pone las leyendas en MAYUSCULAS, pero alli esa variante
    // se usa solo para etiquetas cortas. Nosotros usamos "caption" para
    // fechas, notas y textos secundarios que deben leerse normal -- los
    // pocos lugares que si necesitan mayusculas lo declaran ellos mismos.
    caption: { fontSize: 13 },
    subtitle1: { fontSize: 14 },
    subtitle2: { fontWeight: 400, fontSize: 15 },
    overline: { fontSize: 13, fontWeight: 700, textTransform: 'uppercase' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingLeft: 18,
          paddingRight: 18,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: 12,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          color: '#6b7590',
          backgroundColor: '#f8f9fc',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    // Blur de fondo cuando se abre un Drawer/Dialog/Menu -- aplica globalmente
    // porque todos usan el componente Backdrop de MUI por debajo. Mismo patron
    // que usa Atlas CMMS (MuiBackdrop.styleOverrides en su tema).
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(15, 22, 61, 0.2)',
          backdropFilter: 'blur(2px)',
          '&.MuiBackdrop-invisible': {
            backgroundColor: 'transparent',
            backdropFilter: 'blur(2px)',
          },
        },
      },
    },
    // El bug de la etiqueta cortada a la mitad resultó estar en el mecanismo
    // "outlined" de MUI (el borde con hueco para la etiqueta) -- tras varios
    // intentos de arreglar ese mecanismo sin éxito, lo evitamos por completo
    // usando la variante "filled" (fondo de color, sin borde con hueco).
    MuiTextField: {
      defaultProps: {
        variant: 'filled',
        InputLabelProps: {
          shrink: true,
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#f2f4f9',
          border: '1px solid #dde2ea',
          '&:before, &:after': {
            display: 'none',
          },
          '&:hover': {
            backgroundColor: '#eef1f7',
          },
          '&.Mui-focused': {
            backgroundColor: '#eef1f7',
            borderColor: '#5b6df8',
          },
        },
      },
    },
  },
});

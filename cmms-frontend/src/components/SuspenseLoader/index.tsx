import { Box, CircularProgress } from '@mui/material';

/**
 * Copia de SuspenseLoader de Atlas CMMS (commit 44069b69).
 *
 * Unica diferencia: el original arranca y detiene una barra de progreso de
 * NProgress. Esa libreria no esta instalada aca, asi que se omite -- el
 * indicador circular es identico.
 */
function SuspenseLoader() {
  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
      }}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <CircularProgress size={64} disableShrink thickness={3} />
    </Box>
  );
}

export default SuspenseLoader;

import { createAction } from '@reduxjs/toolkit';

/**
 * Copia de utils/redux.ts de Atlas CMMS.
 *
 * Cada slice escucha esta accion para volver a su estado inicial. Se
 * dispara al cerrar sesion: sin esto, los datos del usuario anterior
 * quedarian en memoria y los veria quien entre despues.
 */
export const revertAll = createAction('REVERT_ALL');

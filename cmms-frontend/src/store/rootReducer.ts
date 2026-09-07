import { combineReducers } from '@reduxjs/toolkit';
import { reducer as workOrderReducer } from '../slices/workOrder';
import { reducer as assetReducer } from '../slices/asset';
import { reducer as locationReducer } from '../slices/location';
import { reducer as meterReducer } from '../slices/meter';
import { reducer as requestReducer } from '../slices/request';
import { reducer as preventiveMaintenanceReducer } from '../slices/preventiveMaintenance';
import { reducer as categoryReducer } from '../slices/category';
import { reducer as userReducer } from '../slices/user';
import { reducer as teamReducer } from '../slices/team';
import { reducer as roleReducer } from '../slices/role';
import { reducer as notificationReducer } from '../slices/notification';

/**
 * Copia de store/rootReducer.ts de Atlas CMMS (commit 44069b69), con los
 * mismos nombres de clave que usa el original. El suyo combina 43 slices;
 * aca estan los 11 dominios que existen en esta app.
 */
const rootReducer = combineReducers({
  workOrders: workOrderReducer,
  assets: assetReducer,
  locations: locationReducer,
  meters: meterReducer,
  requests: requestReducer,
  preventiveMaintenances: preventiveMaintenanceReducer,
  categories: categoryReducer,
  users: userReducer,
  teams: teamReducer,
  roles: roleReducer,
  notifications: notificationReducer
});

export default rootReducer;

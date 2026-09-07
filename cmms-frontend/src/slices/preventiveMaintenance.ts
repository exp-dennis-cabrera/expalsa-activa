import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { api } from '../api/client';
import { cancellableFetch } from '../api/cancellableRequest';
import { getInitialPage, type Page } from '../models/page';
import { revertAll } from '../utils/redux';
import type { AppThunk } from '../store';
import type { PreventiveMaintenance } from '../types';

/** Mismo patron que slices/preventiveMaintenance.ts de Atlas CMMS. */
const basePath = '/preventive-maintenances';

interface PreventiveMaintenanceState {
  preventiveMaintenances: Page<PreventiveMaintenance>;
  singlePreventiveMaintenance: PreventiveMaintenance | null;
  loadingGet: boolean;
}

const initialState: PreventiveMaintenanceState = {
  preventiveMaintenances: getInitialPage<PreventiveMaintenance>(),
  singlePreventiveMaintenance: null,
  loadingGet: false
};

const slice = createSlice({
  name: 'preventiveMaintenances',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getPreventiveMaintenances(
      state: PreventiveMaintenanceState,
      action: PayloadAction<{ preventiveMaintenances: Page<PreventiveMaintenance> }>
    ) {
      state.preventiveMaintenances = action.payload.preventiveMaintenances;
    },
    getSinglePreventiveMaintenance(
      state: PreventiveMaintenanceState,
      action: PayloadAction<{ preventiveMaintenance: PreventiveMaintenance }>
    ) {
      state.singlePreventiveMaintenance = action.payload.preventiveMaintenance;
    },
    editPreventiveMaintenance(
      state: PreventiveMaintenanceState,
      action: PayloadAction<{ preventiveMaintenance: PreventiveMaintenance }>
    ) {
      const { preventiveMaintenance } = action.payload;
      state.preventiveMaintenances.content = state.preventiveMaintenances.content.map((item) =>
        item.id === preventiveMaintenance.id ? preventiveMaintenance : item
      );
    },
    deletePreventiveMaintenance(
      state: PreventiveMaintenanceState,
      action: PayloadAction<{ id: number }>
    ) {
      state.preventiveMaintenances.content = state.preventiveMaintenances.content.filter(
        (item) => item.id !== action.payload.id
      );
    },
    setLoadingGet(
      state: PreventiveMaintenanceState,
      action: PayloadAction<{ loading: boolean }>
    ) {
      state.loadingGet = action.payload.loading;
    }
  }
});

export const reducer = slice.reducer;

export const getPreventiveMaintenances =
  (query = ''): AppThunk =>
  async (dispatch) => {
    await cancellableFetch(
      'getPreventiveMaintenances',
      (signal) => api.get<PreventiveMaintenance[]>(`${basePath}${query ? '?' + query : ''}`, signal),
      (lista) =>
        dispatch(
          slice.actions.getPreventiveMaintenances({
            preventiveMaintenances: {
              ...getInitialPage<PreventiveMaintenance>(),
              content: lista,
              totalElements: lista.length,
              empty: lista.length === 0
            }
          })
        ),
      (loading) => dispatch(slice.actions.setLoadingGet({ loading }))
    );
  };

export const getSinglePreventiveMaintenance =
  (id: number): AppThunk =>
  async (dispatch) => {
    const preventiveMaintenance = await api.get<PreventiveMaintenance>(`${basePath}/${id}`);
    dispatch(slice.actions.getSinglePreventiveMaintenance({ preventiveMaintenance }));
  };

export const deletePreventiveMaintenance =
  (id: number): AppThunk =>
  async (dispatch) => {
    await api.delete<void>(`${basePath}/${id}`);
    dispatch(slice.actions.deletePreventiveMaintenance({ id }));
  };

export default slice;

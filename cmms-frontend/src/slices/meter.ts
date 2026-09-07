import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { api } from '../api/client';
import { cancellableFetch } from '../api/cancellableRequest';
import { getInitialPage, type Page } from '../models/page';
import { revertAll } from '../utils/redux';
import type { AppThunk } from '../store';
import type { MeterEntry } from '../types';

/** Mismo patron que slices/meter.ts de Atlas CMMS (commit 44069b69). */
const basePath = '/meters';

interface MeterState {
  meters: Page<MeterEntry>;
  metersByAsset: { [key: number]: MeterEntry[] };
  singleMeter: MeterEntry | null;
  loadingGet: boolean;
}

const initialState: MeterState = {
  meters: getInitialPage<MeterEntry>(),
  metersByAsset: {},
  singleMeter: null,
  loadingGet: false
};

const slice = createSlice({
  name: 'meters',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getMeters(state: MeterState, action: PayloadAction<{ meters: Page<MeterEntry> }>) {
      state.meters = action.payload.meters;
    },
    getMetersByAsset(state: MeterState, action: PayloadAction<{ id: number; meters: MeterEntry[] }>) {
      const { id, meters } = action.payload;
      state.metersByAsset[id] = meters;
    },
    getSingleMeter(state: MeterState, action: PayloadAction<{ meter: MeterEntry }>) {
      state.singleMeter = action.payload.meter;
    },
    editMeter(state: MeterState, action: PayloadAction<{ meter: MeterEntry }>) {
      const { meter } = action.payload;
      state.meters.content = state.meters.content.map((item) =>
        item.id === meter.id ? meter : item
      );
      if (state.singleMeter?.id === meter.id) state.singleMeter = meter;
    },
    deleteMeter(state: MeterState, action: PayloadAction<{ id: number }>) {
      state.meters.content = state.meters.content.filter((item) => item.id !== action.payload.id);
    },
    setLoadingGet(state: MeterState, action: PayloadAction<{ loading: boolean }>) {
      state.loadingGet = action.payload.loading;
    }
  }
});

export const reducer = slice.reducer;

/**
 * Aca si se usa POST /search, como el original: nuestro backend expone la
 * busqueda de medidores por POST con filtros y paginacion.
 */
export const getMeters =
  (criteria: unknown): AppThunk =>
  async (dispatch) => {
    await cancellableFetch(
      'getMeters',
      (signal) => api.post<Page<MeterEntry>>(`${basePath}/search`, criteria, signal),
      (meters) => dispatch(slice.actions.getMeters({ meters })),
      (loading) => dispatch(slice.actions.setLoadingGet({ loading }))
    );
  };

export const getMetersByAsset =
  (id: number): AppThunk =>
  async (dispatch) => {
    const meters = await api.get<MeterEntry[]>(`${basePath}/asset/${id}`);
    dispatch(slice.actions.getMetersByAsset({ id, meters }));
  };

export const getSingleMeter =
  (id: number): AppThunk =>
  async (dispatch) => {
    const meter = await api.get<MeterEntry>(`${basePath}/${id}`);
    dispatch(slice.actions.getSingleMeter({ meter }));
  };

export const deleteMeter =
  (id: number): AppThunk =>
  async (dispatch) => {
    await api.delete<void>(`${basePath}/${id}`);
    dispatch(slice.actions.deleteMeter({ id }));
  };

export default slice;

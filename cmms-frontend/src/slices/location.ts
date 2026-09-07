import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { api } from '../api/client';
import { cancellableFetch } from '../api/cancellableRequest';
import { getInitialPage, type Page } from '../models/page';
import { revertAll } from '../utils/redux';
import type { AppThunk } from '../store';
import type { LocationResponse, LocationSummary } from '../types';

/** Mismo patron que slices/location.ts de Atlas CMMS (commit 44069b69). */
const basePath = '/locations';

interface LocationState {
  locations: Page<LocationResponse>;
  locationsMini: LocationSummary[];
  locationsHierarchy: LocationResponse[];
  childrenPages: { [key: number]: Page<LocationResponse> };
  singleLocation: LocationResponse | null;
  loadingGet: boolean;
  loadingHierarchy: boolean;
}

const initialState: LocationState = {
  locations: getInitialPage<LocationResponse>(),
  locationsMini: [],
  locationsHierarchy: [],
  childrenPages: {},
  singleLocation: null,
  loadingGet: false,
  loadingHierarchy: false
};

const slice = createSlice({
  name: 'locations',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getLocations(state: LocationState, action: PayloadAction<{ locations: Page<LocationResponse> }>) {
      state.locations = action.payload.locations;
    },
    getLocationsMini(state: LocationState, action: PayloadAction<{ locations: LocationSummary[] }>) {
      state.locationsMini = action.payload.locations;
    },
    getSingleLocation(state: LocationState, action: PayloadAction<{ location: LocationResponse }>) {
      state.singleLocation = action.payload.location;
    },
    editLocation(state: LocationState, action: PayloadAction<{ location: LocationResponse }>) {
      const { location } = action.payload;
      state.locations.content = state.locations.content.map((item) =>
        item.id === location.id ? location : item
      );
      if (state.singleLocation?.id === location.id) state.singleLocation = location;
    },
    deleteLocation(state: LocationState, action: PayloadAction<{ id: number }>) {
      state.locations.content = state.locations.content.filter((item) => item.id !== action.payload.id);
    },
    /** Mismo reductor de acumulacion que en activos. */
    getLocationChildrenPaginated(
      state: LocationState,
      action: PayloadAction<{ locations: Page<LocationResponse>; id: number }>
    ) {
      const { locations, id } = action.payload;
      const parent = state.locationsHierarchy.findIndex((l) => l.id === id);
      if (parent !== -1) (state.locationsHierarchy[parent] as any).childrenFetched = true;

      state.locationsHierarchy = locations.content.reduce((acc, location) => {
        const inState = state.locationsHierarchy.findIndex((l) => l.id === location.id);
        if (inState === -1) return [...acc, location];
        acc[inState] = location;
        return acc;
      }, state.locationsHierarchy);

      state.childrenPages[id] = locations;
    },
    resetLocationsHierarchy(state: LocationState) {
      state.locationsHierarchy = [];
      state.childrenPages = {};
    },
    setLoadingGet(state: LocationState, action: PayloadAction<{ loading: boolean }>) {
      state.loadingGet = action.payload.loading;
    },
    setLoadingHierarchy(state: LocationState, action: PayloadAction<{ loading: boolean }>) {
      state.loadingHierarchy = action.payload.loading;
    }
  }
});

export const reducer = slice.reducer;

export const getLocations =
  (query = ''): AppThunk =>
  async (dispatch) => {
    await cancellableFetch(
      'getLocations',
      (signal) => api.get<Page<LocationResponse>>(`${basePath}?${query}`, signal),
      (locations) => dispatch(slice.actions.getLocations({ locations })),
      (loading) => dispatch(slice.actions.setLoadingGet({ loading }))
    );
  };

/** Catalogo para los selectores. Se cachea en la fase 4. */
export const getLocationsMini = (): AppThunk => async (dispatch) => {
  const locations = await api.get<LocationSummary[]>(basePath);
  dispatch(slice.actions.getLocationsMini({ locations }));
};

export const getSingleLocation =
  (id: number): AppThunk =>
  async (dispatch) => {
    const location = await api.get<LocationResponse>(`${basePath}/${id}`);
    dispatch(slice.actions.getSingleLocation({ location }));
  };

export const deleteLocation =
  (id: number): AppThunk =>
  async (dispatch) => {
    await api.delete<void>(`${basePath}/${id}`);
    dispatch(slice.actions.deleteLocation({ id }));
  };

export const getLocationChildren =
  (id: number, page = 0, size = 20): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.setLoadingHierarchy({ loading: true }));
    try {
      const locations = await api.get<Page<LocationResponse>>(
        `${basePath}/children/${id}/paginated?page=${page}&size=${size}`
      );
      dispatch(slice.actions.getLocationChildrenPaginated({ id, locations }));
    } finally {
      dispatch(slice.actions.setLoadingHierarchy({ loading: false }));
    }
  };

export const resetLocationsHierarchy = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.resetLocationsHierarchy());
};

export default slice;

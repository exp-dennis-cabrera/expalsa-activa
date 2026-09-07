import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { api } from '../api/client';
import { cancellableFetch } from '../api/cancellableRequest';
import { getInitialPage, type Page } from '../models/page';
import { revertAll } from '../utils/redux';
import type { AppThunk } from '../store';
import type { RequestItem } from '../types';

/** Mismo patron que slices/request.ts de Atlas CMMS (commit 44069b69). */
const basePath = '/requests';

interface RequestState {
  requests: Page<RequestItem>;
  singleRequest: RequestItem | null;
  pendingCount: number;
  loadingGet: boolean;
}

const initialState: RequestState = {
  requests: getInitialPage<RequestItem>(),
  singleRequest: null,
  pendingCount: 0,
  loadingGet: false
};

const slice = createSlice({
  name: 'requests',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getRequests(state: RequestState, action: PayloadAction<{ requests: Page<RequestItem> }>) {
      state.requests = action.payload.requests;
    },
    getSingleRequest(state: RequestState, action: PayloadAction<{ request: RequestItem }>) {
      state.singleRequest = action.payload.request;
    },
    editRequest(state: RequestState, action: PayloadAction<{ request: RequestItem }>) {
      const { request } = action.payload;
      state.requests.content = state.requests.content.map((item) =>
        item.id === request.id ? request : item
      );
      if (state.singleRequest?.id === request.id) state.singleRequest = request;
    },
    deleteRequest(state: RequestState, action: PayloadAction<{ id: number }>) {
      state.requests.content = state.requests.content.filter((item) => item.id !== action.payload.id);
    },
    getPendingCount(state: RequestState, action: PayloadAction<{ count: number }>) {
      state.pendingCount = action.payload.count;
    },
    setLoadingGet(state: RequestState, action: PayloadAction<{ loading: boolean }>) {
      state.loadingGet = action.payload.loading;
    }
  }
});

export const reducer = slice.reducer;

export const getRequests =
  (query = ''): AppThunk =>
  async (dispatch) => {
    await cancellableFetch(
      'getRequests',
      // El backend devuelve una lista simple, no Page: se envuelve para
      // mantener la misma forma de estado que el original.
      (signal) => api.get<RequestItem[]>(`${basePath}${query ? '?' + query : ''}`, signal),
      (lista) =>
        dispatch(
          slice.actions.getRequests({
            requests: { ...getInitialPage<RequestItem>(), content: lista, totalElements: lista.length, empty: lista.length === 0 }
          })
        ),
      (loading) => dispatch(slice.actions.setLoadingGet({ loading }))
    );
  };

export const getSingleRequest =
  (id: number): AppThunk =>
  async (dispatch) => {
    const request = await api.get<RequestItem>(`${basePath}/${id}`);
    dispatch(slice.actions.getSingleRequest({ request }));
  };

export const deleteRequest =
  (id: number): AppThunk =>
  async (dispatch) => {
    await api.delete<void>(`${basePath}/${id}`);
    dispatch(slice.actions.deleteRequest({ id }));
  };

export default slice;

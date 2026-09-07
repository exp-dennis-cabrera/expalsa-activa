import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { api } from '../api/client';
import { revertAll } from '../utils/redux';
import type { AppThunk } from '../store';
import type { RoleResponse } from '../api/roles';

/** Mismo patron que slices/role.ts de Atlas CMMS. */
const basePath = '/roles';

interface RoleState {
  roles: RoleResponse[];
  loadingGet: boolean;
}

const initialState: RoleState = {
  roles: [],
  loadingGet: false
};

const slice = createSlice({
  name: 'roles',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getRoles(state: RoleState, action: PayloadAction<{ roles: RoleResponse[] }>) {
      state.roles = action.payload.roles;
    },
    editRole(state: RoleState, action: PayloadAction<{ role: RoleResponse }>) {
      const { role } = action.payload;
      state.roles = state.roles.map((item) => (item.id === role.id ? role : item));
    },
    setLoadingGet(state: RoleState, action: PayloadAction<{ loading: boolean }>) {
      state.loadingGet = action.payload.loading;
    }
  }
});

export const reducer = slice.reducer;

export const getRoles = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.setLoadingGet({ loading: true }));
  try {
    const roles = await api.get<RoleResponse[]>(basePath);
    dispatch(slice.actions.getRoles({ roles }));
  } finally {
    dispatch(slice.actions.setLoadingGet({ loading: false }));
  }
};

export default slice;

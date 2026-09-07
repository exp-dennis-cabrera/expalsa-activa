import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { api } from '../api/client';
import { cancellableFetch } from '../api/cancellableRequest';
import { getInitialPage, type Page } from '../models/page';
import { revertAll } from '../utils/redux';
import type { AppThunk } from '../store';
import type { UserMini } from '../api/users';
import type { MyProfile } from '../api/me';

/** Mismo patron que slices/user.ts de Atlas CMMS (commit 44069b69). */
const basePath = '/users';

interface UserState {
  users: Page<MyProfile>;
  singleUser: MyProfile | null;
  usersMini: UserMini[];
  disabledUsersMini: UserMini[];
  loadingGet: boolean;
}

const initialState: UserState = {
  users: getInitialPage<MyProfile>(),
  singleUser: null,
  usersMini: [],
  disabledUsersMini: [],
  loadingGet: false
};

const slice = createSlice({
  name: 'users',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getUsers(state: UserState, action: PayloadAction<{ users: Page<MyProfile> }>) {
      state.users = action.payload.users;
    },
    getUsersMini(state: UserState, action: PayloadAction<{ users: UserMini[] }>) {
      state.usersMini = action.payload.users;
    },
    getDisabledUsersMini(state: UserState, action: PayloadAction<{ users: UserMini[] }>) {
      state.disabledUsersMini = action.payload.users;
    },
    getSingleUser(state: UserState, action: PayloadAction<{ user: MyProfile }>) {
      state.singleUser = action.payload.user;
    },
    editUser(state: UserState, action: PayloadAction<{ user: MyProfile }>) {
      const { user } = action.payload;
      state.users.content = state.users.content.map((item) => (item.id === user.id ? user : item));
      if (state.singleUser?.id === user.id) state.singleUser = user;
    },
    setLoadingGet(state: UserState, action: PayloadAction<{ loading: boolean }>) {
      state.loadingGet = action.payload.loading;
    }
  }
});

export const reducer = slice.reducer;

export const getUsers =
  (criteria: unknown): AppThunk =>
  async (dispatch) => {
    await cancellableFetch(
      'getUsers',
      (signal) => api.post<Page<MyProfile>>(`${basePath}/search`, criteria, signal),
      (users) => dispatch(slice.actions.getUsers({ users })),
      (loading) => dispatch(slice.actions.setLoadingGet({ loading }))
    );
  };

/** Catalogo para los selectores. Se cachea en la fase 4. */
export const getUsersMini = (): AppThunk => async (dispatch) => {
  const users = await api.get<UserMini[]>(`${basePath}/mini`);
  dispatch(slice.actions.getUsersMini({ users }));
};

export const getDisabledUsersMini = (): AppThunk => async (dispatch) => {
  const users = await api.get<UserMini[]>(`${basePath}/mini/disabled`);
  dispatch(slice.actions.getDisabledUsersMini({ users }));
};

export const getSingleUser =
  (id: number): AppThunk =>
  async (dispatch) => {
    const user = await api.get<MyProfile>(`${basePath}/${id}`);
    dispatch(slice.actions.getSingleUser({ user }));
  };

export default slice;

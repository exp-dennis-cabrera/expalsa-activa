import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { api } from '../api/client';
import { cancellableFetch } from '../api/cancellableRequest';
import { getInitialPage, type Page } from '../models/page';
import { revertAll } from '../utils/redux';
import type { AppThunk } from '../store';
import type { TeamResponse } from '../types';
import type { TeamMiniResponse as TeamMini } from '../api/teams';

/** Mismo patron que slices/team.ts de Atlas CMMS. */
const basePath = '/teams';

interface TeamState {
  teams: Page<TeamResponse>;
  singleTeam: TeamResponse | null;
  teamsMini: TeamMini[];
  loadingGet: boolean;
}

const initialState: TeamState = {
  teams: getInitialPage<TeamResponse>(),
  singleTeam: null,
  teamsMini: [],
  loadingGet: false
};

const slice = createSlice({
  name: 'teams',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getTeams(state: TeamState, action: PayloadAction<{ teams: Page<TeamResponse> }>) {
      state.teams = action.payload.teams;
    },
    getTeamsMini(state: TeamState, action: PayloadAction<{ teams: TeamMini[] }>) {
      state.teamsMini = action.payload.teams;
    },
    getSingleTeam(state: TeamState, action: PayloadAction<{ team: TeamResponse }>) {
      state.singleTeam = action.payload.team;
    },
    editTeam(state: TeamState, action: PayloadAction<{ team: TeamResponse }>) {
      const { team } = action.payload;
      state.teams.content = state.teams.content.map((item) => (item.id === team.id ? team : item));
    },
    deleteTeam(state: TeamState, action: PayloadAction<{ id: number }>) {
      state.teams.content = state.teams.content.filter((item) => item.id !== action.payload.id);
    },
    setLoadingGet(state: TeamState, action: PayloadAction<{ loading: boolean }>) {
      state.loadingGet = action.payload.loading;
    }
  }
});

export const reducer = slice.reducer;

export const getTeams =
  (criteria: unknown): AppThunk =>
  async (dispatch) => {
    await cancellableFetch(
      'getTeams',
      (signal) => api.post<Page<TeamResponse>>(`${basePath}/search`, criteria, signal),
      (teams) => dispatch(slice.actions.getTeams({ teams })),
      (loading) => dispatch(slice.actions.setLoadingGet({ loading }))
    );
  };

export const getTeamsMini = (): AppThunk => async (dispatch) => {
  const teams = await api.get<TeamMini[]>(`${basePath}/mini`);
  dispatch(slice.actions.getTeamsMini({ teams }));
};

export const deleteTeam =
  (id: number): AppThunk =>
  async (dispatch) => {
    await api.delete<void>(`${basePath}/${id}`);
    dispatch(slice.actions.deleteTeam({ id }));
  };

export default slice;

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { api } from '../api/client';
import { getInitialPage, type Page } from '../models/page';
import { revertAll } from '../utils/redux';
import type { AppThunk } from '../store';
import type { AppNotification } from '../types';

/**
 * Copia del patron de slices/notification.ts de Atlas CMMS.
 *
 * Guarda currentPageNum y lastPage porque la campanita carga las
 * notificaciones de a poco, al desplazarse.
 */
const basePath = '/notifications';

interface NotificationState {
  notifications: Page<AppNotification>;
  currentPageNum: number;
  lastPage: boolean;
  loadingGet: boolean;
}

const initialState: NotificationState = {
  notifications: getInitialPage<AppNotification>(),
  currentPageNum: 0,
  lastPage: true,
  loadingGet: false
};

const slice = createSlice({
  name: 'notifications',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getNotifications(
      state: NotificationState,
      action: PayloadAction<{ notifications: Page<AppNotification> }>
    ) {
      const { notifications } = action.payload;
      state.notifications = notifications;
      state.currentPageNum = notifications.number;
      state.lastPage = notifications.last;
    },
    /** Al desplazarse: se AGREGAN a las que ya estan, no las reemplazan. */
    getMoreNotifications(
      state: NotificationState,
      action: PayloadAction<{ notifications: Page<AppNotification> }>
    ) {
      const { notifications } = action.payload;
      state.notifications.content = [...state.notifications.content, ...notifications.content];
      state.currentPageNum = notifications.number;
      state.lastPage = notifications.last;
    },
    /** Llega una nueva por WebSocket: se pone al inicio. */
    addNotification(
      state: NotificationState,
      action: PayloadAction<{ notification: AppNotification }>
    ) {
      state.notifications.content = [action.payload.notification, ...state.notifications.content];
    },
    editNotification(
      state: NotificationState,
      action: PayloadAction<{ notification: AppNotification }>
    ) {
      const { notification } = action.payload;
      state.notifications.content = state.notifications.content.map((item) =>
        item.id === notification.id ? notification : item
      );
    },
    setLoadingGet(state: NotificationState, action: PayloadAction<{ loading: boolean }>) {
      state.loadingGet = action.payload.loading;
    }
  }
});

export const reducer = slice.reducer;

export const getNotifications =
  (page = 0, size = 25): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.setLoadingGet({ loading: true }));
    try {
      const notifications = await api.get<Page<AppNotification>>(
        `${basePath}?page=${page}&size=${size}`
      );
      dispatch(
        page === 0
          ? slice.actions.getNotifications({ notifications })
          : slice.actions.getMoreNotifications({ notifications })
      );
    } finally {
      dispatch(slice.actions.setLoadingGet({ loading: false }));
    }
  };

export const editNotification =
  (id: number, notification: unknown): AppThunk =>
  async (dispatch) => {
    const updated = await api.patch<AppNotification>(`${basePath}/${id}`, notification);
    dispatch(slice.actions.editNotification({ notification: updated }));
  };

/** Se usa desde el WebSocket cuando llega una nueva. */
export const addNotification =
  (notification: AppNotification): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.addNotification({ notification }));
  };

export default slice;

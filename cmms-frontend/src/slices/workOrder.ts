import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { api } from '../api/client';
import { cancellableFetch } from '../api/cancellableRequest';
import { getInitialPage, type Page } from '../models/page';
import { revertAll } from '../utils/redux';
import type { AppThunk } from '../store';
import type { WorkOrder } from '../types';
import type { SearchCriteria } from '../models/searchCriteria';

/**
 * Copia del patron de slices/workOrder.ts de Atlas CMMS (commit 44069b69).
 *
 * Se mantiene su estructura: interfaz de estado, initialState, createSlice
 * con extraReducers escuchando revertAll, reducers sincronos, y thunks que
 * usan cancellableFetch. Es la plantilla para los demas dominios.
 */
const basePath = '/work-orders';

interface WorkOrderState {
  workOrders: Page<WorkOrder>;
  workOrdersByLocation: { [key: number]: WorkOrder[] };
  workOrdersByAsset: { [key: number]: WorkOrder[] };
  singleWorkOrder: WorkOrder | null;
  urgentCount: number;
  loadingGet: boolean;
}

const initialState: WorkOrderState = {
  workOrders: getInitialPage<WorkOrder>(),
  workOrdersByLocation: {},
  workOrdersByAsset: {},
  singleWorkOrder: null,
  urgentCount: 0,
  loadingGet: false
};

const slice = createSlice({
  name: 'workOrders',
  initialState,
  // Al cerrar sesion se vuelve al estado inicial: si no, los datos del
  // usuario anterior quedarian visibles para el siguiente.
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getWorkOrders(
      state: WorkOrderState,
      action: PayloadAction<{ workOrders: Page<WorkOrder> }>
    ) {
      state.workOrders = action.payload.workOrders;
    },
    getSingleWorkOrder(
      state: WorkOrderState,
      action: PayloadAction<{ workOrder: WorkOrder }>
    ) {
      state.singleWorkOrder = action.payload.workOrder;
    },
    getWorkOrdersByLocation(
      state: WorkOrderState,
      action: PayloadAction<{ id: number; workOrders: WorkOrder[] }>
    ) {
      const { id, workOrders } = action.payload;
      state.workOrdersByLocation[id] = workOrders;
    },
    getWorkOrdersByAsset(
      state: WorkOrderState,
      action: PayloadAction<{ id: number; workOrders: WorkOrder[] }>
    ) {
      const { id, workOrders } = action.payload;
      state.workOrdersByAsset[id] = workOrders;
    },
    addWorkOrder(
      state: WorkOrderState,
      action: PayloadAction<{ workOrder: WorkOrder }>
    ) {
      const { workOrder } = action.payload;
      state.workOrders.content = [...state.workOrders.content, workOrder];
    },
    editWorkOrder(
      state: WorkOrderState,
      action: PayloadAction<{ workOrder: WorkOrder }>
    ) {
      const { workOrder } = action.payload;
      state.workOrders.content = state.workOrders.content.map((item) =>
        item.id === workOrder.id ? workOrder : item
      );
      if (state.singleWorkOrder?.id === workOrder.id) {
        state.singleWorkOrder = workOrder;
      }
    },
    deleteWorkOrder(
      state: WorkOrderState,
      action: PayloadAction<{ id: number }>
    ) {
      const { id } = action.payload;
      state.workOrders.content = state.workOrders.content.filter(
        (item) => item.id !== id
      );
    },
    getUrgentCount(
      state: WorkOrderState,
      action: PayloadAction<{ count: number }>
    ) {
      state.urgentCount = action.payload.count;
    },
    setLoadingGet(
      state: WorkOrderState,
      action: PayloadAction<{ loading: boolean }>
    ) {
      state.loadingGet = action.payload.loading;
    },
    clearSingleWorkOrder(state: WorkOrderState) {
      state.singleWorkOrder = null;
    }
  }
});

export const reducer = slice.reducer;

/**
 * Listado paginado. Usa cancellableFetch con la clave 'getWorkOrders': si
 * llega otra busqueda antes de que esta responda, la anterior se cancela y
 * su resultado tardio no pisa el nuevo.
 */
/**
 * Copia fiel de getWorkOrders real: POST /search con SearchCriteria.
 */
export const getWorkOrders =
  (criteria: SearchCriteria): AppThunk =>
  async (dispatch) => {
    await cancellableFetch(
      'getWorkOrders',
      (signal) => api.post<Page<WorkOrder>>(`${basePath}/search`, criteria, signal),
      (workOrders) => dispatch(slice.actions.getWorkOrders({ workOrders })),
      (loading) => dispatch(slice.actions.setLoadingGet({ loading }))
    );
  };

export const getSingleWorkOrder =
  (id: number): AppThunk =>
  async (dispatch) => {
    const workOrder = await api.get<WorkOrder>(`${basePath}/${id}`);
    dispatch(slice.actions.getSingleWorkOrder({ workOrder }));
  };

export const getWorkOrdersByLocation =
  (id: number): AppThunk =>
  async (dispatch) => {
    const workOrders = await api.get<WorkOrder[]>(`${basePath}/location/${id}`);
    dispatch(slice.actions.getWorkOrdersByLocation({ id, workOrders }));
  };

export const getWorkOrdersByAsset =
  (id: number): AppThunk =>
  async (dispatch) => {
    const workOrders = await api.get<WorkOrder[]>(`${basePath}/asset/${id}`);
    dispatch(slice.actions.getWorkOrdersByAsset({ id, workOrders }));
  };

export const addWorkOrder =
  (workOrder: unknown): AppThunk =>
  async (dispatch) => {
    const created = await api.post<WorkOrder>(basePath, workOrder);
    dispatch(slice.actions.addWorkOrder({ workOrder: created }));
    return created.id;
  };

export const editWorkOrder =
  (id: number, workOrder: unknown): AppThunk =>
  async (dispatch) => {
    const updated = await api.patch<WorkOrder>(`${basePath}/${id}`, workOrder);
    dispatch(slice.actions.editWorkOrder({ workOrder: updated }));
  };

export const deleteWorkOrder =
  (id: number): AppThunk =>
  async (dispatch) => {
    await api.delete<void>(`${basePath}/${id}`);
    dispatch(slice.actions.deleteWorkOrder({ id }));
  };

export const getUrgentCount = (): AppThunk => async (dispatch) => {
  const { count } = await api.get<{ count: number }>(`${basePath}/urgent`);
  dispatch(slice.actions.getUrgentCount({ count }));
};

export const clearSingleWorkOrder = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.clearSingleWorkOrder());
};

export default slice;

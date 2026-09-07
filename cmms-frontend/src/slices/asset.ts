import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { api } from '../api/client';
import { cancellableFetch } from '../api/cancellableRequest';
import { getInitialPage, type Page } from '../models/page';
import { revertAll } from '../utils/redux';
import type { AppThunk } from '../store';
import type { AssetResponse } from '../types';

/** Mismo patron que slices/asset.ts de Atlas CMMS (commit 44069b69). */
const basePath = '/assets';

interface AssetState {
  assets: Page<AssetResponse>;
  assetsMini: AssetResponse[];
  assetsByLocation: { [key: number]: AssetResponse[] };
  /** Arbol acumulado: se van sumando niveles al expandir. */
  assetsHierarchy: AssetResponse[];
  /** Pagina de hijos por padre, para saber si quedan mas por cargar. */
  childrenPages: { [key: number]: Page<AssetResponse> };
  singleAsset: AssetResponse | null;
  loadingGet: boolean;
  loadingHierarchy: boolean;
}

const initialState: AssetState = {
  assets: getInitialPage<AssetResponse>(),
  assetsMini: [],
  assetsByLocation: {},
  assetsHierarchy: [],
  childrenPages: {},
  singleAsset: null,
  loadingGet: false,
  loadingHierarchy: false
};

const slice = createSlice({
  name: 'assets',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getAssets(state: AssetState, action: PayloadAction<{ assets: Page<AssetResponse> }>) {
      state.assets = action.payload.assets;
    },
    getAssetsMini(state: AssetState, action: PayloadAction<{ assets: AssetResponse[] }>) {
      state.assetsMini = action.payload.assets;
    },
    getSingleAsset(state: AssetState, action: PayloadAction<{ asset: AssetResponse }>) {
      state.singleAsset = action.payload.asset;
    },
    addAsset(state: AssetState, action: PayloadAction<{ asset: AssetResponse }>) {
      state.assets.content = [...state.assets.content, action.payload.asset];
    },
    editAsset(state: AssetState, action: PayloadAction<{ asset: AssetResponse }>) {
      const { asset } = action.payload;
      state.assets.content = state.assets.content.map((item) =>
        item.id === asset.id ? asset : item
      );
      if (state.singleAsset?.id === asset.id) state.singleAsset = asset;
    },
    deleteAsset(state: AssetState, action: PayloadAction<{ id: number }>) {
      state.assets.content = state.assets.content.filter((item) => item.id !== action.payload.id);
    },
    /**
     * Copia fiel de getAssetChildrenPaginated real: marca el padre como ya
     * expandido y fusiona los hijos en el arbol, reemplazando los que ya
     * estaban en vez de duplicarlos.
     */
    getAssetChildrenPaginated(
      state: AssetState,
      action: PayloadAction<{ assets: Page<AssetResponse>; id: number }>
    ) {
      const { assets, id } = action.payload;
      const parent = state.assetsHierarchy.findIndex((asset) => asset.id === id);
      if (parent !== -1) (state.assetsHierarchy[parent] as any).childrenFetched = true;

      state.assetsHierarchy = assets.content.reduce((acc, asset) => {
        const assetInState = state.assetsHierarchy.findIndex((asset1) => asset1.id === asset.id);
        if (assetInState === -1) return [...acc, asset];
        acc[assetInState] = asset;
        return acc;
      }, state.assetsHierarchy);

      state.childrenPages[id] = assets;
    },
    resetAssetsHierarchy(state: AssetState) {
      state.assetsHierarchy = [];
      state.childrenPages = {};
    },
    setLoadingGet(state: AssetState, action: PayloadAction<{ loading: boolean }>) {
      state.loadingGet = action.payload.loading;
    },
    setLoadingHierarchy(state: AssetState, action: PayloadAction<{ loading: boolean }>) {
      state.loadingHierarchy = action.payload.loading;
    }
  }
});

export const reducer = slice.reducer;

export const getAssets =
  (query: string): AppThunk =>
  async (dispatch) => {
    await cancellableFetch(
      'getAssets',
      (signal) => api.get<Page<AssetResponse>>(`${basePath}?${query}`, signal),
      (assets) => dispatch(slice.actions.getAssets({ assets })),
      (loading) => dispatch(slice.actions.setLoadingGet({ loading }))
    );
  };

export const getSingleAsset =
  (id: number): AppThunk =>
  async (dispatch) => {
    const asset = await api.get<AssetResponse>(`${basePath}/${id}`);
    dispatch(slice.actions.getSingleAsset({ asset }));
  };

export const deleteAsset =
  (id: number): AppThunk =>
  async (dispatch) => {
    await api.delete<void>(`${basePath}/${id}`);
    dispatch(slice.actions.deleteAsset({ id }));
  };

/**
 * Copia fiel de getAssetChildren real: carga los hijos de un nodo al
 * expandirlo, paginados. id = 0 es la raiz.
 */
export const getAssetChildren =
  (id: number, page = 0, size = 20): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.setLoadingHierarchy({ loading: true }));
    try {
      const assets = await api.get<Page<AssetResponse>>(
        `${basePath}/children/${id}/paginated?page=${page}&size=${size}`
      );
      dispatch(slice.actions.getAssetChildrenPaginated({ id, assets }));
    } finally {
      dispatch(slice.actions.setLoadingHierarchy({ loading: false }));
    }
  };

export const resetAssetsHierarchy = (): AppThunk => async (dispatch) => {
  dispatch(slice.actions.resetAssetsHierarchy());
};

export default slice;

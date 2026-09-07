import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { api } from '../api/client';
import { revertAll } from '../utils/redux';
import type { AppThunk } from '../store';
import type { CategorySummary } from '../types';

/**
 * Copia del patron de slices/category.ts de Atlas CMMS.
 *
 * Las categorias se guardan en un MAPA indexado por tipo (WORK_ORDER,
 * METER, ASSET...), no en una lista plana: cada modulo tiene las suyas y
 * se cachean por separado.
 */
interface CategoryState {
  categories: { [basePath: string]: CategorySummary[] };
  loading: { [basePath: string]: boolean };
}

const initialState: CategoryState = {
  categories: {},
  loading: {}
};

const slice = createSlice({
  name: 'categories',
  initialState,
  extraReducers: (builder) => builder.addCase(revertAll, () => initialState),
  reducers: {
    getCategories(
      state: CategoryState,
      action: PayloadAction<{ categories: CategorySummary[]; basePath: string }>
    ) {
      const { categories, basePath } = action.payload;
      state.categories[basePath] = categories;
    },
    addCategory(
      state: CategoryState,
      action: PayloadAction<{ category: CategorySummary; basePath: string }>
    ) {
      const { category, basePath } = action.payload;
      state.categories[basePath] = [...(state.categories[basePath] ?? []), category];
    },
    deleteCategory(
      state: CategoryState,
      action: PayloadAction<{ id: number; basePath: string }>
    ) {
      const { id, basePath } = action.payload;
      state.categories[basePath] = (state.categories[basePath] ?? []).filter((c) => c.id !== id);
    },
    setLoading(
      state: CategoryState,
      action: PayloadAction<{ loading: boolean; basePath: string }>
    ) {
      const { loading, basePath } = action.payload;
      state.loading[basePath] = loading;
    }
  }
});

export const reducer = slice.reducer;

/** basePath es el tipo de categoria: WORK_ORDER, METER, ASSET... */
export const getCategories =
  (basePath: string): AppThunk =>
  async (dispatch) => {
    dispatch(slice.actions.setLoading({ loading: true, basePath }));
    try {
      const categories = await api.get<CategorySummary[]>(`/categories?type=${basePath}`);
      dispatch(slice.actions.getCategories({ categories, basePath }));
    } finally {
      dispatch(slice.actions.setLoading({ loading: false, basePath }));
    }
  };

export default slice;

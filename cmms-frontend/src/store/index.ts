import type { TypedUseSelectorHook } from 'react-redux';
import {
  useDispatch as useReduxDispatch,
  useSelector as useReduxSelector
} from 'react-redux';
import type { ThunkAction } from 'redux-thunk';
import type { Action } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';

/**
 * Copia de store/index.ts de Atlas CMMS (commit 44069b69).
 *
 * Se mantiene la misma estructura: configureStore con el rootReducer, los
 * tipos RootState/AppDispatch/AppThunk, y los hooks tipados que reemplazan
 * a los de react-redux.
 *
 * StoreReturnType se copia tal cual del original: sus thunks devuelven
 * cosas distintas segun el caso (nada, un id, una lista de ids...).
 */
const store = configureStore({
  reducer: rootReducer,
  devTools: true
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export type StoreReturnType = void | number | number[] | string | any;

/**
 * El original declara el "extra argument" como null. Aca va undefined, que
 * es lo que configureStore usa realmente cuando no se le pasa ninguno.
 *
 * Con react-redux 8 y TypeScript 5, declarar null hace que dispatch()
 * rechace los thunks: espera undefined y recibe null. El original no lo
 * nota porque compila con TypeScript 4.7, mas permisivo en esta inferencia.
 */
export type AppThunk = ThunkAction<
  Promise<StoreReturnType>,
  RootState,
  undefined,
  Action<string>
>;

export const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;

export const useDispatch = () => useReduxDispatch<AppDispatch>();

export default store;

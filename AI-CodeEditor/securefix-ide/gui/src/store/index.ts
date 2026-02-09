import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import vulnerabilityReducer from './vulnerabilitySlice';
import chatReducer from './chatSlice';
import diffReducer from './diffSlice';

export const store = configureStore({
  reducer: {
    vulnerabilities: vulnerabilityReducer,
    chat: chatReducer,
    diff: diffReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in certain actions
        ignoredActions: ['vulnerabilities/setVulnerabilities'],
        ignoredPaths: ['vulnerabilities.items'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

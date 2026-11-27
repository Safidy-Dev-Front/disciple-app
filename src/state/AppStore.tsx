import React, { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch } from 'react';

import { repository, STORAGE_KEY, type Repository } from '../storage/repository';
import type { AppData } from '../types';

import { reducer, type Action } from './reducer';

interface Store {
  data: AppData;
  dispatch: Dispatch<Action>;
}

const StoreContext = createContext<Store | null>(null);

interface Props {
  children: React.ReactNode;
  repo?: Repository;
}

export const AppStoreProvider: React.FC<Props> = ({ children, repo = repository }) => {
  const [data, dispatch] = useReducer(reducer, undefined, () => repo.load());

  // Persistance : le chrono ne change d'état qu'aux clics (pas à chaque seconde),
  // donc on écrit rarement.
  useEffect(() => {
    repo.save(data);
  }, [data, repo]);

  // Synchronisation entre onglets ouverts simultanément.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) dispatch({ type: 'data/replace', data: repo.load() });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [repo]);

  const value = useMemo(() => ({ data, dispatch }), [data]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit être utilisé dans <AppStoreProvider>');
  return ctx;
}

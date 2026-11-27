import type { AppData } from '../types';

import { LocalStorageAdapter, type StorageAdapter } from './adapter';
import { parseAppData } from './schema';

export const STORAGE_KEY = 'discipline2027.data';

export interface Repository {
  load(): AppData;
  save(data: AppData): void;
  clear(): void;
}

export function createRepository(adapter: StorageAdapter, key: string = STORAGE_KEY): Repository {
  return {
    load: () => parseAppData(adapter.read(key)),
    save: (data) => adapter.write(key, data),
    clear: () => adapter.remove(key),
  };
}

export const repository = createRepository(new LocalStorageAdapter());

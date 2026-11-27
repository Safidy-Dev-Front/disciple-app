/**
 * Contrat minimal de stockage clé/valeur JSON.
 * Pour migrer vers IndexedDB / SQLite (Capacitor), il suffit d'écrire un autre
 * adaptateur respectant cette interface et de le passer à `createRepository`.
 */
export interface StorageAdapter {
  read(key: string): unknown;
  write(key: string, value: unknown): void;
  remove(key: string): void;
}

export class LocalStorageAdapter implements StorageAdapter {
  read(key: string): unknown {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? null : (JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }

  write(key: string, value: unknown): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      // Quota dépassé ou stockage bloqué (navigation privée) : on ne casse pas l'app.
      console.warn('[storage] écriture impossible', err);
    }
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* stockage indisponible : rien à supprimer */
    }
  }
}

/** Adaptateur en mémoire, utile pour les tests. */
export class MemoryAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  read(key: string): unknown {
    const raw = this.store.get(key);
    return raw === undefined ? null : (JSON.parse(raw) as unknown);
  }

  write(key: string, value: unknown): void {
    this.store.set(key, JSON.stringify(value));
  }

  remove(key: string): void {
    this.store.delete(key);
  }
}

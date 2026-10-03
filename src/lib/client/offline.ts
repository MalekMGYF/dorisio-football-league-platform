/**
 * Offline layer: IndexedDB cache for previously loaded data + an offline-safe
 * write queue for admin match events. Nothing is ever reported as synced
 * before the server confirms it — queued items stay marked «pending».
 */

const DB_NAME = "dorisio-offline";
const DB_VERSION = 1;
const CACHE_STORE = "cache";
const QUEUE_STORE = "queue";

export interface QueuedEvent {
  id: string;
  kind: "match-event" | "generic";
  matchId?: string;
  payload: Record<string, unknown>;
  clientAt: string;
  status: "pending" | "syncing" | "failed";
  attempts: number;
  lastError?: string;
}

function supported(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!supported()) {
      reject(new Error("indexeddb_unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb_error"));
  });
}

async function withStore<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = fn(transaction.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb_error"));
    transaction.oncomplete = () => db.close();
  });
}

export async function cacheSet(key: string, value: unknown): Promise<void> {
  if (!supported()) return;
  try {
    await withStore(CACHE_STORE, "readwrite", (store) =>
      store.put({ key, value, savedAt: Date.now() }),
    );
  } catch {
    /* cache is best-effort */
  }
}

export async function cacheGet<T>(key: string): Promise<{ value: T; savedAt: number } | null> {
  if (!supported()) return null;
  try {
    const row = (await withStore<unknown>(CACHE_STORE, "readonly", (store) =>
      store.get(key),
    )) as { key: string; value: T; savedAt: number } | undefined;
    return row ?? null;
  } catch {
    return null;
  }
}

export async function queueAdd(item: Omit<QueuedEvent, "status" | "attempts">): Promise<void> {
  if (!supported()) return;
  await withStore(QUEUE_STORE, "readwrite", (store) =>
    store.put({ ...item, status: "pending", attempts: 0 } as QueuedEvent),
  );
}

export async function queueList(): Promise<QueuedEvent[]> {
  if (!supported()) return [];
  try {
    return await withStore<QueuedEvent[]>(QUEUE_STORE, "readonly", (store) => store.getAll());
  } catch {
    return [];
  }
}

export async function queueUpdate(item: QueuedEvent): Promise<void> {
  if (!supported()) return;
  await withStore(QUEUE_STORE, "readwrite", (store) => store.put(item));
}

export async function queueRemove(id: string): Promise<void> {
  if (!supported()) return;
  await withStore(QUEUE_STORE, "readwrite", (store) => store.delete(id));
}

export async function queueCount(): Promise<number> {
  const items = await queueList();
  return items.filter((item) => item.status !== "failed").length;
}

export async function queueClear(): Promise<void> {
  if (!supported()) return;
  await withStore(QUEUE_STORE, "readwrite", (store) => store.clear());
}

/** Flushes queued match events. Idempotent server-side (client event ids). */
export async function flushQueue(
  post: (path: string, body: Record<string, unknown>) => Promise<unknown>,
): Promise<{ synced: number; failed: number }> {
  const items = await queueList();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    if (item.status === "failed") continue;
    try {
      await queueUpdate({ ...item, status: "syncing", attempts: item.attempts + 1 });
      if (item.kind === "match-event" && item.matchId) {
        await post(`/api/matches/${item.matchId}/events`, item.payload);
      }
      await queueRemove(item.id);
      synced += 1;
    } catch (error) {
      failed += 1;
      await queueUpdate({
        ...item,
        status: item.attempts > 4 ? "failed" : "pending",
        attempts: item.attempts + 1,
        lastError: error instanceof Error ? error.message : "unknown",
      });
    }
  }
  return { synced, failed };
}

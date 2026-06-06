/**
 * Offline Mode utilities for Intellix.
 *
 * Provides IndexedDB-based caching for resources and flashcards,
 * allowing users to review study material even without an internet connection.
 * Changes are queued and synced when connectivity is restored.
 */

const DB_NAME = 'intellix-cache';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Store for cached resources (PDFs, documents, etc.)
            if (!db.objectStoreNames.contains('resources')) {
                const store = db.createObjectStore('resources', { keyPath: 'id' });
                store.createIndex('name', 'name', { unique: false });
                store.createIndex('cached_at', 'cached_at', { unique: false });
            }

            // Store for cached flashcards
            if (!db.objectStoreNames.contains('flashcards')) {
                const store = db.createObjectStore('flashcards', { keyPath: 'id' });
                store.createIndex('resource_id', 'resource_id', { unique: false });
                store.createIndex('cached_at', 'cached_at', { unique: false });
            }

            // Store for pending sync actions (created offline, sync when online)
            if (!db.objectStoreNames.contains('sync_queue')) {
                const store = db.createObjectStore('sync_queue', {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                store.createIndex('action', 'action', { unique: false });
                store.createIndex('created_at', 'created_at', { unique: false });
            }

            // Store for app settings persisted offline
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = (event.target as IDBOpenDBRequest).result;
            resolve(dbInstance!);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
}

/**
 * Generic cache helpers
 */

export async function cacheResource<T>(storeName: string, data: T & { id: string | number }): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put({ ...data, cached_at: Date.now() });
    } catch (e) {
        console.warn(`[Offline] Failed to cache in "${storeName}":`, e);
    }
}

export async function cacheResources<T>(storeName: string, data: Array<T & { id: string | number }>): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        for (const item of data) {
            store.put({ ...item, cached_at: Date.now() });
        }
    } catch (e) {
        console.warn(`[Offline] Failed to cache batch in "${storeName}":`, e);
    }
}

export async function getCachedResource<T>(storeName: string, id: string | number): Promise<T | null> {
    try {
        const db = await openDB();
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error);
        });
    } catch {
        return null;
    }
}

export async function getAllCached<T>(storeName: string): Promise<T[]> {
    try {
        const db = await openDB();
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result ?? []);
            request.onerror = () => reject(request.error);
        });
    } catch {
        return [];
    }
}

export async function removeCachedResource(storeName: string, id: string | number): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.delete(id);
    } catch (e) {
        console.warn(`[Offline] Failed to remove from "${storeName}":`, e);
    }
}

export async function clearCache(storeName?: string): Promise<void> {
    try {
        const db = await openDB();
        if (storeName) {
            db.transaction(storeName, 'readwrite').objectStore(storeName).clear();
        } else {
            for (const name of ['resources', 'flashcards', 'sync_queue']) {
                if (db.objectStoreNames.contains(name)) {
                    db.transaction(name, 'readwrite').objectStore(name).clear();
                }
            }
        }
    } catch (e) {
        console.warn('[Offline] Failed to clear cache:', e);
    }
}

/**
 * Sync queue - for actions created while offline
 */

interface SyncAction {
    action: 'create' | 'update' | 'delete';
    entity: string;
    payload: unknown;
    created_at: number;
}

export async function enqueueSync(action: SyncAction): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction('sync_queue', 'readwrite');
        tx.objectStore('sync_queue').add(action);
    } catch (e) {
        console.warn('[Offline] Failed to enqueue sync:', e);
    }
}

export async function getSyncQueue(): Promise<(SyncAction & { id: number })[]> {
    try {
        const db = await openDB();
        const tx = db.transaction('sync_queue', 'readonly');
        const store = tx.objectStore('sync_queue');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result ?? []);
            request.onerror = () => reject(request.error);
        });
    } catch {
        return [];
    }
}

export async function clearSyncQueue(): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction('sync_queue', 'readwrite');
        tx.objectStore('sync_queue').clear();
    } catch (e) {
        console.warn('[Offline] Failed to clear sync queue:', e);
    }
}

/**
 * Connectivity monitoring
 */

export function onOnline(callback: () => void): () => void {
    window.addEventListener('online', callback);
    return () => window.removeEventListener('online', callback);
}

export function onOffline(callback: () => void): () => void {
    window.addEventListener('offline', callback);
    return () => window.removeEventListener('offline', callback);
}

export function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * Register service worker for cache-first strategy on static assets.
 * Call this once during app initialization.
 */
export async function registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('[Offline] Service worker registered:', registration.scope);
        } catch (e) {
            console.warn('[Offline] Service worker registration failed:', e);
        }
    }
}

/**
 * Offline status indicator component data.
 */
export function getOfflineStatus(): { isOffline: boolean; queuedActions: number } {
    return {
        isOffline: !isOnline(),
        queuedActions: 0, // populated async
    };
}

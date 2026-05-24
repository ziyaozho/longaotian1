const DB_NAME = 'game-sprites';
const DB_VERSION = 1;
const STORE_NAME = 'spritesheets';

interface CacheEntry {
  hash: string;
  dataUrl: string;
  seed: number;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getAttributeHash(appearance: {
  talent: number;
  appearance: number;
  intelligence: number;
  physique: number;
  family: number;
  luck: number;
}): string {
  return `v1-${appearance.talent}-${appearance.appearance}-${appearance.intelligence}-${appearance.physique}-${appearance.family}-${appearance.luck}`;
}

export async function getCachedSpritesheet(hash: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(hash);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;
        if (entry?.dataUrl) {
          resolve(entry.dataUrl);
        } else {
          // Fallback to localStorage
          try {
            const local = localStorage.getItem(`sprite_${hash}`);
            resolve(local);
          } catch { resolve(null); }
        }
      };
      request.onerror = () => {
        // Fallback to localStorage
        try {
          const local = localStorage.getItem(`sprite_${hash}`);
          resolve(local);
        } catch { resolve(null); }
      };
      tx.oncomplete = () => db.close();
    });
  } catch {
    // IndexedDB unavailable: try localStorage
    try {
      const local = localStorage.getItem(`sprite_${hash}`);
      return local;
    } catch {
      return null;
    }
  }
}

export async function cacheSpritesheet(
  hash: string,
  dataUrl: string,
  seed: number,
): Promise<void> {
  try {
    const db = await openDB();
    const entry: CacheEntry = { hash, dataUrl, seed, createdAt: Date.now() };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(entry);
      tx.oncomplete = () => {
        db.close();
        // Also persist in localStorage as fallback for session-loss scenarios
        try { localStorage.setItem(`sprite_${hash}`, dataUrl); } catch { /* quota */ }
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error ?? new Error('IndexedDB write failed'));
      };
    });
  } catch {
    // Try localStorage as fallback when IndexedDB is unavailable
    try { localStorage.setItem(`sprite_${hash}`, dataUrl); } catch { /* quota */ }
  }
}

export async function downloadImageAsDataUrl(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to convert image to data URL'));
    reader.readAsDataURL(blob);
  });
}

export async function getAllCachedHashes(): Promise<string[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => resolve([]);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return [];
  }
}

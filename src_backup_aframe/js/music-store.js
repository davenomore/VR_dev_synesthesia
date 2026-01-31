/**
 * Music Store (IndexedDB)
 * Handles storage of user-selected music files because localStorage is too small (5MB max).
 * Stores files in 'MusicDatabase' -> 'tracks' object store.
 */

const DB_NAME = 'MusicDatabase';
const STORE_NAME = 'tracks';
const DB_VERSION = 1;

export const MusicStore = {

    /**
     * Open DB Connection
     */
    openDB: function () {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (e) => reject('DB Error: ' + e.target.error);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = (e) => resolve(e.target.result);
        });
    },

    /**
     * Save Audio File (Blob/File)
     */
    saveTrack: async function (file) {
        if (!file) return;

        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            // We only store one track as 'current_track'
            const request = store.put(file, 'current_track');

            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    /**
     * Get Saved Audio File
     */
    getTrack: async function () {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get('current_track');

            request.onsuccess = (e) => {
                const result = e.target.result;
                resolve(result || null); // Returns File/Blob or null
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }
};

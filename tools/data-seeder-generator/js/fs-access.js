/**
 * File System Access Manager
 * Remembers folder permissions permanently and smartly traces paths.
 */

class FsAccessManager {
    constructor() {
        this.dbName = 'seeder-fs-handles';
        this.storeName = 'handles';
        this.rootKey = 'wamp-root';
        this.dbPromise = null;
    }

    isSupported() {
        return typeof window.showDirectoryPicker === 'function';
    }

    openDb() {
        if (this.dbPromise) return this.dbPromise;
        this.dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(this.storeName);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return this.dbPromise;
    }

    async getStoredHandle(key) {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const req = tx.objectStore(this.storeName).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(tx.error);
        });
    }

    async setStoredHandle(key, handle) {
        const db = await this.openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            tx.objectStore(this.storeName).put(handle, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getRootHandleWithPermission() {
        const handle = await this.getStoredHandle(this.rootKey);
        if (!handle) return null;

        // If permission is already granted, proceed silently
        if ((await handle.queryPermission({ mode: 'readwrite' })) === 'granted') {
            return handle;
        }

        // If permission was dropped (e.g. page refresh), request it again.
        // This triggers a small browser alert ("Allow site to view files?"), NOT the Windows File Explorer!
        try {
            if ((await handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
                return handle;
            }
        } catch (e) {
            console.warn('Permission request failed or dismissed:', e);
        }
        
        return null;
    }

    async linkRoot() {
        if (!this.isSupported()) throw new Error('Browser not supported.');
        
        // This opens Windows Explorer ONLY on the very first time.
        // id: 'wamp-root' forces Windows to remember the folder you picked for next time.
        const handle = await window.showDirectoryPicker({ 
            id: 'wamp-root',
            mode: 'readwrite' 
        });
        
        if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
            throw new Error('Permission denied.');
        }

        await this.setStoredHandle(this.rootKey, handle);
        return handle;
    }

    async getSeedersDirHandle(buildInfo, rootHandle) {
        if (!rootHandle) return null;

        const versionFolder = `version7-${buildInfo.quarter.toLowerCase()}`;
        const buildFolder = `${buildInfo.clientName}-${buildInfo.version}`;
        const tail = ['vendor', 'timeless', 'customers', 'src', 'Database', 'Seeds', 'ClientDataUpdates'];
        
        // Smart Path Tracer: It doesn't matter which folder the user selected, it will find the seeders
        const path1 = [versionFolder, buildFolder, ...tail]; // User selected "local"
        const path2 = [buildFolder, ...tail];                // User selected "version7-qX"
        const path3 = [...tail];                             // User selected project folder directly

        const tryPath = async (segments) => {
            let currentDir = rootHandle;
            for (const segment of segments) {
                try {
                    currentDir = await currentDir.getDirectoryHandle(segment, { create: false });
                } catch (error) {
                    return null; // Stop if path breaks
                }
            }
            return currentDir;
        }

        let dirHandle = await tryPath(path1);
        if (dirHandle) return dirHandle;

        dirHandle = await tryPath(path2);
        if (dirHandle) return dirHandle;

        dirHandle = await tryPath(path3);
        if (dirHandle) return dirHandle;

        return null; // Could not trace path
    }

    async getHighestSeederNumber(dirHandle) {
        let highest = 0;
        for await (const [name, entry] of dirHandle.entries()) {
            if (entry.kind !== 'file') continue;
            const match = name.match(/^DATA(\d+)\.php$/i);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > highest) highest = num;
            }
        }
        return highest;
    }

    async writeSeederFile(dirHandle, fileName, content) {
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    }
}

const fsAccessManager = new FsAccessManager();
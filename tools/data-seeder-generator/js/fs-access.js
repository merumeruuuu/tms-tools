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

        const buildFolder = `${buildInfo.clientName}-${buildInfo.version}`;
        const tail = ['vendor', 'timeless', 'customers', 'src', 'Database', 'Seeds', 'ClientDataUpdates'];

        const tryPath = async (startHandle, segments) => {
            let currentDir = startHandle;
            for (const segment of segments) {
                try {
                    currentDir = await currentDir.getDirectoryHandle(segment, { create: false });
                } catch (error) {
                    return null;
                }
            }
            return currentDir;
        };

        const normalizedBuildName = buildFolder.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedClient = buildInfo.clientName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedVersion = buildInfo.version.toLowerCase().replace(/[^a-z0-9]/g, '');
        const ignoredFolders = new Set(['.git', 'node_modules', 'storage', 'cache', 'logs']);
        const queue = [{ handle: rootHandle, segments: [], depth: 0 }];
        const candidates = [];
        let visited = 0;
        const maxDepth = 10;
        const maxDirectories = 5000;

        while (queue.length && visited < maxDirectories) {
            const current = queue.shift();
            visited += 1;

            const seedersHandle = await tryPath(current.handle, tail);
            if (seedersHandle) {
                const directoryName = current.segments[current.segments.length - 1] || rootHandle.name;
                const normalizedName = directoryName.toLowerCase().replace(/[^a-z0-9]/g, '');
                const matchesBuild = normalizedName === normalizedBuildName ||
                    (normalizedName.includes(normalizedClient) && normalizedName.includes(normalizedVersion));
                candidates.push({
                    handle: seedersHandle,
                    relativePath: current.segments.length ? current.segments.join('\\') : rootHandle.name,
                    matchesBuild
                });
                continue;
            }

            if (current.depth >= maxDepth) continue;
            for await (const [name, entry] of current.handle.entries()) {
                if (entry.kind !== 'directory' || ignoredFolders.has(name.toLowerCase())) continue;
                if (name.toLowerCase() === 'vendor') continue;
                queue.push({
                    handle: entry,
                    segments: [...current.segments, name],
                    depth: current.depth + 1
                });
            }
        }

        const matchingCandidates = candidates.filter(candidate => candidate.matchesBuild);
        const selected = matchingCandidates.length === 1
            ? matchingCandidates[0]
            : matchingCandidates.length > 1
                ? null
                : candidates.length === 1 ? candidates[0] : null;

        return selected ? { handle: selected.handle, relativePath: selected.relativePath } : null;
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
/**
 * File System Access Manager
 * Remembers folder permissions permanently and smartly traces paths.
 */

class FsAccessManager {
    constructor() {
        this.dbName = 'seeder-fs-handles';
        this.storeName = 'handles';
        this.rootKey = 'wamp-root';
        this.vhostRootKey = 'apache-vhost-root';
        this.hostsFileKey = 'windows-hosts-file';
        this.buildParentsKey = 'build-parent-roots';
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

    getBuildHandleKey(buildInfo) {
        const identity = `${buildInfo.hostname}|${buildInfo.documentRoot || `${buildInfo.clientName}-${buildInfo.version}`}`;
        return `build:${identity.toLowerCase()}`;
    }

    async getStoredBuildFolderHandle(buildInfo) {
        return this.getStoredHandle(this.getBuildHandleKey(buildInfo));
    }

    async getBuildFolderHandle(buildInfo, requestPermission = false) {
        const handle = await this.getStoredBuildFolderHandle(buildInfo);
        if (!handle) return null;

        let permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted' && requestPermission) {
            permission = await handle.requestPermission({ mode: 'readwrite' });
        }
        return permission === 'granted' ? handle : null;
    }

    async requestBuildFolderPermission(buildInfo) {
        const handle = await this.getStoredBuildFolderHandle(buildInfo);
        if (!handle) return null;
        try {
            return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted' ? handle : null;
        } catch (error) {
            return null;
        }
    }

    async getSharedBuildParents(requestPermission = false) {
        const handles = await this.getStoredHandle(this.buildParentsKey) || [];
        const accessible = [];
        for (const handle of handles) {
            let permission = await handle.queryPermission({ mode: 'readwrite' });
            if (permission !== 'granted' && requestPermission) {
                try {
                    permission = await handle.requestPermission({ mode: 'readwrite' });
                } catch (error) {
                    permission = 'denied';
                }
            }
            if (permission === 'granted') accessible.push(handle);
        }
        return accessible;
    }

    async getSharedBuildParentsForBuild(buildInfo) {
        const parents = await this.getSharedBuildParents();
        const expectedGroup = `version7-${buildInfo.quarter.toLowerCase()}`;
        return parents.sort((left, right) => {
            const leftMatch = left.name.toLowerCase() === expectedGroup;
            const rightMatch = right.name.toLowerCase() === expectedGroup;
            return Number(rightMatch) - Number(leftMatch);
        });
    }

    async rememberSharedBuildParent(handle) {
        if (!handle) return;
        const parents = await this.getStoredHandle(this.buildParentsKey) || [];
        for (const parent of parents) {
            if (typeof parent.isSameEntry === 'function' && await parent.isSameEntry(handle)) return;
        }
        parents.push(handle);
        await this.setStoredHandle(this.buildParentsKey, parents);
    }

    async pickSharedBuildParent(buildInfo, startIn) {
        if (!this.isSupported()) throw new Error('Browser does not support folder access.');

        const handle = await window.showDirectoryPicker({
            id: 'shared-build-parent',
            mode: 'readwrite',
            ...(startIn ? { startIn } : {})
        });
        if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted' &&
            (await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
            throw new Error('Permission denied for the selected build parent folder.');
        }

        const projectFolder = buildInfo.buildFolderName || buildInfo.hostname.replace(/\.local$/i, '');
        if (!projectFolder) throw new Error('Apache did not provide a project folder name for this URL.');
        const normalizedFolder = projectFolder.toLowerCase().replace(/[^a-z0-9]/g, '');
        const seeders = await this.findProjectByFolderName(handle, normalizedFolder, [
            'vendor', 'timeless', 'customers', 'src', 'Database', 'Seeds', 'ClientDataUpdates'
        ], () => true);
        if (!seeders) {
            throw new Error(`Could not find ${projectFolder} beneath the selected parent. Select the common folder that contains your build directories.`);
        }

        await this.rememberSharedBuildParent(handle);
        return { rootHandle: handle, ...seeders };
    }

    async linkHostsFile() {
        if (typeof window.showOpenFilePicker !== 'function') {
            throw new Error('This browser does not support selecting the Windows hosts file.');
        }
        const [handle] = await window.showOpenFilePicker({ id: 'windows-hosts-file', multiple: false });
        if ((await handle.queryPermission({ mode: 'read' })) !== 'granted' &&
            (await handle.requestPermission({ mode: 'read' })) !== 'granted') {
            throw new Error('Permission denied for the Windows hosts file.');
        }
        await this.setStoredHandle(this.hostsFileKey, handle);
        return handle;
    }

    async getHostsFileWithPermission() {
        const handle = await this.getStoredHandle(this.hostsFileKey);
        if (!handle) return null;
        return (await handle.queryPermission({ mode: 'read' })) === 'granted' ? handle : null;
    }

    async findHostsIp(hostname, fileHandle) {
        if (!fileHandle) return null;
        const source = await (await fileHandle.getFile()).text();
        for (const rawLine of source.split(/\r?\n/)) {
            const line = rawLine.replace(/#.*/, '').trim();
            if (!line) continue;
            const [ip, ...hostnames] = line.split(/\s+/);
            if (hostnames.some(value => value.toLowerCase() === hostname.toLowerCase())) return ip;
        }
        return null;
    }

    async pickBuildFolder(buildInfo, startIn) {
        if (!this.isSupported()) throw new Error('Browser does not support folder access.');

        const handle = await window.showDirectoryPicker({
            id: `build-${buildInfo.clientName}-${buildInfo.version}`,
            mode: 'readwrite',
            ...(startIn ? { startIn } : {})
        });
        if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted' &&
            (await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
            throw new Error('Permission denied for the selected build folder.');
        }

        const seedersHandle = await this.getDirectoryPath(handle, [
            'vendor', 'timeless', 'customers', 'src', 'Database', 'Seeds', 'ClientDataUpdates'
        ]);
        if (!seedersHandle) {
            throw new Error('The selected folder does not contain the expected ClientDataUpdates seeder directory.');
        }

        await this.setStoredHandle(this.getBuildHandleKey(buildInfo), handle);
        return { handle: seedersHandle, projectHandle: handle };
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

    async linkVhostRoot() {
        if (!this.isSupported()) throw new Error('Browser not supported.');

        const handle = await window.showDirectoryPicker({
            id: 'apache-vhost-config',
            mode: 'read'
        });
        if ((await handle.queryPermission({ mode: 'read' })) !== 'granted' &&
            (await handle.requestPermission({ mode: 'read' })) !== 'granted') {
            throw new Error('Permission denied for the Apache config folder.');
        }

        await this.setStoredHandle(this.vhostRootKey, handle);
        return handle;
    }

    async getVhostRootWithPermission() {
        const handle = await this.getStoredHandle(this.vhostRootKey);
        if (!handle) return null;
        return (await handle.queryPermission({ mode: 'read' })) === 'granted' ? handle : null;
    }

    async findVhostDocumentRoot(hostname, configRoot, buildInfo, hostsIp = null) {
        if (!configRoot) return null;

        const queue = [{ handle: configRoot, depth: 0 }];
        const maxDepth = 6;
        const maxDirectories = 1000;
        const maxConfigFiles = 1000;
        const ignoredFolders = new Set(['.git', 'logs', 'modules']);
        const candidates = [];
        let visitedDirectories = 0;
        let visitedFiles = 0;

        while (queue.length && visitedDirectories < maxDirectories && visitedFiles < maxConfigFiles) {
            const current = queue.shift();
            visitedDirectories += 1;

            for await (const [name, entry] of current.handle.entries()) {
                if (entry.kind === 'directory') {
                    if (current.depth < maxDepth && !ignoredFolders.has(name.toLowerCase())) {
                        queue.push({ handle: entry, depth: current.depth + 1 });
                    }
                    continue;
                }

                if (entry.kind !== 'file' || !/\.conf$/i.test(name)) continue;
                visitedFiles += 1;
                let source;
                try {
                    source = await (await entry.getFile()).text();
                } catch (error) {
                    continue;
                }

                const uncommented = source.replace(/^\s*#.*$/gm, '');
                const blocks = uncommented.matchAll(/<VirtualHost\b[^>]*>([\s\S]*?)<\/VirtualHost\s*>/gi);
                for (const block of blocks) {
                    const addressTokens = block[0].match(/^<VirtualHost\s+([^>]+)>/i)?.[1].trim().split(/\s+/) || [];
                    if (hostsIp && !addressTokens.some(value => value === '*' || value.startsWith(`${hostsIp}:`) || value === hostsIp)) continue;
                    const body = block[1];
                    const hostnames = [];
                    const serverNames = body.matchAll(/^\s*ServerName\s+([^\s#]+)/gim);
                    const aliases = body.matchAll(/^\s*ServerAlias\s+([^\r\n#]+)/gim);
                    for (const match of serverNames) hostnames.push({ value: match[1].replace(/^['"]|['"]$/g, ''), exact: true });
                    for (const match of aliases) {
                        hostnames.push(...match[1].trim().split(/\s+/).map(value => ({ value: value.replace(/^['"]|['"]$/g, ''), exact: false })));
                    }
                    const matchesHostname = value => {
                        const escaped = value.toLowerCase().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
                        return new RegExp(`^${escaped}$`, 'i').test(hostname);
                    };
                    const matchedHost = hostnames.find(item => matchesHostname(item.value));
                    if (!matchedHost) continue;

                    const virtualRoot = body.match(/^\s*VirtualDocumentRoot\s+(?:"([^"]+)"|'([^']+)'|([^\s#]+))/im);
                    const documentRoot = body.match(/^\s*DocumentRoot\s+(?:"([^"]+)"|'([^']+)'|([^\s#]+))/im);
                    const directive = virtualRoot || documentRoot;
                    const value = directive && (directive[1] || directive[2] || directive[3]);
                    if (!value) continue;

                    const hostnameParts = hostname.split('.');
                    const expanded = value.replace(/%%|%(-?\d+)(\+)?/g, (token, part, remainder) => {
                        if (token === '%%') return '%';
                        const index = Number(part);
                        if (index === 0) return hostname;
                        const hostnameIndex = index > 0 ? index - 1 : hostnameParts.length + index;
                        const selectedParts = hostnameParts.slice(hostnameIndex, remainder ? undefined : hostnameIndex + 1);
                        return selectedParts.join('.');
                    }).replace(/[\\/]+$/, '');
                    const normalizedExpanded = expanded.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const normalizedBuild = `${buildInfo.clientName}-${buildInfo.version}`.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const normalizedQuarter = `version7-${buildInfo.quarter}`.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const hasBuild = normalizedExpanded.includes(normalizedBuild);
                    const hasQuarter = normalizedExpanded.includes(normalizedQuarter);
                    if (virtualRoot && !matchedHost.exact && (!hasBuild || !hasQuarter)) continue;

                    candidates.push({
                        path: expanded,
                        score: (matchedHost.exact ? 100 : 0) + (hostsIp ? 50 : 0) + (hasBuild ? 20 : 0) + (hasQuarter ? 10 : 0)
                    });
                }
            }
        }

        if (!candidates.length) return null;
        candidates.sort((a, b) => b.score - a.score);
        if (candidates.length > 1 && candidates[0].score === candidates[1].score && candidates[0].path !== candidates[1].path) return null;
        return candidates[0].path;
    }

    async getSeedersDirHandle(buildInfo, rootHandle, isCurrentRun = () => true, documentRoot = '') {
        if (!rootHandle) return null;

        const buildFolder = buildInfo.buildFolderName || buildInfo.hostname.replace(/\.local$/i, '') || `${buildInfo.clientName}-${buildInfo.version}`;
        const quarterFolder = `version7-${buildInfo.quarter.toLowerCase()}`;
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
        const maxDepth = 8;
        const maxDirectories = 2000;
        const maxEntriesPerDirectory = 500;
        const getRelativePath = segments => segments.length ? segments.join('\\') : rootHandle.name;
        const makeResult = (handle, segments) => ({
            handle,
            relativePath: getRelativePath(segments)
        });

        if (/^version7-q[1-4]$/i.test(rootHandle.name) && rootHandle.name.toLowerCase() !== quarterFolder) {
            return null;
        }

        if (documentRoot) {
            const normalizedDocumentRoot = documentRoot.replace(/\\/g, '/').replace(/\/+$/, '');
            const documentSegments = normalizedDocumentRoot.split('/').filter(Boolean);
            const projectSegments = documentSegments[documentSegments.length - 1]?.toLowerCase() === 'public'
                ? documentSegments.slice(0, -1)
                : documentSegments;
            const rootSegmentIndex = projectSegments.findIndex(segment => segment.toLowerCase() === rootHandle.name.toLowerCase());
            if (rootSegmentIndex >= 0) {
                const relativeSegments = projectSegments.slice(rootSegmentIndex + 1);
                const directHandle = await tryPath(rootHandle, [...relativeSegments, ...tail]);
                if (directHandle) return makeResult(directHandle, relativeSegments);
            }

            const documentFolderName = projectSegments[projectSegments.length - 1] || '';
            const normalizedDocumentFolder = documentFolderName.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedDocumentFolder) {
                const preferred = await this.findProjectByFolderName(rootHandle, normalizedDocumentFolder, tail, isCurrentRun);
                if (preferred) return preferred;
            }
            return null;
        }

        // Check the expected layouts before traversing a potentially large linked root.
        const directPaths = [
            { segments: ['www', 'local', quarterFolder, buildFolder] },
            { segments: ['www', 'local', buildFolder] },
            { segments: ['local', quarterFolder, buildFolder] },
            { base: rootHandle, segments: [quarterFolder, buildFolder], relative: [quarterFolder, buildFolder] },
            { base: rootHandle, segments: [buildFolder], relative: [buildFolder] },
            { base: rootHandle, segments: tail, relative: [] }
        ];
        for (const candidate of directPaths) {
            if (!isCurrentRun()) return null;
            const base = candidate.base || rootHandle;
            const handle = await tryPath(base, [...candidate.segments, ...tail]);
            if (handle) {
                const relative = candidate.relative || candidate.segments;
                if (relative.length === 0) {
                    const normalizedRootName = rootHandle.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (!normalizedRootName.includes(normalizedClient) || !normalizedRootName.includes(normalizedVersion)) continue;
                }
                const parentHandle = candidate.segments.length
                    ? await tryPath(base, candidate.segments.slice(0, -1))
                    : rootHandle;
                if (parentHandle) await this.rememberSharedBuildParent(parentHandle);
                return {
                    ...makeResult(handle, relative),
                    parentHandle: parentHandle || rootHandle
                };
            }
        }

        const exactBuild = await this.findProjectByFolderName(
            rootHandle,
            normalizedBuildName,
            tail,
            isCurrentRun,
            true
        );
        if (exactBuild) return exactBuild;

        const queue = [{ handle: rootHandle, segments: [], depth: 0 }];
        const matches = [];
        let visited = 0;
        let index = 0;

        while (index < queue.length && visited < maxDirectories) {
            if (!isCurrentRun()) return null;
            const current = queue[index++];
            visited += 1;

            const currentName = current.segments[current.segments.length - 1] || rootHandle.name;
            const normalizedName = currentName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const matchesBuild = normalizedName === normalizedBuildName ||
                (normalizedName.includes(normalizedClient) && normalizedName.includes(normalizedVersion));

            if (matchesBuild) {
                const seedersHandle = await tryPath(current.handle, tail);
                if (seedersHandle) {
                    matches.push(makeResult(seedersHandle, current.segments));
                    if (normalizedName === normalizedBuildName) return matches[0];
                    continue;
                }
            }

            if (current.depth >= maxDepth) continue;
            let entriesRead = 0;
            for await (const [name, entry] of current.handle.entries()) {
                if (entriesRead++ >= maxEntriesPerDirectory) break;
                if (entry.kind !== 'directory' || ignoredFolders.has(name.toLowerCase())) continue;
                if (name.toLowerCase() === 'vendor') continue;
                queue.push({
                    handle: entry,
                    segments: [...current.segments, name],
                    depth: current.depth + 1
                });
            }
        }

        return matches.length === 1 ? matches[0] : null;
    }

    async findProjectByFolderName(rootHandle, normalizedFolderName, tail, isCurrentRun, stopAtFirst = false) {
        const queue = [{ handle: rootHandle, segments: [], depth: 0 }];
        const ignoredFolders = new Set(['.git', 'node_modules', 'storage', 'cache', 'logs']);
        const matches = [];
        let visited = 0;
        let index = 0;

        while (index < queue.length && visited < 2000) {
            if (!isCurrentRun()) return null;
            const current = queue[index++];
            visited += 1;
            const name = current.segments[current.segments.length - 1] || rootHandle.name;
            if (name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedFolderName) {
                const handle = await this.getDirectoryPath(current.handle, tail);
                if (handle) {
                    const parentHandle = current.parentHandle || rootHandle;
                    await this.rememberSharedBuildParent(parentHandle);
                    const match = {
                        handle,
                        parentHandle,
                        projectHandle: current.handle,
                        relativePath: current.segments.length ? current.segments.join('\\') : rootHandle.name
                    };
                    if (stopAtFirst) return match;
                    matches.push(match);
                }
            }
            if (current.depth >= 8) continue;
            let entriesRead = 0;
            for await (const [entryName, entry] of current.handle.entries()) {
                if (entriesRead++ >= 500) break;
                if (entry.kind !== 'directory' || ignoredFolders.has(entryName.toLowerCase()) || entryName.toLowerCase() === 'vendor') continue;
                queue.push({
                    handle: entry,
                    parentHandle: current.handle,
                    segments: [...current.segments, entryName],
                    depth: current.depth + 1
                });
            }
        }
        return matches.length === 1 ? matches[0] : null;
    }

    async getDirectoryPath(startHandle, segments) {
        let current = startHandle;
        for (const segment of segments) {
            try {
                current = await current.getDirectoryHandle(segment, { create: false });
            } catch (error) {
                return null;
            }
        }
        return current;
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
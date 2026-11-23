/**
 * File System Access Manager
 * Remembers folder permissions permanently and smartly traces paths with parallel probing & hard timeouts.
 */

const FS_IGNORED_DIRS = new Set([
    '.git', '.svn', '.hg', '.vscode', '.idea',
    'node_modules', 'vendor', 'storage', 'cache', 'logs',
    // OS & system folders (in case a drive root like C:\ or D:\ was selected)
    'windows', 'program files', 'program files (x86)', 'programdata', 'appdata',
    'users', 'documents and settings', '$recycle.bin', 'system volume information',
    'recovery', 'perflogs', 'msocache', 'intel', 'amd', 'nvidia', 'inetpub', 'drivers', 'onedrive',
    // WAMP / Apache / PHP / MySQL service folders (never contain client Laravel builds)
    'bin', 'alias', 'apps', 'lang', 'scripts', 'tmp', 'temp', 'sessions',
    'ssl', 'mariadb', 'mysql', 'php', 'phpmyadmin', 'adminer', 'phpsysinfo',
    // Standard Laravel internal folders (never contain nested client builds)
    'app', 'bootstrap', 'config', 'database', 'public', 'resources',
    'routes', 'tests', 'stubs', 'migrations', 'seeds', 'seeders'
]);

const APACHE_CONF_ALLOWED_DIRS = new Set([
    'bin', 'conf', 'extra', 'vhosts', 'sites-enabled', 'sites-available',
    'etc', 'httpd', 'wamp', 'wamp64', 'laragon', 'xampp', 'local'
]);

const SEEDER_TAIL_CANDIDATES = [
    ['vendor', 'timeless', 'customers', 'src', 'Database', 'Seeds', 'ClientDataUpdates'],
    ['vendor', 'timeless', 'customers', 'Database', 'Seeds', 'ClientDataUpdates']
];

function withFsTimeout(promise, timeoutMs, fallbackValue = null) {
    let timerId;
    const timeoutPromise = new Promise(resolve => {
        timerId = setTimeout(() => resolve(fallbackValue), timeoutMs);
    });
    return Promise.race([
        Promise.resolve(promise).catch(() => fallbackValue).finally(() => clearTimeout(timerId)),
        timeoutPromise
    ]);
}

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
            req.onblocked = () => reject(new Error('IndexedDB is blocked by another open tab.'));
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

    async isSameHandleInList(targetHandle, handleList) {
        if (!targetHandle || !Array.isArray(handleList)) return false;
        for (const existing of handleList) {
            if (!existing) continue;
            if (existing === targetHandle) return true;
            if (typeof existing.isSameEntry === 'function') {
                if (await withFsTimeout(existing.isSameEntry(targetHandle), 250, false)) return true;
            }
        }
        return false;
    }

    async filterUniqueHandles(handles, excludeHandles = []) {
        const unique = [];
        for (const handle of handles || []) {
            if (!handle) continue;
            if (await this.isSameHandleInList(handle, excludeHandles)) continue;
            if (await this.isSameHandleInList(handle, unique)) continue;
            unique.push(handle);
        }
        return unique;
    }

    async getRootHandleWithPermission() {
        const handle = await this.getStoredHandle(this.rootKey);
        if (!handle) return null;

        try {
            if ((await withFsTimeout(handle.queryPermission({ mode: 'readwrite' }), 800, 'denied')) === 'granted') {
                return handle;
            }
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

        try {
            let permission = await withFsTimeout(handle.queryPermission({ mode: 'readwrite' }), 800, 'denied');
            if (permission !== 'granted' && requestPermission) {
                permission = await handle.requestPermission({ mode: 'readwrite' });
            }
            return permission === 'granted' ? handle : null;
        } catch {
            return null;
        }
    }

    async requestBuildFolderPermission(buildInfo) {
        const handle = await this.getStoredBuildFolderHandle(buildInfo);
        if (!handle) return null;
        try {
            return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted' ? handle : null;
        } catch {
            return null;
        }
    }

    async getSharedBuildParents(requestPermission = false) {
        const handles = await this.getStoredHandle(this.buildParentsKey) || [];
        const accessible = [];
        for (const handle of handles) {
            try {
                let permission = await withFsTimeout(handle.queryPermission({ mode: 'readwrite' }), 600, 'denied');
                if (permission !== 'granted' && requestPermission) {
                    permission = await handle.requestPermission({ mode: 'readwrite' });
                }
                if (permission === 'granted') accessible.push(handle);
            } catch {
                // Skip stale/revoked handles
            }
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
        if (await this.isSameHandleInList(handle, parents)) return;
        parents.push(handle);
        await withFsTimeout(this.setStoredHandle(this.buildParentsKey, parents), 600, null);
    }

    async resolveSeedersFromProjectHandle(projectHandle) {
        if (!projectHandle) return null;
        for (const tail of SEEDER_TAIL_CANDIDATES) {
            const direct = await this.getDirectoryPath(projectHandle, tail);
            if (direct) return direct;

            // If Seeds folder exists without ClientDataUpdates yet, create ClientDataUpdates
            const seedsParent = await this.getDirectoryPath(projectHandle, tail.slice(0, -1));
            if (seedsParent) {
                const created = await withFsTimeout(
                    seedsParent.getDirectoryHandle(tail[tail.length - 1], { create: true }),
                    500,
                    null
                );
                if (created) return created;
                return seedsParent;
            }
        }
        return null;
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
        if (!projectFolder) throw new Error('Could not determine a project folder name for this URL.');
        const normalizedFolder = projectFolder.toLowerCase().replace(/[^a-z0-9]/g, '');
        const seeders = await this.findProjectByFolderName(handle, normalizedFolder, SEEDER_TAIL_CANDIDATES[0], () => true, true);
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
        return (await withFsTimeout(handle.queryPermission({ mode: 'read' }), 600, 'denied')) === 'granted' ? handle : null;
    }

    async findHostsIp(hostname, fileHandle) {
        if (!fileHandle) return null;
        try {
            const file = await withFsTimeout(fileHandle.getFile(), 600, null);
            if (!file) return null;
            const source = await withFsTimeout(file.text(), 800, '');
            for (const rawLine of source.split(/\r?\n/)) {
                const line = rawLine.replace(/#.*/, '').trim();
                if (!line) continue;
                const [ip, ...hostnames] = line.split(/\s+/);
                if (hostnames.some(value => value.toLowerCase() === hostname.toLowerCase())) return ip;
            }
        } catch {
            return null;
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

        const seedersHandle = await this.resolveSeedersFromProjectHandle(handle);
        if (!seedersHandle) {
            throw new Error('The selected folder does not contain the expected ClientDataUpdates seeder directory.');
        }

        await this.setStoredHandle(this.getBuildHandleKey(buildInfo), handle);
        return { handle: seedersHandle, projectHandle: handle };
    }

    async linkRoot() {
        if (!this.isSupported()) throw new Error('Browser not supported.');

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
        return (await withFsTimeout(handle.queryPermission({ mode: 'read' }), 600, 'denied')) === 'granted' ? handle : null;
    }

    async readDirectoryEntriesBounded(dirHandle, maxEntries = 200, timeoutMs = 800) {
        const collector = (async () => {
            const items = [];
            let count = 0;
            for await (const pair of dirHandle.entries()) {
                items.push(pair);
                if (++count >= maxEntries) break;
            }
            return items;
        })();
        return withFsTimeout(collector, timeoutMs, []);
    }

    isApacheConfigSubdir(folderName) {
        const lower = folderName.toLowerCase();
        if (APACHE_CONF_ALLOWED_DIRS.has(lower)) return true;
        return /^apache/i.test(lower) || /^wamp/i.test(lower) || /^httpd/i.test(lower) || /^vhosts?/i.test(lower);
    }

    async findVhostDocumentRoot(hostname, configRoot, buildInfo, hostsIp = null, isCurrentRun = () => true, onProgress = null) {
        if (!configRoot) return null;

        const queue = [{ handle: configRoot, depth: 0 }];
        const maxDepth = 4;
        const maxDirectories = 40;
        const maxConfigFiles = 40;
        const deadline = Date.now() + 1500;
        const candidates = [];
        let visitedDirectories = 0;
        let visitedFiles = 0;
        let index = 0;

        while (index < queue.length && visitedDirectories < maxDirectories && visitedFiles < maxConfigFiles) {
            if (!isCurrentRun() || Date.now() > deadline) break;
            const current = queue[index++];
            visitedDirectories += 1;

            if (typeof onProgress === 'function' && (visitedDirectories === 1 || visitedDirectories % 10 === 0)) {
                onProgress(`Checking Apache vhosts in ${current.handle.name}...`);
            }

            const entries = await this.readDirectoryEntriesBounded(current.handle, 120, 600);
            for (const [name, entry] of entries) {
                if (!isCurrentRun() || Date.now() > deadline) break;
                if (entry.kind === 'directory') {
                    if (current.depth < maxDepth && !FS_IGNORED_DIRS.has(name.toLowerCase()) && this.isApacheConfigSubdir(name)) {
                        queue.push({ handle: entry, depth: current.depth + 1 });
                    }
                    continue;
                }

                if (entry.kind !== 'file' || !/\.conf$/i.test(name)) continue;
                visitedFiles += 1;
                const fileObj = await withFsTimeout(entry.getFile(), 400, null);
                if (!fileObj) continue;
                const source = await withFsTimeout(fileObj.text(), 400, '');
                if (!source) continue;

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
                        const idx = Number(part);
                        if (idx === 0) return hostname;
                        const hostnameIndex = idx > 0 ? idx - 1 : hostnameParts.length + idx;
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

    async isLaravelProjectDir(dirHandle) {
        const fileHandle = await withFsTimeout(dirHandle.getFileHandle('artisan', { create: false }), 250, null);
        return Boolean(fileHandle);
    }

    getDirectCandidateSegments(rootHandle, buildInfo) {
        const buildFolder = buildInfo.buildFolderName || buildInfo.hostname.replace(/\.local$/i, '') || `${buildInfo.clientName}-${buildInfo.version}`;
        const qLower = buildInfo.quarter.toLowerCase();
        const rootLower = (rootHandle.name || '').toLowerCase();

        const quarterVariants = [`version7-${qLower}`, `v7-${qLower}`, qLower];
        const buildFolderVariants = [buildFolder];
        if (buildInfo.hostname && buildInfo.hostname !== buildFolder) {
            buildFolderVariants.push(buildInfo.hostname);
        }

        let basePrefixes;
        if (rootLower === 'local' || rootLower === 'htdocs') {
            basePrefixes = [[]];
        } else if (rootLower === 'www') {
            basePrefixes = [['local'], []];
        } else if (rootLower === 'wamp64' || rootLower === 'wamp') {
            basePrefixes = [['www', 'local'], ['www'], []];
        } else if (/^(?:version7-|v7-)?q[1-4]$/.test(rootLower)) {
            basePrefixes = [[]];
        } else {
            basePrefixes = [[], ['www', 'local'], ['wamp64', 'www', 'local'], ['local'], ['www']];
        }

        const candidates = [];
        for (const prefix of basePrefixes) {
            for (const qFolder of quarterVariants) {
                for (const bFolder of buildFolderVariants) {
                    candidates.push([...prefix, qFolder, bFolder]);
                }
            }
            for (const bFolder of buildFolderVariants) {
                candidates.push([...prefix, bFolder]);
            }
        }
        candidates.push([]);
        return candidates;
    }

    async getSeedersDirHandle(buildInfo, rootHandle, isCurrentRun = () => true, documentRoot = '', onProgress = null) {
        if (!rootHandle) return null;

        const buildFolder = buildInfo.buildFolderName || buildInfo.hostname.replace(/\.local$/i, '') || `${buildInfo.clientName}-${buildInfo.version}`;
        const qLower = buildInfo.quarter.toLowerCase();
        const tail = SEEDER_TAIL_CANDIDATES[0];

        const tryPath = async (startHandle, segments) => {
            let currentDir = startHandle;
            for (const segment of segments) {
                currentDir = await withFsTimeout(currentDir.getDirectoryHandle(segment, { create: false }), 400, null);
                if (!currentDir) return null;
            }
            return currentDir;
        };

        const normalizedBuildName = buildFolder.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedClient = buildInfo.clientName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedVersion = buildInfo.version.toLowerCase().replace(/[^a-z0-9]/g, '');
        const getRelativePath = segments => segments.length ? segments.join('\\') : rootHandle.name;
        const makeResult = (handle, segments, parentHandle = rootHandle) => ({
            handle,
            parentHandle,
            relativePath: getRelativePath(segments)
        });

        if (/^(?:version7-|v7-)?q[1-4]$/i.test(rootHandle.name) && !rootHandle.name.toLowerCase().endsWith(qLower)) {
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
                const projectHandle = await tryPath(rootHandle, relativeSegments);
                const directHandle = await this.resolveSeedersFromProjectHandle(projectHandle);
                if (directHandle) return makeResult(directHandle, relativeSegments);
            }

            const documentFolderName = projectSegments[projectSegments.length - 1] || '';
            const normalizedDocumentFolder = documentFolderName.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedDocumentFolder) {
                const preferred = await this.findProjectByFolderName(
                    rootHandle,
                    normalizedDocumentFolder,
                    tail,
                    isCurrentRun,
                    true,
                    { onProgress }
                );
                if (preferred) return preferred;
            }
            return null;
        }

        // 1. Parallel O(1) Direct Probing across common layouts (resolves in 1 round-trip)
        if (typeof onProgress === 'function') {
            onProgress(`Checking direct paths in ${rootHandle.name}...`);
        }

        const directCandidates = this.getDirectCandidateSegments(rootHandle, buildInfo);
        const probeResults = await Promise.all(
            directCandidates.map(async (segments) => {
                if (!isCurrentRun()) return null;
                if (segments.length === 0) {
                    const normalizedRootName = rootHandle.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (!normalizedRootName.includes(normalizedClient) || !normalizedRootName.includes(normalizedVersion)) {
                        return null;
                    }
                }
                const projectHandle = segments.length ? await tryPath(rootHandle, segments) : rootHandle;
                if (!projectHandle) return null;
                const seedersHandle = await this.resolveSeedersFromProjectHandle(projectHandle);
                if (!seedersHandle) return null;
                return { segments, seedersHandle };
            })
        );

        const matchedProbe = probeResults.find(Boolean);
        if (matchedProbe) {
            if (!isCurrentRun()) return null;
            const parentHandle = matchedProbe.segments.length
                ? await tryPath(rootHandle, matchedProbe.segments.slice(0, -1))
                : rootHandle;
            if (parentHandle) await this.rememberSharedBuildParent(parentHandle);
            return makeResult(matchedProbe.seedersHandle, matchedProbe.segments, parentHandle || rootHandle);
        }

        // 2. Bounded shallow BFS across sibling/quarter directories (for folders with extra suffixes like client-v7-4-2-1)
        const queue = [{ handle: rootHandle, parentHandle: rootHandle, segments: [], depth: 0 }];
        const partialMatches = [];
        const maxDepth = 3;
        const maxDirectories = 80;
        const deadline = Date.now() + 2000;
        let visited = 0;
        let index = 0;

        while (index < queue.length && visited < maxDirectories) {
            if (!isCurrentRun() || Date.now() > deadline) break;
            const current = queue[index++];
            visited += 1;

            const currentName = current.segments[current.segments.length - 1] || rootHandle.name;
            if (typeof onProgress === 'function' && (visited === 1 || visited % 5 === 0)) {
                onProgress(`Scanning ${rootHandle.name} (${visited} folders)...`);
            }

            const normalizedName = currentName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const isExactMatch = normalizedName === normalizedBuildName;
            const isPrefixOrVersionMatch = !isExactMatch && (
                normalizedName.startsWith(normalizedBuildName) ||
                (normalizedName.includes(normalizedClient) && normalizedName.includes(normalizedVersion))
            );

            if (isExactMatch || isPrefixOrVersionMatch) {
                const seedersHandle = await this.resolveSeedersFromProjectHandle(current.handle);
                if (seedersHandle) {
                    await this.rememberSharedBuildParent(current.parentHandle);
                    const result = makeResult(seedersHandle, current.segments, current.parentHandle);
                    if (isExactMatch) return result;
                    partialMatches.push(result);
                    continue;
                }
            }

            // Do not descend into sibling Laravel projects (their subfolders never contain another build)
            if (current.depth > 0 && await this.isLaravelProjectDir(current.handle)) {
                continue;
            }

            if (current.depth >= maxDepth) continue;

            const entries = await this.readDirectoryEntriesBounded(current.handle, 150, 600);
            for (const [name, entry] of entries) {
                if (!isCurrentRun() || Date.now() > deadline) break;
                if (entry.kind !== 'directory') continue;
                const lower = name.toLowerCase();
                if (FS_IGNORED_DIRS.has(lower)) continue;
                // Skip other quarter folders when searching for a specific quarter
                if (/^(?:version7-|v7-)?q[1-4]$/i.test(lower) && !lower.endsWith(qLower)) continue;

                queue.push({
                    handle: entry,
                    parentHandle: current.handle,
                    segments: [...current.segments, name],
                    depth: current.depth + 1
                });
            }
        }

        return partialMatches.length === 1 ? partialMatches[0] : null;
    }

    async findProjectByFolderName(rootHandle, normalizedFolderName, tail, isCurrentRun = () => true, stopAtFirst = false, options = {}) {
        const onProgress = options.onProgress || null;
        const queue = [{ handle: rootHandle, parentHandle: rootHandle, segments: [], depth: 0 }];
        const matches = [];
        const maxDepth = 4;
        const maxDirectories = 100;
        const deadline = Date.now() + 2500;
        const requireSeederTail = Array.isArray(tail) && tail.length > 0;
        let visited = 0;
        let index = 0;

        while (index < queue.length && visited < maxDirectories) {
            if (!isCurrentRun() || Date.now() > deadline) return null;
            const current = queue[index++];
            visited += 1;

            if (typeof onProgress === 'function' && (visited === 1 || visited % 5 === 0)) {
                onProgress(`Scanning ${rootHandle.name} (${visited} folders)...`);
            }

            const name = current.segments[current.segments.length - 1] || rootHandle.name;
            if (name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedFolderName) {
                const handle = requireSeederTail
                    ? await this.resolveSeedersFromProjectHandle(current.handle)
                    : current.handle;
                if (handle) {
                    const parentHandle = current.parentHandle || rootHandle;
                    if (requireSeederTail) await this.rememberSharedBuildParent(parentHandle);
                    const match = {
                        handle,
                        parentHandle,
                        projectHandle: current.handle,
                        relativePath: current.segments.length ? current.segments.join('\\') : rootHandle.name
                    };
                    if (stopAtFirst) return match;
                    matches.push(match);
                    continue;
                }
            }

            if (current.depth > 0 && await this.isLaravelProjectDir(current.handle)) {
                continue;
            }

            if (current.depth >= maxDepth) continue;

            const entries = await this.readDirectoryEntriesBounded(current.handle, 150, 600);
            for (const [entryName, entry] of entries) {
                if (!isCurrentRun() || Date.now() > deadline) break;
                if (entry.kind !== 'directory') continue;
                if (FS_IGNORED_DIRS.has(entryName.toLowerCase())) continue;
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
            current = await withFsTimeout(current.getDirectoryHandle(segment, { create: false }), 400, null);
            if (!current) return null;
        }
        return current;
    }

    async getHighestSeederNumber(dirHandle) {
        let highest = 0;
        const entries = await this.readDirectoryEntriesBounded(dirHandle, 1000, 1200);
        for (const [name, entry] of entries) {
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
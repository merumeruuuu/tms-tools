const frame = document.getElementById('sandboxFrame');
// Add this anywhere in index.js
const injectLocalApiEndpoint = async (url, apiKey) => {
    if (typeof wampDetector === 'undefined' || typeof fsAccessManager === 'undefined') {
        console.warn("Auto-injector requires wamp-detector.js and fs-access.js");
        return null;
    }

    const urlInfo = wampDetector.parseUrl(url);
    if (!urlInfo.isValid) throw new Error(urlInfo.error);
    const buildInfo = await wampDetector.detectLocalBuild(urlInfo);

    let rootHandle = await fsAccessManager.getRootHandleWithPermission();
    if (!rootHandle) {
        alert(`API Injection Required:\nPlease select your WAMP root folder so the browser can inject the API into ${buildInfo.clientName}.`);
        rootHandle = await fsAccessManager.linkRoot();
    }
    if (!rootHandle) throw new Error("Folder access denied.");

    const projectFolder = buildInfo.buildFolderName || `${buildInfo.clientName}-${buildInfo.version}`;
    const normalizedProjectFolder = projectFolder.toLowerCase().replace(/[^a-z0-9]/g, '');
    const projectMatch = await fsAccessManager.findProjectByFolderName(
        rootHandle,
        normalizedProjectFolder,
        [],
        () => true,
        true
    );
    if (!projectMatch?.projectHandle) {
        throw new Error(`Could not find ${projectFolder} under the selected folder. Choose the build folder itself or a parent folder containing it.`);
    }
    const currentHandle = projectMatch.projectHandle;

    const vendor = await currentHandle.getDirectoryHandle('vendor');
    const timeless = await vendor.getDirectoryHandle('timeless');
    const customers = await timeless.getDirectoryHandle('customers');

    const findFile = async (dirHandle, fileName) => {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file' && entry.name === fileName) {
                return { fileHandle: entry, dirHandle };
            } else if (entry.kind === 'directory') {
                const result = await findFile(entry, fileName);
                if (result) return result;
            }
        }
        return null;
    };

    const ctrlResult = await findFile(customers, 'UtilityController.php');
    const apiResult = await findFile(customers, 'api.php');

    if (!ctrlResult || !apiResult) throw new Error("Could not locate Laravel core files.");

    const ctrlFile = await ctrlResult.fileHandle.getFile();
    let ctrlContent = await ctrlFile.text();

    if (!ctrlContent.includes('fetchQaLabels')) {
        const controllerPayload = `
    public function fetchQaLabels(\\Illuminate\\Http\\Request $request)
    {
        $validKey = env('TMS_QA_LABEL_KEY', '${apiKey || 'tms-qa-super-secret-key-2026'}'); 
        if ($request->header('X-QA-Key') !== $validKey) {
            return response()->json(['error' => 'Unauthorized Access'], 401);
        }
        try {
            $candidateDirs = [];
            $standardPaths = [
                base_path('legacy' . DIRECTORY_SEPARATOR . 'print' . DIRECTORY_SEPARATOR . 'filesprinted'),
                storage_path('app' . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'filesprinted'),
                storage_path('customer' . DIRECTORY_SEPARATOR . 'filesprinted'),
                base_path('public' . DIRECTORY_SEPARATOR . 'filesprinted')
            ];
            foreach ($standardPaths as $path) {
                if (is_dir($path) && is_readable($path)) $candidateDirs[] = $path;
            }
            $searchZones = [base_path('legacy'), storage_path(), base_path('public')];
            $getDirs = function($base, $maxDepth, $currentDepth = 0) use (&$getDirs) {
                $found = [];
                if ($currentDepth > $maxDepth || !is_dir($base) || !is_readable($base)) return $found;
                $items = @scandir($base);
                if (!$items) return $found;
                foreach ($items as $item) {
                    if ($item === '.' || $item === '..') continue;
                    if (in_array(strtolower($item), ['vendor', 'node_modules', 'framework', 'logs'])) continue;
                    $fullPath = $base . DIRECTORY_SEPARATOR . $item;
                    if (is_dir($fullPath)) {
                        $found[] = $fullPath;
                        $found = array_merge($found, $getDirs($fullPath, $maxDepth, $currentDepth + 1));
                    }
                }
                return $found;
            };
            foreach ($searchZones as $zone) {
                $candidateDirs = array_merge($candidateDirs, $getDirs($zone, 2));
            }
            $candidateDirs = array_unique($candidateDirs);
            $activePath = null;
            $maxFiles = -1; 
            $winningFilesList = [];
            foreach ($candidateDirs as $dir) {
                if (!is_readable($dir)) continue;
                $files = @scandir($dir);
                if (!$files) continue;
                $validFiles = [];
                foreach ($files as $file) {
                    if (is_file($dir . DIRECTORY_SEPARATOR . $file) && preg_match('/\\.(epl|zpl)$/i', $file)) {
                        $validFiles[] = $file;
                    }
                }
                $count = count($validFiles);
                if ($count > $maxFiles && $count > 0) {
                    $maxFiles = $count;
                    $activePath = $dir;
                    $winningFilesList = $validFiles;
                }
            }
            if (!$activePath) {
                return response()->json([
                    'error' => 'Directory Not Found',
                    'clue' => 'Recursive Scan failed. Looked everywhere in legacy/ and storage/ but found absolutely no valid directories containing .epl or .zpl files.',
                ], 404);
            }
            return response()->json([
                'success' => true,
                'active_path' => $activePath,
                'files' => array_values($winningFilesList)
            ], 200);
        } catch (\\Throwable $e) {
            return response()->json(['error' => 'Exception Thrown', 'clue' => $e->getMessage()], 500);
        }
    }

    public function downloadQaLabel(\\Illuminate\\Http\\Request $request)
    {
        if ($request->isMethod('OPTIONS')) {
            return response('', 200)->header('Access-Control-Allow-Origin', '*')->header('Access-Control-Allow-Methods', 'GET, OPTIONS')->header('Access-Control-Allow-Headers', 'X-QA-Key, Content-Type');
        }
        $validKey = env('TMS_QA_LABEL_KEY', '${apiKey || 'tms-qa-super-secret-key-2026'}');
        if ($request->header('X-QA-Key') !== $validKey && $request->query('key') !== $validKey) {
            return response()->json(['error' => 'Unauthorized Access'], 401);
        }
        $fileName = basename($request->query('file'));
        if (empty($fileName)) return response()->json(['error' => 'Bad Request'], 400);
        $candidateDirs = [];
        $searchZones = [base_path('legacy'), storage_path(), base_path('public')];
        $getDirs = function($base, $maxDepth, $currentDepth = 0) use (&$getDirs) {
            $found = [];
            if ($currentDepth > $maxDepth || !is_dir($base) || !is_readable($base)) return $found;
            $items = @scandir($base);
            if (!$items) return $found;
            foreach ($items as $item) {
                if ($item === '.' || $item === '..') continue;
                if (in_array(strtolower($item), ['vendor', 'node_modules', 'framework', 'logs'])) continue;
                $fullPath = $base . DIRECTORY_SEPARATOR . $item;
                if (is_dir($fullPath)) {
                    $found[] = $fullPath;
                    $found = array_merge($found, $getDirs($fullPath, $maxDepth, $currentDepth + 1));
                }
            }
            return $found;
        };
        foreach ($searchZones as $zone) {
            $candidateDirs = array_merge($candidateDirs, $getDirs($zone, 2));
        }
        $candidateDirs = array_unique($candidateDirs);
        $activePath = null;
        foreach ($candidateDirs as $dir) {
            $filePath = $dir . DIRECTORY_SEPARATOR . $fileName;
            if (file_exists($filePath) && is_file($filePath)) {
                $activePath = $dir;
                break;
            }
        }
        if (!$activePath) return response()->json(['error' => 'File Not Found', 'clue' => "Scanned all folders recursively. {$fileName} does not exist anywhere."], 404);
        $path = $activePath . DIRECTORY_SEPARATOR . $fileName;
        if (!is_readable($path)) return response()->json(['error' => 'Permission Denied'], 403);
        $content = file_get_contents($path);
        if ($content === false) return response()->json(['error' => 'Read Failed'], 500);
        return response($content, 200)->header('Content-Type', 'text/plain')->header('Access-Control-Allow-Origin', '*');
    }`;

        ctrlContent = ctrlContent.replace(/(\s*)\}(?=\s*(?:\?>\s*)?$)/, `\n${controllerPayload}\n}`);
        const ctrlWritable = await ctrlResult.fileHandle.createWritable();
        await ctrlWritable.write(ctrlContent);
        await ctrlWritable.close();
    }

    const apiFile = await apiResult.fileHandle.getFile();
    let apiContent = await apiFile.text();

    if (!apiContent.includes("Route::prefix('labels')")) {
        const routePayload = `
            Route::prefix('labels')->group(function () {
                Route::get('fetch', 'TMS\\Customers\\Controllers\\UtilityController@fetchQaLabels');
                Route::get('download', 'TMS\\Customers\\Controllers\\UtilityController@downloadQaLabel'); 
            });`;

        apiContent = apiContent.replace(/(Route::post\('emr-validate-barcode'.*?)(?=\s*\}\);)/s, `$1\n${routePayload}`);
        const apiWritable = await apiResult.fileHandle.createWritable();
        await apiWritable.write(apiContent);
        await apiWritable.close();
        
    }
    // 6. Natively Clear Laravel Route Cache
    try {
        const bootstrapDir = await currentHandle.getDirectoryHandle('bootstrap');
        const cacheDir = await bootstrapDir.getDirectoryHandle('cache');
        
        // Delete the cached route files so Laravel is forced to detect our new endpoints
        await cacheDir.removeEntry('routes.php').catch(() => {});
        await cacheDir.removeEntry('routes-v7.php').catch(() => {});
        console.log("Laravel route cache natively cleared!");
    } catch (cacheErr) {
        console.warn("No route cache found to clear, or access denied.", cacheErr);
    }

    return buildInfo;
};

// ... Further down in index.js, inside your existing message listener ...
window.addEventListener('message', (event) => {
    if (event.source !== frame.contentWindow) return;
    
    // Add this new listener condition!
    if (event.data.action === 'INJECT_API') {
        injectLocalApiEndpoint(event.data.url, event.data.apiKey)
            .then(buildInfo => {
                if (buildInfo) console.log("API Injected for", buildInfo.clientName);
                if (event.data.id) frame.contentWindow.postMessage({
                    action: 'INJECT_API_RESULT',
                    id: event.data.id,
                    success: Boolean(buildInfo)
                }, '*');
            })
            .catch(err => {
                console.warn("Auto-Injection skipped or failed:", err);
                if (event.data.id) frame.contentWindow.postMessage({
                    action: 'INJECT_API_RESULT',
                    id: event.data.id,
                    success: false,
                    error: err.message
                }, '*');
            });
    }
});
frame.onload = () => {
    chrome.storage.local.get(null, (allData) => {
        frame.contentWindow.postMessage({ action: 'SYNC_STORAGE', data: allData || {} }, '*');
    });
};

window.addEventListener('message', async (event) => {
    if (event.source !== frame.contentWindow) return;

    if (event.data.action === 'SWITCH_BUILD_FOLDER') {
        const respond = result => frame.contentWindow.postMessage({
            action: 'SWITCH_BUILD_FOLDER_RESULT',
            id: event.data.id,
            ...result
        }, '*');

        if (typeof fsAccessManager === 'undefined' || !fsAccessManager.isSupported()) {
            respond({ success: false, error: 'Folder access is not supported in this browser.' });
            return;
        }

        try {
            const handle = await window.showDirectoryPicker({
                id: 'label-simulator-build-root',
                mode: 'readwrite'
            });
            let permission = await handle.queryPermission({ mode: 'readwrite' });
            if (permission !== 'granted') permission = await handle.requestPermission({ mode: 'readwrite' });
            if (permission !== 'granted') throw new Error('Permission was not granted for the selected folder.');

            await fsAccessManager.setStoredHandle(fsAccessManager.rootKey, handle);
            respond({ success: true, folderName: handle.name });
        } catch (error) {
            respond({
                success: false,
                cancelled: error.name === 'AbortError',
                error: error.name === 'AbortError' ? '' : error.message
            });
        }
        return;
    }

    // 1. Storage Saves
    if (event.data.action === 'SAVE_STORAGE') {
        chrome.storage.local.set({ [event.data.key]: event.data.value });
    }
    // Return to the dashboard selection page from the outer shell.
    if (event.data.action === 'GO_DASHBOARD') {
        window.location.href = '../../dashboard/index.html';
        return;
    }
    // 3. NEW: Safely reload the extension when the sandbox asks
    if (event.data.action === 'RELOAD_APP') {
        window.location.reload();
    }
    // 4. NEW: The Nuclear Option (Wipes Chrome's native storage)
    if (event.data.action === 'CLEAR_ALL_STORAGE') {
        chrome.storage.local.clear(() => {
            console.log("💥 Chrome storage completely wiped.");
        });
    }
    
// 2. NEW: The VIP Fetch Proxy (Bypasses CORS!)
    if (event.data.action === 'FETCH_API') {
        try {
            const response = await fetch(event.data.url, {
                method: event.data.method || 'GET', //  FIX: Reads the dynamic method (defaults to GET)
                headers: event.data.headers
            });
            
            const textData = await response.text(); 
            
            if (!response.ok) {
                throw new Error(textData);
            }
            
            frame.contentWindow.postMessage({ 
                action: 'FETCH_SUCCESS', id: event.data.id, data: textData 
            }, '*');
        } catch (error) {
            frame.contentWindow.postMessage({ 
                action: 'FETCH_ERROR', id: event.data.id, error: error.message 
            }, '*');
        }
    }
});
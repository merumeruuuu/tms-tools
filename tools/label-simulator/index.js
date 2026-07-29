const frame = document.getElementById('sandboxFrame');

frame.onload = () => {
    chrome.storage.local.get(null, (allData) => {
        frame.contentWindow.postMessage({ action: 'SYNC_STORAGE', data: allData || {} }, '*');
    });
};

window.addEventListener('message', async (event) => {
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
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
    
    // 2. Safely reload the extension when the sandbox asks
    if (event.data.action === 'RELOAD_APP') {
        window.location.reload();
    }
    
    // 3. The Nuclear Option (Wipes Chrome's native storage)
    if (event.data.action === 'CLEAR_ALL_STORAGE') {
        chrome.storage.local.clear(() => {
            console.log("🔒 Chrome storage completely wiped.");
        });
    }

    // 4. HARDENED VIP Fetch Proxy (Bypasses CORS but RESTRICTS to Local Only!)
    if (event.data.action === 'FETCH_API') {
        try {
            const targetUrl = new URL(event.data.url);
            
            // 🛡️ SECURITY ENFORCEMENT: Only allow specific local/internal domains
            const allowedDomains = ['localhost', '127.0.0.1', '.local', '.timelessmedical.com'];
            const isAllowed = allowedDomains.some(domain => 
                targetUrl.hostname === domain || targetUrl.hostname.endsWith(domain)
            );

            if (!isAllowed) {
                console.error(`🚨 SECURITY BLOCK: Attempted to fetch external URL: ${event.data.url}`);
                throw new Error('SECURITY BLOCK: External API calls are strictly forbidden. HIPAA/PHI local environment enforced.');
            }

            const response = await fetch(event.data.url, {
                method: event.data.method || 'GET',
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
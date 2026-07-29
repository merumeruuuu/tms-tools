const memoryStorage = {
    _data: {},
    getItem: function(key) { return this._data[key] || null; },
    setItem: function(key, val) { 
        this._data[key] = String(val); 
        // Send a message to index.html to save this permanently!
        window.parent.postMessage({ action: 'SAVE_STORAGE', key: key, value: String(val) }, '*');
    },
    removeItem: function(key) { delete this._data[key]; },
    clear: function() { this._data = {}; },
    get length() { return Object.keys(this._data).length; }
};
Object.defineProperty(window, 'localStorage', { value: memoryStorage });
Object.defineProperty(window, 'sessionStorage', { value: memoryStorage });

// Wait for index.html to send our saved data BEFORE booting Vue!
window.addEventListener('message', (event) => {
    if (event.data.action === 'SYNC_STORAGE') {
        memoryStorage._data = event.data.data;
        
        // Now that we have our saved URLs, it is safe to load the Vue app!
        const script = document.createElement('script');
        script.type = 'module';
        script.src = './js/app.js';
        document.head.appendChild(script);
    }
});
class ApiService {
    constructor() {
        this.configKey = 'tms_api_config';
        this.cachedProducts = [];
        this.config = this.loadConfig();
    }

    loadConfig() {
        const defaults = {
            baseUrl: 'https://nutritionsourceqa2.internal.timelessmedical.com',
            token: ''
        };
        try {
            const saved = JSON.parse(localStorage.getItem(this.configKey));
            return saved ? { ...defaults, ...saved } : defaults;
        } catch {
            return defaults;
        }
    }

    saveConfig(configData) {
        this.config = { ...this.config, ...configData };
        localStorage.setItem(this.configKey, JSON.stringify(this.config));
    }

    isConfigured() {
        return Boolean(this.config.baseUrl && this.config.token);
    }

    getHeaders(tokenOverride) {
        const token = (tokenOverride !== undefined ? tokenOverride : this.config.token || '').trim();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    extractProductList(json) {
        if (Array.isArray(json)) return json;
        if (Array.isArray(json?.data)) return json.data;
        if (Array.isArray(json?.data?.ProductData)) return json.data.ProductData;
        if (Array.isArray(json?.data?.Products)) return json.data.Products;
        if (Array.isArray(json?.ProductData)) return json.ProductData;
        return [];
    }

    // Validate Base URL + Bearer Token against /api/internal/cpoe/v1/get-active-products/0
    async testConnection(baseUrl, token) {
        const cleanBase = (baseUrl || this.config.baseUrl || '').replace(/\/$/, '');
        if (!cleanBase || !token) {
            throw new Error('API Base URL and Personal Access Token are required.');
        }

        const url = `${cleanBase}/api/internal/cpoe/v1/get-active-products/0`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(token)
            });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const json = await response.json();
            if (json && json.success === false) {
                throw new Error(json.message || 'API reported failure');
            }

            const items = this.extractProductList(json);
            const totalRecords = Number(json?.data?.TotalRecords ?? json?.TotalRecords ?? items.length) || items.length;

            return {
                success: true,
                totalRecords,
                sampleCount: items.length
            };
        } catch (error) {
            console.error('API Connection Test Error:', error);
            throw new Error(`Connection failed: ${error.message}`);
        }
    }

    // Fetch all active products across all facilities via /api/internal/cpoe/v1/get-active-products/{offset}
    async fetchProducts(onProgress) {
        if (!this.isConfigured()) {
            throw new Error('API is not configured. Please set your Base URL and Token.');
        }

        const baseUrl = this.config.baseUrl.replace(/\/$/, '');
        const headers = this.getHeaders();

        try {
            const initialUrl = `${baseUrl}/api/internal/cpoe/v1/get-active-products/0`;
            const response = await fetch(initialUrl, { method: 'GET', headers });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const json = await response.json();
            if (json && json.success === false) {
                throw new Error(json.message || 'Failed to fetch active products');
            }

            let allProducts = this.extractProductList(json);
            const totalRecords = Number(json?.data?.TotalRecords ?? json?.TotalRecords ?? allProducts.length) || allProducts.length;
            const limit = Number(json?.data?.Limit ?? json?.Limit ?? allProducts.length) || allProducts.length;
            let loadedCount = allProducts.length;

            if (typeof onProgress === 'function') {
                onProgress(loadedCount, totalRecords);
            }

            // Paginate remaining pages if TotalRecords exceeds the initial page size
            if (limit > 0 && totalRecords > allProducts.length) {
                const fetchPromises = [];

                for (let offset = limit; offset < totalRecords; offset += limit) {
                    const pageUrl = `${baseUrl}/api/internal/cpoe/v1/get-active-products/${offset}`;

                    const pagePromise = fetch(pageUrl, { method: 'GET', headers })
                        .then(res => {
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            return res.json();
                        })
                        .then(pageJson => {
                            const pageItems = this.extractProductList(pageJson);
                            loadedCount += pageItems.length;
                            if (typeof onProgress === 'function') {
                                onProgress(Math.min(loadedCount, totalRecords), totalRecords);
                            }
                            return pageItems;
                        })
                        .catch(err => {
                            console.warn(`Failed to fetch active products at offset ${offset}:`, err);
                            return [];
                        });

                    fetchPromises.push(pagePromise);
                }

                const remainingPages = await Promise.all(fetchPromises);
                remainingPages.forEach(pageData => {
                    allProducts = allProducts.concat(pageData);
                });
            }

            this.cachedProducts = allProducts;
            return this.cachedProducts;
        } catch (error) {
            console.error('Active Products Fetch Error:', error);
            throw new Error(`Failed to retrieve active products: ${error.message}`);
        }
    }

    // Resolve item details directly from the active-products payload (no facility ID required)
    async fetchProductDetails(itemIdsArray) {
        if (!Array.isArray(itemIdsArray) || itemIdsArray.length === 0) return [];

        if (!Array.isArray(this.cachedProducts) || this.cachedProducts.length === 0) {
            await this.fetchProducts();
        }

        const idSet = new Set(itemIdsArray.map(id => String(id)));
        return this.cachedProducts
            .filter(p => idSet.has(String(p.ItemID)))
            .map(p => ({
                ...p,
                Nutrients: p.Calorie !== undefined && p.Calorie !== null
                    ? [{ Description: 'Calories', Value: p.Calorie }]
                    : []
            }));
    }
}

window.apiService = new ApiService();
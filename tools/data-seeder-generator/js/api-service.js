class ApiService {
    constructor() {
        this.configKey = 'tms_api_config';
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            return JSON.parse(localStorage.getItem(this.configKey)) || { baseUrl: 'https://nutritionsourceqa2.internal.timelessmedical.com', token: '', facilityId: '', facilityName: '' };
        } catch {
            return { baseUrl: 'https://nutritionsourceqa2.internal.timelessmedical.com', token: '', facilityId: '', facilityName: '' };
        }
    }

    saveConfig(configData) {
        this.config = { ...this.config, ...configData };
        localStorage.setItem(this.configKey, JSON.stringify(this.config));
    }

    isConfigured() {
        return this.config.token && this.config.facilityId;
    }

    // API 1: Fetch Facilities
    async fetchFacilities(baseUrl, token) {
        const url = `${baseUrl.replace(/\/$/, '')}/api/internal/cpoe/v1/get-facilities`;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            
            const json = await response.json();
            if (!json.success) throw new Error(json.message || 'API reported failure');
            if (!json.data || !json.data.Facilities) throw new Error('Invalid response format');

            return json.data.Facilities;
        } catch (error) {
            console.error('API Fetch Error:', error);
            throw new Error(`Connection failed: ${error.message}`);
        }
    }
    // API 2: Get ALL Products by Facility (with Pagination)
    async fetchProducts() {
        if (!this.isConfigured()) throw new Error('API is not configured. Please set your Token and Facility.');
        
        const baseUrl = this.config.baseUrl.replace(/\/$/, '');
        const facId = this.config.facilityId;
        const headers = {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        try {
            // 1. Fetch the very first page to see how many total records exist
            const initialUrl = `${baseUrl}/api/internal/cpoe/v1/get-product-by-facility/${facId}/0/1`;
            const response = await fetch(initialUrl, { method: 'GET', headers });
            
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            
            const json = await response.json();
            if (!json.success) throw new Error(json.message || 'Failed to fetch products');
            
            let allProducts = json.data?.ProductData || [];
            const totalRecords = json.data?.TotalRecords || 0;
            const limit = json.data?.Limit || 10;

            // 2. If there are more products than the limit, fetch the remaining pages
            if (totalRecords > limit) {
                const fetchPromises = [];
                
                // Create requests for every offset (10, 20, 30, etc.)
                for (let offset = limit; offset < totalRecords; offset += limit) {
                    const pageUrl = `${baseUrl}/api/internal/cpoe/v1/get-product-by-facility/${facId}/${offset}/1`;
                    
                    const pagePromise = fetch(pageUrl, { method: 'GET', headers })
                        .then(res => res.json())
                        .then(pageJson => pageJson.data?.ProductData || [])
                        .catch(err => {
                            console.warn(`Failed to fetch offset ${offset}`, err);
                            return []; // If one page fails, return empty array so the rest succeed
                        });
                        
                    fetchPromises.push(pagePromise);
                }

                // Execute all remaining fetches concurrently for speed
                const remainingPages = await Promise.all(fetchPromises);
                
                // Combine all pages into our master array
                remainingPages.forEach(pageData => {
                    allProducts = allProducts.concat(pageData);
                });
            }
            
            this.cachedProducts = allProducts;
            return this.cachedProducts;
            
        } catch (error) {
            console.error('API 2 Fetch Error:', error);
            throw new Error(`Failed to retrieve catalog: ${error.message}`);
        }
    }
    // API 3: Get Nutritional Information by Product
    async fetchProductDetails(itemIdsArray) {
        if (!this.isConfigured()) throw new Error('API not configured.');
        
        const itemIdsString = itemIdsArray.join(',');
        const url = `${this.config.baseUrl.replace(/\/$/, '')}/api/internal/cpoe/v1/get-product-by-itemid/${this.config.facilityId}/${itemIdsString}`;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            
            const json = await response.json();
            if (!json.success) throw new Error(json.message || 'Failed to fetch details');
            
            return json.data?.theItems || [];
        } catch (error) {
            console.error('API 3 Fetch Error:', error);
            throw new Error(`Failed to retrieve product details: ${error.message}`);
        }
    }
}

window.apiService = new ApiService();
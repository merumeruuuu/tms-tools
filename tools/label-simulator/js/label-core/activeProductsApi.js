// label-core/activeProductsApi.js
import { loadSavedApiConfig } from './milkBankApi.js';

function mapManufacturerCategory(rawMfg) {
    const clean = String(rawMfg || '').trim();
    if (!clean) return 'Undefined';
    const lower = clean.toLowerCase();
    if (lower.includes('prolacta')) return 'Prolacta';
    if (lower.includes('mead johnson') || lower === 'mjn') return 'MJN';
    if (lower.includes('cera')) return 'Cera Products';
    if (lower.includes('abbott')) return 'Abbott';
    if (lower.includes('nestle')) return 'Nestle';
    if (lower.includes('nutricia')) return 'Nutricia';
    if (lower.includes('gerber')) return 'Gerber';
    if (lower === 'undefined') return 'Undefined';
    return clean;
}

function extractProductArray(rawJson) {
    if (Array.isArray(rawJson)) return rawJson;
    if (Array.isArray(rawJson?.data?.ProductData)) return rawJson.data.ProductData;
    if (Array.isArray(rawJson?.data?.Products)) return rawJson.data.Products;
    if (Array.isArray(rawJson?.ProductData)) return rawJson.ProductData;
    if (Array.isArray(rawJson?.data)) return rawJson.data;
    return [];
}

export function normalizeActiveProductsPayload(rawItems, savedOverrides = {}) {
    const seenKeys = new Set();
    const normalized = [];

    for (const item of rawItems || []) {
        if (!item) continue;
        if (item.ItemStatus && String(item.ItemStatus).toLowerCase() !== 'active') continue;

        const productId = String(item.ItemNumber ?? item.ItemID ?? '').trim();
        const itemId = String(item.ItemID ?? '').trim();
        const rawFamily = String(item.FamilyName || '').replace(/[®™©]/g, '').trim();
        const flavor = String(item.ItemFlavor || '').trim();

        let displayName = rawFamily || `Item ${productId || itemId}`;
        if (flavor && flavor.toLowerCase() !== 'unflavored' && !displayName.toLowerCase().includes(flavor.toLowerCase())) {
            displayName = `${displayName} (${flavor})`;
        }

        const dedupeKey = `${productId}|${itemId}|${displayName}`;
        if (seenKeys.has(dedupeKey)) continue;
        seenKeys.add(dedupeKey);

        const barcodes = [];
        const seenBarcodes = new Set();
        const pushBarcode = (type, val) => {
            const cleanVal = String(val ?? '').trim();
            if (!cleanVal || cleanVal.toLowerCase() === 'null' || seenBarcodes.has(cleanVal)) return;
            seenBarcodes.add(cleanVal);
            barcodes.push({ type: type || 'Unit', value: cleanVal });
        };

        pushBarcode('Case', item.CaseBarcode);
        pushBarcode('Carton', item.CartonBarcode);
        pushBarcode((item.PrimaryPackage || 'Unit').trim(), item.PrimaryBarcode);

        // Merge any user-saved custom barcodes for this productId
        const overrideBarcodes = productId && Array.isArray(savedOverrides[productId])
            ? savedOverrides[productId]
            : [];
        for (const ob of overrideBarcodes) {
            if (ob && ob.value) {
                pushBarcode(ob.type || 'Custom', ob.value);
            }
        }

        const manufacturerName = String(item.ManufacturerName || '').trim();
        normalized.push({
            category: mapManufacturerCategory(manufacturerName),
            manufacturerName,
            name: displayName,
            productId,
            itemId,
            flavor,
            formType: String(item.FormType || '').trim(),
            calorie: item.Calorie ?? '',
            displacement: item.Displacement ?? '',
            barcodes
        });
    }

    return normalized;
}

export function createActiveProductsController({
    ref,
    productsData,
    defaultProducts,
    productOverrides,
    extensionFetch,
    openApiSettingsModal
}) {
    const isLoadingProducts = ref(false);
    const productSyncProgress = ref(0);
    const productSourceStatus = ref('');

    const loadInitialProducts = () => {
        try {
            const stored = localStorage.getItem('tms_products');
            if (stored && stored.length > 2) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    productsData.value = parsed;
                    productSourceStatus.value = `📦 ${parsed.length} products loaded from local cache`;
                    return;
                }
            }
        } catch (e) {
            console.warn('Error loading cached tms_products:', e);
        }
        productsData.value = [...defaultProducts];
        productSourceStatus.value = `📦 Using bundled list (${productsData.value.length}) — set API token to sync live`;
    };

    const fetchActiveProductsFromApi = async (interactive = false) => {
        const cfg = loadSavedApiConfig();
        if (!cfg.baseUrl || !cfg.token) {
            productSourceStatus.value = `📦 Using cached list (${productsData.value.length}) — set API token to sync live`;
            if (interactive && typeof openApiSettingsModal === 'function') {
                openApiSettingsModal('Enter your Nutrition Source API Base URL and Bearer token to fetch active products.');
            }
            return false;
        }

        const cleanBase = cfg.baseUrl.replace(/\/$/, '');
        const headers = {
            'Authorization': `Bearer ${cfg.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        isLoadingProducts.value = true;
        productSyncProgress.value = 5;
        productSourceStatus.value = '⏳ Connecting to Nutrition Source active products API...';

        try {
            const initialUrl = `${cleanBase}/api/internal/cpoe/v1/get-active-products/0`;
            const rawInitial = await extensionFetch(initialUrl, headers, 'GET');
            const initialJson = typeof rawInitial === 'string' ? JSON.parse(rawInitial) : rawInitial;

            if (initialJson && initialJson.success === false) {
                throw new Error(initialJson.message || 'API returned failure');
            }

            let allRawItems = extractProductArray(initialJson);
            const totalRecords = Number(initialJson?.data?.TotalRecords ?? initialJson?.TotalRecords ?? allRawItems.length) || allRawItems.length;
            const limit = Number(initialJson?.data?.Limit ?? initialJson?.Limit ?? allRawItems.length) || allRawItems.length;

            if (totalRecords > 0) {
                productSyncProgress.value = Math.min(100, Math.max(5, Math.round((allRawItems.length / totalRecords) * 100)));
                productSourceStatus.value = `⏳ Syncing active products... ${allRawItems.length} / ${totalRecords} (${productSyncProgress.value}%)`;
            }

            if (limit > 0 && totalRecords > allRawItems.length) {
                const offsets = [];
                for (let offset = limit; offset < totalRecords; offset += limit) {
                    offsets.push(offset);
                }

                const BATCH_SIZE = 12;
                for (let i = 0; i < offsets.length; i += BATCH_SIZE) {
                    const batch = offsets.slice(i, i + BATCH_SIZE);
                    const batchResults = await Promise.all(
                        batch.map(async (offset) => {
                            const pageUrl = `${cleanBase}/api/internal/cpoe/v1/get-active-products/${offset}`;
                            try {
                                const rawPage = await extensionFetch(pageUrl, headers, 'GET');
                                const pageJson = typeof rawPage === 'string' ? JSON.parse(rawPage) : rawPage;
                                return extractProductArray(pageJson);
                            } catch (pageErr) {
                                console.warn(`Failed to fetch active products at offset ${offset}:`, pageErr);
                                return [];
                            }
                        })
                    );

                    for (const pageItems of batchResults) {
                        allRawItems = allRawItems.concat(pageItems);
                    }

                    const loaded = Math.min(allRawItems.length, totalRecords);
                    const pct = Math.min(100, Math.round((loaded / totalRecords) * 100));
                    productSyncProgress.value = pct;
                    productSourceStatus.value = `⏳ Syncing active products... ${loaded} / ${totalRecords} (${pct}%)`;
                }
            }

            const normalized = normalizeActiveProductsPayload(allRawItems, productOverrides.value || {});
            if (normalized.length === 0) {
                throw new Error('No active products returned by API.');
            }

            productsData.value = normalized;
            const serialized = JSON.stringify(normalized);
            localStorage.setItem('tms_products', serialized);
            window.parent.postMessage({
                action: 'SAVE_STORAGE',
                key: 'tms_products',
                value: serialized
            }, '*');

            productSyncProgress.value = 100;
            productSourceStatus.value = `✅ Synced ${normalized.length} active products from Nutrition Source API`;

            if (interactive) {
                alert(`✅ Loaded ${normalized.length} active products from Nutrition Source!`);
            }
            return true;
        } catch (error) {
            console.warn('Active products API fetch failed, keeping cached/fallback list:', error);
            productSourceStatus.value = `⚠️ Offline/Fallback (${productsData.value.length} cached): ${error.message}`;
            if (interactive) {
                alert(`Failed to load active products: ${error.message}`);
            }
            return false;
        } finally {
            isLoadingProducts.value = false;
            setTimeout(() => {
                productSyncProgress.value = 0;
            }, 1500);
        }
    };

    return {
        isLoadingProducts,
        productSyncProgress,
        productSourceStatus,
        loadInitialProducts,
        fetchActiveProductsFromApi
    };
}
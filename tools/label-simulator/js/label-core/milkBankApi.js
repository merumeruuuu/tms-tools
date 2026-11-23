// label-core/milkBankApi.js

const DEFAULT_NS_API_BASE_URL = 'https://nutritionsourceqa2.internal.timelessmedical.com';

export function loadSavedApiConfig() {
    try {
        const parsed = JSON.parse(localStorage.getItem('tms_api_config') || 'null');
        return {
            baseUrl: (parsed?.baseUrl || DEFAULT_NS_API_BASE_URL).trim(),
            token: (parsed?.token || '').trim()
        };
    } catch {
        return { baseUrl: DEFAULT_NS_API_BASE_URL, token: '' };
    }
}

export function normalizeMilkBankPayload(rawJson) {
    const list = Array.isArray(rawJson?.data?.milkbanks)
        ? rawJson.data.milkbanks
        : Array.isArray(rawJson?.milkbanks)
            ? rawJson.milkbanks
            : Array.isArray(rawJson?.data)
                ? rawJson.data
                : [];

    return list
        .filter(item => item && (!item.status || String(item.status).toLowerCase() === 'active'))
        .map(item => ({
            id: String(item.trace_id ?? item.id ?? ''),
            uuid: item.uuid || '',
            name: String(item.name || '').trim(),
            shortname: String(item.shortname || '').trim(),
            trace_id: item.trace_id ?? item.id ?? '',
            status: item.status || 'Active'
        }))
        .filter(item => item.id && item.name);
}

export function createMilkBankController({ ref, computed, demoSettings, defaultMilkBanks, extensionFetch }) {
    const loadInitialMilkBanks = () => {
        try {
            const cached = JSON.parse(localStorage.getItem('tms_milkbanks') || 'null');
            if (Array.isArray(cached) && cached.length > 0) return cached;
        } catch (e) {
            console.warn('Failed to parse cached tms_milkbanks:', e);
        }
        return [...defaultMilkBanks];
    };

    const milkBanks = ref(loadInitialMilkBanks());
    const isLoadingMilkBanks = ref(false);
    const milkBankSourceStatus = ref('');
    const showApiSettingsModal = ref(false);
    const initialCfg = loadSavedApiConfig();
    const apiBaseUrlInput = ref(initialCfg.baseUrl);
    const apiTokenInput = ref(initialCfg.token);
    const apiSettingsFeedback = ref('');
    const apiSettingsError = ref(false);

    const milkBankSearchQuery = ref('Timeless');
    const showMilkBankDropdown = ref(false);

    const filteredMilkBanks = computed(() => {
        const query = milkBankSearchQuery.value.toLowerCase().trim();
        const list = milkBanks.value || [];
        if (!query) return list;
        return list.filter(b =>
            (b.name && b.name.toLowerCase().includes(query)) ||
            (b.shortname && b.shortname.toLowerCase().includes(query))
        );
    });

    const selectMilkBank = (bank) => {
        demoSettings.value.selectedBankId = bank.id;
        milkBankSearchQuery.value = bank.name;
        showMilkBankDropdown.value = false;
    };

    const handleMilkBankBlur = () => {
        setTimeout(() => {
            showMilkBankDropdown.value = false;
            const currentBank = (milkBanks.value || []).find(b => String(b.id) === String(demoSettings.value.selectedBankId));
            if (currentBank) milkBankSearchQuery.value = currentBank.name;
        }, 200);
    };

    const syncSelectedMilkBankDisplay = () => {
        const list = milkBanks.value || [];
        if (!list.length) return;
        let active = list.find(b => String(b.id) === String(demoSettings.value.selectedBankId));
        if (!active) {
            active = list.find(b => String(b.id) === '1') || list[0];
            demoSettings.value.selectedBankId = active.id;
        }
        milkBankSearchQuery.value = active.name;
    };

    const openApiSettingsModal = (initialErrorMessage = '') => {
        const cfg = loadSavedApiConfig();
        apiBaseUrlInput.value = cfg.baseUrl;
        apiTokenInput.value = cfg.token;
        apiSettingsFeedback.value = typeof initialErrorMessage === 'string' ? initialErrorMessage : '';
        apiSettingsError.value = Boolean(initialErrorMessage);
        showApiSettingsModal.value = true;
    };

    const fetchMilkBanksFromApi = async (interactive = false) => {
        const cfg = loadSavedApiConfig();
        if (!cfg.baseUrl || !cfg.token) {
            milkBankSourceStatus.value = `📦 Using cached list (${milkBanks.value.length}) — set API token to sync live`;
            if (interactive) {
                openApiSettingsModal();
                apiSettingsError.value = true;
                apiSettingsFeedback.value = 'Enter your Nutrition Source API Base URL and Bearer token to fetch milk banks.';
            }
            return false;
        }

        const endpoint = `${cfg.baseUrl.replace(/\/$/, '')}/mbms-api/v1/get-milkbank-list`;
        isLoadingMilkBanks.value = true;
        try {
            const rawResponse = await extensionFetch(endpoint, {
                'Authorization': `Bearer ${cfg.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }, 'GET');

            const parsed = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
            if (parsed && parsed.success === false) {
                throw new Error(parsed.message || 'API returned failure');
            }

            const normalized = normalizeMilkBankPayload(parsed);
            if (normalized.length === 0) {
                throw new Error('No active milk banks returned by API.');
            }

            milkBanks.value = normalized;
            localStorage.setItem('tms_milkbanks', JSON.stringify(normalized));
            syncSelectedMilkBankDisplay();
            milkBankSourceStatus.value = `✅ Synced ${normalized.length} milk banks from Nutrition Source API`;
            if (interactive) {
                alert(`✅ Loaded ${normalized.length} active milk banks from Nutrition Source!`);
            }
            return true;
        } catch (error) {
            console.warn('Milk bank API fetch failed, using cached/fallback list:', error);
            milkBankSourceStatus.value = `⚠️ Offline/Fallback (${milkBanks.value.length} cached): ${error.message}`;
            if (interactive) {
                alert(`Failed to load milk banks: ${error.message}`);
            }
            return false;
        } finally {
            isLoadingMilkBanks.value = false;
        }
    };

    const saveAndFetchMilkBanks = async () => {
        const baseUrl = (apiBaseUrlInput.value || '').trim().replace(/\/$/, '');
        const token = (apiTokenInput.value || '').trim();
        if (!baseUrl || !token) {
            apiSettingsError.value = true;
            apiSettingsFeedback.value = 'API Base URL and Personal Access Token are required.';
            return;
        }

        let existingConfig = {};
        try {
            existingConfig = JSON.parse(localStorage.getItem('tms_api_config') || '{}') || {};
        } catch {
            existingConfig = {};
        }
        localStorage.setItem('tms_api_config', JSON.stringify({
            ...existingConfig,
            baseUrl,
            token
        }));

        apiSettingsError.value = false;
        apiSettingsFeedback.value = 'Connecting to Nutrition Source...';
        const ok = await fetchMilkBanksFromApi(false);
        if (ok) {
            apiSettingsError.value = false;
            apiSettingsFeedback.value = `✅ Connected! Loaded ${milkBanks.value.length} active milk banks.`;
        } else {
            apiSettingsError.value = true;
            apiSettingsFeedback.value = milkBankSourceStatus.value;
        }
    };

    return {
        milkBanks,
        isLoadingMilkBanks,
        milkBankSourceStatus,
        showApiSettingsModal,
        apiBaseUrlInput,
        apiTokenInput,
        apiSettingsFeedback,
        apiSettingsError,
        milkBankSearchQuery,
        showMilkBankDropdown,
        filteredMilkBanks,
        selectMilkBank,
        handleMilkBankBlur,
        syncSelectedMilkBankDisplay,
        openApiSettingsModal,
        fetchMilkBanksFromApi,
        saveAndFetchMilkBanks
    };
}
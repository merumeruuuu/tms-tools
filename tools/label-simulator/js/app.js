import { createApp, ref, onMounted, onUnmounted, computed, watch } from '../libs/vue.esm-browser.prod.js';
import { ready } from "../libs/zpl-renderer.min.js";

import { TimelessEncryption } from './label-core/encryption.js';
import { printerConfigs, milkBanks, BASE_FACTORY_SIGNATURES, DEMO_PRODUCT_SIGNATURES, sizeOffsets, commonLabelFonts } from './label-core/configs.js';
import { formatRawLabelCode, getBcType, extractZplBlocks } from './label-core/parserUtils.js';
import { getMilkBankTemplate } from './label-core/demoTemplates.js';
import { defaultProducts } from '../libs/tms-products.js';
import { defaultCalibrations } from '../libs/tms-calibrations.js';
const fakeStorage = {
    cache: {},
    getItem(key) { return this.cache[key] || null; },
    setItem(key, val) { this.cache[key] = String(val); },
    removeItem(key) { delete this.cache[key]; },
    clear() { this.cache = {}; }
};
const envMeta = document.querySelector('meta[name="tms-env"]');
const ENV_DEV_MODE = envMeta ? envMeta.getAttribute('data-dev-mode') === 'true' : false;
const ENV_ENCRYPTION_KEY = envMeta ? envMeta.getAttribute('data-encryption-key') : '';
const ENV_QA_API_KEY = envMeta ? envMeta.getAttribute('data-qa-api-key') : '';

const timelessEncryptor = new TimelessEncryption(ENV_ENCRYPTION_KEY);
//  THE PROXY HELPER (Now supports GET, POST, etc.)
const extensionFetch = (url, headers, method = 'GET') => {
    return new Promise((resolve, reject) => {
        const fetchId = Math.random().toString(36).substring(7);
        const messageHandler = (event) => {
            if (event.data.id === fetchId) {
                window.removeEventListener('message', messageHandler);
                if (event.data.action === 'FETCH_SUCCESS') resolve(event.data.data);
                else reject(new Error(event.data.error));
            }
        };
        window.addEventListener('message', messageHandler);
        // Pass the new method parameter down to the Chrome Extension!
        window.parent.postMessage({ action: 'FETCH_API', id: fetchId, url: url, headers: headers, method: method }, '*');
    });
};
const injectLocalApiEndpoint = (url) => new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).substring(7);
    const timeoutId = setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        reject(new Error('Timed out while preparing the local labels endpoint.'));
    }, 120000);
    const messageHandler = (event) => {
        if (event.source !== window.parent || event.data.action !== 'INJECT_API_RESULT' || event.data.id !== requestId) return;
        clearTimeout(timeoutId);
        window.removeEventListener('message', messageHandler);
        if (event.data.success) resolve();
        else reject(new Error(event.data.error || 'Local API injection failed.'));
    };
    window.addEventListener('message', messageHandler);
    window.parent.postMessage({
        action: 'INJECT_API',
        id: requestId,
        url,
        apiKey: ENV_QA_API_KEY
    }, '*');
});
// Global App Variables
const isDevMode = ref(false); 
//  FIX: Read directly from local memory on boot! No async message waiting.
const metaTag = document.querySelector('meta[name="tms-env"]');
const baseDevMode = metaTag ? metaTag.dataset.devMode === "true" : false;

const savedDevMode = localStorage.getItem('force_dev_mode');
if (savedDevMode !== null) {
    isDevMode.value = savedDevMode === 'true';
} else {
    isDevMode.value = baseDevMode;
}

console.log("App Booted. Dev Mode is:", isDevMode.value);
const isCurrentLabelDemo = ref(false);

const app = createApp({
    setup() {
        const columnCount = ref(1);
        const isDeveloperMode = computed(() => isDevMode.value);
        const isCalibrationMode = ref(false);
        const calibrationRules = ref({
            clientDefaults: {},
            signatures: JSON.parse(JSON.stringify(BASE_FACTORY_SIGNATURES))
        });
        
        const demoCalibrationRules = ref(JSON.parse(localStorage.getItem('tms_demo_calibrations') || '{}'));
        
        let primaryZplSignature = null;
        let primaryEplSignature = null;
        let activeSignaturesForSaving = new Set();
        let lastLoadedSignature = null;
        const zplCache = new Map(); 
        
        const currentEditingFile = ref(null);
        const isDemoMode = ref(false);
        
        const mathUtils = Math;

        const currentViewMode = ref('local');
        const currentViewSource = ref('');
        const isListView = ref(true); 
        const currentEditorFilename = ref('');
        const editorContainer = ref(null);
        let codeEditor = null;
        let zplLibrary = null;
        let currentRenderController = null;

        const loading = ref(true);
        const isLoading = ref(false);
        const fileList = ref([]);
        const selectedFiles = ref([]);
        
        const qzConnected = ref(false);
        const qzPrinters = ref([]);
        const selectedPrinter = ref('');
        const renderedLabels = ref([]); 

        const searchQuery = ref('');
        const folderPath = ref('No folder selected'); 
        const folderInput = ref(null);

        const tmsUrls = ref(JSON.parse(localStorage.getItem('tms_qa_urls') || '[]'));
        const newTmsUrl = ref('');
        const selectedTmsUrl = ref('');
        const tmsFiles = ref([]);
        const selectedFileToInspect = ref('');
        const folderPermissionStatus = ref('');
        const isSwitchingBuildFolder = ref(false);
        
        const clientPreferences = ref(JSON.parse(localStorage.getItem('tms-client-prefs')) || {});
        const showClientDefaultsModal = ref(false);
        const newClientKeyword = ref('');

        const settings = ref({
            lang: 'zpl', size: '2.25x1.25', customW: 3, customH: 1.5, density: '8', zoom: 1.2, rotation: 0,
            offsetX: 0, offsetY: 0, //  RESTORED TO ZERO
            dmOffset: 0, bcMoveX: 0, bcMoveY: 0, 
            font: '', fontSize: 1.0, fontWidth: 1.0, fontSpace: 0, 
            isAutoDetectActive: false,
            isHardwareCenteringActive: true
        });

        const selectedPrinterProfile = ref('general');
        const useWidthOverride = ref(false);
        const validationErrors = ref([]);

        const milkBankSearchQuery = ref('Timeless Training'); 
        const showMilkBankDropdown = ref(false);

        const filteredMilkBanks = computed(() => {
            const query = milkBankSearchQuery.value.toLowerCase();
            return milkBanks.filter(b => b.name.toLowerCase().includes(query));
        });

        const selectMilkBank = (bank) => {
            demoSettings.value.selectedBankId = bank.id;
            milkBankSearchQuery.value = bank.name;
            showMilkBankDropdown.value = false;
        };

        const handleMilkBankBlur = () => {
            setTimeout(() => {
                showMilkBankDropdown.value = false;
                const currentBank = milkBanks.find(b => b.id === demoSettings.value.selectedBankId);
                if (currentBank) milkBankSearchQuery.value = currentBank.name;
            }, 200);
        };


        const demoSettings = ref({
            labelType: 'milkbank', 
            selectedBankId: '0', 
            volume: '120',
            calories: '20',
            expiryDate: '2027-03-27',
            quantity: 5,
            barcodeFormat: 'datamatrix',
            lot: 'TST001',
            startSerial: '001',
            batchNumber: '001319-1',
            milkType: 'Term'
        });

        const productsData = ref([]); 
        const productSearchQuery = ref('');
        const showProductDropdown = ref(false);
        const showBarcodeModal = ref(false);
        const pendingProductSelection = ref(null);

        const productOverrides = ref(JSON.parse(localStorage.getItem('tms_product_overrides') || '{}'));

        const addBarcode = () => {
            if (!pendingProductSelection.value.barcodes) {
                pendingProductSelection.value.barcodes = [];
            }
            pendingProductSelection.value.barcodes.push({ type: 'New Level', value: '' });
        };

        const deleteBarcode = (index) => {
            pendingProductSelection.value.barcodes.splice(index, 1);
        };

        const saveProductOverrides = async () => {
            if (!pendingProductSelection.value) return;
            const pid = pendingProductSelection.value.productId;
            if (!pid) return alert("Cannot save overrides for a product without a Product ID.");

            const idx = productsData.value.findIndex(p => p.productId === pid);
            if (idx !== -1) {
                productsData.value[idx] = pendingProductSelection.value;
            }

            //  FIX: Send to the parent window to save in Chrome Storage!
            window.parent.postMessage({ 
                action: 'SAVE_STORAGE', 
                key: 'tms_products', 
                value: JSON.parse(JSON.stringify(productsData.value)) 
            }, '*');
            
            // Also keep a local sandbox copy for instant reloads
            localStorage.setItem('tms_products', JSON.stringify(productsData.value));
            
            alert("✅ Barcodes saved permanently to browser storage!");
        };

        const allowedBarcodeFormats = computed(() => {
            const cat = pendingProductSelection.value ? pendingProductSelection.value.category : '';
            
            // The 6 master formats our engine can natively generate in ZPL/EPL
            let masterFormats = [
                { label: 'GS1 DataMatrix (2D)', value: 'datamatrix' },
                { label: 'QR Code (2D)', value: 'qrcode' },
                { label: 'Aztec Code (2D)', value: 'azteccode' },
                { label: 'GS1-128 (Clinical 1D)', value: 'gs1-128' },
                { label: 'UPC-A (Retail 1D)', value: 'upca' },
                { label: 'EAN-13 (1D)', value: 'ean13' },
                { label: 'ITF-14 (Case 1D)', value: 'itf14' }
            ];

            if (cat === 'Prolacta') {
                return masterFormats.filter(f => f.value === 'datamatrix');
            }
            if (cat === 'Cera Products' || cat === 'Cera') {
                return masterFormats.filter(f => ['upca', 'itf14','ean13'].includes(f.value));
            }
            if (['Nestle'].includes(cat)) {
                return masterFormats.filter(f => ['datamatrix','itf14','ean13'].includes(f.value));
            }
            if (['Nutricia'].includes(cat)) {
                return masterFormats.filter(f => ['datamatrix','itf14','ean13'].includes(f.value));
            }
            if (['Abbott', 'MJN'].includes(cat)) {
                return masterFormats.filter(f => ['datamatrix', 'gs1-128', 'itf14','ean13'].includes(f.value));
            }
            
            // Default: Give standard items access to all 6 formats
            return masterFormats; 
        });
        watch(pendingProductSelection, () => {
            demoSettings.value.barcodeFormat = allowedBarcodeFormats.value[0].value;
        });

        const loadProducts = async () => {
    try {
        let stored = localStorage.getItem('tms_products');
        if (stored && stored.length > 2) {
            productsData.value = JSON.parse(stored);
        } else {
            // Use the imported variable instantly!
            productsData.value = defaultProducts;
        }
    } catch (e) {
        console.error("Error loading products:", e);
    }
    };

        const filteredProducts = computed(() => {
            let list = productsData.value || []; 
            if (productSearchQuery.value) {
                const cleanQuery = productSearchQuery.value.replace(/^\[.*?\]\s*/, '').trim().toLowerCase();
                list = list.filter(p => 
                    (p.name && p.name.toLowerCase().includes(cleanQuery)) || 
                    (p.productId && p.productId.toLowerCase().includes(cleanQuery)) ||
                    (p.category && p.category.toLowerCase().includes(cleanQuery)) ||
                    (p.barcodes && p.barcodes.some(b => b.value && b.value.toLowerCase().includes(cleanQuery)))
                );
            }
            return list.slice(0, 50); 
        });

        const selectProduct = (product) => {
            pendingProductSelection.value = product;
            showProductDropdown.value = false;
            productSearchQuery.value = `[${product.category || 'UNK'}] ${product.name}`; 
            showBarcodeModal.value = true;
        };
        const isGenerateBlinking = ref(false);
const chooseBarcode = (barcodeVal) => {
            const cleanVal = barcodeVal ? barcodeVal.trim() : '';
            if (!cleanVal) {
                return alert("Please enter a valid barcode value before using it.");
            }

            const format = demoSettings.value.barcodeFormat;
            const length = cleanVal.length;
            const isNumeric = /^\d+$/.test(cleanVal);

            //  VALIDATION GUARDRAILS
            let warningMsg = "";

            if (format === 'upca' && length !== 12) {
                warningMsg = `UPC-A (Retail 1D) strictly requires exactly 12 digits.\n\nYou selected a barcode with ${length} characters.\nIf you proceed, the generator will alter the barcode to force it to fit, which will likely cause TMS to fail.`;
            } 
            else if (format === 'ean13' && length !== 13) {
                warningMsg = `EAN-13 (1D) strictly requires exactly 13 digits.\n\nYou selected a barcode with ${length} characters.\nIf you proceed, the generator will alter the barcode (like adding a check-digit), which will likely cause TMS to fail.`;
            } 
            else if (format === 'itf14' && length !== 14) {
                warningMsg = `ITF-14 (Case 1D) usually requires exactly 14 digits.\n\nYou selected a barcode with ${length} characters.`;
            }
            else if (['upca', 'ean13', 'itf14', 'gs1-128'].includes(format) && !isNumeric && format !== 'gs1-128') {
                // GS1-128 allows alphanumeric, but UPC/EAN/ITF strictly require numbers only
                warningMsg = `The selected format (${format.toUpperCase()}) strictly requires numbers only, but your barcode contains letters or special characters.`;
            }

            // If a warning was triggered, ask the user if they want to override
            if (warningMsg !== "") {
                const proceed = window.confirm(`⚠️ BARCODE FORMAT WARNING\n\n${warningMsg}\n\nWe recommend clicking 'Cancel' and changing the Barcode Format dropdown to match your data.\n\nDo you want to proceed and generate anyway?`);
                if (!proceed) return; // Stop and let them fix the dropdown
            }
            
            // 1. Set the correct values
            demoSettings.value.productName = pendingProductSelection.value.name;
            demoSettings.value.gtin = cleanVal;
            
            // 2. Close the modal
            showBarcodeModal.value = false;

            // 3. Trigger the blink animation
            isGenerateBlinking.value = true;
    
            // Leave it on for 5 seconds (5000ms) + buffer to match the CSS exactly
            setTimeout(() => {
                isGenerateBlinking.value = false;
            }, 9000);
        };
        const activePrinterConfig = computed(() => printerConfigs[selectedPrinterProfile.value]);
        const hasNewFiles = computed(() => fileList.value.some(file => isNew(file)));

        const calibratedDots = computed(() => {
            const conf = activePrinterConfig.value;
            const dpi = settings.value.density === '12' ? 300 : 203;

            let wIn, hIn;
            if (settings.value.size === 'custom') {
                wIn = parseFloat(settings.value.customW) || 3; hIn = parseFloat(settings.value.customH) || 1.5;
            } else {
                const parts = settings.value.size.split('x');
                wIn = parseFloat(parts[0]); hIn = parseFloat(parts[1]);
            }

            if (validationErrors.value.length > 0 && selectedPrinterProfile.value !== 'general') wIn = Math.min(wIn, conf.maxWInches);

            let requestedW = Math.round(wIn * dpi); let requestedH = Math.round(hIn * dpi);
            if (selectedPrinterProfile.value === 'gx420' && useWidthOverride.value) requestedW = 507; 
            return { w: requestedW, h: requestedH };
        });

        const computedLabelStyle = computed(() => {
            const dots = calibratedDots.value;
            const dpi = settings.value.density === '12' ? 300 : 203;
            const wIn = dots.w / dpi; const hIn = dots.h / dpi;
            
            const hardwareGapPx = 0.125 * 38 * settings.value.zoom;

            return { 
                width: `${wIn * 96 * settings.value.zoom}px`, 
                aspectRatio: `${wIn} / ${hIn}`, 
                transform: `rotate(${settings.value.rotation}deg)`, 
                background: '#ffffff', 
                borderRadius: '15px', // Tighter radius to match the real physical die-cuts
                boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                marginBottom: `${hardwareGapPx}px` // Applies the exact to-scale gap!
            };
        });

        const computedImageStyle = computed(() => {
            const dots = calibratedDots.value;
            
            //  FIX: Programmed Size Fit ONLY. No manual CSS sliders allowed!
            let finalOffsetX = 0;
            let finalOffsetY = 0;
            if (settings.value.isHardwareCenteringActive) {
                finalOffsetX = renderState.autoHardwareOffsetX || 0;
            } 
            
            const pctX = (finalOffsetX / dots.w) * 100; 
            const pctY = (finalOffsetY / dots.h) * 100;
            
            return { 
                transform: `translate(${pctX}%, ${pctY}%)`, 
                width: '100%', 
                height: '100%', 
                objectFit: 'contain', 
                display: 'block' 
            };
        });

        const isAllSelected = computed(() => {
            return filteredFiles.value.length > 0 && filteredFiles.value.every(f => isFileSelected(f));
        });

        const filteredFiles = computed(() => {
            let listToProcess = [...fileList.value];
            if (searchQuery.value) {
                const query = searchQuery.value.toLowerCase();
                listToProcess = listToProcess.filter(file => file.name.toLowerCase().includes(query));
            }
            return listToProcess.sort((a, b) => {
                const matchA = a.name.match(/_(\d{8})_(\d{6})_/);
                const matchB = b.name.match(/_(\d{8})_(\d{6})_/);
                const timeA = matchA ? matchA[1] + matchA[2] : a.name;
                const timeB = matchB ? matchB[1] + matchB[2] : b.name;
                return timeB.localeCompare(timeA);
            });
        });

        const isNew = (file) => {
            if (file.isViewed) return false;
            return file.isNew === true; 
        };

        const formatDate = (file) => {
            if (!file.name) return '';
            const dateMatch = file.name.match(/_(\d{8})_(\d{6})_/);
            if (dateMatch) {
                const d = dateMatch[1]; const t = dateMatch[2]; 
                return `${d.substring(0,4)}-${d.substring(4,6)}-${d.substring(6,8)} ${t.substring(0,2)}:${t.substring(2,4)}:${t.substring(4,6)}`;
            }
            return file.last_modified;
        };

        const isFileSelected = (file) => selectedFiles.value.some(f => f.id === file.id);
        const getCombinedListCode = () => selectedFiles.value.map(f => f.content).join('\n\n').trim();

        const toggleDemoMode = () => {
            isDemoMode.value = !isDemoMode.value;
            if (isDemoMode.value) {
                isListView.value = false;
                renderedLabels.value = [];
                if (codeEditor) codeEditor.setValue('');
                lastLoadedSignature = null;
            } else {
                isListView.value = true;  
            }
        };

        const returnToGenerator = () => {
            if (codeEditor) codeEditor.setValue(''); 
            renderedLabels.value = [];
            isCurrentLabelDemo.value = false;
            isDemoMode.value = true;
            lastLoadedSignature = null; 
        };

        const toggleViewMode = () => {
            isDemoMode.value = false;
            isListView.value = !isListView.value;
            if (!isListView.value && codeEditor) setTimeout(() => codeEditor.layout(), 50);
            triggerRender();
        };

        const switchToLocalMode = () => {
            currentViewMode.value = 'local';
            selectedTmsUrl.value = '';
            fetchFiles();
        };

        const switchBuildFolderPermission = () => {
            if (isSwitchingBuildFolder.value) return;
            isSwitchingBuildFolder.value = true;
            folderPermissionStatus.value = 'Choose the shared folder containing your TMS build(s)...';
            const requestId = `folder-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const handleResult = (event) => {
                if (event.data?.action !== 'SWITCH_BUILD_FOLDER_RESULT' || event.data.id !== requestId) return;
                window.removeEventListener('message', handleResult);
                isSwitchingBuildFolder.value = false;
                folderPermissionStatus.value = event.data.success
                    ? `Folder permission saved: ${event.data.folderName}`
                    : event.data.cancelled
                        ? 'Folder selection cancelled.'
                        : `Folder permission failed: ${event.data.error || 'Unknown error'}`;
            };
            window.addEventListener('message', handleResult);
            window.parent.postMessage({ action: 'SWITCH_BUILD_FOLDER', id: requestId }, '*');
        };

        const triggerFolderPicker = () => {
            if (folderInput.value) folderInput.value.click();
        };

        const rotateLabels = () => { settings.value.rotation = (settings.value.rotation + 90) % 360; };
        const zoomIn = () => { settings.value.zoom = Math.min(5.0, Math.round((settings.value.zoom + 0.05) * 100) / 100); };
        const zoomOut = () => { settings.value.zoom = Math.max(0.05, Math.round((settings.value.zoom - 0.05) * 100) / 100); };
        
        const clearWorkspace = () => {
            if (isListView.value) { selectedFiles.value = []; triggerRender(); } 
            else { if (confirm("Clear editor?")) { codeEditor.setValue(''); codeEditor.focus(); } }
        };

        const formatEditorCode = () => {
            if (!codeEditor) return;
            const originalVal = codeEditor.getValue();
            let val = formatRawLabelCode(originalVal);
            
            if (val !== originalVal) {
                const position = codeEditor.getPosition();
                codeEditor.executeEdits("auto-formatter", [{
                    range: codeEditor.getModel().getFullModelRange(),
                    text: val
                }]);
                codeEditor.setPosition(position);
            }
            triggerRender();
        };

        const checkSizeLimits = () => {
            validationErrors.value = [];
            const conf = activePrinterConfig.value;
            if (selectedPrinterProfile.value === 'general') return;
            let wIn;
            if (settings.value.size === 'custom') wIn = parseFloat(settings.value.customW) || 3;
            else wIn = parseFloat(settings.value.size.split('x')[0]);

            if (wIn > conf.maxWInches) validationErrors.value.push(`Label Size Exceeded: ${wIn}" width is too wide for ${conf.name}. Maximum physical width is ${conf.maxWInches}".`);
            //  DPI MISMATCH WARNING
            if (settings.value.intendedDensity && settings.value.intendedDensity !== settings.value.density) {
                let expected = settings.value.intendedDensity === '12' ? '300' : '203';
                let forced = settings.value.density === '12' ? '300' : '203';
                validationErrors.value.push(`DPI Mismatch: This label was programmed for ${expected} DPI, but you selected a strictly ${forced} DPI printer. The physical printout may be scaled incorrectly.`);
            }
        };

        const handleSizeChange = () => {
            if (sizeOffsets[settings.value.size]) {
                settings.value.offsetX = sizeOffsets[settings.value.size].x;
                settings.value.offsetY = sizeOffsets[settings.value.size].y;
            } else if (settings.value.size !== 'custom') {
                settings.value.offsetX = 0;
                settings.value.offsetY = 0; //  RESTORED TO ZERO
            }
            triggerRender();
        };

        const handleProfileChange = () => {
            const conf = activePrinterConfig.value;
            if (selectedPrinterProfile.value !== 'general') {
                settings.value.density = conf.fixedDpi || '8'; 
            }
            settings.value.size = conf.defaultSize;
            if (sizeOffsets[settings.value.size]) {
                settings.value.offsetX = sizeOffsets[settings.value.size].x;
                settings.value.offsetY = sizeOffsets[settings.value.size].y;
            } else {
                settings.value.offsetX = 0;
                settings.value.offsetY = 0; //  RESTORED TO ZERO
            }
            triggerRender();
        };

        const handleSmartRefresh = () => {
            if (currentViewMode.value === 'remote') fetchFileList();
            else fetchFiles();
        };

        const handleLocalFolder = async (event) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            renderState.maxRequiredW = 0;
            renderState.maxRequiredH = 0;
            renderState.lockedSize = null;
            renderState.lockedDpi = null;
            renderState.lastCode = '';
            
            if (codeEditor) codeEditor.setValue('');
            renderedLabels.value = [];

            const folderName = files[0].webkitRelativePath.split('/')[0];
            folderPath.value = `[Local Folder]: ${folderName}`;

            isLoading.value = true;
            loading.value = true;

            try {
                const labelFiles = [];
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const ext = file.name.split('.').pop().toLowerCase();

                    if (['txt', 'zpl', 'epl'].includes(ext)) {
                        const content = formatRawLabelCode(await file.text());
                        labelFiles.push({
                            id: 'local_' + i,
                            name: file.name,
                            content: content,
                            timestamp: Math.floor(file.lastModified / 1000)
                        });
                    }
                }
                labelFiles.sort((a, b) => b.timestamp - a.timestamp);
                fileList.value = labelFiles;
                selectedFiles.value = [];
            } catch (error) {
                console.error("Error reading local files:", error);
                alert("Could not read files from the selected folder.");
            } finally {
                isLoading.value = false;
                loading.value = false;
                event.target.value = ''; 
            }
        };
const fetchFiles = async () => {
    
    if (currentViewMode.value === 'local') {
        isLoading.value = false;
        loading.value = false;
        return; 
    }

    // Keep the remote fetch logic exactly as it was for TMS builds
    isLoading.value = true;
    loading.value = true;
    try {
        const storageKey = 'tms_remote_' + selectedTmsUrl.value;
        const previousSnapshot = sessionStorage.getItem(storageKey);
        const existingFileNames = new Set(previousSnapshot ? JSON.parse(previousSnapshot) : []);
        
        //  PROXY FIX: Use extensionFetch instead of native fetch!
        const rawData = await extensionFetch(`${selectedTmsUrl.value}/api/customer/interoperability/labels/fetch`, { 
            'X-QA-Key': ENV_QA_API_KEY 
        });
        
        const parsedData = JSON.parse(rawData);
        const filenames = Array.isArray(parsedData) ? parsedData : (parsedData.files || []);
        
        if (parsedData.active_path && !Array.isArray(parsedData)) {
            console.log("✅ Locked onto server path:", parsedData.active_path);
            
            // Checks memory so we don't spam the user with alerts!
            const lastAlertPath = sessionStorage.getItem('tms_last_alert_path');
            
            if (lastAlertPath !== parsedData.active_path) {
                alert(`✅ API Connection Successful!\n\nThe server locked onto this directory:\n${parsedData.active_path}\n\nFound ${filenames.length} labels.`);
                // Memorize this path so it stays silent next time
                sessionStorage.setItem('tms_last_alert_path', parsedData.active_path);
            }
        }
        
        const isFirstLoad = !previousSnapshot;
        
        fileList.value = filenames.map((name, index) => {
            return {
                id: 'tms_' + index, name: name, content: '', 
                isRemote: true, isNew: !isFirstLoad && !existingFileNames.has(name), isViewed: false
            };
        });
        
        sessionStorage.setItem(storageKey, JSON.stringify(filenames));
        currentViewMode.value = 'remote';
        selectedFiles.value = [];
    } catch (e) {
        // Only alert if they actually tried to fetch a remote URL
        if (selectedTmsUrl.value) alert("Error: " + e.message);
    } finally {
        setTimeout(() => { isLoading.value = false; loading.value = false; }, 1000);
    }
};
        

const loadRemoteContent = async (file, isBulk = false) => {
            if (file.content) return; 
            try {
                const cacheBuster = new Date().getTime();
                
                //  FIX 1: Pass the QA Key in the headers just like fetchFiles does!
                const rawZpl = await extensionFetch(
                    `${selectedTmsUrl.value}/api/customer/interoperability/labels/download?file=${file.name}&key=${ENV_QA_API_KEY}&cb=${cacheBuster}`, 
                    { 'X-QA-Key': ENV_QA_API_KEY }
                );
                
                file.content = formatRawLabelCode(rawZpl);
            } catch (e) {
                console.warn(`Could not download: ${file.name}`, e);
                //  FIX 2: Only show the blocking alert if they clicked a single file manually
                if (!isBulk) {
                    alert(`Could not download file content for ${file.name}\n\nServer Response: ${e.message}`);
                }
            }
        };

        const fetchFileList = async () => {
            isLoading.value = true;
            loading.value = true;
            try {
                const storageKey = 'tms_remote_' + selectedTmsUrl.value;
                const previousSnapshot = sessionStorage.getItem(storageKey);
                const existingFileNames = new Set(previousSnapshot ? JSON.parse(previousSnapshot) : []);
                
                const listUrl = `${selectedTmsUrl.value}/api/customer/interoperability/labels/fetch`;
                const requestLabelList = () => extensionFetch(listUrl, { 'X-QA-Key': ENV_QA_API_KEY });
                let rawData;
                try {
                    rawData = await requestLabelList();
                } catch (requestError) {
                    const isNotFound = requestError.message.includes('<title>Not Found</title>') || /\b404\b/.test(requestError.message);
                    let isLocalEnv = false;
                    try {
                        const hostname = new URL(selectedTmsUrl.value).hostname.toLowerCase();
                        isLocalEnv = hostname.endsWith('.local') || hostname.endsWith('.test') || hostname === 'localhost' || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
                    } catch (urlError) {
                        isLocalEnv = false;
                    }
                    if (!isNotFound || !isLocalEnv) throw requestError;

                    await injectLocalApiEndpoint(selectedTmsUrl.value);
                    rawData = await requestLabelList();
                }
                
                const parsedData = JSON.parse(rawData);
                const filenames = Array.isArray(parsedData) ? parsedData : (parsedData.files || []);
                
                if (parsedData.active_path && !Array.isArray(parsedData)) {
                    console.log("✅ Locked onto server path:", parsedData.active_path);
                    
                    // Checks memory so we don't spam the user with alerts!
                    const lastAlertPath = sessionStorage.getItem('tms_last_alert_path');
                    
                    if (lastAlertPath !== parsedData.active_path) {
                        alert(`✅ API Connection Successful!\n\nThe server locked onto this directory:\n${parsedData.active_path}\n\nFound ${filenames.length} labels.`);
                        // Memorize this path so it stays silent next time
                        sessionStorage.setItem('tms_last_alert_path', parsedData.active_path);
                    }
                }
                
                const isFirstLoad = !previousSnapshot;
                
                fileList.value = filenames.map((name, index) => {
                    return {
                        id: 'tms_' + index, name: name, content: '', 
                        isRemote: true, isNew: !isFirstLoad && !existingFileNames.has(name), isViewed: false
                    };
                });
                
                sessionStorage.setItem(storageKey, JSON.stringify(filenames));
                currentViewMode.value = 'remote';
                selectedFiles.value = [];
            } catch (e) {
                if (!selectedTmsUrl.value) return;
                try {
                    const errObj = JSON.parse(e.message);
                    let alertMsg = `❌ ${errObj.error}\n\n💡 Clue: ${errObj.clue}`;
                    if (errObj.path_checked) alertMsg += `\n\n📁 Path: ${errObj.path_checked}`;
                    if (errObj.line) alertMsg += `\n\n⚙️ File: ${errObj.file} (Line ${errObj.line})`;
                    alert(alertMsg);
                } catch (parseErr) {
                    alert("Network Error: " + e.message);
                }
            } finally {
                setTimeout(() => { isLoading.value = false; loading.value = false; }, 1000);
            }
        };

        const toggleFileSelection = async (file) => {
            file.isViewed = true;
            //  FIX 3: Explicitly flag this as NOT a bulk operation
            if (file.isRemote && !file.content) await loadRemoteContent(file, false); 
            
            const idx = selectedFiles.value.findIndex(f => f.id === file.id);
            if (idx > -1) selectedFiles.value.splice(idx, 1);
            else selectedFiles.value.push(file);
            debouncedRender();
        };

        const toggleSelectAll = async () => {
            if (isCalibrationMode.value) {
                alert("Calibration Blocked: You cannot select multiple labels while calibrating.");
                return;
            }
            if (filteredFiles.value.length === 0) return;

            if (isAllSelected.value) {
                selectedFiles.value = selectedFiles.value.filter(selected => 
                    !filteredFiles.value.some(filtered => filtered.id === selected.id)
                );
            } else {
                isLoading.value = true;
                let failedCount = 0; // Track how many fail

                for (let file of filteredFiles.value) {
                    file.isViewed = true; 
                    if (file.isRemote && !file.content) {
                        //  FIX 4: Flag as a bulk operation to suppress the alert box!
                        await loadRemoteContent(file, true); 
                        if (!file.content) failedCount++;
                    }
                    
                    //  FIX 5: Only select the file if the content actually exists!
                    if (!isFileSelected(file) && file.content) {
                        selectedFiles.value.push(file);
                    }
                }
                isLoading.value = false;

                //  FIX 6: Show one final summary if anything went wrong
                if (failedCount > 0) {
                    alert(`Select All completed, but ${failedCount} file(s) failed to download from the server.`);
                }
            }
            debouncedRender();
        };

        const editFile = async (file) => {
            file.isViewed = true;
            currentEditingFile.value = file; 
            if (!codeEditor) return;
            if (file.isRemote && !file.content) await loadRemoteContent(file);
            
            let finalCode = file.content || '';
            
            if (calibrationRules.value.fileOverrides && calibrationRules.value.fileOverrides[file.name]) {
                finalCode = calibrationRules.value.fileOverrides[file.name];
            }
            
            codeEditor.setValue(finalCode);
            isListView.value = false; 
            setTimeout(() => { codeEditor.layout(); triggerRender(); }, 50);
        };

        // const addTmsUrl = () => {    
        //     let rawUrl = newTmsUrl.value.trim();
        //     if (!rawUrl) return alert("Please enter a valid URL.");
            
        //     // 1. Ensure a protocol exists so the JS URL parser doesn't crash
        //     if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
        //         rawUrl = 'https://' + rawUrl; 
        //     }

        //     try {
        //         // 2. Use the native URL parser to strip away any /api/ paths or ?queries
        //         const parsedUrl = new URL(rawUrl);
        //         const cleanHost = parsedUrl.host; // Extracts strictly the domain (and port if applicable)

        //         // 3. Smart Protocol: Force http for .local environments, https for everything else
        //         const protocol = cleanHost.includes('.local') ? 'http://' : 'https://';
        //         const finalUrl = protocol + cleanHost;

        //         if (!tmsUrls.value.includes(finalUrl)) {
        //             tmsUrls.value.push(finalUrl);
        //             localStorage.setItem('tms_qa_urls', JSON.stringify(tmsUrls.value));
        //         }
                
        //         selectedTmsUrl.value = finalUrl;
        //         newTmsUrl.value = '';       
        //         tmsFiles.value = [];        
        //     } catch (e) {
        //         alert("Invalid URL format. Please try again.");
        //     }
        // };
        const addTmsUrl = async () => {
            let rawUrl = newTmsUrl.value.trim();
            if (!rawUrl) return alert("Please enter a valid URL.");
            
            if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
                rawUrl = 'https://' + rawUrl; 
            }

            try {
                const parsedUrl = new URL(rawUrl);
                const cleanHost = parsedUrl.host; 
                
                const isLocalEnv = cleanHost.includes('.local') || cleanHost.includes('.test') || cleanHost.includes('localhost') || cleanHost.match(/^\d+\.\d+\.\d+\.\d+/);
                const protocol = isLocalEnv ? 'http://' : 'https://';
                const finalUrl = protocol + cleanHost;

                if (isLocalEnv) {
                    try {
                        await injectLocalApiEndpoint(finalUrl);
                    } catch (injectionError) {
                        console.warn("Local API setup will be retried when labels are fetched:", injectionError);
                    }
                }

                if (!tmsUrls.value.includes(finalUrl)) {
                    tmsUrls.value.push(finalUrl);
                    localStorage.setItem('tms_qa_urls', JSON.stringify(tmsUrls.value));
                }
                
                selectedTmsUrl.value = finalUrl;
                newTmsUrl.value = '';       
                tmsFiles.value = [];        
            } catch (e) {
                alert("Invalid URL format. Please try again.");
            }
        };
        const removeTmsUrl = () => {
            if (!selectedTmsUrl.value) return;
            if (!confirm(`Remove ${selectedTmsUrl.value} from your list?`)) return;
            
            tmsUrls.value = tmsUrls.value.filter(u => u !== selectedTmsUrl.value);
            localStorage.setItem('tms_qa_urls', JSON.stringify(tmsUrls.value));
            selectedTmsUrl.value = '';
            tmsFiles.value = [];
        };

        watch(showClientDefaultsModal, (isOpen) => {
            if (isOpen && selectedTmsUrl.value) {
                try {
                    let base = new URL(selectedTmsUrl.value).hostname.split('.')[0].split('-')[0];
                    newClientKeyword.value = base.toLowerCase();
                } catch(e) { newClientKeyword.value = ''; }
            }
        });

        watch(selectedTmsUrl, (newUrl) => {
            if (!newUrl) return;

            let matchedDefaults = null;

            if (calibrationRules.value.clientDefaults) {
                let urlLower = newUrl.toLowerCase();
                let matchedKey = Object.keys(calibrationRules.value.clientDefaults).find(k => urlLower.includes(k));
                if (matchedKey) matchedDefaults = calibrationRules.value.clientDefaults[matchedKey];
            }

            if (matchedDefaults) {
                settings.value.density = matchedDefaults.density;
                settings.value.size = matchedDefaults.size;
                if (matchedDefaults.size === 'custom') {
                    settings.value.customW = matchedDefaults.customW || 3;
                    settings.value.customH = matchedDefaults.customH || 1.5;
                }
            } else {
                settings.value.density = '8'; 
                settings.value.size = '2.25x1.25'; 
            }

            renderState.maxRequiredW = 0;
            renderState.maxRequiredH = 0;
            renderState.lockedSize = null;
            renderState.lockedDpi = null;
            renderState.lastCode = '';

            if (codeEditor) codeEditor.setValue(''); 
            renderedLabels.value = []; 

            lastLoadedSignature = null; 
            selectedFiles.value = [];
            fileList.value = [];
            triggerRender(); 
            fetchFileList();
        });

        const loadCalibrations = async () => {
    try {
        let stored = localStorage.getItem('tms_calibrations');
        let fetchedRules = stored ? JSON.parse(stored) : defaultCalibrations; // Use the import!
        
        if (fetchedRules.signatures && !Array.isArray(fetchedRules.signatures)) {
            calibrationRules.value.signatures = {
                ...calibrationRules.value.signatures, 
                ...fetchedRules.signatures            
            };
        }
        
        if (fetchedRules.fileOverrides) {
            calibrationRules.value.fileOverrides = {}; 
        }

        if (fetchedRules.clientDefaults) {
            calibrationRules.value.clientDefaults = Array.isArray(fetchedRules.clientDefaults) ? {} : fetchedRules.clientDefaults;
        }
        const localSavedDefaults = JSON.parse(localStorage.getItem('tms_client_defaults') || 'null');
            if (localSavedDefaults) {
            calibrationRules.value.clientDefaults = { ...calibrationRules.value.clientDefaults, ...localSavedDefaults };
            }
        if (fetchedRules.demoCalibrations) {
            demoCalibrationRules.value = Array.isArray(fetchedRules.demoCalibrations) ? {} : fetchedRules.demoCalibrations;
            localStorage.setItem('tms_demo_calibrations', JSON.stringify(demoCalibrationRules.value));
        }
        // 1. Load the user's custom Client Defaults from local storage
        const savedClientDefaults = JSON.parse(localStorage.getItem('tms_client_defaults') || 'null');
        if (savedClientDefaults) {
            calibrationRules.value.clientDefaults = { 
                ...calibrationRules.value.clientDefaults, 
                ...savedClientDefaults 
            };
        }

        // 2. Load the user's custom Barcode Signatures from local storage
        const savedSignatures = JSON.parse(localStorage.getItem('tms_custom_signatures') || 'null');
        if (savedSignatures) {
            calibrationRules.value.signatures = { 
                ...calibrationRules.value.signatures, 
                ...savedSignatures 
            };
        }
    } catch (e) {
        console.warn("Could not load calibrations. Falling back to defaults.");
    }
};

        const getCalibrationRule = (sig) => {
            if (!sig) return null;
            
            if (sig.startsWith('DEMO_')) {
                if (demoCalibrationRules.value && demoCalibrationRules.value[sig]) {
                    return demoCalibrationRules.value[sig];
                }
                
                if (demoSettings.value.labelType === 'product' && DEMO_PRODUCT_SIGNATURES[sig]) {
                    return DEMO_PRODUCT_SIGNATURES[sig];
                }
                
                if (calibrationRules.value.signatures && calibrationRules.value.signatures[sig]) {
                    return calibrationRules.value.signatures[sig];
                }
                
                const baseSig = sig.replace('DEMO_', '');
                if (BASE_FACTORY_SIGNATURES && BASE_FACTORY_SIGNATURES[baseSig]) {
                    return BASE_FACTORY_SIGNATURES[baseSig];
                }
                
                return null;
            }
            
            if (calibrationRules.value.signatures && calibrationRules.value.signatures[sig]) {
                return calibrationRules.value.signatures[sig];
            }
            
            if (BASE_FACTORY_SIGNATURES && BASE_FACTORY_SIGNATURES[sig]) {
                return BASE_FACTORY_SIGNATURES[sig];
            }
            
            return null;
        };

        const saveClientDefault = async () => {
            let keyword = newClientKeyword.value.trim().toLowerCase();
            if (!keyword) return alert("Please enter a keyword.");

            if (!calibrationRules.value.clientDefaults || Array.isArray(calibrationRules.value.clientDefaults)) {
                calibrationRules.value.clientDefaults = {};
            }

            let existingPrinter = "No Record";
            if (calibrationRules.value.clientDefaults[keyword] && calibrationRules.value.clientDefaults[keyword].printer) {
                existingPrinter = calibrationRules.value.clientDefaults[keyword].printer;
            }

            calibrationRules.value.clientDefaults = {
                ...calibrationRules.value.clientDefaults,
                [keyword]: {
                    size: settings.value.size,
                    density: settings.value.density,
                    customW: settings.value.customW, 
                    customH: settings.value.customH,
                    printer: existingPrinter
                }
            };

            //  THE FIX: Completely purify the Vue object into plain text, then back to a pure JS object
            const cleanData = JSON.parse(JSON.stringify(calibrationRules.value.clientDefaults));

            // Send the purified data to the parent
            window.parent.postMessage({ 
                action: 'SAVE_STORAGE', 
                key: 'tms_client_defaults', 
                value: cleanData 
            }, '*');
            
            // Save the purified data to local sandbox memory
            localStorage.setItem('tms_client_defaults', JSON.stringify(cleanData));
            
            alert(`✅ Saved! URLs containing '${keyword}' will now default to ${settings.value.size}.`);
        };

        // const deleteClientDefault = async (keyword) => {
        //     if (!confirm(`Remove defaults for '${keyword}'?`)) return;
            
        //     let freshDefaults = { ...calibrationRules.value.clientDefaults };
        //     delete freshDefaults[keyword];
        //     calibrationRules.value.clientDefaults = freshDefaults;

        //     //  FIX: Send to parent
        //     window.parent.postMessage({ action: 'SAVE_STORAGE', key: 'tms_client_defaults', value: calibrationRules.value.clientDefaults }, '*');
        //     localStorage.setItem('tms_client_defaults', JSON.stringify(calibrationRules.value.clientDefaults));
        // };

        const deleteClientDefault = async (keyword) => {
            if (!confirm(`Remove defaults for '${keyword}'?`)) return;
    
            // 1. Remove it from the live UI
            let freshDefaults = { ...calibrationRules.value.clientDefaults };
            delete freshDefaults[keyword];
            calibrationRules.value.clientDefaults = freshDefaults;

            // 2. Purify the defaults data
            const cleanDefaults = JSON.parse(JSON.stringify(calibrationRules.value.clientDefaults));

            // 3. Save the erased state to the dedicated client_defaults memory
            window.parent.postMessage({ action: 'SAVE_STORAGE', key: 'tms_client_defaults', value: cleanDefaults }, '*');
            localStorage.setItem('tms_client_defaults', JSON.stringify(cleanDefaults));

            //  THE FIX: ALSO save the erased state to the main calibrations backup!
            const cleanCalibrations = JSON.parse(JSON.stringify(calibrationRules.value));
            window.parent.postMessage({ action: 'SAVE_STORAGE', key: 'tms_calibrations', value: cleanCalibrations }, '*');
            localStorage.setItem('tms_calibrations', JSON.stringify(cleanCalibrations));
        };

        const enterCalibrationMode = () => {
            if (isListView.value && selectedFiles.value.length > 1) {
                alert("Calibration Blocked: You can only calibrate ONE label at a time. Please deselect the others.");
                return; 
            }
            if (isListView.value && selectedFiles.value.length === 0) {
                alert("Please select a label to calibrate.");
                return;
            }
            isCalibrationMode.value = true;
        };

        const syncUiToSignature = (signature) => {
            if (lastLoadedSignature === signature) return; 
            lastLoadedSignature = signature;

            let fullRule = getCalibrationRule(signature);

            if (fullRule) {
                // 1. ALWAYS load the specific barcode/font sliders
                settings.value.dmOffset = parseFloat(fullRule.dmOffset || 0);
                settings.value.bcMoveX = parseInt(fullRule.bcMoveX || 0);
                settings.value.bcMoveY = parseInt(fullRule.bcMoveY || 0);
                settings.value.font = fullRule.font || '';
                settings.value.fontSize = parseFloat(fullRule.fontSize || 1.0);
                settings.value.fontWidth = parseFloat(fullRule.fontWidth || 1.0);
                settings.value.fontSpace = parseInt(fullRule.fontSpace || 0);
                
                if (fullRule.offsetX !== undefined) settings.value.offsetX = parseInt(fullRule.offsetX);
                if (fullRule.offsetY !== undefined) settings.value.offsetY = parseInt(fullRule.offsetY);

                //  FIX 1: Tell the UI dropdowns to match the saved JSON rule!
                if (fullRule.labelSize) {
                    settings.value.size = fullRule.labelSize;
                    settings.value.density = fullRule.labelDensity || '8';
                    if (fullRule.labelSize === 'custom') {
                        settings.value.customW = parseFloat(fullRule.customW) || 3;
                        settings.value.customH = parseFloat(fullRule.customH) || 1.5;
                    }
                }
                
            } else {
                // No rule found -> Reset sliders
                settings.value.dmOffset = 0; settings.value.bcMoveX = 0; settings.value.bcMoveY = 0;
                settings.value.font = ''; settings.value.fontSize = 1.0; settings.value.fontWidth = 1.0; settings.value.fontSpace = 0;
                
                // Only reset the Canvas offset if Auto Size is turned off
                if (!settings.value.isAutoDetectActive) {
                    if (sizeOffsets[settings.value.size]) {
                        settings.value.offsetX = sizeOffsets[settings.value.size].x;
                        settings.value.offsetY = sizeOffsets[settings.value.size].y;
                    } else {
                        settings.value.offsetX = 0; settings.value.offsetY = 0; 
                    }
                }
            }
        };
        const saveCurrentCalibration = async () => {
            let targets = Array.from(activeSignaturesForSaving);
            let isSavingDemo = isCurrentLabelDemo.value;

            if (targets.length === 0 && !isSavingDemo && !currentEditingFile.value) {
                return alert("Could not find an active barcode on the screen to target.");
            }

            let activeConfig = {
                dmOffset: parseFloat(settings.value.dmOffset || 0),
                bcMoveX: parseInt(settings.value.bcMoveX || 0),
                bcMoveY: parseInt(settings.value.bcMoveY || 0),
                font: settings.value.font || '', 
                fontSize: parseFloat(settings.value.fontSize || 1.0),
                fontWidth: parseFloat(settings.value.fontWidth || 1.0),
                fontSpace: parseInt(settings.value.fontSpace || 0),
                offsetX: parseInt(settings.value.offsetX || 0),
                offsetY: parseInt(settings.value.offsetY || 0),
                labelSize: settings.value.size,
                labelDensity: settings.value.density,
                customW: settings.value.customW,
                customH: settings.value.customH
            };

            // Sanitize Arrays back to Objects (The PHP fix)
            if (!calibrationRules.value.fileOverrides || Array.isArray(calibrationRules.value.fileOverrides)) calibrationRules.value.fileOverrides = {};
            if (!calibrationRules.value.signatures || Array.isArray(calibrationRules.value.signatures)) calibrationRules.value.signatures = {};
            if (!demoCalibrationRules.value || Array.isArray(demoCalibrationRules.value)) demoCalibrationRules.value = {};

            if (isSavingDemo) {
                // 1. Save EVERYTHING to LocalStorage (Just like your original code)
                let freshDemoRules = { ...demoCalibrationRules.value };
                targets.forEach(sig => { freshDemoRules[sig] = activeConfig; });
                
                let demoKey = demoSettings.value.labelType === 'product' ? `DEMO_RAW_${pendingProductSelection.value?.category || 'UNK'}` : `DEMO_RAW_BANK_${demoSettings.value.selectedBankId}`;
                if (codeEditor) freshDemoRules[demoKey] = codeEditor.getValue();
                
                demoCalibrationRules.value = freshDemoRules;
                localStorage.setItem('tms_demo_calibrations', JSON.stringify(demoCalibrationRules.value));
                
                // 2. Filter the payload for the Server: ONLY send slider rules, NOT raw text templates!
                let serverDemoRules = {};
                Object.keys(demoCalibrationRules.value).forEach(key => {
                    if (!key.startsWith('DEMO_RAW_')) {
                        serverDemoRules[key] = demoCalibrationRules.value[key];
                    }
                });
                calibrationRules.value.demoCalibrations = serverDemoRules;
                
            } else {
                let freshSigs = { ...calibrationRules.value.signatures };
                targets.forEach(sig => { freshSigs[sig] = activeConfig; });
                calibrationRules.value.signatures = freshSigs;

                // if (currentEditingFile.value && !isCurrentLabelDemo.value && codeEditor) {
                //     let freshOverrides = { ...calibrationRules.value.fileOverrides };
                //     freshOverrides[currentEditingFile.value.name] = codeEditor.getValue();
                //     calibrationRules.value.fileOverrides = freshOverrides;
                // }
            }
            
            try {
            window.parent.postMessage({ 
                action: 'SAVE_STORAGE', 
                key: 'tms_calibrations', 
                value: JSON.parse(JSON.stringify(calibrationRules.value)) 
            }, '*');

            localStorage.setItem('tms_calibrations', JSON.stringify(calibrationRules.value));
            
            let snippetToCopy = {};
            targets.forEach(sig => {
                // If it's a standard signature, configs.js usually drops the "DEMO_" prefix
                let cleanSig = (!isSavingDemo && sig.startsWith('DEMO_')) ? sig.replace('DEMO_', '') : sig;
                snippetToCopy[cleanSig] = activeConfig;
            });

            console.log("\n======== 📋 COPY FOR CONFIGS.JS ========");
            console.log(JSON.stringify(snippetToCopy, null, 4));
            console.log("========================================\n");

            alert("✅ Settings saved successfully!");
            triggerRender();
            
            } catch (error) {
                console.error("Storage error:", error);
                alert("Error trying to save to browser storage.");
            }
        };

        const resetCurrentCalibration = async () => {
            let targets = Array.from(activeSignaturesForSaving);
            let isResettingDemo = isCurrentLabelDemo.value;

            if (targets.length === 0 && !isResettingDemo && !currentEditingFile.value) {
                return alert("Could not find an active barcode on the screen to reset.");
            }

            if (!confirm("Are you sure you want to reset the rules for this label back to default?")) return;

            if (isResettingDemo) {
                let demoKey = demoSettings.value.labelType === 'product' ? `DEMO_RAW_${pendingProductSelection.value?.category || 'UNK'}` : `DEMO_RAW_BANK_${demoSettings.value.selectedBankId}`;
                let freshDemoRules = { ...demoCalibrationRules.value };
                
                delete freshDemoRules[demoKey]; // Delete local ghost raw template
                
                Object.keys(freshDemoRules).forEach(key => {
                    if (key.startsWith('DEMO_ZPL_') || key.startsWith('DEMO_EPL_')) {
                        delete freshDemoRules[key]; // Delete local barcode signatures
                    }
                });

                demoCalibrationRules.value = freshDemoRules; 
                localStorage.setItem('tms_demo_calibrations', JSON.stringify(freshDemoRules));
                
                // Filter the sync for the server payload
                let serverDemoRules = {};
                Object.keys(demoCalibrationRules.value).forEach(key => {
                    if (!key.startsWith('DEMO_RAW_')) {
                        serverDemoRules[key] = demoCalibrationRules.value[key];
                    }
                });
                // ...
                calibrationRules.value.demoCalibrations = serverDemoRules;
                
                settings.value.dmOffset = 0; settings.value.bcMoveX = 0; settings.value.bcMoveY = 0;
                settings.value.offsetX = 0; settings.value.offsetY = 0; //  RESTORED TO ZERO
                settings.value.fontSpace = 0; settings.value.fontWidth = 1.0; settings.value.fontSize = 1.0;
                // ...
                lastLoadedSignature = null;
                generateDemoLabels();
            } else {
                if (calibrationRules.value.signatures) {
                    let freshSigs = { ...calibrationRules.value.signatures };
                    targets.forEach(sig => { delete freshSigs[sig]; });
                    calibrationRules.value.signatures = freshSigs; 
                }
                
                if (currentEditingFile.value && calibrationRules.value.fileOverrides) {
                    let freshOverrides = { ...calibrationRules.value.fileOverrides };
                    delete freshOverrides[currentEditingFile.value.name];
                    calibrationRules.value.fileOverrides = freshOverrides; 
                }
            }

            //  FIX: Strip the Vue Proxy wrapper before sending!
            window.parent.postMessage({ 
                action: 'SAVE_STORAGE', 
                key: 'tms_calibrations', 
                value: JSON.parse(JSON.stringify(calibrationRules.value)) 
            }, '*');

            localStorage.setItem('tms_calibrations', JSON.stringify(calibrationRules.value));

            alert("✅ Settings reset successfully!");
            triggerRender();
        };
        const nukeCache = () => {
            console.log("💥 CACHE NUKED via UI Hotkey!");
            
            // 1. Wipe all sandbox memory completely
            zplCache.clear();
            sessionStorage.clear();
            
            //  THE FIX: Wipes ALL keys in the sandbox's local storage instantly
            localStorage.clear(); 
            
            //  THE FIX: Tell the parent window to burn the Chrome backups!
            window.parent.postMessage({ action: 'CLEAR_ALL_STORAGE' }, '*');
            
            // 2. Erase the screen
            renderedLabels.value = [];
            
            // 3. Force the engine to forget the previous label code
            renderState.lastCode = ''; 
            
            // 4. Reload the entire extension for a truly pristine slate
            setTimeout(() => {
                alert("💥 ALL memory wiped! The extension will now restart.");
                // Ask parent to reload the app to purge any Vue variables in memory
                window.parent.postMessage({ action: 'RELOAD_APP' }, '*');
            }, 100);
        };
        const handleCalibrationKeys = (e) => {
            if (!isCalibrationMode.value) return;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

            //  THE CACHE NUKE HOTKEY (Shift + C)
            if (e.shiftKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                zplCache.clear(); // 1. Wipe the ZPL API image memory
                sessionStorage.clear(); // 2. Wipe the file list network cache
                renderedLabels.value = []; // 3. Force the UI to destroy the old HTML images
                console.log("💥 CACHE NUKED! Forcing a fresh render...");
                triggerRender(); // 4. Redraw everything from scratch
                return;
            }

            let step = e.shiftKey ? 5 : 1; 
            let needsRender = false;

            switch (e.key) {
                case 'ArrowUp': settings.value.bcMoveY -= step; needsRender = true; break;
                case 'ArrowDown': settings.value.bcMoveY += step; needsRender = true; break;
                case 'ArrowLeft': settings.value.bcMoveX -= step; needsRender = true; break;
                case 'ArrowRight': settings.value.bcMoveX += step; needsRender = true; break;
                case '+':
                case '=':
                    settings.value.dmOffset = parseFloat((parseFloat(settings.value.dmOffset || 0) + 0.1).toFixed(1));
                    needsRender = true;
                    break;
                case '-':
                case '_':
                    settings.value.dmOffset = parseFloat((parseFloat(settings.value.dmOffset || 0) - 0.1).toFixed(1));
                    needsRender = true;
                    break;
            }

            if (needsRender) {
                e.preventDefault(); 
                triggerRender();
            }
        };

        const generateDemoLabels = () => {
            let zplCode = ''; 
            
            //  Now pulling directly from user input, with a random fallback just in case they leave it blank
            const fakeBatchId = demoSettings.value.batchNumber || Math.floor(100000 + Math.random() * 900000).toString();
            const selectedMilkType = demoSettings.value.milkType || 'Term';
            
            const trunc = (str, maxLen) => {
                if (!str) return '';
                const s = String(str);
                return s.length > maxLen ? s.substring(0, maxLen - 3) + '...' : s;
            };
            
            try {
                for (let i = 0; i < demoSettings.value.quantity; i++) {
                    const displayFac = demoSettings.value.facilityName || 'Timeless';
                    let displayId = (demoSettings.value.baseId || "013174").replace(/[^A-Z0-9]/gi, '');            
                    const displayVol = demoSettings.value.volume || 120;
                    const displayCal = demoSettings.value.calories || 20;

                    let baseSerial = parseInt(demoSettings.value.startSerial) || 1;
                    let currentSerial = String(baseSerial + i).padStart(3, '0');

                    if (demoSettings.value.labelType === 'product') {
                        const dateParts = (demoSettings.value.expiryDate || '2026-01-01').split('-');
                        const yy = dateParts[0].substring(2);
                        const mm = dateParts[1];
                        const dd = dateParts[2];
                        const expFormatted = `${yy}${mm}${dd}`;
                        
                        let activeCategory = pendingProductSelection.value ? pendingProductSelection.value.category : 'General';
                        
                        let rawGtin = demoSettings.value.gtin || '00000000000000'; 
                        let gtinPadded = rawGtin.padStart(14, '0'); 
                        
                        let barcodeData = '';
                        let safeLotData = demoSettings.value.lot || 'DEMO01';

                        if (activeCategory === 'Prolacta') {
                            
                            //  FULL GS1 FORMAT (Prolacta uses Application Identifier 21 for Serial)
                            barcodeData = `01${gtinPadded}10${safeLotData}17${expFormatted}21${currentSerial}`;
                            
                        } else if (activeCategory === 'Abbott' || activeCategory === 'Nestle' || activeCategory === 'Nutricia') {
                            
                            // Sequence expected by the backend: 01(GTIN) + 17(EXP) + 10(LOT)
                            // By putting the Lot at the end, we avoid needing the complex FNC1 separator!
                            barcodeData = `01${gtinPadded}17${expFormatted}10${safeLotData}`;
                            
                        } else {
                            //  HARDWARE SCANNER MIMIC
                            if (activeCategory === 'Gerber') {
                                // Gerber's DB entry strictly expects 12 digits, so we restore the missing leading zero
                                barcodeData = rawGtin.padStart(12, '0');
                            } else {
                                // Output exactly the raw string selected in the UI for the others (MJN, etc.)
                                barcodeData = rawGtin;
                            }
                        }

                        let format = demoSettings.value.barcodeFormat || 'datamatrix';
                        let humanExpDate = `${mm}/${dd}/${yy}`;
                        let labelCountStr = String(i + 1).padStart(2, '0');

                        // ==========================================
                        // 0. LOAD PRODUCT SIGNATURE CONFIGURATIONS
                        // ==========================================
                        let signatureKey = "DEMO_ZPL_DM_20_50"; 
                        if (format === 'upca' || format === 'ean13' || format === 'itf14') {
                            signatureKey = "DEMO_ZPL_ITF_15_50";
                        } else if (format === 'gs1-128') {
                            signatureKey = "DEMO_ZPL_C128_15_50";
                        } else if (format === 'qrcode' || format === 'azteccode') {
                            signatureKey = "DEMO_ZPL_QR_20_50";
                        }


                        const sigDefaults = DEMO_PRODUCT_SIGNATURES[signatureKey] || {};
                        const jsonDefaults = pendingProductSelection.value?.layoutOverrides || {};

                        const layout = {
                            offsetX: 0, offsetY: 0,
                            bcMoveX: 0, bcMoveY: 0,
                            dmOffset: 0, fontSize: 22,
                            ...jsonDefaults,
                            ...sigDefaults 
                        };

                        // ==========================================
                        // 1. DEFINE ALL SAFE VARIABLES FIRST
                        // ==========================================
                        let safeProductName = trunc(demoSettings.value.productName || 'PRODUCT', 40);
                        let safeGtin = trunc(gtinPadded, 22); 
                        let safeLot = trunc(demoSettings.value.lot || 'DEMO01', 18);
                        let safeCat = trunc(activeCategory, 50);

                       /// ==========================================
                        // 2. GENERATE BARCODE COMMAND ONLY
                        // ==========================================
                        let zplBarcodeCommand = '';
                        
                        if (format === 'upca') {
                            let upc = rawGtin.length > 12 ? rawGtin.substring(rawGtin.length - 12) : rawGtin;
                            zplBarcodeCommand = `^FO${15 + layout.offsetX},${50 + layout.offsetY}^BY2,2,100^BCN,100,N,N,N,A^FD${upc}^FS\n` + 
                                                `^FO${15 + layout.offsetX},${155 + layout.offsetY}^A0N,28,28^FD${upc}^FS`;
                        } else if (format === 'ean13') {
                            let ean = rawGtin.length > 13 ? rawGtin.substring(rawGtin.length - 13) : rawGtin;
                            zplBarcodeCommand = `^FO${45 + layout.offsetX},${55 + layout.offsetY}^BY3,2,80^BEN,80,Y,N^FD${ean}^FS`;
                        } else if (format === 'gs1-128') {
                            zplBarcodeCommand = `^FO${15 + layout.offsetX},${50 + layout.offsetY}^BY2,2,100^BCN,100,N,N,N,A^FD${barcodeData}^FS\n^FO${15 + layout.offsetX},${155 + layout.offsetY}^A0N,28,28^FD${barcodeData}^FS`;
                        } else if (format === 'itf14') {
                            zplBarcodeCommand = `^FO${15 + layout.offsetX},${50 + layout.offsetY}^BY3,2,100^B2N,100,N,N,N^FD${gtinPadded}^FS\n^FO${15 + layout.offsetX},${155 + layout.offsetY}^A0N,28,28^FD${gtinPadded}^FS`;
                        } else if (format === 'qrcode') {
                            zplBarcodeCommand = `^FO${15 + layout.offsetX},${50 + layout.offsetY}^BQN,2,4^FDQA,${barcodeData}^FS`;
                        } else if (format === 'azteccode') {
                            zplBarcodeCommand = `^FO${20 + layout.offsetX},${50 + layout.offsetY}^B0N,4,N,0,N,1,0^FD${barcodeData}^FS`;
                        } else {
                            let dmSize = barcodeData.length > 20 ? 5 : 8;
                            zplBarcodeCommand = `^FO${20 + layout.offsetX},${50 + layout.offsetY}^BXN,${dmSize},200^FD${barcodeData}^FS`;
                        }

                        // ==========================================
                        // 3. ASSEMBLE FULL LABEL
                        // ==========================================
                        if (format === 'upca') {
                            zplCode += `^XA\n` +
                                       `^FX_TMS_DEMO^FS\n` +
                                       `^FO${20 + layout.offsetX},${15 + layout.offsetY}^A0N,24,24^FD${safeProductName}^FS\n` +
                                       `^FO${20 + layout.offsetX},${40 + layout.offsetY}^GB410,2,2^FS\n` +
                                       `${zplBarcodeCommand}\n` +
                                       `^FO${20 + layout.offsetX},${180 + layout.offsetY}^A0N,22,22^FDLOT: ${safeLot}^FS\n` +
                                       `^FO${240 + layout.offsetX},${180 + layout.offsetY}^A0N,22,22^FDEXP: ${humanExpDate}^FS\n` +
                                       `^FO${340 + layout.offsetX},${15 + layout.offsetY}^A0N,20,20^FD${labelCountStr}^FS\n` +
                                       `^XZ\n\n`;
                        } else if (format === 'ean13') {
                            zplCode += `^XA\n` +
                                       `^FX_TMS_DEMO^FS\n` +
                                       `^FO${20 + layout.offsetX},${15 + layout.offsetY}^A0N,24,24^FD${safeProductName}^FS\n` +
                                       `^FO${20 + layout.offsetX},${45 + layout.offsetY}^GB410,2,2^FS\n` +
                                       `${zplBarcodeCommand}\n` +
                                       `^FO${20 + layout.offsetX},${170 + layout.offsetY}^A0N,22,22^FDLOT: ${safeLot}^FS\n` +
                                       `^FO${240 + layout.offsetX},${170 + layout.offsetY}^A0N,22,22^FDEXP: ${humanExpDate}^FS\n` +
                                       `^FO${370 + layout.offsetX},${55 + layout.offsetY}^A0N,20,20^FD${labelCountStr}^FS\n` +
                                       `^XZ\n\n`;
                        } else if (format === 'qrcode' || format === 'azteccode') {
                            zplCode += `^XA\n^FX_TMS_DEMO^FS\n` +
                                       `^FO${20 + layout.offsetX},${15 + layout.offsetY}^A0N,23,23^FD${safeProductName}^FS\n` +
                                       `^FO${20 + layout.offsetX},${40 + layout.offsetY}^GB410,2,2^FS\n` +
                                       `^FO${145 + layout.offsetX},${50 + layout.offsetY}^A0N,22,22^FDGTIN: ${safeGtin}^FS\n` +
                                       `^FO${145 + layout.offsetX},${80 + layout.offsetY}^A0N,22,22^FDLOT:  ${safeLot}^FS\n` +
                                       `^FO${145 + layout.offsetX},${110 + layout.offsetY}^A0N,22,22^FDEXP:  ${demoSettings.value.expiryDate || '2026-01-01'}^FS\n` +
                                       `^FO${145 + layout.offsetX},${140 + layout.offsetY}^A0N,22,22^FDSN:   (21) ${currentSerial}^FS\n` +
                                       `${zplBarcodeCommand}\n` +
                                       `^FO${15 + layout.offsetX},${175 + layout.offsetY}^A0N,20,20^FD${safeCat}^FS\n` +
                                       `^FO${350 + layout.offsetX},${175 + layout.offsetY}^A0N,20,20^FD${labelCountStr}^FS\n` +
                                       `^XZ\n\n`;
                        } else {
                            let is1D = ['gs1-128', 'itf14'].includes(format);
                            if (is1D) {
                                zplCode += `^XA\n^FX_TMS_DEMO^FS\n` +
                                           `^FO${25 + layout.offsetX},${15 + layout.offsetY}^A0N,25,25^FD${safeProductName}^FS\n` +
                                           `^FO${10 + layout.offsetX},${40 + layout.offsetY}^GB400,2,2^FS\n` +
                                           `${zplBarcodeCommand}\n` +
                                           `^FO${25 + layout.offsetX},${180 + layout.offsetY}^A0N,22,22^FDLot : ${safeLot}  |  Expiry: ${humanExpDate}^FS\n` +
                                           `^FO${370 + layout.offsetX},${50 + layout.offsetY}^A0N,22,22^FD${labelCountStr}^FS\n` +
                                           `^XZ\n\n`;
                            } else {
                                zplCode += `^XA\n^FX_TMS_DEMO^FS\n` +
                                           `^FO${20 + layout.offsetX},${15 + layout.offsetY}^A0N,23,23^FD${safeProductName}^FS\n` +
                                           `^FO${20 + layout.offsetX},${40 + layout.offsetY}^GB410,2,2^FS\n` +
                                           `^FO${145 + layout.offsetX},${50 + layout.offsetY}^A0N,22,22^FDGTIN: ${safeGtin}^FS\n` +
                                           `^FO${145 + layout.offsetX},${80 + layout.offsetY}^A0N,22,22^FDLOT:  ${safeLot}^FS\n` +
                                           `^FO${145 + layout.offsetX},${110 + layout.offsetY}^A0N,22,22^FDEXP:  ${demoSettings.value.expiryDate || '2026-01-01'}^FS\n` +
                                           `^FO${145 + layout.offsetX},${140 + layout.offsetY}^A0N,22,22^FDSN:   (21) ${currentSerial}^FS\n` +
                                           `${zplBarcodeCommand}\n` +
                                           `^FO${15 + layout.offsetX},${175 + layout.offsetY}^A0N,20,20^FD${safeCat}^FS\n` +
                                           `^FO${350 + layout.offsetX},${175 + layout.offsetY}^A0N,20,20^FD${labelCountStr}^FS\n` +
                                           `^XZ\n\n`;
                            }
                        }

                    } else {
                        // ... milk banks code starts here ...
                        const activeBank = milkBanks.find(b => b.id === demoSettings.value.selectedBankId);
                        const displayFac = activeBank ? activeBank.name : 'Timeless Training';
                        const dbId = activeBank ? activeBank.id : '1';
                        
                        //  Replaced fakeBatchId with the safe fallback we created at the top!
                        const displayId = fakeBatchId; 
                        
                        const rawDate = demoSettings.value.expiryDate || new Date().toISOString().split('T')[0];
                        const d = new Date(rawDate + 'T00:00:00'); 
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                        const dateParts = rawDate.split('-'); 
                        const mmddyy = `${dateParts[1]}${dateParts[2]}${dateParts[0].substring(2)}`;
                        const volPadded = Math.round(parseFloat(demoSettings.value.volume) * 100).toString();
                        const calPadded = String(demoSettings.value.calories);

                        let rawTextToEncrypt = `V04_${dbId}_${displayId}_${currentSerial}_${mmddyy}_${volPadded}_${calPadded}_0`; 
                        let barcodePayload = timelessEncryptor.encrypt(rawTextToEncrypt.toUpperCase());

                        let safeBankName = trunc(displayFac, 45);

                        //  PACKED NEW VARIABLES INTO THE CONTEXT: added selectedMilkType and fakeBatchId (which is the actual batch number)
                        const context = { 
                            demoSettings: demoSettings.value, 
                            displayId: fakeBatchId, 
                            milkType: selectedMilkType, 
                            currentSerial, 
                            barcodePayload, 
                            safeBankName, 
                            trunc, 
                            d, 
                            months 
                        };
                        
                        zplCode += getMilkBankTemplate(displayFac, context);
                    }
                }
                
                if (codeEditor) {
                    //  FIX: Temporarily blindfold the watcher so the parser doesn't crash on bulk injections!
                    isListView.value = true; 
                    
                    codeEditor.setValue(zplCode);
                    
                    isDemoMode.value = false;
                    isListView.value = false; // Take the blindfold off
                    setTimeout(() => { codeEditor.layout(); triggerRender(); }, 50);
                }
                
            } catch (err) {
                console.error("Generator Error:", err);
                alert("Check console: " + err.message);
            }
        };

        const renderLabelLocally = (eplBlock, dotsW, dotsH, isDemoLabelActive) => {
            const canvas = document.createElement('canvas');
            canvas.width = dotsW; canvas.height = dotsH;
            const ctx = canvas.getContext('2d');
            
            ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, dotsW, dotsH);
            ctx.fillStyle = '#000000'; ctx.textBaseline = 'top';
            
            const lines = eplBlock.split(/\r?\n/);
            const isDemoLabel = isDemoLabelActive || eplBlock.includes(';TMS_DEMO');

            //  1. PRE-SCAN: Measure Aztec and DataMatrix INDEPENDENTLY
            let isWideLabel = false;
            let maxAztecDataLen = 0; 
            let maxDataMatrixLen = 0; 

            for (let line of lines) {
                let t = line.trim().toLowerCase();
                if (t.startsWith('q')) {
                    let qVal = parseInt(t.substring(1));
                    if (qVal > 600) isWideLabel = true;
                }
                if (t.startsWith('b')) {
                    let p = line.split(',');
                    let type = p[2] ? p[2].replace(/"/g,'').toUpperCase() : '';
                    
                    if (type === 'A' || type === 'D') {
                        let firstQuote = line.indexOf('"'); 
                        let lastQuote = line.lastIndexOf('"');
                        if (firstQuote !== -1 && lastQuote !== -1) {
                            let len = lastQuote - firstQuote - 1;
                            if (type === 'A' && len > maxAztecDataLen) maxAztecDataLen = len;
                            if (type === 'D' && len > maxDataMatrixLen) maxDataMatrixLen = len;
                        }
                    }
                }
            }

            //  2. CALCULATE DYNAMIC EPL
            let textScaleOffset = 0;
            let textSpacingOffset = 0;
            let detectedLayer = 1; 
            let is300Dpi = settings.value.density === '12'; 

            // //  AZTEC TEXT SCALING 0.9
            // if (maxAztecDataLen > 0) {
            //     if (maxAztecDataLen > 44) detectedLayer = 4; 
            //     else if (maxAztecDataLen > 26) detectedLayer = 3; 
            //     else if (maxAztecDataLen > 13) detectedLayer = 2; 
                
            //     if (detectedLayer === 4) {
            //         if (is300Dpi) textScaleOffset = 0.10; 
            //         else textScaleOffset = 0.1985, textSpacingOffset = 3;  
            //     } else if (detectedLayer === 1) {
            //         if (is300Dpi) textScaleOffset = 0.10; 
            //         else textScaleOffset = 0.2, textSpacingOffset = 9;    
            //     } else if (detectedLayer === 3) textScaleOffset = 0.20; 
            //     else if (detectedLayer === 2) textScaleOffset = 0.10; 
            // }
            
            //  DATAMATRIX TEXT SCALING (Completely Isolated)
            // else if (maxDataMatrixLen > 0) {
            //     if (maxDataMatrixLen > 44) detectedLayer = 4; 
            //     else if (maxDataMatrixLen > 26) detectedLayer = 3; 
            //     else if (maxDataMatrixLen > 13) detectedLayer = 2; 
            //     else detectedLayer = 1;
                
            //     textScaleOffset = 0.11; 
            //     textSpacingOffset = 1;
            // }

            let prePassSig = null; 
            let hardwareRuleSig = null;
            
            //  NEW: Auto-capture font sizes & handle text-only labels
            let hasBarcode = false;
            for (let line of lines) {
                let trimmed = line.trim();
                if (trimmed.startsWith('b')) {
                    hasBarcode = true;
                    let p = trimmed.split(',');
                    let bcType = getBcType(p[2] ? p[2].replace(/"/g,'').toUpperCase() : '');
                    let sig = `${isDemoLabel ? 'DEMO_' : ''}EPL_${bcType}_${parseInt(p[0].substring(1))}_${parseInt(p[1])}`; 
                    
                    let fontMatches = eplBlock.match(/,0,([a-zA-Z0-9]+),0,/g);
                    if (fontMatches) {
                        let fonts = fontMatches.map(m => m.split(',')[2]);
                        let uniqueFonts = [...new Set(fonts)].sort().join('');
                        if (uniqueFonts) sig += '_F' + uniqueFonts;
                    }

                    if (!prePassSig) prePassSig = sig; 
                    let checkRule = getCalibrationRule(sig);
                    if (checkRule && checkRule.labelSize) hardwareRuleSig = sig; 
                    activeSignaturesForSaving.add(sig);
                }
            }

            if (!hasBarcode) {
                let sig = `${isDemoLabel ? 'DEMO_' : ''}EPL_TEXTONLY`;
                let fontMatches = eplBlock.match(/,0,([a-zA-Z0-9]+),0,/g);
                if (fontMatches) {
                    let fonts = fontMatches.map(m => m.split(',')[2]);
                    let uniqueFonts = [...new Set(fonts)].sort().join('');
                    if (uniqueFonts) sig += '_F' + uniqueFonts;
                }
                if (!prePassSig) prePassSig = sig;
                let checkRule = getCalibrationRule(sig);
                if (checkRule && checkRule.labelSize) hardwareRuleSig = sig;
                activeSignaturesForSaving.add(sig);
            }
            
            let finalSigToSync = hardwareRuleSig || prePassSig;
            if (finalSigToSync && !primaryEplSignature) { primaryEplSignature = finalSigToSync; syncUiToSignature(finalSigToSync); }

            let savedRule = getCalibrationRule(finalSigToSync);
            let isPrimary = (!isListView.value || selectedFiles.value.length <= 1);
            let isBcPrimary = isPrimary || finalSigToSync === primaryEplSignature;

            //  EPL HARDWARE CENTERING (VIRTUAL DISPLAY OVERRIDE)
            let hwOffsetX = 0;
            let hwOffsetY = 0;

            if (settings.value.isHardwareCenteringActive) {
                let explicitQWidth = dotsW;
                let explicitQHeight = dotsH;
                
                for (let line of lines) {
                    let t = line.trim();
                    if (t.startsWith('q')) {
                        let parsed = parseInt(t.substring(1));
                        if (parsed > 0) explicitQWidth = parsed;
                    }
                    if (t.toUpperCase().startsWith('Q')) {
                        let parsed = parseInt(t.substring(1).split(',')[0]);
                        if (parsed > 0) explicitQHeight = parsed;
                    }
                }
                
                let diffX = dotsW - explicitQWidth;
                let diffY = dotsH - explicitQHeight;

                let isAnomalyLabel = (explicitQWidth >= 810 && explicitQWidth <= 815) && (dotsW >= 708 && dotsW <= 712);

                if (isAnomalyLabel) {
                    let myVirtualTweakX = 30; 
                    let myVirtualTweakY = -2; 

                    hwOffsetX = Math.floor(diffX / 2) + myVirtualTweakX;
                    hwOffsetY = (diffY < 0 ? diffY : Math.floor(diffY / 2)) + myVirtualTweakY;
                } 
            } 

            // Combine hardware baseline with UI sliders
            let globalX = (isBcPrimary ? parseInt(settings.value.offsetX || 0) : (savedRule ? parseInt(savedRule.offsetX || 0) : 0)) + hwOffsetX;
            let globalY = (isBcPrimary ? parseInt(settings.value.offsetY || 0) : (savedRule ? parseInt(savedRule.offsetY || 0) : 0)) + hwOffsetY;

            let tFont = isBcPrimary ? (settings.value.font || '') : (savedRule ? (savedRule.font || '') : '');
            let customFont = tFont ? `"${tFont}", ` : '';

            // ==========================================================
            // HELPER: BARCODE PARSING
            // ==========================================================
            const drawEplBarcode = (line, offsetX, offsetY) => {
                const firstQuote = line.indexOf('"'); 
                const lastQuote = line.lastIndexOf('"');
                if (firstQuote === -1 || lastQuote === -1) return;

                const data = line.substring(firstQuote + 1, lastQuote);
                const params = line.substring(1, firstQuote).split(',');
                
                let x = parseInt(params[0]) || 0; 
                let y = parseInt(params[1]) || 0; 
                const type = params[2] ? params[2].toUpperCase() : ''; 
                
                let bcid = 'datamatrix'; 
                if (type === 'Q') bcid = 'qrcode'; 
                else if (type === 'P') bcid = 'pdf417'; 
                else if (type === 'A') bcid = 'azteccode'; 
                else if (type === 'D') bcid = 'datamatrix'; 

                let parsedVal = 3; 

                if (bcid === 'azteccode' || bcid === 'datamatrix' || bcid === 'qrcode') {
                    for (let j = 3; j < params.length; j++) {
                        let p = params[j].trim().toLowerCase();
                        let match = p.match(/^[a-z](\d+(?:\.\d+)?)$/);
                        if (match) {
                            let val = parseFloat(match[1]);
                            if (val > 0) parsedVal = val;
                        }
                    }
                }

                let sig = `${isDemoLabel ? 'DEMO_' : ''}EPL_${getBcType(type)}_${x}_${y}`; 
                
                let fontMatches = eplBlock.match(/,0,([a-zA-Z0-9]+),0,/g);
                if (fontMatches) {
                    let fonts = fontMatches.map(m => m.split(',')[2]);
                    let uniqueFonts = [...new Set(fonts)].sort().join('');
                    if (uniqueFonts) sig += '_F' + uniqueFonts;
                }

                let thisSavedRule = getCalibrationRule(sig);
                let thisIsBcPrimary = isPrimary || sig === primaryEplSignature;

                let tDm = 0; 
                let tX = 0; 
                let tY = 0;
                let globalMasterX = 0;
                let globalMasterY = 0;

                // ONLY calculate and apply offsets if it is specifically a DataMatrix
                if (bcid === 'datamatrix') {
                    tDm = thisIsBcPrimary ? parseFloat(settings.value.dmOffset || 0) : (thisSavedRule ? parseFloat(thisSavedRule.dmOffset || 0) : 0);
                    tX = thisIsBcPrimary ? parseInt(settings.value.bcMoveX || 0) : (thisSavedRule ? parseInt(thisSavedRule.bcMoveX || 0) : 0);
                    tY = thisIsBcPrimary ? parseInt(settings.value.bcMoveY || 0) : (thisSavedRule ? parseInt(thisSavedRule.bcMoveY || 0) : 0);
                    
                    if (isNaN(tDm)) tDm = 0; if (isNaN(tX)) tX = 0; if (isNaN(tY)) tY = 0;

                    // Your Global Hardcoded DataMatrix Offsets
                    globalMasterX = 4; 
                    globalMasterY = 4; 
                }

                // Apply the math! (If it's an Aztec or QR code, tX and tY will safely remain 0)
                x = x + tX + offsetX + globalMasterX; 
                y = y + tY + offsetY + globalMasterY;

                try {
                    const tempCanvas = document.createElement('canvas');
                    let bwipOpts = { bcid: bcid, text: data, scale: 1, padding: 0, includetext: false };

                    if (bcid === 'azteccode') {
                        bwipOpts.eclevel = 23; 
                        bwipOpts.format = 'compact';
                    }

                    try {
                        bwipjs.toCanvas(tempCanvas, bwipOpts);
                    } catch (err) {
                        if (bwipOpts.format === 'compact') {
                            delete bwipOpts.format; 
                            bwipjs.toCanvas(tempCanvas, bwipOpts);
                        } else {
                            throw err;
                        }
                    }
                        
                    const tmpCtx = tempCanvas.getContext('2d');
                    const ctxScaleX = (tmpCtx.getTransform ? tmpCtx.getTransform().a : window.devicePixelRatio) || 1;
                    const ctxScaleY = (tmpCtx.getTransform ? tmpCtx.getTransform().d : window.devicePixelRatio) || 1;
                    
                    const baseModulesW = tempCanvas.style.width ? parseFloat(tempCanvas.style.width) : (tempCanvas.width / ctxScaleX);
                    const baseModulesH = tempCanvas.style.height ? parseFloat(tempCanvas.style.height) : (tempCanvas.height / ctxScaleY);

                    let finalScalar = 0.50;
                    if (bcid === 'azteccode') finalScalar = 0.50; 
                    else if (bcid === 'qrcode') finalScalar = 0.65;
                    else if (bcid === 'datamatrix') finalScalar = 0.85;

                    let dotMultiplier = parsedVal * finalScalar;
                    dotMultiplier = Math.max(0.1, dotMultiplier + tDm);

                    let drawW = baseModulesW * dotMultiplier; 
                    let drawH = baseModulesH * dotMultiplier;

                    if (drawH > 82 && tDm === 0 && bcid !== 'azteccode' && bcid !== 'qrcode' && bcid !== 'datamatrix') { 
                        let shrinkRatio = 82 / drawH; 
                        drawH = 82; 
                        drawW *= shrinkRatio; 
                    }

                    if (isNaN(drawW) || isNaN(drawH) || drawW <= 0 || drawH <= 0) throw new Error(`Dimensions invalid: W=${drawW}, H=${drawH}`);

                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, x, y, drawW, drawH);
                    
                } catch (e) { 
                    console.warn(`Barcode [${bcid}] skipped at X:${x}, Y:${y}. Reason:`, e.message); 
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                    ctx.fillRect(x, y, 60, 60);
                    ctx.fillStyle = '#000000';
                }
            };

            // ==========================================================
            // RENDER LOOP
            // ==========================================================
            let renderLines = lines;
            if (!isDemoLabel && !savedRule) renderLines = lines;

            for (let line of renderLines) {
                line = line.trim(); 
                if (!line) continue;
                
                if (line.startsWith('A')) {
                    const firstQuote = line.indexOf('"'); const lastQuote = line.lastIndexOf('"');
                    if (firstQuote !== -1 && lastQuote !== -1) {
                        const text = line.substring(firstQuote + 1, lastQuote);
                        const params = line.substring(1, firstQuote).split(',');
                        const x = parseInt(params[0]) || 0; const y = parseInt(params[1]) || 0; const font = params[3];
                        let multX = parseInt(params[4]); if (isNaN(multX) || multX <= 0) multX = 1;
                        let multY = parseInt(params[5]); if (isNaN(multY) || multY <= 0) multY = 1;

                        //  FIX: Master Calibrators for EACH specific EPL Font!
                        // Tweak the 'baseH' (height) and 'baseW' (width) below to perfectly match your thermal printer.
                        let baseH = 1.06; let baseW = 1.00; let dotHeight = 24; let fontWeight = 'bold';
                        
                        if (font === '1')      { dotHeight = 12; fontWeight = 'normal'; baseH = 1.06; baseW = 1.00; }
                        else if (font === '2') { dotHeight = 16; fontWeight = 'normal'; baseH = 1.20; baseW = 1.12; }
                        else if (font === '3') { dotHeight = 20; fontWeight = 'bold';   baseH = 1.15; baseW = 1.08; }
                        else if (font === '4') { dotHeight = 24; fontWeight = 'bold';   baseH = 1.25; baseW = 1.00; }
                        else if (font === '5') { dotHeight = 48; fontWeight = 'bold';   baseH = 1.06; baseW = 1.00; }
                        else if (font === '6') { dotHeight = 64; fontWeight = 'bold';   baseH = 1.06; baseW = 1.00; }

                        // Global adjustment for Wide labels (keeps your previous math intact)
                        if (isWideLabel) { baseH -= 0.06; baseW -= 0.05; }

                        // Combine with DataMatrix inflation rules
                        let widthScale = baseW + textScaleOffset;

                        // UI Sliders (Isolated per label so they don't bleed in List View!)
                        let activeFontSize = isBcPrimary ? parseFloat(settings.value.fontSize || 1.0) : (savedRule ? parseFloat(savedRule.fontSize || 1.0) : 1.0);
                        let activeWidth = isBcPrimary ? parseFloat(settings.value.fontWidth || 1.0) : (savedRule ? parseFloat(savedRule.fontWidth || 1.0) : 1.0);
                        let activeSpacing = isBcPrimary ? parseInt(settings.value.fontSpace || 0) : (savedRule ? parseInt(savedRule.fontSpace || 0) : 0);

                        // Apply strict dimensions
                        let canvasFontSize = Math.round((dotHeight * baseH) * activeFontSize);

                        ctx.save();
                        ctx.font = `${fontWeight} ${canvasFontSize}px ${customFont}"Consolas", monospace`;
                        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = `${activeSpacing}px`;
                        
                        let finalStretch = multX * activeWidth * widthScale;
                        
                        ctx.scale(finalStretch, multY);
                        ctx.fillText(text, (x + globalX) / finalStretch, (y + globalY) / multY);
                        ctx.restore();
                    }
                } else if (line.startsWith('b')) {
                    drawEplBarcode(line, globalX, globalY);
                } else if (line.startsWith('B')) {
                    const firstQuote = line.indexOf('"'); const lastQuote = line.lastIndexOf('"');
                    if (firstQuote !== -1 && lastQuote !== -1) {
                        const data = line.substring(firstQuote + 1, lastQuote); const params = line.substring(1, firstQuote).split(',');
                        const x = parseInt(params[0]) || 0; const y = parseInt(params[1]) || 0;
                        const bcType = params[3]; const narrowBar = parseInt(params[4]) || 2; const targetHeight = parseInt(params[6]) || 50; 
                        let bcid = 'code128'; if (bcType === '3') bcid = 'code39'; if (bcType === 'E30') bcid = 'ean13'; if (bcType === 'UA0') bcid = 'upca';
                        try {
                            const tempCanvas = document.createElement('canvas');
                            bwipjs.toCanvas(tempCanvas, { bcid: bcid, text: data, scaleX: 1, scaleY: 1, height: 10, includetext: false, padding: 2 });
                            ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, x + globalX, y + globalY, tempCanvas.width * narrowBar, targetHeight);
                        } catch (e) { console.warn("Barcode skipped:", e.message) }
                    }
                } else if (/^(LE|LO|LS|LW|X)/i.test(line)) {
                    let cmd = line.substring(0, 2).toUpperCase(); let paramsStr = line.substring(2);
                    if (cmd.startsWith('X')) { cmd = 'X'; paramsStr = line.substring(1); }
                    let params = paramsStr.split(','); const x = parseInt(params[0]) || 0; const y = parseInt(params[1]) || 0;
                    const w = parseInt(params[2]) || 0; const h = parseInt(params[3]) || 0;

                    ctx.fillStyle = cmd === 'LW' ? '#ffffff' : '#000000';
                    if (cmd === 'X') {
                        const t = parseInt(params[4]) || 1;
                        ctx.fillRect(x + globalX, y + globalY, w, t); ctx.fillRect(x + globalX, y + globalY, t, h);
                        ctx.fillRect(x + globalX, y + globalY + h - t, w, t); ctx.fillRect(x + globalX + w - t, y + globalY, t, h);
                    } else { ctx.fillRect(x + globalX, y + globalY, w, h); }
                    ctx.fillStyle = '#000000'; 
                }
            }

            if (isDeveloperMode.value) {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.fillRect(0, dotsH - 30, Math.max(dotsW, 800), 30); 
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px Consolas, monospace';
                ctx.fillText(`DEBUG -> Aztec: ${maxAztecDataLen} | DM: ${maxDataMatrixLen} | Layer: ${detectedLayer} | Offset: ${textScaleOffset} | 300DPI: ${is300Dpi}`, 10, dotsH - 25);
            }

            return canvas.toDataURL('image/png');
        };

        const renderState = {
            lastCode: '',
            wasAutoActive: true,
            maxRequiredW: 0,
            maxRequiredH: 0,
            lockedSize: null,
            lockedDpi: null,
            autoHardwareOffsetX: 0
        };
        
        watch(() => settings.value.isHardwareCenteringActive, () => {
            triggerRender();
        });

        //  THE FIX: Tell the canvas to instantly re-calculate when the Auto Size toggle is clicked!
        watch(() => settings.value.isAutoDetectActive, () => {
            triggerRender();
        });

        //  FIX: Watch UI sliders and force Canvas Redraw!
        watch(
            () => [
                settings.value.offsetX, 
                settings.value.offsetY,
                settings.value.dmOffset, 
                settings.value.bcMoveX, 
                settings.value.bcMoveY,
                settings.value.fontSize, 
                settings.value.fontWidth, 
                settings.value.fontSpace
            ],
            () => {
                // Uses the built-in debouncer so it doesn't crash if you type fast
                debouncedRender(); 
            }
        );

        const processAutoDetectSizing = (codeString, detectedLang) => {
            let lockedSizeToApply = '2.25x1.25';
            let lockedDpiToApply = 203;

            //  FIX: STEP 1 (Saved Rules) and STEP 2 (Client Defaults) have been removed!
            // Auto Size is now strictly "Mathematical Shrink Wrap". 
            // If the user wants to use their saved rules, they simply toggle Auto Size OFF!

            // ==========================================================
            //  SMART SHRINK-WRAP & EXACT BOUNDARY DETECTION
            // ==========================================================
            
            // 1. Detect Explicit Canvas Boundaries (^PW / ^LL / q / Q)
            let currentRawW = null; let currentRawH = null;
            let firstBlock = detectedLang === 'zpl' ? (codeString.match(/\^XA[\s\S]*?\^XZ/i)?.[0] || "") : (codeString.match(/^[\s\S]*?P1/i)?.[0] || "");
            if (detectedLang === 'zpl') {
                const pwMatch = firstBlock.match(/\^PW\s*(\d+)/i); const llMatch = firstBlock.match(/\^LL\s*(\d+)/i);
                if (pwMatch) currentRawW = parseInt(pwMatch[1]); if (llMatch) currentRawH = parseInt(llMatch[1]);
            } else {
                const qMatch = firstBlock.match(/(?:^|[\r\n])[ \t]*q\s*(\d+)/); const capQMatch = firstBlock.match(/(?:^|[\r\n])[ \t]*Q\s*(\d+)(?:,\d+)?/);
                if (qMatch) currentRawW = parseInt(qMatch[1]); if (capQMatch) currentRawH = parseInt(capQMatch[1]);
            }

            lockedDpiToApply = 203; // Default Fallback
            
            // THE FIX: Safely extract sizes whether they are a flat array or grouped categories
            let availableSizes = [];
            if (activePrinterConfig.value && activePrinterConfig.value.sizes) {
                if (Array.isArray(activePrinterConfig.value.sizes)) {
                    availableSizes = activePrinterConfig.value.sizes;
                } else {
                    availableSizes = Object.values(activePrinterConfig.value.sizes).flat(); 
                }
            }
            
            if (currentRawW) {
                let is300 = availableSizes.some(s => Math.abs((parseFloat(s.split('x')[0]) * 300) - currentRawW) <= 10);
                let is203 = availableSizes.some(s => Math.abs((parseFloat(s.split('x')[0]) * 203) - currentRawW) <= 10);
                if (is300 && !is203) lockedDpiToApply = 300;
                else if (currentRawW >= 800 && !is203) lockedDpiToApply = 300;
            }

            // 2. Calculate Ink Bounding Box (In case explicit boundaries are missing)
            let maxReachX = 0; let maxReachY = 0;
            if (detectedLang === 'zpl') {
                let zplBlocks = codeString.split(/\^XA/i);
                zplBlocks.forEach(block => {
                    let lhX = 0, lhY = 0;
                    let allLh = [...block.matchAll(/\^LH\s*(\d+)\s*,\s*(\d+)/gi)];
                    if (allLh.length > 0) {
                        let lastLh = allLh[allLh.length - 1]; lhX = parseInt(lastLh[1]) || 0; lhY = parseInt(lastLh[2]) || 0;
                    }
                    const fields = block.split(/\^FS/i);
                    fields.forEach(f => {
                        const foMatch = f.match(/\^F[O0T]\s*(\d+)\s*,\s*(\d+)/i);
                        if (foMatch) {
                            let x = parseInt(foMatch[1]) + lhX; 
                            let y = parseInt(foMatch[2]) + lhY + 25; 
                            const fontMatch = f.match(/\^A[A-Z0-9]*[,\s]+(\d+)[,\s]+(\d+)/i);
                            const fdMatch = f.match(/\^FD([\s\S]*)$/i);
                            
                            let estimatedReachX = x;
                            
                            // FIX: Isolate Barcodes from Text calculations!
                            if (f.match(/\^(BX|B0|BQ|BU|BC|B2)/i)) {
                                // 1D barcodes are wider, 2D barcodes are compact squares
                                let is1D = f.match(/\^(BU|BC|B2)/i);
                                estimatedReachX += is1D ? 250 : 120; 
                            } else {
                                // Only multiply character width for actual readable text
                                let charW = fontMatch ? parseInt(fontMatch[2]) : 20;
                                let textLen = fdMatch && fdMatch[1] ? fdMatch[1].trim().length : 0;
                                estimatedReachX += (charW * textLen * 0.48); 
                            }

                            if (estimatedReachX > maxReachX) maxReachX = estimatedReachX;
                            if (y > maxReachY) maxReachY = y;
                        }
                    });
                });
            } else {
                const lines = codeString.split(/\r?\n/);
                lines.forEach(line => {
                    let trimmed = line.trim();
                    if (trimmed.startsWith('A')) {
                        let parts = trimmed.split(',');
                        if (parts.length >= 8) {
                            let x = parseInt(parts[0].substring(1)) || 0; let y = parseInt(parts[1]) || 0;
                            let font = parseInt(parts[3]) || 2; let multX = parseInt(parts[4]) || 1;
                            if (multX === 0) multX = 1;
                            let firstQuote = trimmed.indexOf('"'); let lastQuote = trimmed.lastIndexOf('"');
                            let textLen = (firstQuote !== -1 && lastQuote > firstQuote) ? lastQuote - firstQuote - 1 : 0;
                            let charW = 10; if (font === 1) charW = 8; if (font === 3) charW = 12; if (font === 4) charW = 14; if (font === 5) charW = 32;
                            let estimatedReachX = x + (textLen * charW * multX);
                            if (estimatedReachX > maxReachX) maxReachX = estimatedReachX;
                            if (y > maxReachY) maxReachY = y;
                        }
                    } else if (trimmed.match(/^[bB]/)) {
                        let parts = trimmed.split(',');
                        if (parts.length >= 3) {
                            let x = parseInt(parts[0].substring(1)) || 0; let y = parseInt(parts[1]) || 0;
                            let estimatedReachX = x + 180;
                            if (estimatedReachX > maxReachX) maxReachX = estimatedReachX;
                            if (y > maxReachY) maxReachY = y;
                        }
                    }
                });
            }

            // FIX: Never trust explicit canvas bounds blindly! Legacy templates often have wrong widths. 
            // We must use whichever is LARGER: the explicit command, or the actual calculated ink boundaries.
            let requiredDotsW = Math.max((currentRawW || 0), (maxReachX > 0 ? maxReachX + 40 : 0));
            let requiredDotsH = Math.max((currentRawH || 0), (maxReachY > 0 ? maxReachY + 40 : 0));

            if (requiredDotsW === 0) requiredDotsW = 457; // Default Fallback W
            if (requiredDotsH === 0) requiredDotsH = 254; // Default Fallback H

            let testW = requiredDotsW / lockedDpiToApply; 
            let testH = requiredDotsH / lockedDpiToApply;

            const sortedSizes = availableSizes.sort((a, b) => {
                const [aw, ah] = a.split('x').map(parseFloat); const [bw, bh] = b.split('x').map(parseFloat);
                return (aw * ah) - (bw * bh);
            });

            let bestFitMatch = null;
            for (let sizeStr of sortedSizes) {
                const [sw, sh] = sizeStr.split('x').map(parseFloat);
                if (sw >= (testW - 0.05) && sh >= (testH - 0.05)) {
                    bestFitMatch = { size: sizeStr, sw: sw, sh: sh }; 
                    break;
                }
            }

            if (bestFitMatch) {
                // If a standard size has too much dead space, instantly switch to Custom sizing
                if (bestFitMatch.sw - testW > 0.5 || bestFitMatch.sh - testH > 0.5) {
                    lockedSizeToApply = 'custom';
                    settings.value.customW = Math.max(1, Math.ceil(testW * 4) / 4);
                    settings.value.customH = Math.max(1, Math.ceil(testH * 4) / 4);
                } else {
                    lockedSizeToApply = bestFitMatch.size; 
                }
            } else {
                lockedSizeToApply = 'custom';
                settings.value.customW = Math.max(1, Math.ceil(testW * 4) / 4);
                settings.value.customH = Math.max(1, Math.ceil(testH * 4) / 4);
            }

            // ==========================================================
            // FINALIZE STATE
            // ==========================================================
            let intendedDensity = (lockedDpiToApply === 300) ? '12' : '8';
            settings.value.intendedDensity = intendedDensity; // SAVE THIS FOR THE VALIDATION ENGINE!
            
            let calculatedDensity = intendedDensity;
            
            // HARDWARE STRICT OVERRIDE
            if (activePrinterConfig.value && activePrinterConfig.value.fixedDpi) {
                calculatedDensity = activePrinterConfig.value.fixedDpi;
            }

            settings.value.density = calculatedDensity;
            settings.value.size = lockedSizeToApply;

            if (lockedSizeToApply !== 'custom') {
                if (sizeOffsets[lockedSizeToApply]) {
                    settings.value.offsetX = sizeOffsets[lockedSizeToApply].x;
                    settings.value.offsetY = sizeOffsets[lockedSizeToApply].y;
                } else {
                    settings.value.offsetX = 0; 
                    settings.value.offsetY = 0; // RESTORED TO ZERO
                }
            }
        };

        const triggerRender = async () => {
            await new Promise(resolve => setTimeout(resolve, 10));

            if (currentRenderController) currentRenderController.abort();
            currentRenderController = new AbortController();
            const signal = currentRenderController.signal;

            primaryZplSignature = null;
            primaryEplSignature = null;
            activeSignaturesForSaving.clear();
            
            validationErrors.value = []; 

            let codeString = isListView.value ? getCombinedListCode() : codeEditor?.getValue();
            
            const toggleJustTurnedOn = settings.value.isAutoDetectActive && !renderState.wasAutoActive;
            renderState.wasAutoActive = settings.value.isAutoDetectActive;

            if (toggleJustTurnedOn) {
                renderState.maxRequiredW = 0;
                renderState.maxRequiredH = 0;
                renderState.lockedSize = null;
                renderState.lockedDpi = null;
            }

            if (!codeString || !codeString.trim()) {
                renderedLabels.value = [];
                return;
            }

            isCurrentLabelDemo.value = codeString.includes('^FX_TMS_DEMO') || codeString.includes(';TMS_DEMO');
            const detectedLang = codeString.includes('^XA') ? 'zpl' : 'epl';
            settings.value.lang = detectedLang;

            if (settings.value.isAutoDetectActive) {
                processAutoDetectSizing(codeString, detectedLang);
            }
            else {
                const toggleJustTurnedOff = !settings.value.isAutoDetectActive && renderState.wasAutoActive;
                const codeChanged = codeString !== renderState.lastCode;
                
                if (codeChanged || toggleJustTurnedOff) {
                    lastLoadedSignature = null;
                    let foundSavedRule = false;
                    const isDemoLabel = isCurrentLabelDemo.value;

                    try {
                        let sigToCheck = null;
                        if (detectedLang === 'zpl') {
                            const fields = codeString.split(/\^FS/i);
                            for (let field of fields) {
                                let bcMatch = field.match(/\^(BX|B0|BQ|BU|BC|B2)/i);
                                if (bcMatch) {
                                    let foMatch = field.match(/\^F[O0T]\s*(-?\d+)\s*,\s*(-?\d+)/i);
                                    sigToCheck = `${isDemoLabel ? 'DEMO_' : ''}ZPL_${getBcType(bcMatch[1])}_${foMatch ? foMatch[1] : "0"}_${foMatch ? foMatch[2] : "0"}`;
                                    break;
                                }
                            }
                        } else {
                            const lines = codeString.split(/\r?\n/);
                            for (let line of lines) {
                                let trimmed = line.trim();
                                if (trimmed.startsWith('b')) {
                                    let p = trimmed.split(',');
                                    sigToCheck = `${isDemoLabel ? 'DEMO_' : ''}EPL_${getBcType(p[2] ? p[2].replace(/"/g,'').toUpperCase() : '')}_${parseInt(p[0].replace(/b/i,''))}_${parseInt(p[1])}`;
                                    break;
                                }
                            }
                        }

                        if (sigToCheck) {
                            let rule = getCalibrationRule(sigToCheck);
                            if (rule && (rule.labelSize || rule.labelDensity)) {
                                if (rule.labelSize) settings.value.size = rule.labelSize;
                                if (rule.labelDensity) settings.value.density = rule.labelDensity;
                                
                                if (rule.labelSize === 'custom') {
                                    settings.value.customW = parseFloat(rule.customW) || settings.value.customW;
                                    settings.value.customH = parseFloat(rule.customH) || settings.value.customH;
                                }
                                foundSavedRule = true; 
                            }
                        }
                    } catch(e) { console.warn("Manual Pre-Scan Failed:", e); }

                    if (!foundSavedRule && !isDemoLabel && selectedTmsUrl.value && calibrationRules.value.clientDefaults) {
                        let urlLower = selectedTmsUrl.value.toLowerCase();
                        let matchedKey = Object.keys(calibrationRules.value.clientDefaults).find(k => urlLower.includes(k));
                        
                        if (matchedKey) {
                            let cd = calibrationRules.value.clientDefaults[matchedKey];
                            if (cd.density) settings.value.density = cd.density;
                            if (cd.size) settings.value.size = cd.size;
                            
                            if (cd.size === 'custom') {
                                settings.value.customW = parseFloat(cd.customW) || 3;
                                settings.value.customH = parseFloat(cd.customH) || 1.5;
                            }
                            foundSavedRule = true; 
                        }
                    }
                }
            }

            renderState.lastCode = codeString;
            checkSizeLimits();
            
            const dots = calibratedDots.value;
            const dpi = settings.value.density === '12' ? 300 : 203;
            const physicalWMm = (dots.w / dpi) * 25.4;
            const physicalHMm = (dots.h / dpi) * 25.4;

            // =========================================================================
            //  DYNAMIC HARDWARE CENTERING MATH
            // =========================================================================
            let nativeDotsW = dots.w;
            let explicitSized = false;
            let sampleBlock = detectedLang === 'zpl' ? (codeString.match(/\^XA[\s\S]*?\^XZ/i)?.[0] || codeString) : (codeString.match(/^[\s\S]*?P1/i)?.[0] || codeString);

            if (detectedLang === 'zpl') {
                const pwMatch = sampleBlock.match(/\^PW\s*(\d+)/i);
                if (pwMatch) { nativeDotsW = parseInt(pwMatch[1]); explicitSized = true; }
            } else {
                const qMatch = sampleBlock.match(/(?:^|[\r\n])[ \t]*q\s*(\d+)/i);
                if (qMatch) { nativeDotsW = parseInt(qMatch[1]); explicitSized = true; }
            }

            if (!explicitSized) {
                let maxReachX = 0;
                if (detectedLang === 'zpl') {
                    const foMatches = [...sampleBlock.matchAll(/\^F[O0T]\s*(-?\d+)/gi)];
                    for (let m of foMatches) { if (parseInt(m[1]) > maxReachX) maxReachX = parseInt(m[1]); }
                } else {
                    const lines = sampleBlock.split(/\r?\n/);
                    for (let line of lines) {
                        let match = line.match(/^[ABbX]\s*(-?\d+)/i);
                        if (match && parseInt(match[1]) > maxReachX) maxReachX = parseInt(match[1]);
                    }
                }
                
                //  SMARTER FALLBACK: Now correctly recognizes 2" labels!
                if (maxReachX > 0) {
                    let est = maxReachX + 150; // Add breathing room for text/barcodes
                    if (est <= 406) nativeDotsW = 406;      // Snaps to 2"
                    else if (est <= 457) nativeDotsW = 457; // Snaps to 2.25"
                    else if (est <= 609) nativeDotsW = 609; // Snaps to 3"
                    else nativeDotsW = dots.w;
                } else {
                    nativeDotsW = dots.w;
                }
            }

            //  LOGIC SIMPLIFICATION
            // If both Auto-Detect AND Programmed Fit are ON -> Pristine exact fit (0 offset).
            // Otherwise, calculate the physical hardware gap for the selected canvas.
            if (settings.value.isHardwareCenteringActive && !settings.value.isAutoDetectActive) {
                if (Math.abs(dots.w - nativeDotsW) > 15) {
                    renderState.autoHardwareOffsetX = Math.floor((dots.w - nativeDotsW) / 2);
                } else {
                    renderState.autoHardwareOffsetX = 0;
                }
            } else {
                renderState.autoHardwareOffsetX = 0;
            }
            // =========================================================================
            let labelBlocks = [];
            if (detectedLang === 'zpl') {
                labelBlocks = extractZplBlocks(codeString, dots.w, dots.h);
            } else {
                const lines = codeString.split(/\r?\n/);
                let activeSetup = {}; let currentBlock = [];
                for (let line of lines) {
                    let trimmed = line.trim(); if (!trimmed) continue;
                    let cmdActual = trimmed.charAt(0); 
                    let cmdUpper = cmdActual.toUpperCase();
                    
                    if (['D', 'Z', 'Q', 'q', 'O', 'I', 'S'].includes(cmdActual)) { 
                        activeSetup[cmdActual] = trimmed; 
                        currentBlock.push(trimmed); 
                    } 
                    else if (cmdUpper === 'N') { 
                        if (currentBlock.some(l => /^[ABbGWX]/i.test(l))) labelBlocks.push(currentBlock.join('\n') + '\n');
                        currentBlock = Object.values(activeSetup); currentBlock.push(trimmed); 
                    } 
                    else if (cmdUpper === 'P') { 
                        currentBlock.push(trimmed); labelBlocks.push(currentBlock.join('\n') + '\n'); currentBlock = []; 
                    } 
                    else { currentBlock.push(trimmed); }
                }
                if (currentBlock.some(l => /^[ABbGWX]/i.test(l))) labelBlocks.push(currentBlock.join('\n') + '\n');
            }

            if (renderedLabels.value.length > labelBlocks.length) {
                renderedLabels.value.splice(labelBlocks.length);
            }

            for (let i = 0; i < labelBlocks.length; i++) {
                if (!renderedLabels.value[i]) {
                    renderedLabels.value[i] = { src: null, alt: 'Loading...', loading: true, error: false, errorMsg: '' };
                } else {
                    renderedLabels.value[i].error = false;
                    renderedLabels.value[i].errorMsg = '';
                }
            }

            for (let i = 0; i < labelBlocks.length; i++) {
                if (signal.aborted) return;
                
                try {
                    let finalSrc = null;
                    
                    if (detectedLang === 'zpl' && typeof zplLibrary !== 'undefined') {
                        let apiPayload = labelBlocks[i]; 
                        const isDemoLabel = apiPayload.includes('^FX_TMS_DEMO') || apiPayload.includes(';TMS_DEMO');
                        apiPayload = apiPayload.replace(/\^AQ/gi, '^A0');
                        
                        apiPayload = apiPayload.replace(/\\&/g, '&');

                        let lhX = 0, lhY = 0;
                        let lhMatch = apiPayload.match(/\^LH\s*(-?\d+)\s*,\s*(-?\d+)/i);
                        if (lhMatch) {
                            lhX = parseInt(lhMatch[1]) || 0;
                            lhY = parseInt(lhMatch[2]) || 0;
                        }

                        apiPayload = apiPayload.replace(/\^PW\d+/gi, '');
                        apiPayload = apiPayload.replace(/\^LL\d+/gi, '');
                        apiPayload = apiPayload.replace(/\^XA/gi, `^XA\n^PW${dots.w}\n^LL${dots.h}`);

                        //  1. ZPL PRE-SCAN: Find wide labels AND measure Aztec barcodes
                        let isWideLabel = false;
                        let maxAztecDataLen = 0; 

                        let pwMatch = apiPayload.match(/\^PW\s*(\d+)/i);
                        if (pwMatch && parseInt(pwMatch[1]) > 600) isWideLabel = true;

                        // Hunt for ZPL Aztec tags (^B0) and measure the data inside the ^FD
                        let b0Matches = [...apiPayload.matchAll(/\^B0[^]*?\^FD(.*?)(?=\^FS|$)/gi)];
                        for (let m of b0Matches) {
                            let cleanData = m[1].replace('>;>8', '');
                            if (cleanData.length > maxAztecDataLen) maxAztecDataLen = cleanData.length;
                        }

                        //  2. CALCULATE DYNAMIC TEXT OFFSET ZPL
                        let textScaleOffset = 0;
                        let detectedLayer = 1; 
                        let is300Dpi = settings.value.density === '12'; 

                        // if (maxAztecDataLen > 0) {
                        //     if (maxAztecDataLen > 44) detectedLayer = 4; 
                        //     else if (maxAztecDataLen > 26) detectedLayer = 3; 
                        //     else if (maxAztecDataLen > 13) detectedLayer = 2; 
                            
                        //     if (detectedLayer === 4) {
                        //         if (is300Dpi) textScaleOffset = 0.10; 
                        //         else textScaleOffset = 0.1985;  
                        //     }
                        //     else if (detectedLayer === 3) textScaleOffset = 0.20; 
                        //     else if (detectedLayer === 2) textScaleOffset = 0.10; 
                        // }

                        let fieldsForCalib = apiPayload.split(/\^FS/i);
                        let newFields = [];
                        let zplBarcodes = []; 

                        let zplPrePassSig = null;
                        let zplHardwareRuleSig = null;
                        
                        for (let field of fieldsForCalib) {
                            let bcMatch = field.match(/\^(BX|B0|BQ|BU|BC|B2)/i);
                            if (bcMatch) {
                                let bcType = getBcType(bcMatch[1]);
                                let foMatch = field.match(/\^F[O0T]\s*(-?\d+)\s*,\s*(-?\d+)/i);
                                let startX = foMatch ? foMatch[1] : "0";
                                let startY = foMatch ? foMatch[2] : "0";
                                let sig = `${isDemoLabel ? 'DEMO_' : ''}ZPL_${bcType}_${startX}_${startY}`;
                                
                                if (!zplPrePassSig) zplPrePassSig = sig;
                                let checkRule = getCalibrationRule(sig);
                                if (checkRule && checkRule.labelSize) zplHardwareRuleSig = sig;
                            }
                        }
                        
                        let finalZplSig = zplHardwareRuleSig || zplPrePassSig;
                        if (finalZplSig && !primaryZplSignature) {
                            primaryZplSignature = finalZplSig;
                            syncUiToSignature(finalZplSig); 
                        }

                        //  FIX: Fetch the Saved Rule so it works outside Calibration Mode!
                        let zplSavedRule = getCalibrationRule(finalZplSig);
                        let isPrimary = (!isListView.value || selectedFiles.value.length <= 1);
                        let isZplPrimary = isPrimary || finalZplSig === primaryZplSignature;
                        
                        // Master Global Canvas Offset for ZPL
                        let zplMasterOffsetX = 0; 
                        let zplMasterOffsetY = 0; 

                        let globalX = zplMasterOffsetX;
                        let globalY = zplMasterOffsetY;

                        // 🎯 Strict Inheritance Logic
                        if (isCalibrationMode.value && isZplPrimary) {
                            globalX += parseInt(settings.value.offsetX || 0);
                            globalY += parseInt(settings.value.offsetY || 0);
                        } else if (zplSavedRule) {
                            globalX += parseInt(zplSavedRule.offsetX || 0);
                            globalY += parseInt(zplSavedRule.offsetY || 0);
                        }

                        for (let field of fieldsForCalib) {
                            let foMatch = field.match(/\^F[O0T]\s*(-?\d+)\s*,\s*(-?\d+)/i);
                            let fdMatch = field.match(/\^FD\s*([\s\S]*)$/i);
                            let anyBcMatch = field.match(/\^(BX|B0|BQ|BU|BC|B2)/i);

                            if (anyBcMatch && fdMatch) {
                                let rawBcData = fdMatch[1].replace('>;>8', '').trim();
                                if (rawBcData === '') {
                                    field = field.replace(/\^FD\s*([\s\S]*)$/i, '^FD0000000000');
                                    fdMatch[1] = '0000000000'; 
                                }
                            }

                            let tDm = 0, tX = 0, tY = 0, tFont = '', tFontSize = 1.0;
                            
                            if (anyBcMatch && foMatch) {
                                let sig = `${isDemoLabel ? 'DEMO_' : ''}ZPL_${getBcType(anyBcMatch[1])}_${foMatch[1]}_${foMatch[2]}`;
                                activeSignaturesForSaving.add(sig);
                                let savedRule = getCalibrationRule(sig);
                                
                                let isBcPrimary = isPrimary || sig === primaryZplSignature;
                                
                                if (savedRule && typeof savedRule === 'object') {
                                    tDm = isBcPrimary ? parseFloat(settings.value.dmOffset || 0) : parseFloat(savedRule.dmOffset || 0);
                                    tX = isBcPrimary ? parseInt(settings.value.bcMoveX || 0) : parseInt(savedRule.bcMoveX || 0);
                                    tY = isBcPrimary ? parseInt(settings.value.bcMoveY || 0) : parseInt(savedRule.bcMoveY || 0);
                                    tFont = isBcPrimary ? (settings.value.font || '') : (savedRule.font || '');
                                    tFontSize = isBcPrimary ? parseFloat(settings.value.fontSize || 1.0) : parseFloat(savedRule.fontSize || 1.0);
                                } else {
                                    tDm = isBcPrimary ? parseFloat(settings.value.dmOffset || 0) : 0;
                                    tX = isBcPrimary ? parseInt(settings.value.bcMoveX || 0) : 0;
                                    tY = isBcPrimary ? parseInt(settings.value.bcMoveY || 0) : 0;
                                    tFont = isBcPrimary ? (settings.value.font || '') : '';
                                    tFontSize = isBcPrimary ? parseFloat(settings.value.fontSize || 1.0) : 1.0;
                                }
                            }

                            //  FIX: Intercept ALL barcodes onto the Canvas so offsets work universally!
                            let interceptRegex = /\^(BX|B0|BQ|BU|BC|B2)([^\^]*)/i;
                            let interceptMatch = field.match(interceptRegex);

                            if (interceptMatch && foMatch && fdMatch) {
                                let cleanData = fdMatch[1].replace('>;>8', '');
                                if (interceptMatch[1].toUpperCase() === 'BQ') cleanData = cleanData.replace(/^[A-Z0-9]{1,3},/, '');

                                zplBarcodes.push({
                                    x: parseInt(foMatch[1]) + tX, 
                                    y: parseInt(foMatch[2]) + tY, 
                                    isFT: /\^FT/i.test(field),
                                    type: interceptMatch[1].toUpperCase(),
                                    params: interceptMatch[2] || '',
                                    data: cleanData,
                                    sizeAdjust: tDm
                                });
                                
                                let stripRegex = /\^(BX|B0|BQ|BU|BC|B2)[^\^]*/i;
                                field = field.replace(stripRegex, '').replace(/\^FD[\s\S]*/i, '');
                                
                            } else {
                                field = field.replace(/\^BX([A-Z]?),(\d+(?:\.\d+)?)/gi, (m, ori, size) => `^BX${ori},${Math.max(0.1, parseFloat(size) + tDm)}`);
                                field = field.replace(/\^BQ([A-Z]?),(\d+),(\d+(?:\.\d+)?)/gi, (m, ori, model, size) => `^BQ${ori},${model},${Math.max(0.1, parseFloat(size) + tDm)}`);
                                field = field.replace(/\^B0([A-Z]?),(\d+(?:\.\d+)?)/gi, (m, ori, size) => `^B0${ori},${Math.max(0.1, parseFloat(size) + tDm)}`);
                            }

                            if (tFont && tFont.length === 1) {
                                let zplFontChar = '0';
                                if (tFont.toLowerCase().includes('courier')) zplFontChar = 'A';
                                field = field.replace(/\^A[A-Z0-9]/gi, `^A${zplFontChar}`);
                                field = field.replace(/\^CF[A-Z0-9]/gi, `^CF${zplFontChar}`);
                            }

                            if (tFontSize !== 1.0 || textScaleOffset !== 0) {
                                field = field.replace(/\^(A|CF)([A-Z0-9]+),?(\d+)?,?(\d+)?/gi, (match, cmd, font, h, w) => {
                                    let res = `^${cmd}${font}`;
                                    let height = h ? parseInt(h) : 0;
                                    let width = w ? parseInt(w) : height; 
                                    
                                    if (height) {
                                        let finalH = Math.max(1, Math.round(height * tFontSize));
                                        res += `,${finalH}`;
                                        
                                        if (width) {
                                            let finalW = Math.max(1, Math.round((width * tFontSize) * (1 + textScaleOffset)));
                                            res += `,${finalW}`;
                                        }
                                    }
                                    return res;
                                });
                            }
                            
                            newFields.push(field);
                        }

                        if (!primaryZplSignature) syncUiToSignature(null); 

                        let strippedZpl = newFields.join('^FS');
                        let b64 = null;
                        const cacheHash = `${strippedZpl}_${dots.w}_${dots.h}_${settings.value.density}`;
                        
                        if (zplCache.has(cacheHash)) {
                            b64 = zplCache.get(cacheHash);
                        } else {
                            b64 = await zplLibrary.zplToBase64Async(strippedZpl, physicalWMm, physicalHMm, parseInt(settings.value.density));
                            zplCache.set(cacheHash, b64);
                        }
                        
                        if (signal.aborted) return;

                        //  FIX: Force the Canvas to render if the user applies a Global Offset!
                        if (zplBarcodes.length > 0 || isDeveloperMode.value || globalX !== 0 || globalY !== 0) {
                            const img = new Image();
                            img.src = `data:image/png;base64,${b64}`;
                            await new Promise(r => img.onload = r);

                            const canvas = document.createElement('canvas');
                            canvas.width = img.width; 
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.imageSmoothingEnabled = false;
                            
                            // SHIFT ENTIRE ZPL RENDER BACKGROUND
                            ctx.drawImage(img, globalX, globalY);

                            for (let bc of zplBarcodes) {
                                try {
                                    const tmpCanvas = document.createElement('canvas');
                                    let bwipId = 'datamatrix'; 
                                    let is1D = false;

                                    if (bc.type === 'BU') { bwipId = 'upca'; is1D = true; }
                                    else if (bc.type === 'BC') { bwipId = 'code128'; is1D = true; }
                                    else if (bc.type === 'B2') { bwipId = 'interleaved2of5'; is1D = true; }
                                    else if (bc.type === 'BX') { bwipId = 'datamatrix'; is1D = false; }
                                    else if (bc.type === 'B0') { bwipId = 'azteccode'; is1D = false; }
                                    else if (bc.type === 'BQ') { bwipId = 'qrcode'; is1D = false; }

                                    if (is1D) {
                                        bwipjs.toCanvas(tmpCanvas, { bcid: bwipId, text: bc.data, scaleX: 2, scaleY: 2, height: 15, includetext: false, padding: 0 });
                                        
                                        const tmpCtx = tmpCanvas.getContext('2d');
                                        const ctxScaleX = (tmpCtx.getTransform ? tmpCtx.getTransform().a : window.devicePixelRatio) || 1;
                                        
                                        let destW = tmpCanvas.style.width ? parseFloat(tmpCanvas.style.width) : (tmpCanvas.width / ctxScaleX);
                                        destW = destW * 1.1; 
                                        
                                        let targetHeight = Math.max(30, 100 + (bc.sizeAdjust * 10));
                                        let finalBcDrawY = bc.y + lhY + globalY;
                                        if (bc.isFT) finalBcDrawY -= targetHeight;
                                        // Barcode correctly tracks global shifts naturally
                                        ctx.drawImage(tmpCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height, bc.x + lhX + globalX, bc.y + lhY + globalY, destW, targetHeight);
                                        
                                    } else {
                                        let pParts = bc.params.split(',');
                                        let baseMag = 3; 

                                        if (bc.type === 'BQ') { baseMag = parseFloat(pParts[2]); } 
                                        else { baseMag = parseFloat(pParts[1]); }
                                        if (isNaN(baseMag) || baseMag <= 0) baseMag = 3; 

                                        let bwipOpts = { bcid: bwipId, text: bc.data, scale: 1, padding: 0, includetext: false };

                                        if (bwipId === 'azteccode') {
                                            bwipOpts.eclevel = 23; 
                                            if (bc.data && bc.data.length < 35) {
                                                bwipOpts.format = 'compact'; 
                                            }
                                        }

                                        try {
                                            bwipjs.toCanvas(tmpCanvas, bwipOpts);
                                        } catch (err) {
                                            if (bwipOpts.format === 'compact') {
                                                try {
                                                    delete bwipOpts.format; 
                                                    bwipjs.toCanvas(tmpCanvas, bwipOpts);
                                                } catch (err2) {
                                                    continue; 
                                                }
                                            } else {
                                                continue; 
                                            }
                                        }

                                        const tmpCtx = tmpCanvas.getContext('2d');
                                        const ctxScaleX = (tmpCtx.getTransform ? tmpCtx.getTransform().a : window.devicePixelRatio) || 1;
                                        const ctxScaleY = (tmpCtx.getTransform ? tmpCtx.getTransform().d : window.devicePixelRatio) || 1;
                                        
                                        const baseModulesW = tmpCanvas.style.width ? parseFloat(tmpCanvas.style.width) : (tmpCanvas.width / ctxScaleX);
                                        const baseModulesH = tmpCanvas.style.height ? parseFloat(tmpCanvas.style.height) : (tmpCanvas.height / ctxScaleY);

                                        let finalScalar = 0.50;
                                        if (bwipId === 'azteccode') finalScalar = 0.50; 
                                        else if (bwipId === 'qrcode') finalScalar = 0.75; 

                                        let dotMultiplier = baseMag * finalScalar;
                                        dotMultiplier = Math.max(0.1, dotMultiplier + bc.sizeAdjust);

                                        let drawW = baseModulesW * dotMultiplier; 
                                        let drawH = baseModulesH * dotMultiplier;

                                        //  NEW: Segregated Master Offsets for ZPL Barcodes!
                                        let zplBcMasterX = 0;
                                        let zplBcMasterY = 0;

                                        if (bwipId === 'datamatrix') {
                                            zplBcMasterX = 0; // Positive moves ZPL DataMatrix right, negative left
                                            zplBcMasterY = 0; //  FIX: Removed the -6 custom offset!
                                        } else if (bwipId === 'azteccode') {
                                            zplBcMasterX = 0; // Positive moves ZPL Aztec right, negative left
                                            zplBcMasterY = 0; // Positive moves ZPL Aztec down, negative up
                                        }

                                        let finalBcDrawX = bc.x + lhX + globalX + zplBcMasterX;
                                        let finalBcDrawY = bc.y + lhY + globalY + zplBcMasterY;
                                        if (bc.isFT) {
                                            finalBcDrawY -= drawH; 
                                        }
                                        //  FIX: Barcode correctly tracks global shifts + isolated Master offsets
                                        ctx.drawImage(tmpCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height, finalBcDrawX, finalBcDrawY, drawW, drawH);
                                    }
                                } catch (e) { console.warn("Canvas Overlay Error:", e); }
                            }

                            if (isDeveloperMode.value) {
                                ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                                ctx.fillRect(0, canvas.height - 30, Math.max(canvas.width, 800), 30); 
                                ctx.fillStyle = '#ffffff';
                                ctx.font = 'bold 20px Consolas, monospace';
                                ctx.fillText(`ZPL DEBUG -> Len: ${maxAztecDataLen} | Layer: ${detectedLayer} | Offset: ${textScaleOffset} | Wide: ${isWideLabel} | 300DPI: ${is300Dpi}`, 10, canvas.height - 8);
                            }

                            finalSrc = canvas.toDataURL('image/png');
                        } else {
                            finalSrc = `data:image/png;base64,${b64}`;
                        }
                    } else if (detectedLang === 'epl') {
                        finalSrc = renderLabelLocally(labelBlocks[i], dots.w, dots.h, isCurrentLabelDemo.value);
                    }

                    if (!signal.aborted) {
                        if (finalSrc && renderedLabels.value[i].src !== finalSrc) {
                            renderedLabels.value[i].src = finalSrc;
                        }
                        renderedLabels.value[i].loading = false;
                    }

                } catch (e) {
                    if (e.name !== 'AbortError' && renderedLabels.value[i]) {
                        renderedLabels.value[i].error = true;
                        renderedLabels.value[i].errorMsg = e.message || "Failed to generate label image.";
                        renderedLabels.value[i].loading = false;
                    }
                }
            }
            if (detectedLang === 'epl' && !primaryEplSignature) syncUiToSignature(null);
        };

        const debounce = (f, w) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), w); }; };
        const debouncedRender = debounce(triggerRender, 500);

        const connectQZ = () => {
            if (!window.qz) return alert("QZ Tray script is not loaded.");
            
            const fetchPrinters = () => {
                window.qz.printers.find().then((printers) => {
                    
                    // 1. Try to ONLY show known thermal/label printer brands
                    const labelBrands = ['zdesigner', 'zebra', 'sato', 'rollo', 'dymo', 'tsc', 'godex', 'citizen'];
                    let cleanList = printers.filter(p => labelBrands.some(brand => p.toLowerCase().includes(brand)));
                    
                    // 2. If no explicit label printers were found, just hide the common junk/virtual printers
                    if (cleanList.length === 0) {
                        const junkPrinters = ['pdf', 'onenote', 'fax', 'xps', 'microsoft', 'hp smart', 'deskjet', 'officejet'];
                        cleanList = printers.filter(p => !junkPrinters.some(junk => p.toLowerCase().includes(junk)));
                    }
                    
                    // 3. Absolute fallback: If the filter accidentally hid everything, show them all
                    if (cleanList.length === 0) cleanList = printers;

                    qzPrinters.value = cleanList;
                    
                    // 4. Auto-select the Zebra printer instantly
                    const autoSelectZebra = cleanList.find(p => p.toLowerCase().includes('zdesigner') || p.toLowerCase().includes('zebra'));
                    selectedPrinter.value = autoSelectZebra || (cleanList.length > 0 ? cleanList[0] : '');
                    
                    qzConnected.value = true;
                }).catch(err => alert("Could not find printers."));
            };

            if (window.qz.websocket.isActive()) fetchPrinters();
            else window.qz.websocket.connect().then(fetchPrinters).catch(err => alert("Could not connect to QZ Tray. Is the app running?"));
        };

        const printLabels = async () => {
            if (!selectedPrinter.value) return alert("Please select a printer.");
            
            let codeString = isListView.value ? getCombinedListCode() : codeEditor?.getValue();
            if (!codeString || !codeString.trim()) return alert("No code to print.");

            const detectedLang = codeString.includes('^XA') ? 'zpl' : 'epl';
            
            const dpi = settings.value.density === '12' ? 300 : 203;
            let wIn, hIn;
            if (settings.value.size === 'custom') {
                wIn = parseFloat(settings.value.customW) || 2.25; hIn = parseFloat(settings.value.customH) || 1.25;
            } else {
                const parts = settings.value.size.split('x');
                wIn = parseFloat(parts[0]); hIn = parseFloat(parts[1]);
            }
            const targetW = Math.round(wIn * dpi); 
            const targetH = Math.round(hIn * dpi);

            let labelBlocks = [];
            if (detectedLang === 'zpl') {
                let zplBlocks = codeString.match(/\^XA[\s\S]*?\^XZ/gi) || [];
                labelBlocks = zplBlocks.filter(block => block.match(/\^FD|\^B[A-Z0-9]/i));
            } else {
                const lines = codeString.split(/\r?\n/);
                let activeSetup = {}; let currentBlock = [];
                for (let line of lines) {
                    let trimmed = line.trim(); if (!trimmed) continue;
                    let cmd = trimmed.charAt(0).toUpperCase();
                    if (['D', 'Z', 'Q', 'O', 'I', 'S'].includes(cmd)) { activeSetup[trimmed.charAt(0)] = trimmed; currentBlock.push(trimmed); } 
                    else if (cmd === 'N') { currentBlock = Object.values(activeSetup); currentBlock.push(trimmed); } 
                    else if (cmd === 'P') { currentBlock.push(trimmed); labelBlocks.push(currentBlock.join('\n') + '\n'); currentBlock = []; } 
                    else { currentBlock.push(trimmed); }
                }
                if (currentBlock.length > 0 && labelBlocks.length === 0) labelBlocks.push(Object.values(activeSetup).concat(currentBlock).join('\n') + '\n');
            }

            if (labelBlocks.length === 0) return alert("Could not parse any valid labels to print.");

            let qzPayload = [];
            for (let block of labelBlocks) {
                let processedBlock = block;
                let detectedSig = null;
                
                if (detectedLang === 'zpl') {
                    const isDemo = processedBlock.includes('^FX_TMS_DEMO^FS');
                    let bcMatch = processedBlock.match(/\^(BX|B0|BQ|BU|BC|B2)/i);
                    let foMatch = processedBlock.match(/\^F[O0T]\s*(-?\d+)\s*,\s*(-?\d+)/i);
                    if (bcMatch && foMatch) {
                         detectedSig = `${isDemo ? 'DEMO_' : ''}ZPL_${getBcType(bcMatch[1])}_${foMatch[1]}_${foMatch[2]}`;
                    }
                } else {
                    const isDemo = processedBlock.includes(';TMS_DEMO');
                    let match = processedBlock.match(/^b(-?\d+),(-?\d+),([A-Z0-9]+),/im);
                    if (match) {
                         detectedSig = `${isDemo ? 'DEMO_' : ''}EPL_${getBcType(match[3])}_${match[1]}_${match[2]}`;
                    }
                }
                
                let rule = getCalibrationRule(detectedSig);
                let isPrimary = (!isListView.value || selectedFiles.value.length <= 1);
                
                let globalX = 0;
                let globalY = isPrimary ? parseInt(settings.value.offsetY || 0) : (rule && rule.offsetY !== undefined ? parseInt(rule.offsetY) : 0);

                // ====================================================================
                //  TOGGLE ENFORCEMENT: Hardware Math vs Manual Offset
                // ====================================================================
                if (settings.value.isHardwareCenteringActive) {
                    globalX = (renderState.autoHardwareOffsetX || 0);
                } else {
                    globalX = isPrimary ? parseInt(settings.value.offsetX || 0) : (rule && rule.offsetX !== undefined ? parseInt(rule.offsetX) : 0);
                }

                if (detectedLang === 'zpl') {
                    //  NEW: Master Global Canvas Offset applied to Hardware Prints!
                    let zplMasterOffsetX = 0; 
                    let zplMasterOffsetY = 0; 
                    
                    globalX += zplMasterOffsetX;
                    globalY += zplMasterOffsetY;

                    processedBlock = processedBlock.replace(/\^PW\d+/gi, '').replace(/\^LL\d+/gi, '').replace(/\^XA/gi, `^XA\n^PW${targetW}\n^LL${targetH}`);
                    
                    const isDemoLabel = processedBlock.includes('^FX_TMS_DEMO^FS');
                    
                    // 1. ISOLATED BARCODE TWEAKS
                    processedBlock = processedBlock.replace(/\^F[O0T]\s*(-?\d+)\s*,\s*(-?\d+)(.*?)\^(BX|B0|BQ|BU|BC|B2)([^\^]*)/gi, (match, x, y, between, bcType, params) => {
                        let sig = `${isDemoLabel ? 'DEMO_' : ''}ZPL_${getBcType(bcType)}_${x}_${y}`;
                        let bcRule = getCalibrationRule(sig);
                        let isBcPrimary = isPrimary && primaryZplSignature === sig;
                        
                        let tDm = isBcPrimary ? parseFloat(settings.value.dmOffset || 0) : (bcRule ? parseFloat(bcRule.dmOffset || 0) : 0);
                        let tX = isBcPrimary ? parseInt(settings.value.bcMoveX || 0) : (bcRule ? parseInt(bcRule.bcMoveX || 0) : 0);
                        let tY = isBcPrimary ? parseInt(settings.value.bcMoveY || 0) : (bcRule ? parseInt(bcRule.bcMoveY || 0) : 0);
                        
                        let newX = parseInt(x) + tX;
                        let newY = parseInt(y) + tY;
                        
                        let newParams = params;
                        let qrSize = 0;
                        
                        if (tDm !== 0) {
                            if (bcType.toUpperCase() === 'BX' || bcType.toUpperCase() === 'B0') {
                                let pArr = params.split(',');
                                if (pArr.length > 1) {
                                    pArr[1] = Math.max(1, Math.round(parseFloat(pArr[1]) + tDm));
                                    newParams = pArr.join(',');
                                }
                            } else if (bcType.toUpperCase() === 'BQ') {
                                let pArr = params.split(',');
                                if (pArr.length > 2) {
                                    pArr[2] = Math.max(1, Math.round(parseFloat(pArr[2]) + tDm));
                                    qrSize = pArr[2];
                                    newParams = pArr.join(',');
                                }
                            }
                        } else if (bcType.toUpperCase() === 'BQ') {
                            let pArr = params.split(',');
                            if (pArr.length > 2) qrSize = parseFloat(pArr[2]) || 4;
                        }

                        if (bcType.toUpperCase() === 'BQ' && qrSize > 0) {
                            let quietZoneOffset = qrSize * 4; 
                            newX = newX - quietZoneOffset;
                            newY = newY - quietZoneOffset;
                        }
                        
                        return `^FO${Math.round(newX)},${Math.round(newY)}${between}^${bcType}${newParams}`;
                    });

                    // 2. MASTER CANVAS SHIFT
                    if (globalX !== 0 || globalY !== 0) {
                        processedBlock = processedBlock.replace(/\^F([O0T])\s*(-?\d+)\s*,\s*(-?\d+)/gi, (match, cmd, x, y) => {
                            let newX = parseInt(x) + globalX;
                            let newY = parseInt(y) + globalY;
                            return `^F${cmd}${newX},${newY}`;
                        });
                    }

                    //  HARDWARE REVERSE (ZPL)
                    if (settings.value.rotation === 180) {
                        processedBlock = processedBlock.replace(/\^PO[NI]/gi, ''); // Strip existing orientations
                        processedBlock = processedBlock.replace(/\^XA/gi, '^XA\n^POI'); // Force Invert
                    }

                } else {
                    //  1. STABLE RAW PAYLOAD (No more aggressive Q/q rewriting!)
                    // We let the physical Zebra printer handle the gap sensing naturally.
                    
                    let baseOffsetX = isPrimary ? parseInt(settings.value.offsetX || 0) : (rule && rule.offsetX !== undefined ? parseInt(rule.offsetX) : 0);
                    let baseOffsetY = isPrimary ? parseInt(settings.value.offsetY || 0) : (rule && rule.offsetY !== undefined ? parseInt(rule.offsetY) : 0);

                    //  2. NO HARDWARE MATH ON PHYSICAL PRINTS!
                    // The Zebra mechanical rollers naturally handle mismatches. 
                    // We only apply the exact manual offsets from your UI sliders!
                    let finalX = baseOffsetX;
                    let finalY = baseOffsetY;
                    
                    const isDemoLabel = processedBlock.includes(';TMS_DEMO');
                    
                    // 3. ISOLATED BARCODE TWEAKS
                    processedBlock = processedBlock.replace(/^b(-?\d+),(-?\d+),([A-Z0-9]+),(.*)$/gim, (match, x, y, type, params) => {
                        let sig = `${isDemoLabel ? 'DEMO_' : ''}EPL_${getBcType(type)}_${x}_${y}`;
                        let bcRule = getCalibrationRule(sig);
                        let isBcPrimary = isPrimary && primaryEplSignature === sig;
                        
                        let tX = isBcPrimary ? parseInt(settings.value.bcMoveX || 0) : (bcRule ? parseInt(bcRule.bcMoveX || 0) : 0);
                        let tY = isBcPrimary ? parseInt(settings.value.bcMoveY || 0) : (bcRule ? parseInt(bcRule.bcMoveY || 0) : 0);
                        
                        return `b${parseInt(x) + tX},${parseInt(y) + tY},${type},${params}`;
                    });

                    // 4. MASTER CANVAS SHIFT (Only applies if user manually moves sliders)
                    if (finalX !== 0 || finalY !== 0) {
                        processedBlock = processedBlock.replace(/^([AbBX]|LE|LO|LS)(-?\d+),(-?\d+),(.*)$/gim, (match, cmd, x, y, rest) => {
                            return `${cmd}${parseInt(x) + finalX},${parseInt(y) + finalY},${rest}`;
                        });
                    }

                    // 5. HARDWARE REVERSE (EPL) - Safe to keep!
                    if (settings.value.rotation === 180) {
                        let isCurrentlyZB = /^[ \t]*ZB\r?\n/im.test(processedBlock);
                        processedBlock = processedBlock.replace(/^[ \t]*Z[TB]\r?\n/gim, ''); 
                        let invertedCmd = isCurrentlyZB ? 'ZT' : 'ZB';
                        processedBlock = `${invertedCmd}\r\n` + processedBlock; 
                    }
                }
                qzPayload.push({ type: 'raw', format: 'command', data: processedBlock });
            }
            
            try {
                const config = window.qz.configs.create(selectedPrinter.value);
                await window.qz.print(config, qzPayload);
                alert(`✅ Successfully spooled ${labelBlocks.length} label(s) to printer!`);
            } catch (e) { alert("Print Failed: " + e); }
        };

        const exportLabels = () => {
            renderedLabels.value.forEach((label, i) => {
                if (label.src && !label.error) {
                    const a = document.createElement('a'); a.href = label.src; a.download = `label_${i+1}.png`; a.click();
                }
            });
        };

        onMounted(async () => {
            window.addEventListener('keydown', handleCalibrationKeys); 
            
            await loadCalibrations();
            await loadProducts();
            fetchFiles();
            
            ready.then(({ api }) => { zplLibrary = api; if (codeEditor) triggerRender(); });
            
            if (window.require) {
                const extBaseUrl = window.location.href.split('/sandbox.html')[0];

                window.MonacoEnvironment = {
                    getWorkerUrl: function () {
                        const workerCode = `
                            //  FIX: Intercept the broken relative fetch and force the absolute path
                            const originalFetch = self.fetch;
                            self.fetch = function(url, options) {
                                if (typeof url === 'string' && url.startsWith('../../../')) {
                                    url = '${extBaseUrl}/libs/monaco-editor/' + url.substring(9);
                                }
                                return originalFetch(url, options);
                            };
                            
                            self.require = { 
                                baseUrl: '${extBaseUrl}/libs/monaco-editor/',
                                paths: { 'vs': 'vs' } 
                            };
                            importScripts('${extBaseUrl}/libs/monaco-editor/vs/base/worker/workerMain.js');
                        `;
                        const blob = new Blob([workerCode], { type: 'application/javascript' });
                        return URL.createObjectURL(blob);
                    }
                };
                
                window.require.config({ 
                    baseUrl: `${extBaseUrl}/libs/monaco-editor/`,
                    paths: { 'vs': 'vs' }
                });
                
                window.require(['vs/editor/editor.main'], function() {
                    monaco.languages.register({ id: 'zpl' }); 
                    monaco.languages.register({ id: 'epl' });
                    monaco.editor.defineTheme('label-light-theme', { base: 'vs', inherit: true, rules: [{ token: 'keyword', foreground: 'd32f2f', fontStyle: 'bold' }], colors: { 'editor.background': '#ffffff' } });
                    codeEditor = monaco.editor.create(editorContainer.value, {
                        value: `^XA\n^PON^CI0,157,48^LH20,20^A0,24,24^FO0,0^FD^FS\n^A0,16,16^FO100,30^FD**************************^FS\n^A0,28,28^FO120,50^FDSAMPLE LABEL^FS\n^A0,18,18^FO0,70^FD^FS\n^A0,16,16^FO100,86^FD**************************^FS\n^XZ`,
                        language: settings.value.lang, theme: 'label-light-theme', automaticLayout: true, minimap: { enabled: false }
                    });
                    codeEditor.onDidChangeModelContent((e) => { 
                        if (!isListView.value) {
                            try {
                                let val = codeEditor.getValue();
                                let formatted = formatRawLabelCode(val);
                                if (val !== formatted && !val.includes('\n') && val.length > 25) {
                                    formatEditorCode();
                                    return; 
                                }
                            } catch(err) {
                                console.warn("Auto-formatter safely bypassed an unreadable line.");
                            }
                            debouncedRender(); 
                        } 
                    });
                    triggerRender();
                });
            }
            
        let clickCount = 0;
            let clickTimer;

            //  FIX: Grab the element first
            const secretButton = document.getElementById('secret-trigger');
            
            //  FIX: Only attach the listener IF the element actually exists!
            if (secretButton) {
                secretButton.addEventListener('click', () => {
                    clickCount++;
                    clearTimeout(clickTimer);
                    
                    clickTimer = setTimeout(() => { clickCount = 0; }, 1000);

                    if (clickCount === 5) {
                        clickCount = 0; 
                        
                        const newState = !isDevMode.value;
                        
                        //  FIX: Save synchronously directly to the sandbox memory
                        localStorage.setItem('force_dev_mode', newState.toString());
                        
                        alert(`🕵️ Dev Mode is now: ${newState ? 'ON' : 'OFF'}. Restarting...`);
                        
                        // Safely ask parent to reload the extension
                        window.parent.postMessage({ action: 'RELOAD_APP' }, '*');
                    }
                });
            } else {
                console.warn("Secret trigger element not found in HTML.");
            }
        });

        onUnmounted(() => window.removeEventListener('keydown', handleCalibrationKeys));

        return {
            searchQuery, filteredFiles, folderPath, isListView, editorContainer,
            loading, fileList, isLoading, selectedFiles, qzConnected, qzPrinters, selectedPrinter,
            renderedLabels, settings, sizeOffsets, printerConfigs, selectedPrinterProfile,
            useWidthOverride, validationErrors, activePrinterConfig, hasNewFiles,
            handleSizeChange, handleProfileChange, checkSizeLimits, calibratedDots,
            computedLabelStyle, computedImageStyle, editFile, formatEditorCode, toggleViewMode,
            rotateLabels, zoomIn, zoomOut, clearWorkspace, fetchFiles, formatDate,
            isFileSelected, toggleFileSelection, triggerRender, connectQZ, printLabels,
            exportLabels, isNew, mathUtils, folderInput,
            triggerFolderPicker, isDeveloperMode, handleSmartRefresh,
            handleLocalFolder, calibrationRules, currentViewMode,
            currentViewSource,isAllSelected,
            toggleSelectAll,isCalibrationMode,milkBanks,
            commonLabelFonts,enterCalibrationMode,resetCurrentCalibration,
            saveCurrentCalibration, isDemoMode, demoSettings, toggleDemoMode, generateDemoLabels,
            tmsUrls, newTmsUrl, selectedTmsUrl, tmsFiles, selectedFileToInspect, 
            addTmsUrl, removeTmsUrl, fetchFileList,
            folderPermissionStatus, isSwitchingBuildFolder, switchBuildFolderPermission,
            showClientDefaultsModal, newClientKeyword, saveClientDefault, deleteClientDefault,
            productsData, 
            productSearchQuery,
            showProductDropdown,
            filteredProducts,
            showBarcodeModal,
            pendingProductSelection,
            selectProduct, switchToLocalMode,addBarcode,
            deleteBarcode,
            saveProductOverrides, nukeCache,
            milkBankSearchQuery, showMilkBankDropdown, filteredMilkBanks, selectMilkBank, handleMilkBankBlur,
            isGenerateBlinking,chooseBarcode,isCurrentLabelDemo,returnToGenerator,demoCalibrationRules,allowedBarcodeFormats,
            columnCount
        };
    }
});

app.mount('#tms-label-app');
/**
 * Data Seeder Generator - Native File System Version
 * Features professional UI and true offline file counting.
 */

const UPDATE_FIELD_DEFINITIONS = [
    { value: 'manufacturer', label: 'Manufacturer', type: 'select', placeholder: 'Select a manufacturer...', icon: '🏢', theme: 'blue', options: [
        { value: 'Cera Products', label: 'Cera Products' },
        { value: 'Gerber', label: 'Gerber' },
        { value: 'Medolac Laboratories', label: 'Medolac Laboratories' },
        { value: 'Mead Johnson Nutrition', label: 'Mead Johnson Nutrition' },
        { value: 'Natures One', label: 'Natures One' },
        { value: 'Nutricia', label: 'Nutricia' },
        { value: 'Prolacta Bioscience', label: 'Prolacta Bioscience' },
        { value: 'Baxter', label: 'Baxter' },
        { value: 'Abbott', label: 'Abbott' },
        { value: 'UNDEFINED', label: 'UNDEFINED' },
        { value: 'Perrigo', label: 'Perrigo' },
        { value: 'Bobbie', label: 'Bobbie' },
        { value: 'NI-Q', label: 'NI-Q' },
        { value: 'Kate Farms', label: 'Kate Farms' },
        { value: 'Vitaflo', label: 'Vitaflo' },
        { value: 'HiPP', label: 'HiPP' },
        { value: 'Holle', label: 'Holle' },
        { value: 'Kendamil', label: 'Kendamil' },
        { value: 'ByHeart', label: 'ByHeart' },
        { value: 'Functional Formularies', label: 'Functional Formularies' },
        { value: 'Nestle', label: 'Nestle' },
        { value: 'ICU Medical', label: 'ICU Medical' },
        { value: 'Pfizer', label: 'Pfizer' },
        { value: 'Fresenius Kabi', label: 'Fresenius Kabi' },
        { value: 'B Braun', label: 'B Braun' },
        { value: 'American Regent', label: 'American Regent' },
        { value: "Dr.Brown's", label: "Dr.Brown's" },
        { value: 'Parapharmatech', label: 'Parapharmatech' },
        { value: 'Jo Mar Labs', label: 'Jo Mar Labs' },
        { value: 'Cambrooke', label: 'Cambrooke' },
        { value: 'Simply Thick', label: 'Simply Thick' },
        { value: "Baby's Only", label: "Baby's Only" },
        { value: "Earth's Best Organic", label: "Earth's Best Organic" },
        { value: 'Orgain', label: 'Orgain' },
        { value: 'Kabrita', label: 'Kabrita' },
        { value: 'Happy Family Organics', label: 'Happy Family Organics' },
        { value: 'Reason Health', label: 'Reason Health' },
        { value: 'Kraft Heinz', label: 'Kraft Heinz' },
        { value: 'Else Nutrition', label: 'Else Nutrition' },
        { value: "Aussie Bub's", label: "Aussie Bub's" },
        { value: 'Medtrition', label: 'Medtrition' },
        { value: 'Whole Story Meals Inc', label: 'Whole Story Meals Inc' },
        { value: 'Solace Nutrition', label: 'Solace Nutrition' },
        { value: 'Llorens Pharmaceutical', label: 'Llorens Pharmaceutical' },
        { value: 'Sprout Organic', label: 'Sprout Organic' },
        { value: 'Lyons Health Labs', label: 'Lyons Health Labs' },
        { value: 'Kent Precision Foods Group', label: 'Kent Precision Foods Group' },
        { value: 'Unjury', label: 'Unjury' },
        { value: 'A2 Milk Company', label: 'A2 Milk Company' },
        { value: 'Damira', label: 'Damira' },
        { value: 'Delical', label: 'Delical' },
        { value: 'Drasanvi', label: 'Drasanvi' },
        { value: 'Grifols', label: 'Grifols' },
        { value: 'Novolac', label: 'Novolac' },
        { value: 'Nutrisens', label: 'Nutrisens' },
        { value: 'Nara Organics', label: 'Nara Organics' },
        { value: 'OWYN', label: 'OWYN' },
        { value: '__other__', label: 'Other (enter manufacturer)' }
    ]},
    { value: 'productName', label: 'Product Name', type: 'text', placeholder: 'e.g., Similac Pro-Advance', icon: '🏷️', theme: 'blue' },
    { value: 'shortName', label: 'Short Name', type: 'text', placeholder: 'e.g., Similac', icon: '📝', theme: 'blue' },
    { value: 'hl7Reference', label: 'HL7 Reference', type: 'text', placeholder: 'e.g., MLT-17', icon: '🔌', theme: 'purple' },
    { value: 'hl7Fortifier', label: 'Fortifier HL7', type: 'text', placeholder: 'e.g., FORT-09', icon: '🔌', theme: 'purple' },
    { value: 'productType', label: 'Product Type', type: 'select', icon: '✨', theme: 'green', options: [
        { value: '3', label: 'Powder' }, { value: '2', label: 'Liquid Concentrate' }, { value: '1', label: 'Ready-to-Feed Liquid' }
    ]},
    { value: 'useContexts', label: 'Use Contexts', type: 'use-contexts', icon: '✨', theme: 'green', defaultValue: ['feed-base'] },
    { value: 'categoryId', label: 'Category', type: 'select', icon: '✨', theme: 'green', options: [
        { value: '3', label: 'Formula' }, { value: '5', label: 'Additive' }, { value: '1', label: 'EBM' }, { value: '2', label: 'DHM' }
    ]},
    { value: 'caloricValue', label: 'Caloric Density', type: 'number', step: 0.1, numeric: true, icon: '⚡', theme: 'orange' },
    { value: 'displacement', label: 'Displacement', type: 'number', step: 0.01, numeric: true, icon: '💧', theme: 'orange' },
    { value: 'expirationOpened', label: 'Exp. Opened (Hrs)', type: 'number', numeric: true, icon: '⏳', theme: 'red' },
    { value: 'expirationPrepared', label: 'Exp. Prepared (Hrs)', type: 'number', numeric: true, icon: '⏳', theme: 'red' },
    { value: 'measurementVolume', label: 'Unit Volume', type: 'number', step: 0.1, numeric: true, icon: '📏', theme: 'teal' },
    { value: 'measurementUnit', label: 'Measurement Unit', type: 'select', icon: '⚖️', theme: 'teal', options: [
        { value: 'ml', label: 'mL' }, { value: 'g', label: 'g' }, { value: 'oz', label: 'oz' }
    ]}
];

const USE_CONTEXT_OPTIONS = [
    { value: 'additive', label: 'Additive' },
    { value: 'feed-base', label: 'Feed Base' },
    { value: 'modular', label: 'Modular' }
];

function formatUnitDisplayLabel(uom) {
    const u = (uom || 'ml').toLowerCase();
    if (u === 'ml') return 'mL';
    return u;
}

function normalizeProductUseContexts(product) {
    if (Array.isArray(product.useContexts) && product.useContexts.length > 0) {
        return [...product.useContexts];
    }
    if (product.productUse === 'fortifier') return ['additive'];
    if (product.productUse === 'modular') return ['additive', 'modular'];
    return ['feed-base'];
}

function formatUseContextsSummary(contexts) {
    const map = { 'additive': 'Additive', 'feed-base': 'Feed Base', 'modular': 'Modular' };
    return (contexts || []).map(c => map[c] || c).join(' + ');
}

const CONTAINER_TYPE_OPTIONS = [
    { value: '1', label: 'Bottle' },
    { value: '2', label: 'Carton' },
    { value: '3', label: 'Can' },
    { value: '4', label: 'Case' },
    { value: '5', label: 'Vial' },
    { value: '6', label: 'Packet' },
    { value: '7', label: 'Pack' },
    { value: '8', label: 'Sachet' },
    { value: '9', label: 'Tub' },
    { value: '10', label: 'Tetra Pak' },
    { value: '11', label: 'Tetra Prisma' },
    { value: '12', label: 'Tetra Brik' },
    { value: '13', label: 'Pouch' },
    { value: '14', label: 'Bag' },
    { value: '15', label: 'Box' },
    { value: '16', label: 'Cup' },
    { value: '17', label: 'Stick' }
];

const CONTAINER_TYPE_MATCHERS = [
    { id: '11', regex: /\btetra\s*prisma\b/i },
    { id: '12', regex: /\btetra\s*brik\b/i },
    { id: '10', regex: /\btetra(?:\s*pak)?\b/i },
    { id: '1', regex: /\bbottle\b/i },
    { id: '2', regex: /\bcarton\b/i },
    { id: '3', regex: /\bcan\b/i },
    { id: '4', regex: /\bcase\b/i },
    { id: '5', regex: /\bvial\b/i },
    { id: '6', regex: /\bpacket\b/i },
    { id: '7', regex: /\bpack\b/i },
    { id: '8', regex: /\bsachet\b/i },
    { id: '9', regex: /\btub\b/i },
    { id: '13', regex: /\bpouch\b/i },
    { id: '14', regex: /\bbag\b/i },
    { id: '15', regex: /\bbox\b/i },
    { id: '16', regex: /\bcup\b/i },
    { id: '17', regex: /\bstick\b/i }
];

function resolveContainerTypeId(rawText, defaultId = '') {
    if (!rawText) return defaultId;
    const str = String(rawText);
    for (const matcher of CONTAINER_TYPE_MATCHERS) {
        if (matcher.regex.test(str)) return matcher.id;
    }
    return defaultId;
}

const UPDATE_ITEM_FIELD_DEFINITIONS = [
    { value: 'newProductCode', label: 'Item Number', type: 'text', placeholder: 'e.g., 174004' },
    { value: 'itemName', label: 'Item Name', type: 'text', placeholder: 'e.g., Enfamil Infant PWD (12.5 oz)' },
    { value: 'leafContainerType', label: 'Leaf Form Factor Type', type: 'select', options: CONTAINER_TYPE_OPTIONS },
    { value: 'measurementVolume', label: 'Volume', type: 'number', step: 'any', numeric: true, placeholder: 'e.g., 369.66870' },
    { value: 'measurementUnit', label: 'Measurement Unit', type: 'select', options: [
        { value: 'ml', label: 'mL' }, { value: 'g', label: 'g' }, { value: 'oz', label: 'oz' }
    ]},
    { value: 'itemActive', label: 'Active Status', type: 'select', options: [
        { value: '1', label: 'Active (1)' }, { value: '0', label: 'Inactive (0)' }
    ]}
];

const WORKFLOW_STORAGE_KEY = 'dataSeederWorkflow';

class DataSeederApp {
    constructor() {
        this.currentStep = 1;
        this.currentAction = null;
        this.buildInfo = null;
        this.products = [];
        this.generatedSeeder = null;
        this.seederNumber = null;
        this.seedersDirHandle = null;
        this.buildDetectionRun = 0;
        this.pendingBuildFolderInfo = null;
        this.wampRootHandle = null;
        this.pendingRestoredStep = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFavorites();
        this.setupDragAndDrop();
        this.setupProgressPersistence();
        this.restoreProgress();
        this.loadCachedCatalog();
    }

    setupProgressPersistence() {
        const persist = () => this.saveProgress();
        document.getElementById('step-1').addEventListener('input', persist);
        document.getElementById('step-1').addEventListener('change', persist);
        document.getElementById('step-2').addEventListener('input', persist);
        document.getElementById('step-2').addEventListener('change', persist);
        document.getElementById('step-3').addEventListener('change', persist);
    }

    saveProgress() {
        const formValues = {};
        document.querySelectorAll('#productFormFields input[data-field-name], #productFormFields select[data-field-name], #productFormFields textarea[data-field-name]').forEach(control => {
            if (control.type === 'radio') {
                if (control.checked) formValues[control.dataset.fieldName] = control.value;
            } else if (control.type === 'checkbox') {
                formValues[control.dataset.fieldName] = control.checked;
            } else {
                formValues[control.dataset.fieldName] = control.value;
            }
        });

        const useContexts = Array.from(document.querySelectorAll('#productFormFields .use-context-cb:checked'))
            .map(cb => cb.value);

        const hierarchy = Array.from(document.querySelectorAll('#productFormFields .hierarchy-row')).map(row => ({
            type: row.querySelector('.hierarchy-type')?.value || '',
            barcode: row.querySelector('.hierarchy-bc')?.value || '',
            quantity: row.querySelector('.hierarchy-qty')?.value || '',
            volume: row.querySelector('.hierarchy-vol')?.value || ''
        })).reverse();

        const containerUpdates = Array.from(document.querySelectorAll('#productFormFields .container-update-row')).map(row => ({
            target: row.querySelector('.cu-target')?.value || 'leaf',
            currentBarcode: row.querySelector('.cu-current-bc')?.value || '',
            newContainerType: row.querySelector('.cu-new-type')?.value || '',
            newBarcode: row.querySelector('.cu-new-bc')?.value || '',
            newQuantity: row.querySelector('.cu-new-qty')?.value || ''
        }));

        const progress = {
            currentStep: this.currentStep,
            buildInfo: this.buildInfo,
            localUrl: document.getElementById('localUrl').value,
            seederNumber: document.getElementById('nextSeederNum').value,
            products: this.products,
            currentAction: this.currentAction,
            generatedSeeder: this.generatedSeeder,
            actionType: document.getElementById('actionType').value,
            activeTab: document.querySelector('.form-tab-btn.active')?.dataset.tab || 'manual',
            formValues,
            useContexts,
            updateFields: Array.from(document.querySelectorAll('#productFormFields [data-field-name="updateFields"] .field-checkbox:checked'))
                .map(checkbox => checkbox.dataset.fieldValue),
            updateItemFields: Array.from(document.querySelectorAll('#productFormFields [data-field-name="updateItemFields"] .field-checkbox:checked'))
                .map(checkbox => checkbox.dataset.fieldValue),
            hierarchy,
            containerUpdates,
            outputMethod: document.querySelector('input[name="output"]:checked')?.value || 'download'
        };

        try {
            sessionStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(progress));
        } catch (error) {
            console.warn('Could not save workflow progress:', error);
        }
    }

    restoreProgress() {
        let progress;
        try {
            progress = JSON.parse(sessionStorage.getItem(WORKFLOW_STORAGE_KEY) || 'null');
        } catch (error) {
            console.warn('Could not restore workflow progress:', error);
            return;
        }
        if (!progress) return;

        this.buildInfo = progress.buildInfo || null;
        this.products = Array.isArray(progress.products) ? progress.products : [];
        this.currentAction = progress.currentAction || null;
        this.generatedSeeder = progress.generatedSeeder || null;
        this.seederNumber = progress.seederNumber ? Number(progress.seederNumber) : null;

        document.getElementById('localUrl').value = progress.localUrl || '';
        if (this.buildInfo) {
            document.getElementById('clientName').textContent = this.buildInfo.clientName || '';
            document.getElementById('buildVersion').textContent = this.buildInfo.version || '';
            document.getElementById('buildQuarter').textContent = this.buildInfo.quarter || '';
            document.getElementById('buildPath').textContent = this.buildInfo.buildPath || '';
            document.getElementById('buildDetailsCard').style.display = 'flex';
            this.loadFavorites(this.buildInfo.buildPath);
            this.ensureSeedersFolder();
        }
        this.updateSeederNumberDisplay(progress.seederNumber || '', progress.seederNumber ? 'saved' : 'action required');

        const actionType = progress.actionType === 'barcode-update' ? 'update-form-factor' : (progress.actionType || '');
        document.getElementById('actionType').value = actionType;
        if (actionType) {
            this.loadProductForm(actionType);

            const updateGroup = document.querySelector('#productFormFields [data-field-name="updateFields"]');
            if (updateGroup && Array.isArray(progress.updateFields)) {
                updateGroup.querySelectorAll('.field-checkbox').forEach(checkbox => {
                    const checked = progress.updateFields.includes(checkbox.dataset.fieldValue);
                    checkbox.checked = checked;
                    checkbox.closest('.update-toggle-btn')?.classList.toggle('selected', checked);
                });
                this.syncConditionalFieldVisibility();
            }

            const updateItemGroup = document.querySelector('#productFormFields [data-field-name="updateItemFields"]');
            if (updateItemGroup && Array.isArray(progress.updateItemFields)) {
                updateItemGroup.querySelectorAll('.field-checkbox').forEach(checkbox => {
                    const checked = progress.updateItemFields.includes(checkbox.dataset.fieldValue);
                    checkbox.checked = checked;
                    checkbox.closest('.update-toggle-btn')?.classList.toggle('selected', checked);
                });
                this.syncConditionalFieldVisibility();
            }

            if (Array.isArray(progress.useContexts)) {
                const ucBox = document.querySelector('#productFormFields .use-contexts-box');
                if (ucBox) {
                    ucBox.querySelectorAll('.use-context-cb').forEach(cb => {
                        cb.checked = progress.useContexts.includes(cb.value);
                    });
                    this.syncAdditiveContextPanel(ucBox);
                }
            }

            Object.entries(progress.formValues || {}).forEach(([name, value]) => {
                if (name === 'additiveMethod') {
                    const radio = document.querySelector(`#productFormFields input[data-field-name="additiveMethod"][value="${value}"]`);
                    if (radio) {
                        radio.checked = true;
                        const ucBox = radio.closest('.use-contexts-box');
                        if (ucBox) this.syncAdditiveCustomFields(ucBox);
                    }
                    return;
                }
                const control = document.querySelector(`#productFormFields input[data-field-name="${name}"], #productFormFields select[data-field-name="${name}"], #productFormFields textarea[data-field-name="${name}"]`);
                if (!control || control.type === 'checkbox' || control.type === 'radio') return;
                control.value = value;
                if (name === 'manufacturer' || name === 'measurementUnit') {
                    control.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            const hierarchyList = document.querySelector('#productFormFields .hierarchy-list');
            if (hierarchyList && Array.isArray(progress.hierarchy) && progress.hierarchy.length) {
                hierarchyList.innerHTML = '';
                [...progress.hierarchy].reverse().forEach((item, index, visibleHierarchy) => {
                    this.addHierarchyRow(hierarchyList, index === visibleHierarchy.length - 1);
                    const row = hierarchyList.lastElementChild;
                    row.querySelector('.hierarchy-type').value = item.type;
                    row.querySelector('.hierarchy-bc').value = item.barcode;
                    row.querySelector('.hierarchy-qty').value = item.quantity;
                    row.querySelector('.hierarchy-vol').value = item.volume;
                });
            }

            const containerUpdatesList = document.querySelector('#productFormFields .container-updates-list');
            if (containerUpdatesList && Array.isArray(progress.containerUpdates) && progress.containerUpdates.length) {
                containerUpdatesList.innerHTML = '';
                progress.containerUpdates.forEach(item => {
                    this.addContainerUpdateRow(containerUpdatesList, item);
                });
            }
        }

        this.switchFormTab(progress.activeTab || 'manual');
        this.renderProductsTable();
        if (this.generatedSeeder) document.getElementById('seederPreview').textContent = this.generatedSeeder;
        const outputRadio = document.querySelector(`input[name="output"][value="${progress.outputMethod || 'download'}"]`);
        if (outputRadio) outputRadio.checked = true;

        const requestedStep = Number(progress.currentStep) || 1;
        const restoredStep = requestedStep === 3 && !this.generatedSeeder ? 2 : requestedStep;
        this.pendingRestoredStep = restoredStep > 1 && this.buildInfo ? restoredStep : null;
        this.currentStep = this.pendingRestoredStep ? 1 : restoredStep;
        if (this.currentStep > 1 && !this.buildInfo) this.currentStep = 1;
        if (progress.outputMethod === 'auto-write') document.getElementById('outputDownload').checked = true;
        this.updateStepIndicator();
        this.showStep(this.currentStep);
        this.saveProgress();
    }

    async loadCachedCatalog() {
        if (typeof idbKeyval === 'undefined') return;
        try {
            const cached = await idbKeyval.get('cachedApiProducts');
            if (cached && cached.length > 0) {
                apiService.cachedProducts = cached;
                document.getElementById('apiSearchInput').disabled = false;
                const loadBtn = document.getElementById('apiLoadCatalogBtn');
                loadBtn.innerHTML = '✅ Products Ready';
                loadBtn.disabled = true;
                loadBtn.style.background = '#ecfdf5';
                loadBtn.style.color = '#065f46';
                loadBtn.style.borderColor = '#10b981';
                document.getElementById('apiTotalLoadedCount').textContent = `(${cached.length} products loaded)`;
                this.refreshApiGrid();
            }
        } catch (error) {
            console.warn('Failed to load cached catalog:', error);
        }
    }

    setupDragAndDrop() {
        const dropZones = [
            { id: 'doc-tab', inputId: 'docFile' },
            { id: 'csv-tab', inputId: 'csvFile' }
        ];

        dropZones.forEach(zone => {
            const tab = document.getElementById(zone.id);
            const dropArea = tab.querySelector('.csv-upload-area');
            const input = document.getElementById(zone.inputId);

            if (!dropArea || !input) return;

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                dropArea.addEventListener(eventName, () => {
                    dropArea.classList.add('drag-active');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, () => {
                    dropArea.classList.remove('drag-active');
                }, false);
            });

            dropArea.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;

                if (files && files.length > 0) {
                    input.files = files;
                    input.dispatchEvent(new Event('change'));
                }
            });
        });
    }

    previewProduct(index) {
        this.editingProductIndex = index;
        const product = this.products[index];
        if (!product) return;

        if ((product.action === 'create' || product.action === 'add-form-factor') && (!product.hierarchy || product.hierarchy.length === 0)) {
            product.hierarchy = [{
                containerId: product.containerType || '1',
                barcode: product.barcode || '',
                quantity: product.unitQuantity || 1,
                volume: product.measurementVolume || 0
            }];
        }

        if (product.action === 'create' || (product.action === 'update' && Array.isArray(product.updateFields) && (product.updateFields.includes('useContexts') || product.updateFields.includes('productUse')))) {
            product.useContexts = normalizeProductUseContexts(product);
        }

        const containerTypeMap = Object.fromEntries(CONTAINER_TYPE_OPTIONS.map(o => [o.value, o.label]));
        const mappings = {
            productType: { '1': 'Ready-to-Feed Liquid', '2': 'Liquid Concentrate', '3': 'Powder' },
            categoryId: { '1': 'EBM', '2': 'DHM', '3': 'Formula', '5': 'Additive / Fortifier' },
            containerType: containerTypeMap,
            leafContainerType: containerTypeMap,
            measurementUnit: { 'ml': 'mL', 'g': 'g', 'oz': 'oz' },
            additiveUnit: { 'ml': 'mL', 'g': 'g', 'oz': 'oz' },
            itemActive: { '1': 'Active (1)', '0': 'Inactive (0)' }
        };

        let orderedKeys = [];
        if (product.action === 'add-unit') {
            orderedKeys = ['unitName', 'unitADT', 'unitOrder', 'bmMaxVolume', 'formulaMaxVolume', 'waterMaxVolume', 'bmPrepCycle', 'formulaPrepCycle'];
        } else if (product.action === 'add-manufacturer') {
            orderedKeys = ['manufacturerName', 'manufacturerDescription'];
        } else if (product.action === 'add-form-factor') {
            orderedKeys = ['productName', 'productCode'];
        } else if (product.action === 'barcode-update') {
            orderedKeys = ['productName', 'oldProductCode', 'newProductCode'];
        } else if (product.action === 'update') {
            orderedKeys = ['productName'];
            if (Array.isArray(product.updateFields)) {
                orderedKeys = orderedKeys.concat(product.updateFields.map(field => {
                    if (field === 'productName') return 'newProductName';
                    if (field === 'productUse') return 'useContexts';
                    return field;
                }));
            }
        } else if (product.action === 'update-form-factor') {
            orderedKeys = ['productName', 'productCode', 'lookupBarcode'];
            if (Array.isArray(product.updateItemFields)) {
                orderedKeys = orderedKeys.concat(product.updateItemFields);
            }
        } else {
            orderedKeys = [
                'manufacturer', 'productName', 'shortName', 'productCode',
                'hl7Reference', 'hl7Fortifier', 'productType', 'useContexts', 'categoryId',
                'caloricValue', 'displacement', 'expirationOpened', 'measurementUnit'
            ];
        }

        const detailsContainer = document.getElementById('previewDetails');
        let html = '<div class="tmnp-product-form"><div class="tmnp-product-columns"><div class="tmnp-product-column">';
        const fieldMarkup = {};

        for (const key of orderedKeys) {
            if (key === 'useContexts') {
                const activeContexts = normalizeProductUseContexts(product);
                const isAdditive = activeContexts.includes('additive');
                const currentUom = product.measurementUnit || 'ml';
                const addMethod = product.additiveMethod || 'standard';
                const addUnit = product.additiveUnit || currentUom;
                const atomicVal = product.atomicUnits !== undefined ? product.atomicUnits : 1;
                const decVal = product.decimalPlaces !== undefined ? product.decimalPlaces : (addUnit === 'g' ? 1 : 0);
                const expPrepVal = product.expirationPrepared !== undefined && product.expirationPrepared !== '' ? product.expirationPrepared : 48;

                const checkboxesHtml = USE_CONTEXT_OPTIONS.map(opt => `
                    <label class="use-context-option">
                        <input type="checkbox" class="preview-use-context-cb" value="${opt.value}" ${activeContexts.includes(opt.value) ? 'checked' : ''}>
                        <span>${opt.label}</span>
                    </label>
                `).join('');

                fieldMarkup[key] = `
                    <div class="tmnp-field">
                        <span class="preview-label">Use Contexts</span>
                        <div class="use-context-checks">${checkboxesHtml}</div>
                        <div id="previewAdditiveContextPanel" class="additive-context-panel${isAdditive ? '' : ' hidden'}" style="margin-top:8px;">
                            <div class="additive-context-header">Additive Context Information :</div>
                            <div class="additive-context-rows">
                                <div class="additive-context-row">
                                    <div class="additive-row-label">Measurement Method:</div>
                                    <div class="additive-row-control">
                                        <div class="additive-radio-list">
                                            <label class="additive-radio-option">
                                                <input type="radio" name="previewAdditiveMethod" class="preview-additive-method" value="standard" ${addMethod === 'standard' ? 'checked' : ''}>
                                                <span id="previewStandardUnitLabel">Standard Units (${formatUnitDisplayLabel(currentUom)})</span>
                                            </label>
                                            <label class="additive-radio-option">
                                                <input type="radio" name="previewAdditiveMethod" class="preview-additive-method" value="custom" ${addMethod === 'custom' ? 'checked' : ''}>
                                                <span>Custom Units</span>
                                            </label>
                                        </div>
                                        <div id="previewAdditiveCustomFields" class="additive-custom-fields${addMethod === 'custom' ? '' : ' hidden'}">
                                            <label class="additive-custom-field">
                                                <span>Unit</span>
                                                <select class="preview-input" data-key="additiveUnit">
                                                    <option value="ml" ${addUnit === 'ml' ? 'selected' : ''}>mL</option>
                                                    <option value="g" ${addUnit === 'g' ? 'selected' : ''}>g</option>
                                                    <option value="oz" ${addUnit === 'oz' ? 'selected' : ''}>oz</option>
                                                </select>
                                            </label>
                                            <label class="additive-custom-field">
                                                <span>Atomic Units</span>
                                                <input type="number" step="any" class="preview-input" data-key="atomicUnits" value="${atomicVal}">
                                            </label>
                                            <label class="additive-custom-field">
                                                <span>Decimals</span>
                                                <input type="number" min="0" max="4" class="preview-input" data-key="decimalPlaces" value="${decVal}">
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div class="additive-context-row">
                                    <div class="additive-row-label">Hours Until Expiry Once Prepared:</div>
                                    <div class="additive-row-control">
                                        <div class="additive-expiry-inline">
                                            <div class="additive-expiry-input-wrap">
                                                <input type="number" min="1" class="preview-input" data-key="expirationPrepared" value="${expPrepVal}">
                                                <span class="additive-req-star">*</span>
                                            </div>
                                            <span class="additive-expiry-hint">This is the amount of time (in hours) that a container containing this product as an additive will expire.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                continue;
            }

            let value = product[key] !== undefined && product[key] !== null ? product[key] : '';

            let formattedLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            if (key === 'productCode') formattedLabel = product.action === 'update-form-factor' ? 'Current Item Number' : 'Item Number';
            if (key === 'newProductCode') formattedLabel = product.action === 'update-form-factor' ? 'New Item Number' : 'New Barcode';
            if (key === 'lookupBarcode') formattedLabel = 'Current Container Barcode';
            if (key === 'oldProductCode') formattedLabel = 'Old Barcode';
            if (key === 'newProductName') formattedLabel = 'Product Name';
            if (key === 'barcode') formattedLabel = 'Barcode';
            if (key === 'hl7Reference') formattedLabel = 'Base HL7 Reference';
            if (key === 'hl7Fortifier') formattedLabel = 'Fortifier HL7 Reference';
            if (key === 'leafContainerType') formattedLabel = 'Leaf Form Factor Type';
            if (key === 'itemActive') formattedLabel = 'Item Active Status';

            const isMissing = (value === '') && !['productName', 'productCode', 'lookupBarcode'].includes(key);
            const missingClass = isMissing ? ' is-missing' : '';

            let inputHtml = '';

            if (mappings[key]) {
                inputHtml = `<select class="preview-input${missingClass}" data-key="${key}">`;
                if (isMissing) {
                    inputHtml += `<option value="" selected disabled>Select...</option>`;
                }
                for (const [optVal, optLabel] of Object.entries(mappings[key])) {
                    const selected = (value.toString() === optVal.toString()) ? 'selected' : '';
                    inputHtml += `<option value="${optVal}" ${selected}>${optLabel}</option>`;
                }
                inputHtml += `</select>`;
            } else {
                const isNumber = ['caloricValue', 'displacement', 'expirationOpened', 'expirationPrepared', 'unitQuantity', 'measurementVolume'].includes(key);
                const type = isNumber ? 'number' : 'text';
                const step = isNumber ? 'any' : '';
                const safeValue = value.toString().replace(/"/g, '&quot;');

                inputHtml = `<input type="${type}" step="${step}" class="preview-input${missingClass}" data-key="${key}" value="${safeValue}" placeholder="(Blank)">`;
            }

            fieldMarkup[key] = `<label class="tmnp-field"><span class="preview-label">${formattedLabel}</span>${inputHtml}</label>`;
        }

        const leftKeys = product.action === 'create'
            ? ['manufacturer', 'productName', 'shortName', 'productCode', 'hl7Reference', 'hl7Fortifier']
            : orderedKeys.filter((_, index) => index % 2 === 0);
        const rightKeys = product.action === 'create'
            ? ['productType', 'useContexts', 'categoryId', 'caloricValue', 'displacement', 'expirationOpened', 'measurementUnit']
            : orderedKeys.filter((_, index) => index % 2 !== 0);

        for (const key of leftKeys) {
            if (fieldMarkup[key]) html += fieldMarkup[key];
        }
        html += '</div><div class="tmnp-product-column">';
        for (const key of rightKeys) {
            if (fieldMarkup[key]) html += fieldMarkup[key];
        }
        html += '</div></div></div>';

        // Hierarchy editor for Create and Add Form Factor
        if (product.action === 'create' || product.action === 'add-form-factor') {
            html += `
            <section class="tmnp-packaging-section">
                <h4 class="tmnp-section-heading">Form Factor Types</h4>
                <div class="tmnp-hierarchy-card">
                    <div class="tmnp-product-summary">
                        <div><strong>Item Number:</strong> ${product.productCode || 'Auto-Generated'}</div>
                        <div><strong>Item Name:</strong> ${product.productName || ''}</div>
                    </div>
                    <div class="tmnp-hierarchy-content">
                        <div class="tmnp-hierarchy-title">Form Factor(s)</div>
            `;

            const displayHierarchy = product.hierarchy
                .map((formFactor, storageIndex) => ({ formFactor, storageIndex }))
                .reverse();

            displayHierarchy.forEach(({ formFactor: ff, storageIndex }, displayIndex) => {
                const isMissing = !ff.containerId;
                const missingClass = isMissing ? ' is-missing' : '';
                const hierarchyLabel = displayHierarchy.length === 1
                    ? 'Single Container'
                    : displayIndex === 0
                        ? 'Outer Container'
                        : displayIndex === displayHierarchy.length - 1
                            ? 'Smallest Unit'
                            : 'Nested Container';

                let typeSelect = `<select class="preview-input hierarchy-input${missingClass}" data-hierarchy-index="${storageIndex}" data-key="containerId">`;

                if (isMissing) typeSelect += `<option value="" selected disabled>Select Type...</option>`;

                for (const [optVal, optLabel] of Object.entries(mappings.containerType)) {
                    const selected = (ff.containerId.toString() === optVal.toString()) ? 'selected' : '';
                    typeSelect += `<option value="${optVal}" ${selected}>${optLabel}</option>`;
                }
                typeSelect += `</select>`;

                const removeBtn = product.hierarchy.length > 1
                    ? `<button type="button" class="remove-preview-ff-btn" data-index="${storageIndex}" title="Remove Container">&times;</button>`
                    : '<span class="tmnp-remove-placeholder"></span>';

                html += `
                    <div class="tmnp-hierarchy-row${displayIndex === 0 ? ' is-outer' : ''}${displayIndex === displayHierarchy.length - 1 ? ' is-smallest' : ''}" style="--hierarchy-depth: ${displayIndex};">
                        <label class="tmnp-hierarchy-type"><span>${hierarchyLabel}</span>${typeSelect}</label>
                        <label class="tmnp-inline-field tmnp-barcode-field"><span>Barcode</span>
                            <input type="text" class="preview-input hierarchy-input" data-hierarchy-index="${storageIndex}" data-key="barcode" value="${(ff.barcode || '').replace(/"/g, '&quot;')}" placeholder="Barcode">
                        </label>
                        <label class="tmnp-inline-field tmnp-quantity-field"><span>Qty</span>
                            <input type="number" class="preview-input hierarchy-input" data-hierarchy-index="${storageIndex}" data-key="quantity" value="${ff.quantity}" title="Quantity">
                        </label>
                        <label class="tmnp-inline-field tmnp-volume-field"><span>Volume</span>
                            <input type="number" step="any" class="preview-input hierarchy-input" data-hierarchy-index="${storageIndex}" data-key="volume" value="${ff.volume}">
                        </label>
                        <div class="tmnp-remove-control">
                            ${removeBtn}
                        </div>
                    </div>
                `;
            });

            html += `
                    <button type="button" class="tmnp-add-container-btn" id="addPreviewContainerBtn">+ Add Outer Container</button>
                </div>
            </div>
            </section>`;
        }

        // Container updates editor for Update Item / Form Factor
        if (product.action === 'update-form-factor') {
            const updates = Array.isArray(product.containerUpdates) ? product.containerUpdates : [];
            html += `
            <section class="tmnp-packaging-section">
                <h4 class="tmnp-section-heading">Container / Form Factor Updates</h4>
                <div class="tmnp-hierarchy-card">
                    <div class="tmnp-product-summary">
                        <div><strong>Target Item #:</strong> ${product.productCode || product.lookupBarcode || 'By Barcode'}</div>
                        <div><strong>Product:</strong> ${product.productName || '(Auto-resolved)'}</div>
                    </div>
                    <div class="tmnp-hierarchy-content">
            `;

            updates.forEach((cu, idx) => {
                const targetOpts = [
                    { value: 'leaf', label: 'Leaf (Smallest Unit)' },
                    { value: 'outer', label: 'Outer Container' },
                    { value: 'by-barcode', label: 'Match by Barcode' }
                ].map(o => `<option value="${o.value}" ${cu.target === o.value ? 'selected' : ''}>${o.label}</option>`).join('');

                let typeOpts = `<option value="" ${!cu.newContainerType ? 'selected' : ''}>Keep Current</option>`;
                for (const [optVal, optLabel] of Object.entries(mappings.containerType)) {
                    typeOpts += `<option value="${optVal}" ${(cu.newContainerType || '').toString() === optVal ? 'selected' : ''}>${optLabel}</option>`;
                }

                html += `
                    <div class="tmnp-container-update-row">
                        <label class="tmnp-inline-field"><span>Target Level</span>
                            <select class="preview-input cu-preview-input" data-cu-index="${idx}" data-key="target">${targetOpts}</select>
                        </label>
                        <label class="tmnp-inline-field"><span>Current Barcode</span>
                            <input type="text" class="preview-input cu-preview-input" data-cu-index="${idx}" data-key="currentBarcode" value="${(cu.currentBarcode || '').replace(/"/g, '&quot;')}" placeholder="Required if by-barcode">
                        </label>
                        <label class="tmnp-inline-field"><span>New Type</span>
                            <select class="preview-input cu-preview-input" data-cu-index="${idx}" data-key="newContainerType">${typeOpts}</select>
                        </label>
                        <label class="tmnp-inline-field"><span>New Barcode</span>
                            <input type="text" class="preview-input cu-preview-input" data-cu-index="${idx}" data-key="newBarcode" value="${(cu.newBarcode || '').replace(/"/g, '&quot;')}" placeholder="Leave blank to keep">
                        </label>
                        <label class="tmnp-inline-field"><span>New Qty</span>
                            <input type="number" class="preview-input cu-preview-input" data-cu-index="${idx}" data-key="newQuantity" value="${cu.newQuantity || ''}" placeholder="Keep">
                        </label>
                        <div class="tmnp-remove-control">
                            <button type="button" class="remove-preview-cu-btn" data-index="${idx}" title="Remove Container Update">&times;</button>
                        </div>
                    </div>
                `;
            });

            html += `
                    <button type="button" class="tmnp-add-container-btn" id="addPreviewContainerUpdateBtn">+ Add Container Update</button>
                </div>
            </div>
            </section>`;
        }

        const displayTitle = product.productName || product.itemName || product.productCode || product.lookupBarcode || 'Entry';
        document.getElementById('previewTitle').textContent = `Edit: ${displayTitle}`;
        detailsContainer.innerHTML = html;

        // Wire Use Contexts checkbox & Standard/Custom radio toggles inside Preview Modal
        detailsContainer.querySelectorAll('.preview-use-context-cb').forEach(cb => {
            cb.addEventListener('change', () => {
                const isAdd = Array.from(detailsContainer.querySelectorAll('.preview-use-context-cb:checked'))
                    .some(el => el.value === 'additive');
                const panel = document.getElementById('previewAdditiveContextPanel');
                if (panel) panel.classList.toggle('hidden', !isAdd);
            });
        });

        detailsContainer.querySelectorAll('.preview-additive-method').forEach(radio => {
            radio.addEventListener('change', () => {
                const customBox = document.getElementById('previewAdditiveCustomFields');
                if (customBox) customBox.classList.toggle('hidden', radio.value !== 'custom');
            });
        });

        const previewUnitSel = detailsContainer.querySelector('.preview-input[data-key="measurementUnit"]');
        if (previewUnitSel) {
            previewUnitSel.addEventListener('change', () => {
                const stdLbl = document.getElementById('previewStandardUnitLabel');
                if (stdLbl) stdLbl.textContent = `Standard Units (${formatUnitDisplayLabel(previewUnitSel.value)})`;
            });
        }

        const addContainerBtn = document.getElementById('addPreviewContainerBtn');
        if (addContainerBtn) addContainerBtn.onclick = () => this.addPreviewFormFactor();

        document.querySelectorAll('.remove-preview-ff-btn').forEach(btn => {
            btn.onclick = (e) => this.removePreviewFormFactor(parseInt(e.target.dataset.index, 10));
        });

        const addCuBtn = document.getElementById('addPreviewContainerUpdateBtn');
        if (addCuBtn) addCuBtn.onclick = () => this.addPreviewContainerUpdate();

        document.querySelectorAll('.remove-preview-cu-btn').forEach(btn => {
            btn.onclick = (e) => this.removePreviewContainerUpdate(parseInt(e.target.dataset.index, 10));
        });

        const closeBtn = document.getElementById('closePreviewBtn');
        closeBtn.textContent = 'Save Changes';
        closeBtn.classList.remove('btn-secondary');
        closeBtn.classList.add('btn-primary');

        document.getElementById('previewModal').classList.remove('hidden');
    }

    scrapePreviewModalInputs(product) {
        const standardInputs = document.querySelectorAll('#previewDetails .preview-input:not(.hierarchy-input):not(.cu-preview-input)');
        standardInputs.forEach(input => {
            const key = input.dataset.key;
            let val = input.value;
            const isNumber = ['caloricValue', 'displacement', 'expirationOpened', 'expirationPrepared', 'unitQuantity', 'measurementVolume', 'atomicUnits', 'decimalPlaces'].includes(key);
            if (isNumber) val = parseFloat(val) || 0;
            product[key] = val;
        });

        const previewUcCheckboxes = document.querySelectorAll('#previewDetails .preview-use-context-cb');
        if (previewUcCheckboxes.length > 0) {
            product.useContexts = Array.from(previewUcCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);

            const methodRadio = document.querySelector('#previewDetails .preview-additive-method:checked');
            product.additiveMethod = methodRadio ? methodRadio.value : 'standard';
            if (product.additiveMethod === 'standard') {
                const uom = product.measurementUnit || 'ml';
                product.additiveUnit = uom;
                product.atomicUnits = 1;
                product.decimalPlaces = uom === 'g' ? 1 : 0;
            }
        }

        if (product.hierarchy) {
            const hierarchyInputs = document.querySelectorAll('#previewDetails .hierarchy-input');
            hierarchyInputs.forEach(input => {
                const index = parseInt(input.dataset.hierarchyIndex, 10);
                const key = input.dataset.key;
                let val = input.value;
                if (key === 'quantity' || key === 'volume') val = parseFloat(val) || 0;
                if (product.hierarchy[index]) product.hierarchy[index][key] = val;
            });
        }

        if (product.action === 'update-form-factor') {
            if (!Array.isArray(product.containerUpdates)) product.containerUpdates = [];
            const cuInputs = document.querySelectorAll('#previewDetails .cu-preview-input');
            cuInputs.forEach(input => {
                const index = parseInt(input.dataset.cuIndex, 10);
                const key = input.dataset.key;
                let val = input.value;
                if (key === 'newQuantity') val = val !== '' ? (parseInt(val, 10) || 0) : '';
                if (product.containerUpdates[index]) product.containerUpdates[index][key] = val;
            });
        }
    }

    savePreviewChanges() {
        if (this.editingProductIndex === undefined || this.editingProductIndex === null) return;

        const product = this.products[this.editingProductIndex];
        if (!product) return;

        this.scrapePreviewModalInputs(product);
        this.renderProductsTable();
        this.saveProgress();
        this.showStatus('Product updated successfully!', 'success');
        this.editingProductIndex = null;
    }

    addPreviewFormFactor() {
        if (this.editingProductIndex === undefined || this.editingProductIndex === null) return;
        const product = this.products[this.editingProductIndex];
        if (!product) return;

        this.scrapePreviewModalInputs(product);
        if (!product.hierarchy) product.hierarchy = [];
        product.hierarchy.push({
            containerId: '',
            barcode: '',
            quantity: 0,
            volume: 0
        });
        this.previewProduct(this.editingProductIndex);
    }

    removePreviewFormFactor(index) {
        if (this.editingProductIndex === undefined || this.editingProductIndex === null) return;
        const product = this.products[this.editingProductIndex];
        if (!product || !product.hierarchy) return;

        this.scrapePreviewModalInputs(product);
        product.hierarchy.splice(index, 1);
        this.previewProduct(this.editingProductIndex);
    }

    addPreviewContainerUpdate() {
        if (this.editingProductIndex === undefined || this.editingProductIndex === null) return;
        const product = this.products[this.editingProductIndex];
        if (!product) return;

        this.scrapePreviewModalInputs(product);
        if (!Array.isArray(product.containerUpdates)) product.containerUpdates = [];
        product.containerUpdates.push({
            target: 'leaf',
            currentBarcode: '',
            newContainerType: '',
            newBarcode: '',
            newQuantity: ''
        });
        this.previewProduct(this.editingProductIndex);
    }

    removePreviewContainerUpdate(index) {
        if (this.editingProductIndex === undefined || this.editingProductIndex === null) return;
        const product = this.products[this.editingProductIndex];
        if (!product || !Array.isArray(product.containerUpdates)) return;

        this.scrapePreviewModalInputs(product);
        product.containerUpdates.splice(index, 1);
        this.previewProduct(this.editingProductIndex);
    }

    async handleDocUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const errorEl = document.getElementById('docParseError');
        errorEl.style.display = 'none';
        errorEl.textContent = '';

        this.showStatus(`Reading ${files.length} document(s) offline...`, 'info');

        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                let text = '';

                if (file.name.toLowerCase().endsWith('.txt')) {
                    text = await file.text();
                } else if (file.name.toLowerCase().endsWith('.docx')) {
                    if (typeof mammoth === 'undefined') {
                        throw new Error('Offline .docx parser missing! Please download mammoth.browser.min.js');
                    }
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                    text = result.value;
                } else {
                    throw new Error('Unsupported file type.');
                }

                if (!text || !text.trim()) {
                    throw new Error('Document is empty or could not be read.');
                }

                this.processExtractedDocText(text, file.name);
                successCount++;

            } catch (error) {
                errorEl.textContent += `Failed on ${file.name}: ${error.message}\n`;
                errorEl.style.display = 'block';
            }
        }

        if (successCount > 0 && successCount === files.length) {
            this.showStatus(`Successfully extracted ${successCount} document(s)!`, 'success');
        } else if (successCount > 0) {
            this.showStatus(`Extracted ${successCount} documents, but some failed.`, 'info');
        } else {
            this.showStatus('Failed to read documents.', 'error');
        }

        event.target.value = '';
    }

    processExtractedDocText(text, fileName) {
        try {
            const knownLabels = [
                'Requested Information', 'Manufacturer', 'Display Name', 'Item Number',
                'Product Type', 'Unit Volume', 'Product Use', 'Caloric Density',
                'Caloric Range', 'Displacement', 'Expiration Once Opened',
                'Expiration Once Prepared', 'Base Formula HL7 Reference Code',
                'Fortifier HL7 Reference Code', 'Kitchen Recipe 1', 'Kitchen Recipe 2',
                'Kitchen Recipe 3', 'Container 1', 'Container 2', 'Container 3',
                'Type of Container', 'Barcode', 'Number of Containers', 'Volume', '2D barcode'
            ];

            const boundaryRegex = new RegExp(`(${knownLabels.join('|')})`, 'gi');
            const parts = text.split(boundaryRegex);

            const extractedData = {};
            for (let i = 1; i < parts.length; i += 2) {
                const label = parts[i].trim().toLowerCase();
                let value = parts[i + 1] || '';

                value = value.replace(/\|/g, ' ');
                value = value.replace(/\([^)]+\)/g, ' ');
                value = value.replace(/only applies of this product will be ordered with in a range of cals example 1-45 cal/ig, '');
                value = value.replace(/(?:Ready-to-Feed, Liquid Concentrate, and\/or or Powder; list all that apply)/ig, '');
                value = value.replace(/(?:Base, Fortifier, and\/or Modular; list all that apply)/ig, '');
                value = value.replace(/(?:Case, Carton, Bottle, Can, Packet)/ig, '');
                value = value.replace(/the outermost container/ig, '');
                value = value.replace(/the containers found within/ig, '');
                value = value.replace(/see screenshot provided/ig, '');

                extractedData[label] = value.trim();
            }

            const getVal = (key) => {
                let val = extractedData[key.toLowerCase()] || '';
                let cleanVal = val.trim().toLowerCase();
                return (cleanVal === 'na' || cleanVal === 'n/a' || cleanVal === 'none' || cleanVal === 'null') ? '' : val.trim();
            };

            const rawName = getVal('Display Name');
            const rawItemNumText = getVal('Item Number');
            const itemNumberMatch = rawItemNumText.match(/\bwhich\s+is\s+([A-Z0-9][A-Z0-9-]*)\b/i)
                || rawItemNumText.match(/\b(?:item\s+)?number\s*(?:is|:)\s*([A-Z0-9][A-Z0-9-]*)\b/i);
            const rawItemNum = itemNumberMatch ? itemNumberMatch[1] : rawItemNumText;
            const rawMfg = getVal('Manufacturer');
            const rawType = getVal('Product Type');
            const rawUse = getVal('Product Use');
            const rawCaloric = `${getVal('Caloric Density')} ${getVal('Caloric Range')}`;
            const rawDisplacement = getVal('Displacement');
            const rawExpOpen = getVal('Expiration Once Opened');
            const rawExpPrep = getVal('Expiration Once Prepared');
            const rawHl7Base = getVal('Base Formula HL7 Reference Code');
            const rawHl7Fort = getVal('Fortifier HL7 Reference Code');
            const rawContainer = getVal('Type of Container');
            const rawVolume = `${getVal('Unit Volume')} ${getVal('Volume')}`;
            const rawBarcode2D = getVal('2D barcode') || getVal('Barcode');

            const isRawHl7Message = (str) => {
                if (!str) return false;
                const upperStr = str.toUpperCase();
                return upperStr.includes('MSH|') ||
                       upperStr.includes('MSH^') ||
                       upperStr.includes('PID|') ||
                       (str.match(/\^/g) || []).length > 3;
            };

            const cleanHl7Base = isRawHl7Message(rawHl7Base) ? '' : rawHl7Base;
            const cleanHl7Fort = isRawHl7Message(rawHl7Fort) ? '' : rawHl7Fort;

            if (!rawName) {
                throw new Error('Could not find "Display Name". Ensure the uploaded .docx matches the Timeless form format.');
            }

            let typeId = '1';
            const tLower = rawType.toLowerCase();
            if (tLower.includes('powder')) typeId = '3';
            else if (tLower.includes('concentrate')) typeId = '2';
            else if (tLower.includes('liquid') || tLower.includes('rtf') || tLower.includes('ready')) typeId = '1';

            const useLower = rawUse.toLowerCase();
            const useContexts = [];
            if (useLower.includes('base')) useContexts.push('feed-base');
            if (useLower.includes('fortifier') || useLower.includes('additive')) useContexts.push('additive');
            if (useLower.includes('modular')) {
                if (!useContexts.includes('additive')) useContexts.push('additive');
                useContexts.push('modular');
            }
            if (useContexts.length === 0) useContexts.push('feed-base');

            const catId = useContexts.includes('additive') && !useContexts.includes('feed-base') ? '5' : '3';
            const containerId = resolveContainerTypeId(rawContainer, '1');

            const caloricMatch = rawCaloric.match(/[\d.]+/);
            let caloricVal = 0;
            if (caloricMatch && caloricMatch[0] !== '.') caloricVal = parseFloat(caloricMatch[0]);

            const dispMatch = rawDisplacement.match(/[\d.]+/);
            let dispVal = 0;
            if (dispMatch && dispMatch[0] !== '.') dispVal = parseFloat(dispMatch[0]);

            const volMatch = rawVolume.match(/[\d.]+/);
            let volVal = 0;
            if (volMatch && volMatch[0] !== '.') volVal = parseFloat(volMatch[0]);

            let unitVal = 'ml';
            if (rawVolume.toLowerCase().includes('g')) unitVal = 'g';
            else if (rawVolume.toLowerCase().includes('oz')) unitVal = 'oz';

            let expOpenHours = 0;
            if (rawExpOpen) {
                const expMatch = rawExpOpen.match(/[\d.]+/);
                if (expMatch && expMatch[0] !== '.') {
                    expOpenHours = parseFloat(expMatch[0]) || 0;
                    if (rawExpOpen.toLowerCase().includes('day')) expOpenHours *= 24;
                }
            }

            let expPrepHours = 0;
            if (rawExpPrep) {
                const prepMatch = rawExpPrep.match(/[\d.]+/);
                if (prepMatch && prepMatch[0] !== '.') {
                    expPrepHours = parseFloat(prepMatch[0]) || 0;
                    if (rawExpPrep.toLowerCase().includes('day')) expPrepHours *= 24;
                }
            }

            const containerTypesRaw = getVal('Type of Container (Case, Carton, Bottle, Can, Packet)') || getVal('Type of Container');
            const barcodesRaw = extractedData['barcode'] || '';
            const quantitiesRaw = getVal('Number of Containers');
            const volumesRaw = getVal('Volume');

            const types = (containerTypesRaw.match(/\b(tetra\s*prisma|tetra\s*brik|tetra(?:\s*pak)?|bottle|carton|can|case|vial|packet|pack|sachet|tub|pouch|bag|box|cup|stick)\b/gi) || []).map(s => s.toLowerCase());
            const barcodes = barcodesRaw.match(/\d{5,}/g) || [];
            const quantities = quantitiesRaw.match(/\d+(\.\d+)?/g) || [];
            const volumes = volumesRaw.match(/\d+(\.\d+)?/g) || [];

            const formFactors = [];
            const maxCols = Math.max(types.length, barcodes.length, quantities.length, volumes.length);

            for (let i = 0; i < maxCols; i++) {
                const cid = resolveContainerTypeId(types[i] || '', '');
                const bc = barcodes[i] || '';
                const qty = parseInt(quantities[i]) || (i === maxCols - 1 ? 1 : 0);
                const vol = parseFloat(volumes[i]) || 0;

                if (bc || qty || vol || cid) {
                    formFactors.push({ containerId: cid, barcode: bc, quantity: qty, volume: vol });
                }
            }

            const hierarchy = formFactors.reverse();

            const product = {
                action: 'create',
                manufacturer: rawMfg,
                productName: rawName,
                shortName: rawName,
                productCode: rawItemNum,
                barcode: rawBarcode2D,
                productType: typeId,
                useContexts: useContexts,
                additiveMethod: 'standard',
                additiveUnit: unitVal,
                atomicUnits: 1,
                decimalPlaces: unitVal === 'g' ? 1 : 0,
                categoryId: catId,
                caloricValue: caloricVal,
                displacement: dispVal,
                expirationOpened: expOpenHours,
                expirationPrepared: useContexts.includes('additive') ? (expPrepHours || 48) : 0,
                containerType: containerId,
                unitQuantity: 1,
                measurementVolume: volVal,
                hl7Reference: cleanHl7Base,
                hl7Fortifier: cleanHl7Fort,
                measurementUnit: unitVal,
                hierarchy: hierarchy
            };

            this.currentAction = 'create';
            this.products.push(product);
            this.renderProductsTable();
            this.saveProgress();

            this.showStatus(`Extracted ${rawName} from document!`, 'success');

        } catch (error) {
            const errorEl = document.getElementById('docParseError');
            errorEl.textContent = error.message;
            errorEl.style.display = 'block';
            this.showStatus('Mapping failed.', 'error');
        }
    }

    updateApiSelectionCount() {
        const checked = document.querySelectorAll('.api-product-cb:checked').length;
        document.getElementById('apiSelectedCount').textContent = `${checked} product(s) selected`;
        document.getElementById('stageSelectedApiBtn').disabled = checked === 0;
    }

    setupEventListeners() {
        document.querySelectorAll('.output-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.output-tab').forEach(btn => {
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-secondary');
                });
                e.target.classList.remove('btn-secondary');
                e.target.classList.add('btn-primary');

                this.switchOutputFormat(e.target.dataset.format);
            });
        });

        document.getElementById('dismissPreviewBtn').addEventListener('click', () => {
            document.getElementById('previewModal').classList.add('hidden');
        });

        document.getElementById('apiResultsBody').addEventListener('change', async (e) => {
            if (!e.target.classList.contains('api-product-cb')) return;

            const cb = e.target;
            const itemId = cb.value;

            if (cb.checked) {
                try {
                    cb.disabled = true;
                    this.showStatus('Fetching details...', 'info');

                    const detailedItems = await apiService.fetchProductDetails([itemId]);
                    if (detailedItems && detailedItems.length > 0) {
                        const apiItem = detailedItems[0];
                        const basicData = apiService.cachedProducts.find(p => p.ItemID.toString() === itemId.toString()) || {};

                        let calValue = 20;
                        if (apiItem.Nutrients && Array.isArray(apiItem.Nutrients)) {
                            const calObj = apiItem.Nutrients.find(n => (n.Description || '').toLowerCase().includes('calorie'));
                            if (calObj && calObj.Value) calValue = parseFloat(calObj.Value) || calValue;
                        }

                        let hierarchy = [];
                        if (basicData.PrimaryPackage) {
                            const cId = resolveContainerTypeId(basicData.PrimaryPackage, '1');
                            hierarchy.push({ containerId: cId, barcode: basicData.PrimaryBarcode || '', quantity: 1, volume: parseFloat(basicData.Displacement) || 0 });
                        }

                        this.products.push({
                            apiItemId: itemId.toString(),
                            action: 'create',
                            manufacturer: 'Undefined',
                            productName: (basicData.FamilyName || 'Imported Product').replace(/[®™©]/g, '').trim(),
                            shortName: (basicData.ItemFlavor || '').replace(/[®™©]/g, '').trim(),
                            productCode: apiItem.ItemNumber || basicData.ItemNumber || '',
                            barcode: basicData.PrimaryBarcode || '',
                            productType: (basicData.FormType || '').toLowerCase().includes('powder') ? '3' : '1',
                            useContexts: ['feed-base'],
                            additiveMethod: 'standard',
                            additiveUnit: 'ml',
                            atomicUnits: 1,
                            decimalPlaces: 0,
                            categoryId: '3',
                            caloricValue: calValue,
                            displacement: parseFloat(basicData.Displacement) || 0,
                            expirationOpened: 48,
                            expirationPrepared: 0,
                            measurementUnit: 'ml',
                            hierarchy: hierarchy.length > 0 ? hierarchy : [{ containerId: '1', barcode: '', quantity: 1, volume: 100 }]
                        });

                        this.renderProductsTable();
                        this.saveProgress();
                        this.showStatus('Added to batch!', 'success');
                    }
                } catch (error) {
                    this.showStatus(error.message, 'error');
                    cb.checked = false;
                } finally {
                    cb.disabled = false;
                }
            } else {
                const index = this.products.findIndex(p => p.apiItemId === itemId.toString());
                if (index !== -1) {
                    this.products.splice(index, 1);
                    this.renderProductsTable();
                    this.saveProgress();
                    this.showStatus('Removed from batch', 'success');
                }
            }
            this.updateApiSelectionCount();
        });

        const searchInput = document.getElementById('apiSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.refreshApiGrid());
        }

        document.getElementById('changeFolderBtn').addEventListener('click', async () => {
            if (typeof fsAccessManager === 'undefined' || !fsAccessManager.isSupported()) {
                this.showStatus('File system access not supported on this browser.', 'error');
                return;
            }

            try {
                this.showStatus('Select your master project folder...', 'info');
                const newRootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });

                await fsAccessManager.setStoredHandle(fsAccessManager.rootKey, newRootHandle);

                await this.ensureSeedersFolder();
                this.rememberBuild();
                this.showStatus(`Folder updated to: ${newRootHandle.name}`, 'success');

            } catch (error) {
                console.warn('Folder switch cancelled:', error);
            }
        });

        document.getElementById('apiLoadCatalogBtn').addEventListener('click', async () => {
            if (!apiService.isConfigured()) {
                this.showStatus('Please configure API settings first.', 'error');
                document.getElementById('apiSettingsModal').classList.remove('hidden');
                return;
            }

            const btn = document.getElementById('apiLoadCatalogBtn');
            const searchInput = document.getElementById('apiSearchInput');
            const progWrapper = document.getElementById('apiLoadProgressWrapper');
            const progBar = document.getElementById('apiLoadProgressBar');
            const progText = document.getElementById('apiLoadProgressText');

            try {
                btn.disabled = true;
                btn.textContent = 'Loading...';
                progWrapper.style.display = 'block';
                progBar.style.width = '0%';

                const baseUrl = apiService.config.baseUrl.replace(/\/$/, '');
                const facId = apiService.config.facilityId;
                const headers = { 'Authorization': `Bearer ${apiService.config.token}`, 'Content-Type': 'application/json' };

                const initialUrl = `${baseUrl}/api/internal/cpoe/v1/get-product-by-facility/${facId}/0/1`;
                const response = await fetch(initialUrl, { headers });
                const json = await response.json();

                let allProducts = json.data?.ProductData || [];
                const totalRecords = json.data?.TotalRecords || 0;
                if (totalRecords === 0 || allProducts.length === 0) {
                    this.showStatus('No products found for this facility. Please select a different one.', 'error');

                    document.getElementById('apiBaseUrl').value = apiService.config.baseUrl;
                    document.getElementById('apiToken').value = apiService.config.token;
                    document.getElementById('apiSettingsModal').classList.remove('hidden');

                    btn.disabled = false;
                    btn.textContent = '⬇️ Load Catalog';
                    progWrapper.style.display = 'none';
                    return;
                }
                const limit = json.data?.Limit || 10;
                let loadedCount = limit;

                if (totalRecords > limit) {
                    const fetchPromises = [];
                    for (let offset = limit; offset < totalRecords; offset += limit) {
                        const pageUrl = `${baseUrl}/api/internal/cpoe/v1/get-product-by-facility/${facId}/${offset}/1`;

                        const req = fetch(pageUrl, { headers }).then(res => res.json()).then(pageJson => {
                            allProducts = allProducts.concat(pageJson.data?.ProductData || []);
                            loadedCount += limit;

                            const percentage = Math.min(100, Math.round((loadedCount / totalRecords) * 100));
                            progBar.style.width = `${percentage}%`;
                            progText.textContent = `Downloading... ${percentage}%`;
                        }).catch(e => console.warn(e));

                        fetchPromises.push(req);
                    }
                    await Promise.all(fetchPromises);
                }

                apiService.cachedProducts = allProducts;
                if (typeof idbKeyval !== 'undefined') {
                    await idbKeyval.set('cachedApiProducts', allProducts);
                }

                progBar.style.width = '100%';
                progText.textContent = 'Complete!';
                searchInput.disabled = false;

                btn.innerHTML = '✅ Products Ready';
                btn.style.background = '#ecfdf5';
                btn.style.color = '#065f46';
                btn.style.borderColor = '#10b981';
                document.getElementById('apiTotalLoadedCount').textContent = `(${allProducts.length} products loaded)`;
                searchInput.dispatchEvent(new Event('input'));
                setTimeout(() => progWrapper.style.display = 'none', 2000);
                this.showStatus(`Successfully loaded ${allProducts.length} products!`, 'success');

            } catch (error) {
                this.showStatus(error.message, 'error');
                btn.disabled = false;
                btn.textContent = '⬇️ Load Catalog';
                progWrapper.style.display = 'none';
            }
        });

        const apiModal = document.getElementById('apiSettingsModal');

        document.getElementById('openApiSettingsBtn').addEventListener('click', () => {
            document.getElementById('apiBaseUrl').value = apiService.config.baseUrl;
            document.getElementById('apiToken').value = apiService.config.token;
            document.getElementById('facilitySelectionWrapper').classList.add('hidden');
            apiModal.classList.remove('hidden');
        });

        document.querySelector('.close-api-btn').addEventListener('click', () => {
            apiModal.classList.add('hidden');
        });

        document.getElementById('testApiConnectionBtn').addEventListener('click', async () => {
            const baseUrl = document.getElementById('apiBaseUrl').value.trim();
            const token = document.getElementById('apiToken').value.trim();
            const btn = document.getElementById('testApiConnectionBtn');

            if (!baseUrl || !token) {
                this.showStatus('URL and Token are required', 'error');
                return;
            }

            try {
                btn.textContent = 'Connecting...';
                btn.disabled = true;

                const facilities = await apiService.fetchFacilities(baseUrl, token);

                const select = document.getElementById('apiFacilitySelect');
                select.innerHTML = facilities.map(f =>
                    `<option value="${f.FacilityID}">${f.FacilityName} (${f.EnterpriseName})</option>`
                ).join('');

                if (apiService.config.facilityId) {
                    select.value = apiService.config.facilityId;
                }

                document.getElementById('facilitySelectionWrapper').classList.remove('hidden');
                this.showStatus('Facilities loaded successfully!', 'success');
            } catch (error) {
                this.showStatus(error.message, 'error');
            } finally {
                btn.textContent = 'Test Connection & Fetch Facilities';
                btn.disabled = false;
            }
        });

        document.getElementById('saveApiSettingsBtn').addEventListener('click', () => {
            const select = document.getElementById('apiFacilitySelect');
            apiService.saveConfig({
                baseUrl: document.getElementById('apiBaseUrl').value.trim(),
                token: document.getElementById('apiToken').value.trim(),
                facilityId: select.value,
                facilityName: select.options[select.selectedIndex].text
            });
            apiModal.classList.add('hidden');
            this.showStatus('API Configured Successfully!', 'success');
        });

        document.getElementById('detectBuildBtn').addEventListener('click', () => this.detectBuild());
        document.getElementById('localUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.detectBuild();
        });

        document.getElementById('grantBuildFolderBtn').addEventListener('click', () => this.grantBuildFolderAccess());

        document.getElementById('continueBtn').addEventListener('click', () => this.goToStep(2));
        document.getElementById('savedBuildsSelect').addEventListener('change', (e) => {
            if (e.target.value) this.useFavorite(e.target.value);
        });
        document.getElementById('forgetBuildBtn').addEventListener('click', () => this.forgetSelectedBuild());

        document.getElementById('actionType').addEventListener('change', (e) => this.loadProductForm(e.target.value));
        document.getElementById('addProductBtn').addEventListener('click', () => this.addProduct());

        document.querySelectorAll('.form-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchFormTab(e.target.dataset.tab));
        });

        document.getElementById('docFile').addEventListener('change', (e) => this.handleDocUpload(e));
        document.getElementById('csvFile').addEventListener('change', (e) => this.handleCsvUpload(e));
        document.getElementById('downloadCsvTemplate').addEventListener('click', () => csvHandler.downloadTemplate());

        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllProducts());
        document.getElementById('generateSeederBtn').addEventListener('click', () => this.generateSeeder());
        document.getElementById('step2BackBtn').addEventListener('click', () => this.goToStep(1));
        document.getElementById('executeOutputBtn').addEventListener('click', () => this.executeOutput());
        document.getElementById('backToProductsBtn').addEventListener('click', () => this.showOutput(false));
        document.getElementById('newSeederBtn').addEventListener('click', () => this.reset());

        document.getElementById('closeSuccessBtn').addEventListener('click', () => {
            document.getElementById('successModal').classList.add('hidden');
        });
        document.getElementById('closeErrorBtn').addEventListener('click', () => {
            document.getElementById('errorModal').classList.add('hidden');
        });
        document.getElementById('closePreviewBtn').addEventListener('click', () => {
            this.savePreviewChanges();
            document.getElementById('previewModal').classList.add('hidden');
        });

        document.getElementById('productsTableBody').addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;

            const index = parseInt(target.getAttribute('data-index'), 10);

            if (target.classList.contains('remove-product-btn')) {
                this.removeProduct(index);
            } else if (target.classList.contains('preview-product-btn')) {
                this.previewProduct(index);
            }
        });
    }

    async detectBuild() {
        const runId = ++this.buildDetectionRun;
        const url = document.getElementById('localUrl').value.trim();
        const errorEl = document.getElementById('urlError');
        errorEl.classList.remove('show');
        this.setBuildSearchState(true, false, 'Parsing build URL...');
        this.seedersDirHandle = null;
        this.seederNumber = null;
        this.pendingBuildFolderInfo = null;
        document.getElementById('buildDetailsCard').style.display = 'none';
        document.getElementById('grantBuildFolderBtn').style.display = 'none';
        this.updateSeederNumberDisplay('', 'searching');

        if (!url) {
            this.setBuildSearchState(false, false);
            errorEl.textContent = 'Please enter a URL';
            errorEl.classList.add('show');
            return;
        }

        if (!wampDetector.validateUrl(url)) {
            this.setBuildSearchState(false, false);
            errorEl.textContent = 'Enter a build hostname such as client-v7-3-1, or its .local URL.';
            errorEl.classList.add('show');
            return;
        }

        try {
            const urlInfo = wampDetector.parseUrl(url);
            if (!urlInfo.isValid) throw new Error(urlInfo.error);

            this.buildInfo = {
                clientName: urlInfo.clientName,
                version: urlInfo.version,
                quarter: urlInfo.quarter,
                hostname: urlInfo.hostname,
                buildFolderName: urlInfo.buildFolderName,
                buildPath: urlInfo.buildFolderName
            };
            document.getElementById('clientName').textContent = this.buildInfo.clientName;
            document.getElementById('buildVersion').textContent = this.buildInfo.version;
            document.getElementById('buildQuarter').textContent = this.buildInfo.quarter;
            document.getElementById('buildPath').textContent = this.buildInfo.buildPath;
            document.getElementById('buildDetailsCard').style.display = 'flex';

            this.buildInfo = await wampDetector.detectLocalBuild(urlInfo);
            if (runId !== this.buildDetectionRun) return;

            document.getElementById('clientName').textContent = this.buildInfo.clientName;
            document.getElementById('buildVersion').textContent = this.buildInfo.version;
            document.getElementById('buildQuarter').textContent = this.buildInfo.quarter;
            document.getElementById('buildPath').textContent = this.buildInfo.buildPath;

            document.getElementById('buildDetailsCard').style.display = 'flex';

            await this.ensureSeedersFolder(false, runId);
            if (runId !== this.buildDetectionRun) return;

            this.rememberBuild();

        } catch (error) {
            if (runId !== this.buildDetectionRun) return;
            this.setBuildSearchState(false, false);
            errorEl.textContent = error.message;
            errorEl.classList.add('show');
        }
    }

    getProjectRootPath(documentRoot) {
        return documentRoot ? documentRoot.replace(/[\\/]public$/i, '') : '';
    }

    setBuildSearchState(searching, ready, message = 'Searching build folders...') {
        const indicator = document.getElementById('buildSearchIndicator');
        const nextButton = document.getElementById('continueBtn');
        if (indicator) {
            indicator.hidden = !searching;
            document.getElementById('buildSearchText').textContent = message;
        }
        if (nextButton) nextButton.disabled = !ready;
        if (ready && this.pendingRestoredStep) {
            this.currentStep = this.pendingRestoredStep;
            this.pendingRestoredStep = null;
            this.updateStepIndicator();
            this.showStep(this.currentStep);
        }
    }

    async grantBuildFolderAccess() {
        if (!this.pendingBuildFolderInfo) return;
        const selectedBuild = this.pendingBuildFolderInfo;
        const runId = this.buildDetectionRun;

        try {
            this.setBuildSearchState(true, false, 'Restoring saved folder access...');
            this.showStatus(`Select the common parent folder containing ${selectedBuild.buildFolderName} and your other builds.`, 'info');
            const folderResult = await fsAccessManager.pickSharedBuildParent(selectedBuild, this.wampRootHandle || undefined);
            if (runId !== this.buildDetectionRun || this.buildInfo !== selectedBuild) return;

            this.seedersDirHandle = folderResult.handle;
            this.buildInfo.buildPath = this.getProjectRootPath(selectedBuild.documentRoot) || folderResult.relativePath;
            document.getElementById('buildPath').textContent = this.buildInfo.buildPath;
            document.getElementById('grantBuildFolderBtn').style.display = 'none';
            const highest = await fsAccessManager.getHighestSeederNumber(this.seedersDirHandle);
            if (runId !== this.buildDetectionRun) return;
            this.seederNumber = highest + 1;
            this.updateSeederNumberDisplay(this.seederNumber, 'auto-detected');
            this.updateFolderLinkUI(true, '✅ Shared build parent saved for future builds.');
            this.showStatus('Build parent linked and remembered for sibling builds.', 'success');
            this.setBuildSearchState(false, true);
            this.rememberBuild();
        } catch (error) {
            this.setBuildSearchState(false, false);
            if (error.name !== 'AbortError') this.showStatus(error.message, 'error');
        }
    }

    async ensureSeedersFolder(forcePicker = false, runId = this.buildDetectionRun) {
        const isCurrentRun = () => runId === this.buildDetectionRun;
        if (!isCurrentRun()) return;
        this.pendingBuildFolderInfo = null;
        this.seedersDirHandle = null;
        this.seederNumber = null;
        document.getElementById('buildPath').textContent = this.buildInfo?.buildPath || '';
        document.getElementById('grantBuildFolderBtn').style.display = 'none';
        this.setBuildSearchState(true, false, 'Searching permitted folders...');
        this.updateSeederNumberDisplay('', 'searching');
        document.getElementById('folderLinkStatus').textContent = 'Searching linked folder...';
        document.getElementById('folderLinkStatus').classList.remove('linked');
        document.getElementById('folderLinkStatus').style.color = '#64748b';

        if (!fsAccessManager.isSupported()) {
            this.setBuildSearchState(false, false);
            this.showStatus('Browser does not support folder access.', 'error');
            return;
        }

        try {
            const rememberedParents = await fsAccessManager.getSharedBuildParentsForBuild(this.buildInfo);
            for (const parent of rememberedParents) {
                const rememberedResult = await fsAccessManager.getSeedersDirHandle(
                    this.buildInfo,
                    parent,
                    isCurrentRun,
                    ''
                );
                if (!isCurrentRun()) return;
                if (!rememberedResult) continue;

                this.seedersDirHandle = rememberedResult.handle;
                this.buildInfo.documentRoot = '';
                this.buildInfo.buildPath = `${parent.name}\\${rememberedResult.relativePath}`;
                document.getElementById('buildPath').textContent = this.buildInfo.buildPath;
                const highest = await fsAccessManager.getHighestSeederNumber(this.seedersDirHandle);
                if (!isCurrentRun()) return;
                this.seederNumber = highest + 1;
                this.updateSeederNumberDisplay(this.seederNumber, 'auto-detected');
                this.updateFolderLinkUI(true, '✅ Matched URL folder in saved parent.');
                this.showStatus('Ready to generate!', 'success');
                this.setBuildSearchState(false, true);
                return;
            }

            let rootHandle = await fsAccessManager.getRootHandleWithPermission();

            if (!rootHandle) {
                this.showStatus('Select a drive or common parent folder that contains your build folders.', 'info');
                rootHandle = await fsAccessManager.linkRoot();
            }
            if (!isCurrentRun()) return;
            this.wampRootHandle = rootHandle;

            let folderResult = await fsAccessManager.getSeedersDirHandle(this.buildInfo, rootHandle, isCurrentRun, '');
            if (!isCurrentRun()) return;

            let documentRoot = '';
            if (!folderResult) {
                const hostsFile = await fsAccessManager.getHostsFileWithPermission();
                const hostsIp = hostsFile
                    ? await fsAccessManager.findHostsIp(this.buildInfo.hostname, hostsFile)
                    : null;
                documentRoot = await fsAccessManager.findVhostDocumentRoot(this.buildInfo.hostname, rootHandle, this.buildInfo, hostsIp);
                if (!documentRoot) {
                    const vhostRoot = await fsAccessManager.getVhostRootWithPermission();
                    if (vhostRoot) {
                        documentRoot = await fsAccessManager.findVhostDocumentRoot(this.buildInfo.hostname, vhostRoot, this.buildInfo, hostsIp);
                    }
                }
                if (!isCurrentRun()) return;
            }

            this.buildInfo.documentRoot = documentRoot || '';
            const storedProjectHandle = await fsAccessManager.getStoredBuildFolderHandle(this.buildInfo);
            const savedProjectHandle = await fsAccessManager.getBuildFolderHandle(this.buildInfo);
            if (!isCurrentRun()) return;
            if (savedProjectHandle) {
                const savedSeedersHandle = await fsAccessManager.getDirectoryPath(savedProjectHandle, [
                    'vendor', 'timeless', 'customers', 'src', 'Database', 'Seeds', 'ClientDataUpdates'
                ]);
                if (savedSeedersHandle) {
                    this.seedersDirHandle = savedSeedersHandle;
                    this.buildInfo.buildPath = this.getProjectRootPath(documentRoot) || savedProjectHandle.name;
                    document.getElementById('buildPath').textContent = this.buildInfo.buildPath;
                    const highest = await fsAccessManager.getHighestSeederNumber(savedSeedersHandle);
                    if (!isCurrentRun()) return;
                    this.seederNumber = highest + 1;
                    this.updateSeederNumberDisplay(this.seederNumber, 'auto-detected');
                    this.updateFolderLinkUI(true, '✅ Remembered build folder access restored.');
                    this.showStatus('Ready to generate!', 'success');
                    this.setBuildSearchState(false, true);
                    return;
                }
            }

            const sharedParents = await fsAccessManager.getSharedBuildParentsForBuild(this.buildInfo);
            for (const parent of sharedParents) {
                const sharedResult = await fsAccessManager.getSeedersDirHandle(
                    this.buildInfo,
                    parent,
                    isCurrentRun,
                    documentRoot || ''
                );
                if (!isCurrentRun()) return;
                if (sharedResult) {
                    this.seedersDirHandle = sharedResult.handle;
                    this.buildInfo.buildPath = this.getProjectRootPath(documentRoot) || `${parent.name}\\${sharedResult.relativePath}`;
                    document.getElementById('buildPath').textContent = this.buildInfo.buildPath;
                    const highest = await fsAccessManager.getHighestSeederNumber(this.seedersDirHandle);
                    if (!isCurrentRun()) return;
                    this.seederNumber = highest + 1;
                    this.updateSeederNumberDisplay(this.seederNumber, 'auto-detected');
                    this.updateFolderLinkUI(true, '✅ Matched saved shared build parent.');
                    this.showStatus('Ready to generate!', 'success');
                    this.setBuildSearchState(false, true);
                    return;
                }
            }

            if (storedProjectHandle && documentRoot) {
                this.pendingBuildFolderInfo = this.buildInfo;
                this.buildInfo.buildPath = this.getProjectRootPath(documentRoot);
                document.getElementById('buildPath').textContent = this.buildInfo.buildPath;
                document.getElementById('grantBuildFolderBtn').textContent = 'Link Shared Build Folder';
                document.getElementById('grantBuildFolderBtn').style.display = 'inline-block';
                this.updateFolderLinkUI(false, 'Saved project access needs permission again, or link its shared parent.');
                this.updateSeederNumberDisplay('', 'action required');
                this.showStatus('Restore permission to the saved build folder to continue.', 'info');
                this.setBuildSearchState(false, false);
                return;
            }

            if (!folderResult && documentRoot) {
                folderResult = await fsAccessManager.getSeedersDirHandle(this.buildInfo, rootHandle, isCurrentRun, documentRoot);
                if (!isCurrentRun()) return;
            }

            if (!folderResult) {
                this.pendingBuildFolderInfo = this.buildInfo;
                this.buildInfo.buildPath = this.getProjectRootPath(documentRoot) || this.buildInfo.buildFolderName;
                document.getElementById('buildPath').textContent = this.buildInfo.buildPath;
                document.getElementById('grantBuildFolderBtn').textContent = 'Link Shared Build Folder';
                document.getElementById('grantBuildFolderBtn').style.display = 'inline-block';
                this.updateFolderLinkUI(false, 'Build folder not found in permitted folders. Link its common parent once.');
                this.updateSeederNumberDisplay('', 'action required');
                this.showStatus(`Could not access ${this.buildInfo.buildFolderName}. Select its parent folder once to save access.`, 'info');
                this.setBuildSearchState(false, false);
                return;
            }

            this.seedersDirHandle = folderResult.handle;
            this.pendingBuildFolderInfo = null;
            this.buildInfo.documentRoot = documentRoot || '';
            this.buildInfo.buildPath = this.getProjectRootPath(documentRoot) || (folderResult.relativePath === rootHandle.name
                ? rootHandle.name
                : `${rootHandle.name}\\${folderResult.relativePath}`);
            document.getElementById('buildPath').textContent = this.buildInfo.buildPath;

            const highest = await fsAccessManager.getHighestSeederNumber(this.seedersDirHandle);
            if (!isCurrentRun()) return;
            this.seederNumber = highest + 1;

            this.updateSeederNumberDisplay(this.seederNumber, 'auto-detected');
            this.updateFolderLinkUI(true, documentRoot
                ? '✅ Matched Apache vhost and scanned project.'
                : '✅ Folder linked & scanned successfully.');
            this.showStatus('Ready to generate!', 'success');
            this.setBuildSearchState(false, true);

        } catch (error) {
            if (!isCurrentRun()) return;
            this.setBuildSearchState(false, false);
            console.error(error);
            this.seedersDirHandle = null;
            this.updateFolderLinkUI(false, error.message || 'Could not locate this build folder.');
            this.updateSeederNumberDisplay('', 'action required');
            this.showStatus(error.message || 'Could not locate this build folder.', 'error');
        }
    }

    updateFolderLinkUI(linked, message) {
        const statusEl = document.getElementById('folderLinkStatus');
        statusEl.textContent = message;

        if (linked) {
            statusEl.classList.add('linked');
            statusEl.style.color = '#10b981';
        } else {
            statusEl.classList.remove('linked');
            statusEl.style.color = '#ef4444';
        }
    }

    updateSeederNumberDisplay(number, source) {
        const input = document.getElementById('nextSeederNum');
        if (number) input.value = number;
        else input.value = '';

        const badge = document.getElementById('seederNumSource');
        badge.textContent = source;
        if (source === 'action required') {
            badge.className = 'source-badge estimated';
            input.focus();
        } else {
            badge.className = 'source-badge verified';
        }
    }

    syncAdditiveContextPanel(box) {
        if (!box) return;
        const isAdditiveChecked = Array.from(box.querySelectorAll('.use-context-cb:checked'))
            .some(cb => cb.value === 'additive');
        const panel = box.querySelector('.additive-context-panel');
        if (panel) {
            panel.classList.toggle('hidden', !isAdditiveChecked);
        }
    }

    syncAdditiveCustomFields(box) {
        if (!box) return;
        const selectedMethod = box.querySelector('.additive-method-radio:checked')?.value || 'standard';
        const customFields = box.querySelector('.additive-custom-fields');
        if (customFields) {
            customFields.classList.toggle('hidden', selectedMethod !== 'custom');
        }
    }

    loadProductForm(actionType) {
        const container = document.getElementById('productFormFields');
        container.innerHTML = '';
        if (!actionType) return;

        const gridWrapper = document.createElement('div');
        gridWrapper.className = 'form-grid';

        const fields = this.getFormFields(actionType);

        if (actionType === 'update' || actionType === 'update-form-factor') {
            const layout = document.createElement('div');
            layout.className = 'update-module-container';

            const selectorPanel = document.createElement('div');
            selectorPanel.className = 'update-selector-panel';

            const helperText = document.createElement('div');
            helperText.className = 'field-selection-hint';
            helperText.innerHTML = actionType === 'update-form-factor'
                ? '<strong>Select Item Fields to Update:</strong> Toggle the item properties to change, or add container barcode/type/qty updates below.'
                : '<strong>Select Fields to Update:</strong> Click the properties you need to change. The input fields will appear below.';
            selectorPanel.appendChild(helperText);

            const editorPanel = document.createElement('div');
            editorPanel.className = 'update-editor-panel';

            const trailingFields = [];
            fields.forEach(field => {
                if (field.type === 'checkbox-group') {
                    selectorPanel.appendChild(this.createFormField(field));
                } else if (field.type === 'conditional-input') {
                    // Rendered dynamically by syncConditionalFieldVisibility()
                } else if (field.type === 'container-updates') {
                    trailingFields.push(field);
                } else {
                    gridWrapper.appendChild(this.createFormField(field));
                }
            });

            layout.appendChild(selectorPanel);
            layout.appendChild(editorPanel);
            gridWrapper.appendChild(layout);

            trailingFields.forEach(field => {
                gridWrapper.appendChild(this.createFormField(field));
            });

            container.appendChild(gridWrapper);

            this.syncConditionalFieldVisibility();
            const checkboxGroup = document.querySelector('#productFormFields [data-field-name="updateFields"], #productFormFields [data-field-name="updateItemFields"]');
            if (checkboxGroup) {
                checkboxGroup.addEventListener('change', () => this.syncConditionalFieldVisibility());
            }
            return;
        }

        fields.forEach(field => {
            gridWrapper.appendChild(this.createFormField(field));
        });

        container.appendChild(gridWrapper);

        // Sync Standard Units label and default custom unit values when main Measurement Unit changes
        if (actionType === 'create') {
            const mainUnitSel = container.querySelector('[data-field-name="measurementUnit"]');
            const stdUnitSpan = container.querySelector('.standard-unit-label');
            const addUnitSel = container.querySelector('[data-field-name="additiveUnit"]');
            const decInput = container.querySelector('[data-field-name="decimalPlaces"]');
            if (mainUnitSel) {
                mainUnitSel.addEventListener('change', () => {
                    if (stdUnitSpan) stdUnitSpan.textContent = `Standard Units (${formatUnitDisplayLabel(mainUnitSel.value)})`;
                    if (addUnitSel) addUnitSel.value = mainUnitSel.value;
                    if (decInput) decInput.value = mainUnitSel.value === 'g' ? '1' : '0';
                });
            }
            if (addUnitSel && decInput) {
                addUnitSel.addEventListener('change', () => {
                    decInput.value = addUnitSel.value === 'g' ? '1' : '0';
                });
            }
        }
    }

    getFormFields(actionType) {
        const fields = {
            'create': [
                { type: 'section', label: 'General Information' },
                { name: 'manufacturer', label: 'Manufacturer', type: 'select', placeholder: 'Select a manufacturer...', options: UPDATE_FIELD_DEFINITIONS.find(field => field.value === 'manufacturer').options },
                { name: 'productName', label: 'Display Name *', type: 'text', required: true },
                { name: 'shortName', label: 'Short Name', type: 'text' },
                { name: 'productCode', label: 'Item Number', type: 'text' },
                { name: 'barcode', label: 'Barcode', type: 'text' },
                { name: 'hl7Reference', label: 'Base HL7 Ref Code', type: 'text' },
                { name: 'hl7Fortifier', label: 'Fortifier HL7 Ref Code', type: 'text' },

                { type: 'section', label: 'Classification & Use' },
                { name: 'productType', label: 'Product Type *', type: 'select', required: true, value: '1', options: [
                    { value: '3', label: 'Powder' },
                    { value: '2', label: 'Liquid Concentrate' },
                    { value: '1', label: 'Ready-to-Feed Liquid' }
                ]},
                { name: 'categoryId', label: 'Category Override', type: 'select', value: '3', options: [
                    { value: '3', label: 'Formula (Default)' },
                    { value: '5', label: 'Additive / Fortifier' },
                    { value: '1', label: 'EBM' },
                    { value: '2', label: 'DHM' }
                ]},
                { name: 'useContexts', label: 'Use Contexts *', type: 'use-contexts', fullWidth: true, value: ['feed-base'] },

                { type: 'section', label: 'Nutrition & Expiration' },
                { name: 'caloricValue', label: 'Caloric Density', type: 'number', value: 20, step: 0.1, numeric: true },
                { name: 'displacement', label: 'Displacement', type: 'number', value: 0, step: 0.01, numeric: true },
                { name: 'expirationOpened', label: 'Expiration Once Opened (Hours)', type: 'number', value: 48, numeric: true },
                { name: 'measurementUnit', label: 'Measurement Unit', type: 'select', value: 'ml', options: [
                    { value: 'ml', label: 'mL' },
                    { value: 'g', label: 'g' },
                    { value: 'oz', label: 'oz' }
                ]},

                { type: 'section', label: 'Packaging' },
                { name: 'hierarchy', label: 'Packaging Hierarchy (Outer Container at Top, Smallest Unit at Bottom)', type: 'packaging-hierarchy' }
            ],
            'update': [
                { name: 'productName', label: 'Exact Product Name *', type: 'text', required: true, fullWidth: true },
                { name: 'updateFields', label: 'Fields to Update *', type: 'checkbox-group', required: true, value: ['hl7Reference', 'caloricValue'],
                    options: UPDATE_FIELD_DEFINITIONS.map(field => ({ value: field.value, label: field.label }))
                },
                ...UPDATE_FIELD_DEFINITIONS.map(field => ({
                    name: field.value === 'productName' ? 'newProductName' : field.value,
                    label: field.value === 'productName' ? 'New Product Name' : `New ${field.label}`,
                    type: 'conditional-input',
                    dependsOn: 'updateFields',
                    dependsValue: field.value,
                    subtype: field.type,
                    step: field.step,
                    numeric: field.numeric,
                    placeholder: field.placeholder,
                    options: field.options,
                    value: field.value === 'manufacturer' ? '' : (field.type === 'use-contexts' ? (field.defaultValue || ['feed-base']) : (field.type === 'select' ? (field.options?.[0]?.value || '') : ''))
                }))
            ],
            'update-form-factor': [
                { type: 'section', label: 'Target Item / Barcode Lookup' },
                { name: 'productName', label: 'Parent Product Name (Optional)', type: 'text', fullWidth: true, placeholder: 'e.g., Enfamil Infant PWD (narrows lookup)' },
                { name: 'productCode', label: 'Current Item Number', type: 'text', placeholder: 'e.g., 174004' },
                { name: 'lookupBarcode', label: 'Or Current Container Barcode', type: 'text', placeholder: 'e.g., 00300871365025' },
                { name: 'updateItemFields', label: 'Item Fields to Update', type: 'checkbox-group', value: ['itemName', 'measurementVolume'],
                    options: UPDATE_ITEM_FIELD_DEFINITIONS.map(field => ({ value: field.value, label: field.label }))
                },
                ...UPDATE_ITEM_FIELD_DEFINITIONS.map(field => ({
                    name: field.value,
                    label: `New ${field.label}`,
                    type: 'conditional-input',
                    dependsOn: 'updateItemFields',
                    dependsValue: field.value,
                    subtype: field.type,
                    step: field.step,
                    numeric: field.numeric,
                    placeholder: field.placeholder,
                    options: field.options,
                    value: field.type === 'select' ? (field.options?.[0]?.value || '') : ''
                })),
                { type: 'section', label: 'Container / Form Factor Updates (Barcode, Type, Qty)' },
                { name: 'containerUpdates', label: 'Target Containers (Leaf, Outer, or By Current Barcode)', type: 'container-updates' }
            ],
            'add-form-factor': [
                { type: 'section', label: 'Product Identification' },
                { name: 'productName', label: 'Exact Product Name *', type: 'text', required: true, fullWidth: true },
                { type: 'section', label: 'New Packaging Hierarchy' },
                { name: 'hierarchy', label: 'Packaging Hierarchy (Outer Container at Top, Smallest Unit at Bottom)', type: 'packaging-hierarchy' }
            ],
            'add-manufacturer': [
                { type: 'section', label: 'Manufacturer Details' },
                { name: 'manufacturerName', label: 'Manufacturer Name (Max 20 chars) *', type: 'text', required: true, fullWidth: true, placeholder: 'e.g., Abbott' },
                { name: 'manufacturerDescription', label: 'Full Description *', type: 'text', required: true, fullWidth: true, placeholder: 'e.g., Abbott Nutrition' }
            ],
            'add-unit': [
                { type: 'section', label: 'Unit Identification' },
                { name: 'unitName', label: 'Unit Name *', type: 'text', required: true, fullWidth: true, placeholder: 'e.g., Timeless1NICU' },
                { name: 'unitADT', label: 'Unit ADT Reference *', type: 'text', required: true, fullWidth: true, placeholder: 'e.g., Timeless1NICU' },

                { type: 'section', label: 'Batch Settings' },
                { name: 'bmMaxVolume', label: 'Breastmilk Batch Max Volume', type: 'number', value: 0, numeric: true },
                { name: 'formulaMaxVolume', label: 'Formula Batch Max Volume', type: 'number', value: 900, numeric: true },
                { name: 'waterMaxVolume', label: 'Sterile Water Batch Max Volume', type: 'number', value: 900, numeric: true },

                { type: 'section', label: 'Prep Cycles & Settings' },
                { name: 'bmPrepCycle', label: 'Breastmilk Prep Cycle (Hours)', type: 'number', value: 24, numeric: true },
                { name: 'formulaPrepCycle', label: 'Formula Prep Cycle (Hours)', type: 'number', value: 24, numeric: true },
                { name: 'unitOrder', label: 'Unit Order', type: 'number', value: 1, numeric: true }
            ]
        };
        return fields[actionType] || [];
    }

    buildUseContextsWidget(defaultValues = ['feed-base'], currentUnit = 'ml') {
        const box = document.createElement('div');
        box.className = 'use-contexts-box';
        box.dataset.fieldName = 'useContexts';

        const checksRow = document.createElement('div');
        checksRow.className = 'use-context-checks';

        const activeList = Array.isArray(defaultValues) ? defaultValues : ['feed-base'];
        USE_CONTEXT_OPTIONS.forEach(opt => {
            const lbl = document.createElement('label');
            lbl.className = 'use-context-option';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'use-context-cb';
            cb.value = opt.value;
            cb.checked = activeList.includes(opt.value);
            cb.addEventListener('change', () => this.syncAdditiveContextPanel(box));

            const span = document.createElement('span');
            span.textContent = opt.label;
            lbl.append(cb, span);
            checksRow.appendChild(lbl);
        });

        const radioGroupName = `additiveMethod_${Math.random().toString(36).slice(2, 8)}`;
        const unitDisplay = formatUnitDisplayLabel(currentUnit);

        const additivePanel = document.createElement('div');
        additivePanel.className = `additive-context-panel${activeList.includes('additive') ? '' : ' hidden'}`;
        additivePanel.innerHTML = `
            <div class="additive-context-header">Additive Context Information :</div>
            <div class="additive-context-rows">
                <div class="additive-context-row">
                    <div class="additive-row-label">Measurement Method:</div>
                    <div class="additive-row-control">
                        <div class="additive-radio-list">
                            <label class="additive-radio-option">
                                <input type="radio" name="${radioGroupName}" data-field-name="additiveMethod" class="additive-method-radio" value="standard" checked>
                                <span class="standard-unit-label">Standard Units (${unitDisplay})</span>
                            </label>
                            <label class="additive-radio-option">
                                <input type="radio" name="${radioGroupName}" data-field-name="additiveMethod" class="additive-method-radio" value="custom">
                                <span>Custom Units</span>
                            </label>
                        </div>
                        <div class="additive-custom-fields hidden">
                            <label class="additive-custom-field">
                                <span>Measurement Unit</span>
                                <select class="input-field" data-field-name="additiveUnit">
                                    <option value="ml" ${currentUnit === 'ml' ? 'selected' : ''}>mL</option>
                                    <option value="g" ${currentUnit === 'g' ? 'selected' : ''}>g</option>
                                    <option value="oz" ${currentUnit === 'oz' ? 'selected' : ''}>oz</option>
                                </select>
                            </label>
                            <label class="additive-custom-field">
                                <span>Atomic Units / Unit</span>
                                <input type="number" step="any" class="input-field" data-field-name="atomicUnits" value="1">
                            </label>
                            <label class="additive-custom-field">
                                <span>Decimal Places</span>
                                <input type="number" min="0" max="4" class="input-field" data-field-name="decimalPlaces" value="${currentUnit === 'g' ? '1' : '0'}">
                            </label>
                        </div>
                    </div>
                </div>
                <div class="additive-context-row">
                    <div class="additive-row-label">Hours Until Expiry Once Prepared:</div>
                    <div class="additive-row-control">
                        <div class="additive-expiry-inline">
                            <div class="additive-expiry-input-wrap">
                                <input type="number" min="1" class="input-field" data-field-name="expirationPrepared" value="48">
                                <span class="additive-req-star">*</span>
                            </div>
                            <span class="additive-expiry-hint">This is the amount of time (in hours) that a container containing this product as an additive will expire.</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        additivePanel.querySelectorAll('.additive-method-radio').forEach(radio => {
            radio.addEventListener('change', () => this.syncAdditiveCustomFields(box));
        });

        box.append(checksRow, additivePanel);
        return box;
    }

    addHierarchyRow(container, isInner = false, prepend = false) {
        const row = document.createElement('div');
        row.className = `hierarchy-row manual-hierarchy-row${isInner ? ' is-smallest' : ''}`;

        const typeGroup = document.createElement('label');
        typeGroup.className = 'manual-hierarchy-field manual-hierarchy-container';
        const levelLabel = document.createElement('span');
        levelLabel.className = 'manual-hierarchy-level';
        typeGroup.appendChild(levelLabel);

        const typeSel = document.createElement('select');
        typeSel.className = 'hierarchy-type input-field';
        typeSel.setAttribute('aria-label', 'Container type');
        typeSel.innerHTML = CONTAINER_TYPE_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
        if (!isInner) typeSel.value = '4';

        typeGroup.appendChild(typeSel);

        const bcGroup = document.createElement('label');
        bcGroup.className = 'manual-hierarchy-field manual-hierarchy-barcode';
        const bcLabel = document.createElement('span');
        bcLabel.textContent = 'Barcode';
        bcGroup.appendChild(bcLabel);
        const bcIn = document.createElement('input');
        bcIn.type = 'text';
        bcIn.className = 'hierarchy-bc input-field';
        bcIn.placeholder = 'Barcode';
        bcIn.setAttribute('aria-label', 'Barcode');
        bcGroup.appendChild(bcIn);

        const qtyGroup = document.createElement('label');
        qtyGroup.className = 'manual-hierarchy-field manual-hierarchy-quantity';
        const qtyLabel = document.createElement('span');
        qtyLabel.textContent = 'Quantity';
        qtyGroup.appendChild(qtyLabel);
        const qtyIn = document.createElement('input');
        qtyIn.type = 'number';
        qtyIn.className = 'hierarchy-qty input-field';
        qtyIn.placeholder = 'Qty';
        qtyIn.value = isInner ? '1' : '';
        qtyIn.setAttribute('aria-label', 'Quantity');
        qtyGroup.appendChild(qtyIn);

        const volGroup = document.createElement('label');
        volGroup.className = 'manual-hierarchy-field manual-hierarchy-volume';
        const volLabel = document.createElement('span');
        volLabel.textContent = 'Volume';
        volGroup.appendChild(volLabel);
        const volIn = document.createElement('input');
        volIn.type = 'number';
        volIn.step = 'any';
        volIn.className = 'hierarchy-vol input-field';
        volIn.placeholder = 'Vol';
        volIn.setAttribute('aria-label', 'Volume');
        volGroup.appendChild(volIn);

        row.append(typeGroup, bcGroup, qtyGroup, volGroup);

        if (!isInner) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'manual-hierarchy-remove';
            removeBtn.innerHTML = '×';
            removeBtn.title = 'Remove container';
            removeBtn.setAttribute('aria-label', 'Remove container');
            removeBtn.onclick = () => {
                row.remove();
                this.updateHierarchyRowLabels(container);
            };
            row.appendChild(removeBtn);
        }

        if (prepend) container.insertBefore(row, container.firstChild);
        else container.appendChild(row);
        this.updateHierarchyRowLabels(container);
    }

    updateHierarchyRowLabels(container) {
        const rows = Array.from(container.querySelectorAll('.manual-hierarchy-row'));
        rows.forEach((row, index) => {
            const isOuter = rows.length > 1 && index === 0;
            const isSmallest = index === rows.length - 1;
            row.classList.toggle('is-outer', isOuter);
            row.classList.toggle('is-nested', !isOuter && !isSmallest);
            row.classList.toggle('is-smallest', isSmallest);
            row.querySelector('.manual-hierarchy-level').textContent = isOuter
                ? 'Outer Container'
                : isSmallest
                    ? 'Smallest Unit'
                    : 'Nested Container';
        });
    }

    addContainerUpdateRow(container, preset = {}) {
        const row = document.createElement('div');
        row.className = 'container-update-row';

        const targetGroup = document.createElement('label');
        targetGroup.className = 'manual-hierarchy-field';
        targetGroup.innerHTML = '<span>Target Container</span>';
        const targetSel = document.createElement('select');
        targetSel.className = 'cu-target input-field';
        targetSel.innerHTML = `
            <option value="leaf">Leaf Container (Smallest Unit)</option>
            <option value="outer">Outer Container (Case/Carton)</option>
            <option value="by-barcode">Match by Current Barcode</option>
        `;
        targetSel.value = preset.target || 'leaf';
        targetGroup.appendChild(targetSel);

        const curBcGroup = document.createElement('label');
        curBcGroup.className = 'manual-hierarchy-field';
        curBcGroup.innerHTML = '<span>Current Barcode (if matching)</span>';
        const curBcIn = document.createElement('input');
        curBcIn.type = 'text';
        curBcIn.className = 'cu-current-bc input-field';
        curBcIn.placeholder = 'Optional for Leaf';
        curBcIn.value = preset.currentBarcode || '';
        curBcGroup.appendChild(curBcIn);

        const newTypeGroup = document.createElement('label');
        newTypeGroup.className = 'manual-hierarchy-field';
        newTypeGroup.innerHTML = '<span>New Container Type</span>';
        const newTypeSel = document.createElement('select');
        newTypeSel.className = 'cu-new-type input-field';
        newTypeSel.innerHTML = `<option value="">Keep Current Type</option>` +
            CONTAINER_TYPE_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
        newTypeSel.value = preset.newContainerType || '';
        newTypeGroup.appendChild(newTypeSel);

        const newQtyGroup = document.createElement('label');
        newQtyGroup.className = 'manual-hierarchy-field';
        newQtyGroup.innerHTML = '<span>New Unit Qty</span>';
        const newQtyIn = document.createElement('input');
        newQtyIn.type = 'number';
        newQtyIn.className = 'cu-new-qty input-field';
        newQtyIn.placeholder = 'Keep current';
        newQtyIn.value = preset.newQuantity !== undefined && preset.newQuantity !== null ? preset.newQuantity : '';
        newQtyGroup.appendChild(newQtyIn);

        const newBcGroup = document.createElement('label');
        newBcGroup.className = 'manual-hierarchy-field cu-span-2';
        newBcGroup.innerHTML = '<span>New Barcode</span>';
        const newBcIn = document.createElement('input');
        newBcIn.type = 'text';
        newBcIn.className = 'cu-new-bc input-field';
        newBcIn.placeholder = 'Leave blank to keep existing barcode';
        newBcIn.value = preset.newBarcode || '';
        newBcGroup.appendChild(newBcIn);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'manual-hierarchy-remove';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove container update';
        removeBtn.onclick = () => {
            row.remove();
            this.saveProgress();
        };

        targetSel.addEventListener('change', () => {
            curBcIn.placeholder = targetSel.value === 'by-barcode' ? 'Required current barcode' : 'Optional for Leaf';
        });

        row.append(targetGroup, curBcGroup, removeBtn, newTypeGroup, newQtyGroup, newBcGroup);
        container.appendChild(row);
    }

    createFormField(field) {
        if (field.type === 'section') {
            const heading = document.createElement('h4');
            heading.className = 'form-section-title';
            heading.textContent = field.label;
            return heading;
        }

        const group = document.createElement('div');
        group.className = 'product-form-group';
        if (field.fullWidth || field.type === 'checkbox-group' || field.type === 'container-updates' || field.type === 'use-contexts') {
            group.classList.add('full-width');
        }

        if (field.type !== 'checkbox-group') {
            const label = document.createElement('label');
            label.textContent = field.label;
            group.appendChild(label);
        }

        if (field.type === 'use-contexts') {
            const currentUnit = document.querySelector('#productFormFields [data-field-name="measurementUnit"]')?.value || 'ml';
            group.appendChild(this.buildUseContextsWidget(field.value || ['feed-base'], currentUnit));
            return group;
        }

        if (field.type === 'select') {
            const select = document.createElement('select');
            select.dataset.fieldName = field.name;
            if (field.required) select.required = true;

            if (field.placeholder) {
                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = field.placeholder;
                placeholder.disabled = true;
                placeholder.selected = true;
                select.appendChild(placeholder);
            }

            field.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                if (field.value === opt.value) option.selected = true;
                select.appendChild(option);
            });

            group.appendChild(select);

            if (field.name === 'manufacturer') {
                const otherGroup = document.createElement('div');
                otherGroup.className = 'manufacturer-other-field hidden';
                const otherInput = document.createElement('input');
                otherInput.type = 'text';
                otherInput.dataset.fieldName = 'manufacturerOther';
                otherInput.placeholder = 'Enter manufacturer name';
                otherInput.autocomplete = 'organization';
                otherGroup.appendChild(otherInput);
                group.appendChild(otherGroup);

                select.addEventListener('change', () => {
                    otherGroup.classList.toggle('hidden', select.value !== '__other__');
                    if (select.value !== '__other__') otherInput.value = '';
                });
            }

            return group;
        }

        if (field.type === 'checkbox-group') {
            const checkboxWrap = document.createElement('div');
            checkboxWrap.className = 'update-button-group';
            checkboxWrap.dataset.fieldName = field.name;

            const selectedValues = Array.isArray(field.value) ? field.value : [];

            field.options.forEach(opt => {
                const row = document.createElement('label');
                row.className = 'update-toggle-btn';

                const isChecked = selectedValues.includes(opt.value);
                if (isChecked) row.classList.add('selected');

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'field-checkbox';
                checkbox.dataset.fieldValue = opt.value;
                checkbox.checked = isChecked;

                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) row.classList.add('selected');
                    else row.classList.remove('selected');
                });

                const textSpan = document.createElement('span');
                textSpan.className = 'btn-text';
                textSpan.textContent = opt.label;

                row.appendChild(checkbox);
                row.appendChild(textSpan);
                checkboxWrap.appendChild(row);
            });

            group.appendChild(checkboxWrap);
            return group;
        }

        if (field.type === 'conditional-input') {
            const wrapper = document.createElement('div');
            wrapper.className = 'product-form-group conditional-field hidden';
            wrapper.dataset.fieldName = field.name;
            wrapper.dataset.dependsOn = field.dependsOn;
            wrapper.dataset.dependsValue = field.dependsValue;

            const labelEl = document.createElement('label');
            labelEl.textContent = field.label;
            wrapper.appendChild(labelEl);

            if (field.subtype === 'use-contexts') {
                const currentUnit = document.querySelector('#productFormFields [data-field-name="measurementUnit"]')?.value || 'ml';
                wrapper.appendChild(this.buildUseContextsWidget(field.value || ['feed-base'], currentUnit));
                return wrapper;
            }

            if (field.subtype === 'select') {
                const select = document.createElement('select');
                select.dataset.fieldName = field.name;
                if (field.required) select.required = true;
                if (field.placeholder) {
                    const placeholder = document.createElement('option');
                    placeholder.value = '';
                    placeholder.textContent = field.placeholder;
                    placeholder.disabled = true;
                    placeholder.selected = true;
                    select.appendChild(placeholder);
                }
                field.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    if (field.value === opt.value) option.selected = true;
                    select.appendChild(option);
                });
                wrapper.appendChild(select);

                if (field.name === 'manufacturer') {
                    const otherGroup = document.createElement('div');
                    otherGroup.className = 'manufacturer-other-field hidden';

                    const otherInput = document.createElement('input');
                    otherInput.type = 'text';
                    otherInput.dataset.fieldName = 'manufacturerOther';
                    otherInput.placeholder = 'Enter manufacturer name';
                    otherInput.autocomplete = 'organization';
                    otherGroup.appendChild(otherInput);
                    wrapper.appendChild(otherGroup);

                    select.addEventListener('change', () => {
                        otherGroup.classList.toggle('hidden', select.value !== '__other__');
                        if (select.value !== '__other__') otherInput.value = '';
                    });
                }
            } else {
                const input = document.createElement('input');
                input.type = field.subtype || 'text';
                input.dataset.fieldName = field.name;
                if (field.placeholder) input.placeholder = field.placeholder;
                if (field.value !== undefined) input.value = field.value;
                if (field.step) input.step = field.step;
                if (field.required) input.required = true;
                wrapper.appendChild(input);
            }

            return wrapper;
        }

        if (field.type === 'packaging-hierarchy') {
            const wrapper = document.createElement('div');
            wrapper.className = 'product-form-group full-width';
            wrapper.dataset.fieldName = field.name;

            const labelEl = document.createElement('label');
            labelEl.textContent = field.label;
            wrapper.appendChild(labelEl);

            const listContainer = document.createElement('div');
            listContainer.className = 'hierarchy-list';
            listContainer.style.display = 'flex';
            listContainer.style.flexDirection = 'column';
            listContainer.style.gap = '8px';
            listContainer.style.marginBottom = '12px';

            wrapper.appendChild(listContainer);

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'btn btn-secondary btn-small';
            addBtn.innerHTML = '+ Add Outer Container at Top';
            addBtn.style.width = '100%';
            addBtn.onclick = () => this.addHierarchyRow(listContainer, false, true);

            wrapper.appendChild(addBtn);
            this.addHierarchyRow(listContainer, true);

            return wrapper;
        }

        if (field.type === 'container-updates') {
            group.dataset.fieldName = field.name;

            const listContainer = document.createElement('div');
            listContainer.className = 'container-updates-list';
            listContainer.style.display = 'flex';
            listContainer.style.flexDirection = 'column';
            listContainer.style.gap = '10px';
            listContainer.style.marginBottom = '10px';

            group.appendChild(listContainer);

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'btn btn-secondary btn-small';
            addBtn.innerHTML = '+ Add Container Update';
            addBtn.style.width = '100%';
            addBtn.onclick = () => {
                this.addContainerUpdateRow(listContainer);
                this.saveProgress();
            };

            group.appendChild(addBtn);
            return group;
        }

        const input = document.createElement('input');
        input.type = field.type || 'text';
        input.dataset.fieldName = field.name;
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.value !== undefined) input.value = field.value;
        if (field.step) input.step = field.step;
        if (field.required) input.required = true;

        group.appendChild(input);
        return group;
    }

    addProduct() {
        const actionType = document.getElementById('actionType').value;
        if (!actionType) {
            this.showStatus('Select an action first', 'error');
            return;
        }

        const product = this.collectFormData();
        if (!product) return;

        this.currentAction = actionType;
        this.products.push({ action: actionType, ...product });
        this.renderProductsTable();
        this.resetForm();
        this.saveProgress();
        this.showStatus('Product added!', 'success');
    }

    syncConditionalFieldVisibility() {
        const actionType = document.getElementById('actionType').value;
        const groupName = actionType === 'update-form-factor' ? 'updateItemFields' : 'updateFields';
        const checkboxGroup = document.querySelector(`#productFormFields [data-field-name="${groupName}"]`);
        if (!checkboxGroup) return;

        const checkedValues = Array.from(checkboxGroup.querySelectorAll('.field-checkbox:checked'))
            .map(el => el.dataset.fieldValue)
            .filter(Boolean);
        const editorPanel = document.querySelector('#productFormFields .update-editor-panel');
        if (!editorPanel) return;

        const selectedFields = this.getFormFields(actionType)
            .filter(field => field.type === 'conditional-input' && checkedValues.includes(field.dependsValue));
        const selectedNames = new Set(selectedFields.map(field => field.name));

        editorPanel.querySelectorAll('.conditional-field').forEach(element => {
            if (!selectedNames.has(element.dataset.fieldName)) element.remove();
        });

        selectedFields.forEach(field => {
            let element = editorPanel.querySelector(`.conditional-field[data-field-name="${field.name}"]`);
            if (!element) {
                element = this.createFormField(field);
                editorPanel.appendChild(element);
            }
            element.classList.remove('hidden');
            element.querySelectorAll('input, select').forEach(ctrl => { ctrl.disabled = false; });
        });
    }

    collectUseContextsData(containerEl) {
        const ucBox = containerEl.querySelector('.use-contexts-box');
        if (!ucBox) return null;

        const contexts = Array.from(ucBox.querySelectorAll('.use-context-cb:checked')).map(cb => cb.value);
        const mainUom = containerEl.querySelector('[data-field-name="measurementUnit"]')?.value || 'ml';
        const additiveMethod = ucBox.querySelector('.additive-method-radio:checked')?.value || 'standard';

        const additiveUnit = additiveMethod === 'custom'
            ? (ucBox.querySelector('[data-field-name="additiveUnit"]')?.value || mainUom)
            : mainUom;
        const atomicUnits = additiveMethod === 'custom'
            ? (parseFloat(ucBox.querySelector('[data-field-name="atomicUnits"]')?.value) || 1)
            : 1;
        const decimalPlaces = additiveMethod === 'custom'
            ? (parseInt(ucBox.querySelector('[data-field-name="decimalPlaces"]')?.value, 10) || 0)
            : (mainUom === 'g' ? 1 : 0);

        const rawExpPrep = ucBox.querySelector('[data-field-name="expirationPrepared"]')?.value;
        const expirationPrepared = contexts.includes('additive')
            ? (parseFloat(rawExpPrep) || 0)
            : 0;

        return {
            useContexts: contexts,
            additiveMethod,
            additiveUnit,
            atomicUnits,
            decimalPlaces,
            expirationPrepared
        };
    }

    collectFormData() {
        const actionType = document.getElementById('actionType').value;
        const fieldDefs = this.getFormFields(actionType).filter(f => f.type !== 'section');
        const data = {};

        fieldDefs.forEach(field => {
            if (field.type === 'use-contexts') {
                const ucData = this.collectUseContextsData(document.getElementById('productFormFields'));
                if (ucData) Object.assign(data, ucData);
                return;
            }

            if (field.type === 'checkbox-group') {
                const selectedValues = Array.from(document.querySelectorAll(`#productFormFields [data-field-name="${field.name}"] .field-checkbox:checked`))
                    .map(el => el.dataset.fieldValue)
                    .filter(Boolean);
                data[field.name] = selectedValues;
                return;
            }

            if (field.type === 'conditional-input') {
                const checkboxGroup = document.querySelector(`#productFormFields [data-field-name="${field.dependsOn}"]`);
                const selectedValues = Array.from(checkboxGroup ? checkboxGroup.querySelectorAll('.field-checkbox:checked') : [])
                    .map(el => el.dataset.fieldValue)
                    .filter(Boolean);
                if (!selectedValues.includes(field.dependsValue)) {
                    if (field.subtype !== 'use-contexts') {
                        data[field.name] = '';
                    }
                    return;
                }
                if (field.subtype === 'use-contexts') {
                    const ucData = this.collectUseContextsData(document.getElementById('productFormFields'));
                    if (ucData) Object.assign(data, ucData);
                    return;
                }
            }

            if (field.type === 'packaging-hierarchy') {
                const rows = document.querySelectorAll(`#productFormFields [data-field-name="${field.name}"] .hierarchy-row`);
                const hierarchy = [];
                rows.forEach((row, index) => {
                    hierarchy.push({
                        containerId: row.querySelector('.hierarchy-type').value,
                        barcode: row.querySelector('.hierarchy-bc').value.trim(),
                        quantity: parseInt(row.querySelector('.hierarchy-qty').value) || (index === rows.length - 1 ? 1 : 0),
                        volume: parseFloat(row.querySelector('.hierarchy-vol').value) || 0
                    });
                });
                data[field.name] = hierarchy.reverse();
                return;
            }

            if (field.type === 'container-updates') {
                const rows = document.querySelectorAll(`#productFormFields [data-field-name="${field.name}"] .container-update-row`);
                const updates = [];
                rows.forEach(row => {
                    const target = row.querySelector('.cu-target')?.value || 'leaf';
                    const currentBarcode = (row.querySelector('.cu-current-bc')?.value || '').trim();
                    const newContainerType = row.querySelector('.cu-new-type')?.value || '';
                    const newBarcode = (row.querySelector('.cu-new-bc')?.value || '').trim();
                    const rawQty = (row.querySelector('.cu-new-qty')?.value || '').trim();
                    const newQuantity = rawQty !== '' ? (parseInt(rawQty, 10) || 0) : '';

                    if (newContainerType || newBarcode || newQuantity !== '') {
                        updates.push({ target, currentBarcode, newContainerType, newBarcode, newQuantity });
                    }
                });
                data[field.name] = updates;
                return;
            }

            const fieldElement = document.querySelector(`#productFormFields [data-field-name="${field.name}"]`);
            const el = fieldElement && /^(INPUT|SELECT)$/.test(fieldElement.tagName)
                ? fieldElement
                : fieldElement?.querySelector('input, select');
            const raw = el ? el.value : '';
            if (field.name === 'manufacturer' && raw === '__other__') {
                const otherInput = fieldElement?.closest('.product-form-group')?.querySelector('[data-field-name="manufacturerOther"]')
                    || fieldElement?.querySelector('[data-field-name="manufacturerOther"]');
                data[field.name] = otherInput ? otherInput.value.trim() : '';
            } else {
                data[field.name] = field.numeric ? (parseFloat(raw) || 0) : raw;
            }
        });

        // Validation rules per action type
        if (actionType === 'update-form-factor') {
            const hasContainerBarcodeLookup = Array.isArray(data.containerUpdates) && data.containerUpdates.some(cu => cu.currentBarcode);
            if (!data.productCode && !data.lookupBarcode && !data.productName && !hasContainerBarcodeLookup) {
                this.showStatus('Enter a Current Item Number, Container Barcode, or Product Name to locate the item.', 'error');
                return null;
            }

            if (Array.isArray(data.containerUpdates)) {
                const missingByBarcode = data.containerUpdates.find(cu => cu.target === 'by-barcode' && !cu.currentBarcode);
                if (missingByBarcode) {
                    this.showStatus('Enter the Current Barcode when targeting "Match by Current Barcode".', 'error');
                    return null;
                }
            }

            const hasItemUpdates = Array.isArray(data.updateItemFields) && data.updateItemFields.length > 0;
            const hasContainerUpdates = Array.isArray(data.containerUpdates) && data.containerUpdates.length > 0;
            if (!hasItemUpdates && !hasContainerUpdates) {
                this.showStatus('Select at least one item field to update or add a container update.', 'error');
                return null;
            }

            if (hasItemUpdates && data.updateItemFields.includes('newProductCode') && !data.newProductCode) {
                this.showStatus('Enter the New Item Number.', 'error');
                return null;
            }
            if (hasItemUpdates && data.updateItemFields.includes('itemName') && !data.itemName) {
                this.showStatus('Enter the New Item Name.', 'error');
                return null;
            }
            return data;
        }

        if (actionType !== 'add-manufacturer' && actionType !== 'add-unit' && !data.productName) {
            this.showStatus('Display Name is required', 'error');
            return null;
        }

        if (actionType === 'create') {
            if (!Array.isArray(data.useContexts) || data.useContexts.length === 0) {
                this.showStatus('Select at least one Use Context (Additive or Feed Base).', 'error');
                return null;
            }
            if (data.useContexts.includes('additive') && (!data.expirationPrepared || data.expirationPrepared <= 0)) {
                this.showStatus('Enter Hours Until Expiry Once Prepared for Additive products.', 'error');
                return null;
            }
        }

        if (actionType === 'add-manufacturer' && !data.manufacturerName) {
            this.showStatus('Manufacturer Name is required', 'error');
            return null;
        }

        if (actionType === 'add-unit' && !data.unitName) {
            this.showStatus('Unit Name is required', 'error');
            return null;
        }

        if (actionType === 'update' && (!Array.isArray(data.updateFields) || data.updateFields.length === 0)) {
            this.showStatus('Select at least one field to update.', 'error');
            return null;
        }

        if (actionType === 'update' && data.updateFields.includes('useContexts')) {
            if (!Array.isArray(data.useContexts) || data.useContexts.length === 0) {
                this.showStatus('Select at least one Use Context (Additive or Feed Base).', 'error');
                return null;
            }
            if (data.useContexts.includes('additive') && (!data.expirationPrepared || data.expirationPrepared <= 0)) {
                this.showStatus('Enter Hours Until Expiry Once Prepared for Additive products.', 'error');
                return null;
            }
        }

        if (actionType === 'update' && data.updateFields.includes('productName') && !data.newProductName) {
            this.showStatus('Enter the new product name before saving the update.', 'error');
            return null;
        }

        if (actionType === 'update' && data.updateFields.includes('manufacturer') && !data.manufacturer) {
            this.showStatus('Select a manufacturer or enter a name for Other.', 'error');
            return null;
        }

        return data;
    }

    resetForm() {
        const actionType = document.getElementById('actionType').value;
        const fieldDefs = this.getFormFields(actionType);

        fieldDefs.forEach(field => {
            if (field.type === 'section') return;

            if (field.type === 'use-contexts') {
                const ucBox = document.querySelector('#productFormFields .use-contexts-box');
                if (!ucBox) return;
                const defaults = Array.isArray(field.value) ? field.value : ['feed-base'];
                ucBox.querySelectorAll('.use-context-cb').forEach(cb => {
                    cb.checked = defaults.includes(cb.value);
                });
                const stdRadio = ucBox.querySelector('.additive-method-radio[value="standard"]');
                if (stdRadio) stdRadio.checked = true;
                const stdLbl = ucBox.querySelector('.standard-unit-label');
                if (stdLbl) stdLbl.textContent = 'Standard Units (mL)';
                const addUnitSel = ucBox.querySelector('[data-field-name="additiveUnit"]');
                const atomicInput = ucBox.querySelector('[data-field-name="atomicUnits"]');
                const decInput = ucBox.querySelector('[data-field-name="decimalPlaces"]');
                const expPrepInput = ucBox.querySelector('[data-field-name="expirationPrepared"]');
                if (addUnitSel) addUnitSel.value = 'ml';
                if (atomicInput) atomicInput.value = '1';
                if (decInput) decInput.value = '0';
                if (expPrepInput) expPrepInput.value = '48';
                this.syncAdditiveCustomFields(ucBox);
                this.syncAdditiveContextPanel(ucBox);
                return;
            }

            if (field.type === 'checkbox-group') {
                const checkboxGroup = document.querySelector(`#productFormFields [data-field-name="${field.name}"]`);
                if (!checkboxGroup) return;
                const selectedValues = Array.isArray(field.value) ? field.value : [];
                checkboxGroup.querySelectorAll('.field-checkbox').forEach(checkbox => {
                    const checked = selectedValues.includes(checkbox.dataset.fieldValue);
                    checkbox.checked = checked;
                    checkbox.closest('.update-toggle-btn')?.classList.toggle('selected', checked);
                });
                return;
            }

            if (field.type === 'conditional-input') {
                const el = document.querySelector(`#productFormFields [data-field-name="${field.name}"]`);
                if (!el) return;
                el.remove();
                return;
            }

            if (field.type === 'packaging-hierarchy') {
                const listContainer = document.querySelector(`#productFormFields [data-field-name="${field.name}"] .hierarchy-list`);
                if (listContainer) {
                    listContainer.innerHTML = '';
                    this.addHierarchyRow(listContainer, true);
                }
                return;
            }

            if (field.type === 'container-updates') {
                const listContainer = document.querySelector(`#productFormFields [data-field-name="${field.name}"] .container-updates-list`);
                if (listContainer) {
                    listContainer.innerHTML = '';
                }
                return;
            }

            const el = document.querySelector(`#productFormFields [data-field-name="${field.name}"]`);
            if (!el) return;
            el.value = field.value !== undefined ? field.value : '';
            if (field.name === 'manufacturer') el.dispatchEvent(new Event('change', { bubbles: true }));
        });

        this.syncConditionalFieldVisibility();
    }

    renderProductsTable() {
        const tbody = document.getElementById('productsTableBody');
        const generateBtn = document.getElementById('generateSeederBtn');
        const clearBtn = document.getElementById('clearAllBtn');

        if (this.products.length === 0) {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="4" style="text-align:center; padding:40px; color:#94a3b8;">No products in batch.</td></tr>';
            if (clearBtn) clearBtn.style.display = 'none';
            if (generateBtn) generateBtn.style.display = 'none';
            document.querySelector('.product-count').textContent = '0';
            return;
        }

        tbody.innerHTML = this.products.map((p, idx) => {
            const title = p.productName || p.itemName || p.manufacturerName || p.unitName || (p.productCode ? `Item #${p.productCode}` : `Barcode ${p.lookupBarcode || ''}`);
            let detailsHtml = '';

            if (p.action === 'update-form-factor') {
                const cuCount = Array.isArray(p.containerUpdates) ? p.containerUpdates.length : 0;
                detailsHtml = `
                    ${p.productCode ? `Item #: ${p.productCode}<br>` : ''}
                    ${p.lookupBarcode ? `Lookup BC: ${p.lookupBarcode}<br>` : ''}
                    ${p.updateItemFields && p.updateItemFields.length ? `Item Fields: ${p.updateItemFields.join(', ')}<br>` : ''}
                    ${cuCount > 0 ? `Containers: ${cuCount} update(s)` : ''}
                `;
            } else {
                const contexts = (p.action === 'create' || (p.updateFields && (p.updateFields.includes('useContexts') || p.updateFields.includes('productUse'))))
                    ? formatUseContextsSummary(normalizeProductUseContexts(p))
                    : '';
                detailsHtml = `
                    ${p.productCode ? `Item #: ${p.productCode}<br>` : ''}
                    ${contexts ? `Use: ${contexts}<br>` : ''}
                    ${p.updateFields ? `Fields: ${p.updateFields.join(', ')}<br>` : ''}
                    ${p.measurementVolume ? `Vol: ${p.measurementVolume} ${p.measurementUnit || 'mL'}` : ''}
                `;
            }

            return `
            <tr>
                <td><span class="product-action-badge ${p.action}">${p.action}</span></td>
                <td><strong>${title}</strong></td>
                <td class="product-details-cell">${detailsHtml}</td>
                <td>
                    <div class="product-row-actions">
                        <button class="preview-link-btn preview-product-btn" data-index="${idx}" title="View Details">Preview</button>
                        <button class="action-icon-btn remove-product-btn" data-index="${idx}" title="Remove">×</button>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

        if (clearBtn) clearBtn.style.display = 'inline-block';
        if (generateBtn) generateBtn.style.display = 'inline-flex';
        document.querySelector('.product-count').textContent = this.products.length;
    }

    refreshApiGrid() {
        const tbody = document.getElementById('apiResultsBody');
        const searchInput = (document.getElementById('apiSearchInput').value || '').toLowerCase().trim();

        if (!apiService.cachedProducts || apiService.cachedProducts.length === 0) return;

        const filtered = apiService.cachedProducts.filter(p => {
            if (!searchInput) return true;
            return (p.FamilyName || '').toLowerCase().includes(searchInput) ||
                   (p.ItemNumber || '').toLowerCase().includes(searchInput) ||
                   (p.PrimaryBarcode || '').toLowerCase().includes(searchInput);
        }).slice(0, 50);

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr class="empty-state"><td colspan="3" style="text-align:center; padding:40px; color:#94a3b8;">No matching products found.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(p => {
            const isChecked = this.products.some(prod => prod.apiItemId === p.ItemID.toString()) ? 'checked' : '';
            const cleanFamilyName = (p.FamilyName || 'Unnamed Product').replace(/[®™©]/g, '').trim();

            return `
            <tr>
                <td style="text-align: center;">
                    <input type="checkbox" class="api-product-cb" value="${p.ItemID}" data-name="${cleanFamilyName}" ${isChecked}>
                </td>
                <td>
                    <strong style="color: #0f172a;">${cleanFamilyName}</strong><br>
                    <span style="font-size: 11px; color: #64748b;">Item #: ${p.ItemNumber || 'N/A'} | Type: ${p.FormType || 'N/A'}</span>
                </td>
                <td style="font-size: 12px; color: #475569;">
                    ${p.PrimaryPackage ? `Inner: ${p.PrimaryPackage} (${p.PrimaryBarcode})<br>` : ''}
                    ${p.Calorie ? `Calories: ${p.Calorie}` : ''}
                </td>
            </tr>
            `;
        }).join('');
    }

    removeProduct(index) {
        this.products.splice(index, 1);
        this.renderProductsTable();
        this.saveProgress();
        this.showStatus('Product removed', 'success');
    }

    clearAllProducts() {
        if (confirm('Clear all products?')) {
            this.products = [];
            this.renderProductsTable();
            this.saveProgress();
            this.showStatus('All products cleared', 'success');
        }
    }

    switchFormTab(tabName) {
        document.querySelectorAll('.form-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
        document.querySelectorAll('.form-tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
        this.saveProgress();
    }

    async handleCsvUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const csvProducts = await csvHandler.parseFile(file);
            if (!csvProducts.every(p => p.action)) {
                this.showStatus('CSV error: All products must have an "action" column', 'error');
                return;
            }

            if (csvProducts.length > 0) this.currentAction = csvProducts[0].action;

            this.products = csvProducts;
            this.renderProductsTable();
            this.saveProgress();
            this.showStatus(`${csvProducts.length} products loaded`, 'success');
        } catch (error) {
            this.showStatus(`CSV Error: ${error.message}`, 'error');
        }
    }

    generateSeeder() {
        if (this.products.length === 0) {
            this.showStatus('Add at least one product', 'error');
            return;
        }

        const currentNum = parseInt(document.getElementById('nextSeederNum').value, 10);
        if (!currentNum || isNaN(currentNum)) {
            this.showStatus('Please enter a valid Next Seeder Number', 'error');
            document.getElementById('nextSeederNum').focus();
            return;
        }

        this.seederNumber = currentNum;

        this.lastSeederConfig = {
            seederNumber: this.seederNumber,
            quarter: this.buildInfo ? this.buildInfo.quarter : 'Q4',
            actionType: this.currentAction,
            products: this.products,
            buildInfo: this.buildInfo
        };

        const tabs = document.querySelectorAll('.output-tab');
        if (tabs.length > 0) {
            tabs.forEach(btn => {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            });
            document.querySelector('.output-tab[data-format="php-v7"]').classList.remove('btn-secondary');
            document.querySelector('.output-tab[data-format="php-v7"]').classList.add('btn-primary');
        }

        this.switchOutputFormat('php-v7');
        this.showOutput(true);
    }

    switchOutputFormat(format) {
        if (!this.lastSeederConfig) return;

        try {
            if (format === 'sql-v6') {
                this.generatedSeeder = window.SeederTemplates.SQL_V6(this.lastSeederConfig.products);
            } else if (format === 'sql-v7') {
                this.generatedSeeder = window.SeederTemplates.SQL_V7(this.lastSeederConfig.products);
            } else {
                const className = `DATA${this.lastSeederConfig.seederNumber}`;
                this.generatedSeeder = window.SeederTemplates.Q3(className, this.lastSeederConfig.products, this.lastSeederConfig.actionType, this.lastSeederConfig.buildInfo);
            }
            document.getElementById('seederPreview').textContent = this.generatedSeeder;

            const autoWriteWrapper = document.getElementById('autoWriteWrapper');
            const outputAutoWrite = document.getElementById('outputAutoWrite');
            const outputDownload = document.getElementById('outputDownload');

            if (format.startsWith('sql')) {
                if (autoWriteWrapper) autoWriteWrapper.style.display = 'none';
                if (outputAutoWrite && outputAutoWrite.checked && outputDownload) {
                    outputDownload.checked = true;
                }
            } else {
                if (this.seedersDirHandle && autoWriteWrapper) {
                    autoWriteWrapper.style.display = 'flex';
                }
            }

        } catch (error) {
            this.showStatus(`Conversion error: ${error.message}`, 'error');
        }
    }

    showOutput(show) {
        if (show) {
            this.goToStep(3);

            if (this.seedersDirHandle) {
                document.getElementById('autoWriteWrapper').style.display = 'flex';
                document.getElementById('outputAutoWrite').checked = true;
            } else {
                document.getElementById('autoWriteWrapper').style.display = 'none';
                document.getElementById('outputDownload').checked = true;
            }
        } else {
            this.goToStep(2);
        }
    }

    async executeOutput() {
        const method = document.querySelector('input[name="output"]:checked').value;

        const activeTab = document.querySelector('.output-tab.btn-primary');
        const format = activeTab ? activeTab.dataset.format : 'php-v7';
        const extension = format.startsWith('sql') ? 'sql' : 'php';

        const fileName = `DATA${this.seederNumber}.${extension}`;

        if (method === 'download') {
            this.downloadSeeder(fileName);
        } else if (method === 'copy') {
            this.copyToClipboard();
        } else if (method === 'auto-write') {
            await this.autoWriteSeeder(fileName);
        }
    }

    async autoWriteSeeder(fileName) {
        try {
            this.showStatus('Writing file...', 'info');
            await fsAccessManager.writeSeederFile(this.seedersDirHandle, fileName, this.generatedSeeder);

            this.seederNumber++;
            this.updateSeederNumberDisplay(this.seederNumber, 'auto-detected');
            this.saveProgress();

            this.showSuccessModal('Seeder Written!', `${fileName} was written directly to the seeders folder.`);
        } catch (error) {
            console.error(error);
            this.showStatus(`Auto-Write failed: ${error.message}`, 'error');
        }
    }

    downloadSeeder(fileName) {
        const blob = new Blob([this.generatedSeeder], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);

        this.seederNumber++;
        this.updateSeederNumberDisplay(this.seederNumber, this.seedersDirHandle ? 'verified' : 'saved');
        this.saveProgress();
        this.showSuccessModal('Seeder Generated!', `${fileName} downloaded successfully.`);
    }

    copyToClipboard() {
        navigator.clipboard.writeText(this.generatedSeeder).then(() => {
            this.seederNumber++;
            this.updateSeederNumberDisplay(this.seederNumber, this.seedersDirHandle ? 'verified' : 'saved');
            this.saveProgress();
            this.showSuccessModal('Copied!', 'Seeder code copied to clipboard.');
        }).catch(() => {
            this.showStatus('Copy failed', 'error');
        });
    }

    showSuccessModal(title, message) {
        document.getElementById('successTitle').textContent = title;
        document.getElementById('successMessage').textContent = message;
        document.getElementById('successModal').classList.remove('hidden');
    }

    goToStep(step) {
        if (step === 2 && !this.buildInfo) {
            this.showStatus('Detect a build target first', 'error');
            return;
        }

        this.currentStep = step;
        this.updateStepIndicator();
        this.showStep(step);
        this.saveProgress();
    }

    updateStepIndicator() {
        document.querySelectorAll('.step').forEach(step => {
            const num = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');
            if (num === this.currentStep) step.classList.add('active');
            else if (num < this.currentStep) step.classList.add('completed');
        });
    }

    showStep(num) {
        document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
        document.getElementById(`step-${num}`).classList.add('active');
    }

    rememberBuild() {
        if (!this.buildInfo) return;
        const favorites = JSON.parse(localStorage.getItem('seederFavorites') || '[]');
        const favorite = {
            clientName: this.buildInfo.clientName,
            version: this.buildInfo.version,
            quarter: this.buildInfo.quarter,
            hostname: this.buildInfo.hostname,
            buildPath: this.buildInfo.buildPath,
            timestamp: new Date().toISOString()
        };

        const existingIndex = favorites.findIndex(f => f.buildPath === favorite.buildPath);
        if (existingIndex >= 0) favorites[existingIndex] = favorite;
        else favorites.push(favorite);

        localStorage.setItem('seederFavorites', JSON.stringify(favorites));
        this.loadFavorites(favorite.buildPath);
        this.saveProgress();
    }

    loadFavorites(selectedBuildPath) {
        const favorites = JSON.parse(localStorage.getItem('seederFavorites') || '[]');
        const select = document.getElementById('savedBuildsSelect');
        select.innerHTML = '<option value="">Select a saved build...</option>' +
            favorites.map(fav => `
                <option value="${fav.buildPath}" ${fav.buildPath === selectedBuildPath ? 'selected' : ''}>
                    ${fav.hostname} (${fav.quarter})
                </option>
            `).join('');
        document.getElementById('forgetBuildBtn').style.display = selectedBuildPath ? 'inline-block' : 'none';
    }

    useFavorite(buildPath) {
        const favorites = JSON.parse(localStorage.getItem('seederFavorites') || '[]');
        const fav = favorites.find(f => f.buildPath === buildPath);
        if (!fav) return;
        document.getElementById('localUrl').value = `http://${fav.hostname}/`;
        document.getElementById('forgetBuildBtn').style.display = 'inline-block';
        return this.detectBuild();
    }

    forgetSelectedBuild() {
        const select = document.getElementById('savedBuildsSelect');
        const buildPath = select.value;
        if (!buildPath) return;

        const favorites = JSON.parse(localStorage.getItem('seederFavorites') || '[]');
        const filtered = favorites.filter(f => f.buildPath !== buildPath);
        localStorage.setItem('seederFavorites', JSON.stringify(filtered));
        this.loadFavorites();
        this.showStatus('Saved build removed', 'success');
    }

    showStatus(msg, type = 'info') {
        const el = document.getElementById('statusMessage');

        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        el.innerHTML = `<span style="font-size: 16px;">${icon}</span> <span>${msg}</span>`;
        el.className = `status-message ${type}`;

        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 3500);
    }

    reset() {
        this.currentStep = 1;
        this.products = [];
        this.generatedSeeder = null;
        sessionStorage.removeItem(WORKFLOW_STORAGE_KEY);
        this.loadFavorites();
        this.updateStepIndicator();
        this.showStep(1);
        this.renderProductsTable();
        this.loadCachedCatalog();
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => { app = new DataSeederApp(); });
function closeSuccessModal() { document.getElementById('successModal').classList.add('hidden'); }
function closeErrorModal() { document.getElementById('errorModal').classList.add('hidden'); }
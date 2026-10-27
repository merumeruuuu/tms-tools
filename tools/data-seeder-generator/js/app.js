/**
 * Data Seeder Generator - Native File System Version
 * Features professional UI and true offline file counting.
 */

const UPDATE_FIELD_DEFINITIONS = [
    { value: 'manufacturer', label: 'Manufacturer', type: 'select', placeholder: 'Select a manufacturer...', icon: '🏢', theme: 'blue', options: [
        { value: 'Abbott Nutrition', label: 'Abbott Nutrition' },
        { value: 'Mead Johnson Nutrition', label: 'Mead Johnson Nutrition' },
        { value: 'Nestle Health Science', label: 'Nestle Health Science' },
        { value: 'Nutricia', label: 'Nutricia' },
        { value: 'Reckitt', label: 'Reckitt' },
        { value: 'Danone', label: 'Danone' },
        { value: 'Kate Farms', label: 'Kate Farms' },
        { value: 'Fresenius Kabi', label: 'Fresenius Kabi' },
        { value: 'Baxter', label: 'Baxter' },
        { value: 'B. Braun', label: 'B. Braun' },
        { value: '__other__', label: 'Other' }
    ]},
    { value: 'shortName', label: 'Short Name', type: 'text', placeholder: 'e.g., Similac', icon: '📝', theme: 'blue' },
    { value: 'hl7Reference', label: 'HL7 Reference', type: 'text', placeholder: 'e.g., MLT-17', icon: '🔌', theme: 'purple' },
    { value: 'hl7Fortifier', label: 'Fortifier HL7', type: 'text', placeholder: 'e.g., FORT-09', icon: '🔌', theme: 'purple' },
    { value: 'productType', label: 'Product Type', type: 'select', icon: '✨', theme: 'green', options: [
        { value: '3', label: 'Powder' }, { value: '2', label: 'Liquid Concentrate' }, { value: '1', label: 'Ready-to-Feed Liquid' }
    ]},
    { value: 'productUse', label: 'Product Use', type: 'select', icon: '✨', theme: 'green', options: [
        { value: 'base', label: 'Base Formula' }, { value: 'fortifier', label: 'Fortifier' }, { value: 'modular', label: 'Modular' }
    ]},
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

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFavorites();
        this.setupDragAndDrop(); // Call it from here
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
            formValues[control.dataset.fieldName] = control.type === 'checkbox' ? control.checked : control.value;
        });

        const hierarchy = Array.from(document.querySelectorAll('#productFormFields .hierarchy-row')).map(row => ({
            type: row.querySelector('.hierarchy-type')?.value || '',
            barcode: row.querySelector('.hierarchy-bc')?.value || '',
            quantity: row.querySelector('.hierarchy-qty')?.value || '',
            volume: row.querySelector('.hierarchy-vol')?.value || ''
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
            updateFields: Array.from(document.querySelectorAll('#productFormFields .field-checkbox:checked'))
                .map(checkbox => checkbox.dataset.fieldValue),
            hierarchy,
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

        const actionType = progress.actionType || '';
        document.getElementById('actionType').value = actionType;
        if (actionType) {
            this.loadProductForm(actionType);
            const updateGroup = document.querySelector('#productFormFields [data-field-name="updateFields"]');
            if (updateGroup && Array.isArray(progress.updateFields)) {
                updateGroup.querySelectorAll('.field-checkbox').forEach(checkbox => {
                    checkbox.checked = progress.updateFields.includes(checkbox.dataset.fieldValue);
                });
                this.syncConditionalFieldVisibility();
            }

            Object.entries(progress.formValues || {}).forEach(([name, value]) => {
                const control = document.querySelector(`#productFormFields input[data-field-name="${name}"], #productFormFields select[data-field-name="${name}"], #productFormFields textarea[data-field-name="${name}"]`);
                if (!control || control.type === 'checkbox') return;
                control.value = value;
                if (name === 'manufacturer') control.dispatchEvent(new Event('change', { bubbles: true }));
            });

            const hierarchyList = document.querySelector('#productFormFields .hierarchy-list');
            if (hierarchyList && Array.isArray(progress.hierarchy) && progress.hierarchy.length) {
                hierarchyList.innerHTML = '';
                progress.hierarchy.forEach((item, index) => {
                    this.addHierarchyRow(hierarchyList, index === 0);
                    const row = hierarchyList.lastElementChild;
                    row.querySelector('.hierarchy-type').value = item.type;
                    row.querySelector('.hierarchy-bc').value = item.barcode;
                    row.querySelector('.hierarchy-qty').value = item.quantity;
                    row.querySelector('.hierarchy-vol').value = item.volume;
                });
            }
        }

        this.switchFormTab(progress.activeTab || 'manual');
        this.renderProductsTable();
        if (this.generatedSeeder) document.getElementById('seederPreview').textContent = this.generatedSeeder;
        const outputRadio = document.querySelector(`input[name="output"][value="${progress.outputMethod || 'download'}"]`);
        if (outputRadio) outputRadio.checked = true;

        const requestedStep = Number(progress.currentStep) || 1;
        this.currentStep = requestedStep === 3 && !this.generatedSeeder ? 2 : requestedStep;
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
                
                // Unlock the search bar and update the button
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

    // Define it OUTSIDE of init(), as its own class method
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

            // Prevent default browser behavior (opening the file)
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            // Add visual feedback
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

            // Handle the drop
            dropArea.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                const files = dt.files;

                if (files && files.length > 0) {
                    input.files = files;
                    // Trigger the native change event so your existing handlers run
                    input.dispatchEvent(new Event('change'));
                }
            });
        });
    }
    previewProduct(index) {
        this.editingProductIndex = index;
        const product = this.products[index];
        if (!product) return;

        if (!product.hierarchy || product.hierarchy.length === 0) {
            product.hierarchy = [{
                containerId: product.containerType || '1',
                barcode: product.barcode || '',
                quantity: product.unitQuantity || 1,
                volume: product.measurementVolume || 0
            }];
        }

        const mappings = {
            productType: { '1': 'Ready-to-Feed Liquid', '2': 'Liquid Concentrate', '3': 'Powder' },
            categoryId: { '1': 'EBM', '2': 'DHM', '3': 'Formula', '5': 'Additive / Fortifier' },
            containerType: { '1': 'Bottle', '2': 'Carton', '3': 'Can', '4': 'Case', '6': 'Packet', '10': 'Tetra Pak' },
            productUse: { 'base': 'Base Formula', 'fortifier': 'Fortifier', 'modular': 'Modular' },
            measurementUnit: { 'ml': 'mL', 'g': 'g', 'oz': 'oz' },
            action: { 'create': 'Create', 'update': 'Update', 'barcode-update': 'Barcode Update', 'add-form-factor': 'Add Form Factor' }
        };

        // --- DYNAMICALLY SHOW ONLY WHAT IS NEEDED ---
        let orderedKeys = [];
        if (product.action === 'add-form-factor') {
            orderedKeys = ['action', 'productName', 'productCode'];
        } else if (product.action === 'barcode-update') {
            orderedKeys = ['action', 'productName', 'oldProductCode', 'newProductCode'];
        } else if (product.action === 'update') {
            orderedKeys = ['action', 'productName'];
            if (Array.isArray(product.updateFields)) {
                orderedKeys = orderedKeys.concat(product.updateFields);
            }
        } else {
            // Default "Create" layout
            orderedKeys = [
                'action', 'manufacturer', 'productName', 'shortName', 'productCode',
                'hl7Reference', 'hl7Fortifier', 'productType', 'productUse', 'categoryId',
                'caloricValue', 'displacement', 'expirationOpened', 'expirationPrepared', 'measurementUnit'
            ];
        }

        const detailsContainer = document.getElementById('previewDetails');
        let html = '';
        
        for (const key of orderedKeys) {
            let value = product[key] !== undefined && product[key] !== null ? product[key] : '';
            
            let formattedLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            if (key === 'productCode') formattedLabel = 'Item Number';
            if (key === 'oldProductCode') formattedLabel = 'Old Barcode';
            if (key === 'newProductCode') formattedLabel = 'New Barcode';
            if (key === 'barcode') formattedLabel = 'Barcode';
            if (key === 'hl7Reference') formattedLabel = 'Base HL7 Reference';
            if (key === 'hl7Fortifier') formattedLabel = 'Fortifier HL7 Reference';

            const isMissing = (value === '');
            const highlightStyle = isMissing 
                ? 'background: #fef08a; border: 2px solid #eab308; outline: 2px solid #eab308; box-shadow: 0 0 8px rgba(234, 179, 8, 0.5); border-radius: 4px;' 
                : '';

            let inputHtml = '';
            
            if (mappings[key]) {
                inputHtml = `<select class="preview-input" data-key="${key}" style="${highlightStyle}">`;
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
                
                inputHtml = `<input type="${type}" step="${step}" class="preview-input" data-key="${key}" value="${safeValue}" placeholder="(Blank)" style="${highlightStyle}">`;
            }

            html += `
                <div class="preview-grid">
                    <div class="preview-label">${formattedLabel}</div>
                    <div class="preview-value" style="padding: 2px 0;">${inputHtml}</div>
                </div>
            `;
        }

        // --- ONLY SHOW HIERARCHY TABLE FOR CREATE AND ADD-FORM-FACTOR ---
        if (product.action === 'create' || product.action === 'add-form-factor') {
            html += `
            <div style="margin-top: 25px; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
                <div style="background: #f8fafc; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; display: flex; font-size: 13px; color: #334155;">
                    <div style="flex: 1;"><strong>Item Number:</strong> ${product.productCode || 'Auto-Generated'}</div>
                    <div style="flex: 2;"><strong>Item Name:</strong> ${product.productName}</div>
                </div>
                
                <div style="padding: 15px;">
                    <div style="font-weight: bold; font-size: 13px; color: #1e293b; margin-bottom: 12px;">Form Factor(s)</div>
            `;
            
            product.hierarchy.forEach((ff, i) => {
                const isMissing = !ff.containerId;
                const highlightStyle = isMissing 
                    ? 'background: #fef08a; border: 2px solid #eab308; outline: 2px solid #eab308; box-shadow: 0 0 8px rgba(234, 179, 8, 0.5);' 
                    : '';

                let typeSelect = `<select class="preview-input hierarchy-input" data-hierarchy-index="${i}" data-key="containerId" style="width: auto; font-weight: bold; color: #0f172a; cursor: pointer; padding: 2px 4px; height: auto; ${highlightStyle}">`;
                
                if (isMissing) typeSelect += `<option value="" selected disabled>Select Type...</option>`;
                
                for (const [optVal, optLabel] of Object.entries(mappings.containerType)) {
                    const selected = (ff.containerId.toString() === optVal.toString()) ? 'selected' : '';
                    typeSelect += `<option value="${optVal}" ${selected}>${optLabel}</option>`;
                }
                typeSelect += `</select>`;

                const removeBtn = product.hierarchy.length > 1 
                    ? `<button type="button" class="remove-preview-ff-btn" data-index="${i}" title="Remove Container" style="background:none; border:none; color:#ef4444; font-size:18px; font-weight:bold; cursor:pointer; margin-left: 6px; padding: 0 4px; line-height: 1;">&times;</button>`
                    : `<span style="width: 20px; margin-left: 6px;"></span>`;

                html += `
                    <div style="background: #cbd5e1; border-radius: 4px; padding: 6px 8px; margin-bottom: 8px; display: flex; align-items: center; flex-wrap: nowrap; gap: 4px; font-size: 13px; color: #0f172a; overflow-x: auto;">
                        ${typeSelect}
                        
                        <span style="font-weight: bold; color: #334155; margin-left: 2px;">[</span>
                        <input type="text" class="preview-input hierarchy-input" data-hierarchy-index="${i}" data-key="barcode" value="${(ff.barcode || '').replace(/"/g, '&quot;')}" placeholder="Barcode" style="width: 100px; background: rgba(255,255,255,0.6); padding: 2px 6px; height: auto; font-family: monospace;">
                        <span style="font-weight: bold; color: #334155;">]</span>
                        
                        <span style="font-weight: bold; color: #334155; margin-left: 2px;">(</span>
                        <input type="number" class="preview-input hierarchy-input" data-hierarchy-index="${i}" data-key="quantity" value="${ff.quantity}" style="width: 40px; background: rgba(255,255,255,0.6); padding: 2px 6px; height: auto;" title="Quantity">
                        <span style="font-weight: bold; color: #334155;">)</span>
                        
                        <div style="margin-left: auto; display: flex; align-items: center; gap: 4px;">
                            <span style="color: #475569; font-size: 12px; font-weight: bold;">Vol:</span>
                            <input type="number" step="any" class="preview-input hierarchy-input" data-hierarchy-index="${i}" data-key="volume" value="${ff.volume}" style="width: 55px; background: rgba(255,255,255,0.6); padding: 2px 6px; height: auto;">
                        </div>
                        ${removeBtn}
                    </div>
                `;
            });

            html += `
                    <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary btn-small" id="addPreviewContainerBtn" style="background: #f1f5f9; border: 1px dashed #94a3b8; color: #475569;">+ Add Outer Container</button>
                    </div>
                </div>
            </div>`;
        }

        document.getElementById('previewTitle').textContent = `Edit: ${product.productName || 'Product'}`;
        detailsContainer.innerHTML = html;
        
        // Attach listeners to buttons
        const addContainerBtn = document.getElementById('addPreviewContainerBtn');
        if (addContainerBtn) addContainerBtn.onclick = () => this.addPreviewFormFactor();

        document.querySelectorAll('.remove-preview-ff-btn').forEach(btn => {
            btn.onclick = (e) => this.removePreviewFormFactor(parseInt(e.target.dataset.index, 10));
        });
        
        const closeBtn = document.getElementById('closePreviewBtn');
        closeBtn.textContent = 'Save Changes';
        closeBtn.classList.remove('btn-secondary');
        closeBtn.classList.add('btn-primary');

        document.getElementById('previewModal').classList.remove('hidden');
    }
    savePreviewChanges() {
        if (this.editingProductIndex === undefined || this.editingProductIndex === null) return;
        
        const product = this.products[this.editingProductIndex];
        if (!product) return;

        // Save standard fields
        const standardInputs = document.querySelectorAll('#previewDetails .preview-input:not(.hierarchy-input)');
        standardInputs.forEach(input => {
            const key = input.dataset.key;
            let val = input.value;
            
            const isNumber = ['caloricValue', 'displacement', 'expirationOpened', 'expirationPrepared', 'unitQuantity', 'measurementVolume'].includes(key);
            if (isNumber) val = parseFloat(val) || 0;
            
            product[key] = val;
        });

        // Save hierarchy fields if they exist
        if (product.hierarchy) {
            const hierarchyInputs = document.querySelectorAll('#previewDetails .hierarchy-input');
            hierarchyInputs.forEach(input => {
                const index = parseInt(input.dataset.hierarchyIndex, 10);
                const key = input.dataset.key;
                let val = input.value;
                
                if (key === 'quantity' || key === 'volume') val = parseFloat(val) || 0;
                
                product.hierarchy[index][key] = val;
            });
        }

        this.renderProductsTable();
        this.showStatus('Product updated successfully!', 'success');
        this.editingProductIndex = null;
    }
    addPreviewFormFactor() {
        if (this.editingProductIndex === undefined || this.editingProductIndex === null) return;
        const product = this.products[this.editingProductIndex];
        if (!product) return;

        // 1. Scrape current inputs so we don't lose unsaved changes on refresh
        const standardInputs = document.querySelectorAll('#previewDetails .preview-input:not(.hierarchy-input)');
        standardInputs.forEach(input => {
            const key = input.dataset.key;
            let val = input.value;
            const isNumber = ['caloricValue', 'displacement', 'expirationOpened', 'expirationPrepared', 'unitQuantity', 'measurementVolume'].includes(key);
            if (isNumber) val = parseFloat(val) || 0;
            product[key] = val;
        });

        if (product.hierarchy) {
            const hierarchyInputs = document.querySelectorAll('#previewDetails .hierarchy-input');
            hierarchyInputs.forEach(input => {
                const index = parseInt(input.dataset.hierarchyIndex, 10);
                const key = input.dataset.key;
                let val = input.value;
                if (key === 'quantity' || key === 'volume') val = parseFloat(val) || 0;
                product.hierarchy[index][key] = val;
            });
        }

        // 2. Add a new blank outer container to the array
        if (!product.hierarchy) product.hierarchy = [];
        product.hierarchy.push({
            containerId: '', // Blank so it triggers your yellow warning highlight!
            barcode: '',
            quantity: 0,
            volume: 0
        });

        // 3. Refresh the modal
        this.previewProduct(this.editingProductIndex);
    }
    removePreviewFormFactor(index) {
        if (this.editingProductIndex === undefined || this.editingProductIndex === null) return;
        const product = this.products[this.editingProductIndex];
        if (!product || !product.hierarchy) return;

        // Scrape current inputs to prevent losing unsaved data
        const standardInputs = document.querySelectorAll('#previewDetails .preview-input:not(.hierarchy-input)');
        standardInputs.forEach(input => {
            const key = input.dataset.key;
            let val = input.value;
            const isNumber = ['caloricValue', 'displacement', 'expirationOpened', 'expirationPrepared', 'unitQuantity', 'measurementVolume'].includes(key);
            if (isNumber) val = parseFloat(val) || 0;
            product[key] = val;
        });

        const hierarchyInputs = document.querySelectorAll('#previewDetails .hierarchy-input');
        hierarchyInputs.forEach(input => {
            const i = parseInt(input.dataset.hierarchyIndex, 10);
            // Skip the row we are about to delete
            if (i === index) return; 
            
            const key = input.dataset.key;
            let val = input.value;
            if (key === 'quantity' || key === 'volume') val = parseFloat(val) || 0;
            product.hierarchy[i][key] = val;
        });

        // Remove the row from the array
        product.hierarchy.splice(index, 1);

        // Refresh the modal
        this.previewProduct(this.editingProductIndex);
    }
    async handleDocUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const errorEl = document.getElementById('docParseError');
        errorEl.style.display = 'none';
        errorEl.textContent = ''; // Clear previous errors
        
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

                // Process and add to the table
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
        
        // Reset the file input so the user can upload again
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
                // Strip out common "not applicable" strings so the field stays blank
                return (cleanVal === 'na' || cleanVal === 'n/a' || cleanVal === 'none' || cleanVal === 'null') ? '' : val.trim();
            };

            const rawName = getVal('Display Name');
            const rawItemNum = getVal('Item Number');
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

            let useVal = 'base';
            let catId = '3'; 
            if (rawUse.toLowerCase().includes('fortifier')) {
                useVal = 'fortifier';
                catId = '5'; 
            } else if (rawUse.toLowerCase().includes('modular')) {
                useVal = 'modular';
                catId = '5';
            }

            let containerId = '1'; 
            const cLower = rawContainer.toLowerCase();
            if (cLower.includes('carton')) containerId = '2';
            else if (cLower.includes('can')) containerId = '3';
            else if (cLower.includes('case')) containerId = '4';
            else if (cLower.includes('packet')) containerId = '6';
            else if (cLower.includes('tetra')) containerId = '10';
            else if (cLower.includes('bottle')) containerId = '1';

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

            // NEW: Parse the Container Hierarchy Table (Strict Matching)
            const containerTypesRaw = getVal('Type of Container (Case, Carton, Bottle, Can, Packet)') || getVal('Type of Container');
            const barcodesRaw = extractedData['barcode'] || '';
            const quantitiesRaw = getVal('Number of Containers');
            const volumesRaw = getVal('Volume');

            // Safely extract only what we care about, ignoring 'n/a', labels, and spaces
            const types = (containerTypesRaw.match(/(bottle|carton|can|case|packet|tetra)/gi) || []).map(s => s.toLowerCase());
            const barcodes = barcodesRaw.match(/\d{5,}/g) || []; // Matches long numbers
            const quantities = quantitiesRaw.match(/\d+(\.\d+)?/g) || [];
            const volumes = volumesRaw.match(/\d+(\.\d+)?/g) || [];

            const formFactors = [];
            const maxCols = Math.max(types.length, barcodes.length, quantities.length, volumes.length);

            for (let i = 0; i < maxCols; i++) {
                let cid = ''; 
                const typeLower = types[i] || '';
                
                if (typeLower.includes('bottle')) cid = '1';
                else if (typeLower.includes('carton')) cid = '2';
                else if (typeLower.includes('can')) cid = '3';
                else if (typeLower.includes('case')) cid = '4';
                else if (typeLower.includes('packet')) cid = '6';
                else if (typeLower.includes('tetra')) cid = '10';

                const bc = barcodes[i] || '';
                const qty = parseInt(quantities[i]) || (i === maxCols - 1 ? 1 : 0);
                const vol = parseFloat(volumes[i]) || 0;

                if (bc || qty || vol || cid) {
                    formFactors.push({ containerId: cid, barcode: bc, quantity: qty, volume: vol });
                }
            }

            // Reverse so the innermost unit is at the top of the UI
            const hierarchy = formFactors.reverse();

            const product = {
                action: 'create',
                manufacturer: rawMfg,
                productName: rawName,
                shortName: rawName, 
                productCode: rawItemNum,
                barcode: rawBarcode2D,
                productType: typeId,
                productUse: useVal,
                categoryId: catId,
                caloricValue: caloricVal,
                displacement: dispVal,
                expirationOpened: expOpenHours,
                expirationPrepared: expPrepHours,
                containerType: containerId,
                unitQuantity: 1,
                measurementVolume: volVal,
                hl7Reference: cleanHl7Base,
                hl7Fortifier: cleanHl7Fort,
                measurementUnit: unitVal,
                hierarchy: hierarchy // NEW: Hierarchy array attached here
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
        // --- INSTANT STAGE / UNSTAGE CHECKBOX LOGIC ---
        document.getElementById('apiResultsBody').addEventListener('change', async (e) => {
            if (!e.target.classList.contains('api-product-cb')) return;
            
            const cb = e.target;
            const itemId = cb.value;

            if (cb.checked) {
                // ADD TO BATCH
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
                            let cId = '1';
                            const pkg = basicData.PrimaryPackage.toLowerCase();
                            if (pkg.includes('carton')) cId = '2';
                            else if (pkg.includes('can')) cId = '3';
                            else if (pkg.includes('case')) cId = '4';
                            else if (pkg.includes('packet')) cId = '6';

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
                            productUse: 'base',
                            categoryId: '3',
                            caloricValue: calValue,
                            displacement: parseFloat(basicData.Displacement) || 1.0,
                            expirationOpened: 48,
                            expirationPrepared: 48,
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
                // REMOVE FROM BATCH
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
        // --- REAL-TIME TYPING SEARCH LOGIC ---
        const searchInput = document.getElementById('apiSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.refreshApiGrid());
        }
        // --- SWITCH FOLDER LOGIC ---
        document.getElementById('changeFolderBtn').addEventListener('click', async () => {
            // Fix: Removed 'window.' and use the same check your other functions use
            if (typeof fsAccessManager === 'undefined' || !fsAccessManager.isSupported()) {
                this.showStatus('File system access not supported on this browser.', 'error');
                return;
            }
            
            try {
                // 1. Force the prompt to open regardless of what is saved
                this.showStatus('Select your master project folder...', 'info');
                const newRootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                
                // Persist under the same key used by build detection.
                await fsAccessManager.setStoredHandle(fsAccessManager.rootKey, newRootHandle);
                
                // 3. Re-run the folder detection to verify the new path
                await this.ensureSeedersFolder();
                this.rememberBuild();
                this.showStatus(`Folder updated to: ${newRootHandle.name}`, 'success');
                
            } catch (error) {
                console.warn('Folder switch cancelled:', error);
            }
        });
        // --- LOAD CATALOG & PROGRESS BAR LOGIC ---
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

                // 1. Fetch initial page to get TotalRecords
                const initialUrl = `${baseUrl}/api/internal/cpoe/v1/get-product-by-facility/${facId}/0/1`;
                const response = await fetch(initialUrl, { headers });
                const json = await response.json();
                
                let allProducts = json.data?.ProductData || [];
                const totalRecords = json.data?.TotalRecords || 0;
                // --- EMPTY DATA CHECK ---
                if (totalRecords === 0 || allProducts.length === 0) {
                    this.showStatus('No products found for this facility. Please select a different one.', 'error');
                    
                    // Open the API settings modal automatically
                    document.getElementById('apiBaseUrl').value = apiService.config.baseUrl;
                    document.getElementById('apiToken').value = apiService.config.token;
                    document.getElementById('apiSettingsModal').classList.remove('hidden');
                    
                    // Reset the load button
                    btn.disabled = false;
                    btn.textContent = '⬇️ Load Catalog';
                    progWrapper.style.display = 'none';
                    return; // Stop execution so it doesn't save an empty array
                }
                const limit = json.data?.Limit || 10;
                let loadedCount = limit;

                // 2. Fetch remaining pages and update progress bar
                if (totalRecords > limit) {
                    const fetchPromises = [];
                    for (let offset = limit; offset < totalRecords; offset += limit) {
                        const pageUrl = `${baseUrl}/api/internal/cpoe/v1/get-product-by-facility/${facId}/${offset}/1`;
                        
                        const req = fetch(pageUrl, { headers }).then(res => res.json()).then(pageJson => {
                            allProducts = allProducts.concat(pageJson.data?.ProductData || []);
                            loadedCount += limit;
                            
                            // Calculate and update progress
                            const percentage = Math.min(100, Math.round((loadedCount / totalRecords) * 100));
                            progBar.style.width = `${percentage}%`;
                            progText.textContent = `Downloading... ${percentage}%`;
                        }).catch(e => console.warn(e));
                        
                        fetchPromises.push(req);
                    }
                    await Promise.all(fetchPromises); // Wait for all pages to finish downloading
                }

                // 3. Save to memory and IndexedDB
                apiService.cachedProducts = allProducts;
                if (typeof idbKeyval !== 'undefined') {
                    await idbKeyval.set('cachedApiProducts', allProducts);
                }

                // 4. Update UI
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
        // API Settings Modal Listeners
        const apiModal = document.getElementById('apiSettingsModal');
        
        document.getElementById('openApiSettingsBtn').addEventListener('click', () => {
            // Load current config into inputs
            document.getElementById('apiBaseUrl').value = apiService.config.baseUrl;
            document.getElementById('apiToken').value = apiService.config.token;
            document.getElementById('facilitySelectionWrapper').classList.add('hidden');
            apiModal.classList.remove('hidden');
        });

        document.querySelector('.close-api-btn').addEventListener('click', () => {
            apiModal.classList.add('hidden');
        });

        // Test Connection & Fetch API 1
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
                
                // Populate dropdown
                const select = document.getElementById('apiFacilitySelect');
                select.innerHTML = facilities.map(f => 
                    `<option value="${f.FacilityID}">${f.FacilityName} (${f.EnterpriseName})</option>`
                ).join('');
                
                // Auto-select previously saved facility if it exists
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

        // Save Settings
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
        
        const linkBtn = document.getElementById('linkFolderBtn');
        if (linkBtn) linkBtn.addEventListener('click', () => this.ensureSeedersFolder(true));

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

        // Safely listen for File Uploads
        document.getElementById('docFile').addEventListener('change', (e) => this.handleDocUpload(e));
        document.getElementById('csvFile').addEventListener('change', (e) => this.handleCsvUpload(e));
        document.getElementById('downloadCsvTemplate').addEventListener('click', () => csvHandler.downloadTemplate());
        
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllProducts());
        document.getElementById('generateSeederBtn').addEventListener('click', () => this.generateSeeder());
        document.getElementById('step2BackBtn').addEventListener('click', () => this.goToStep(1));
        document.getElementById('executeOutputBtn').addEventListener('click', () => this.executeOutput());
        document.getElementById('backToProductsBtn').addEventListener('click', () => this.showOutput(false));
        document.getElementById('newSeederBtn').addEventListener('click', () => this.reset());

        // Modal Close Buttons
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

        // Delegate listener for the dynamic buttons in the table
        document.getElementById('productsTableBody').addEventListener('click', (e) => {
            // Find the closest button element to the click target
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
        const url = document.getElementById('localUrl').value.trim();
        const errorEl = document.getElementById('urlError');
        errorEl.classList.remove('show');

        if (!url) {
            errorEl.textContent = 'Please enter a URL';
            errorEl.classList.add('show');
            return;
        }

        if (!wampDetector.validateUrl(url)) {
            errorEl.textContent = 'Invalid URL format. Expected: http://client-vX-Y-Z.local/';
            errorEl.classList.add('show');
            return;
        }

        try {
            const urlInfo = wampDetector.parseUrl(url);
            if (!urlInfo.isValid) throw new Error(urlInfo.error);

            this.buildInfo = await wampDetector.detectLocalBuild(urlInfo);

            document.getElementById('clientName').textContent = this.buildInfo.clientName;
            document.getElementById('buildVersion').textContent = this.buildInfo.version;
            document.getElementById('buildQuarter').textContent = this.buildInfo.quarter;
            document.getElementById('buildPath').textContent = this.buildInfo.buildPath;

            document.getElementById('buildDetailsCard').style.display = 'flex';
            
            // Attempt to read the folder silently, or prompt if it's the very first time
            await this.ensureSeedersFolder();

            this.rememberBuild();

        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.add('show');
        }
    }

async ensureSeedersFolder() {
        if (!fsAccessManager.isSupported()) {
            this.showStatus('Browser does not support folder access.', 'error');
            return;
        }

        try {
            // Check memory for previous connection (triggers browser alert, not Windows Explorer)
            let rootHandle = await fsAccessManager.getRootHandleWithPermission();
            
            if (!rootHandle) {
                // FIRST TIME EVER: Open Windows Explorer
                this.showStatus('Please select your WAMP folder to enable auto-write.', 'info');
                rootHandle = await fsAccessManager.linkRoot();
            }

            // Trace path to seeders
            const folderResult = await fsAccessManager.getSeedersDirHandle(this.buildInfo, rootHandle);

            if (!folderResult) {
                throw new Error('Could not find one matching project folder. Select a folder containing the local builds.');
            }

            this.seedersDirHandle = folderResult.handle;
            this.buildInfo.buildPath = folderResult.relativePath === rootHandle.name
                ? rootHandle.name
                : `${rootHandle.name}\\${folderResult.relativePath}`;
            document.getElementById('buildPath').textContent = this.buildInfo.buildPath;
            
            // Count the files!
            const highest = await fsAccessManager.getHighestSeederNumber(this.seedersDirHandle);
            this.seederNumber = highest + 1;
            
            this.updateSeederNumberDisplay(this.seederNumber, 'auto-detected');
            this.updateFolderLinkUI(true, '✅ Folder linked & scanned successfully.');
            this.showStatus('Ready to generate!', 'success');

        } catch (error) {
            console.error(error);
            this.updateFolderLinkUI(false, '⚠️ Manual input required.');
            this.updateSeederNumberDisplay('', 'action required');
        }
    }
    updateFolderLinkUI(linked, message) {
        const statusEl = document.getElementById('folderLinkStatus');
        const linkBtn = document.getElementById('linkFolderBtn');
        
        statusEl.textContent = message;
        
        if (linked) {
            statusEl.classList.add('linked');
            statusEl.style.color = '#10b981';
            if(linkBtn) linkBtn.style.display = 'none';
        } else {
            statusEl.classList.remove('linked');
            statusEl.style.color = '#ef4444';
            if(linkBtn) linkBtn.style.display = 'inline-block';
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

    loadProductForm(actionType) {
        const container = document.getElementById('productFormFields');
        container.innerHTML = '';
        if (!actionType) return;

        const gridWrapper = document.createElement('div');
        gridWrapper.className = 'form-grid';

        const fields = this.getFormFields(actionType);

        if (actionType === 'update') {
            const layout = document.createElement('div');
            layout.className = 'update-module-container';

            const selectorPanel = document.createElement('div');
            selectorPanel.className = 'update-selector-panel';
            
            const helperText = document.createElement('div');
            helperText.className = 'field-selection-hint';
            helperText.innerHTML = '<strong>Select Fields to Update:</strong> Click the properties you need to change. The input fields will appear below.';
            selectorPanel.appendChild(helperText);

            const editorPanel = document.createElement('div');
            editorPanel.className = 'update-editor-panel';

            fields.forEach(field => {
                if (field.name === 'productName') {
                    // Extract the main product name to sit above the module
                    gridWrapper.appendChild(this.createFormField(field));
                } else if (field.type === 'checkbox-group') {
                    selectorPanel.appendChild(this.createFormField(field));
                } else if (field.type !== 'conditional-input') {
                    gridWrapper.appendChild(this.createFormField(field));
                }
            });

            layout.appendChild(selectorPanel);
            layout.appendChild(editorPanel);
            gridWrapper.appendChild(layout);

            container.appendChild(gridWrapper);
            
            this.syncConditionalFieldVisibility();
            const checkboxGroup = document.querySelector('#productFormFields [data-field-name="updateFields"]');
            if (checkboxGroup) {
                checkboxGroup.addEventListener('change', () => this.syncConditionalFieldVisibility());
            }
            return;
        }

        fields.forEach(field => {
            gridWrapper.appendChild(this.createFormField(field));
        });

        container.appendChild(gridWrapper);
    }

    getFormFields(actionType) {
        const fields = {
            'create': [
                { type: 'section', label: 'General Information' },
                { name: 'manufacturer', label: 'Manufacturer', type: 'text', placeholder: 'e.g., Abbott Nutrition' },
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
                { name: 'productUse', label: 'Product Use *', type: 'select', required: true, value: 'base', options: [
                    { value: 'base', label: 'Base Formula' },
                    { value: 'fortifier', label: 'Fortifier' },
                    { value: 'modular', label: 'Modular' }
                ]},
                { name: 'categoryId', label: 'Category Override', type: 'select', value: '3', options: [
                    { value: '3', label: 'Formula (Default)' },
                    { value: '5', label: 'Additive / Fortifier' },
                    { value: '1', label: 'EBM' },
                    { value: '2', label: 'DHM' }
                ]},

                { type: 'section', label: 'Nutrition Details' },
                { name: 'caloricValue', label: 'Caloric Density', type: 'number', value: 20, step: 0.1, numeric: true },
                { name: 'displacement', label: 'Displacement', type: 'number', value: 1.0, step: 0.01, numeric: true },
                
                { type: 'section', label: 'Expirations' },
                { name: 'expirationOpened', label: 'Expiration Once Opened (Hours)', type: 'number', value: 48, numeric: true },
                { name: 'expirationPrepared', label: 'Expiration Once Prepared (Hours)', type: 'number', value: 48, numeric: true },

                { type: 'section', label: 'Packaging' },
                { name: 'measurementUnit', label: 'Measurement Unit', type: 'select', value: 'ml', options: [
                    { value: 'ml', label: 'mL' },
                    { value: 'g', label: 'g' },
                    { value: 'oz', label: 'oz' }
                ]},
                // Replaces the old static inputs with a dynamic builder
                { name: 'hierarchy', label: 'Packaging Hierarchy (Top = Innermost Unit)', type: 'packaging-hierarchy' }
            ],
            'update': [
                { name: 'productName', label: 'Exact Product Name *', type: 'text', required: true, fullWidth: true },
                { name: 'updateFields', label: 'Fields to Update *', type: 'checkbox-group', required: true, value: ['hl7Reference', 'caloricValue'],
                    options: UPDATE_FIELD_DEFINITIONS.map(field => ({ value: field.value, label: field.label }))
                },
                ...UPDATE_FIELD_DEFINITIONS.map(field => ({
                    name: field.value,
                    label: `New ${field.label}`,
                    type: 'conditional-input',
                    dependsOn: 'updateFields',
                    dependsValue: field.value,
                    subtype: field.type,
                    step: field.step,
                    numeric: field.numeric,
                    placeholder: field.placeholder,
                    options: field.options,
                    value: field.name === 'manufacturer' ? '' : (field.type === 'select' ? (field.options?.[0]?.value || '') : '')
                }))
            ],
            'barcode-update': [
                { name: 'productName', label: 'Product Name *', type: 'text', required: true, fullWidth: true },
                { name: 'oldProductCode', label: 'Old Barcode *', type: 'text', required: true },
                { name: 'newProductCode', label: 'New Barcode *', type: 'text', required: true },
            ],
            // --- NEW MODULE: ADD FORM FACTOR ---
            'add-form-factor': [
                { type: 'section', label: 'Product Identification' },
                { name: 'productName', label: 'Exact Product Name *', type: 'text', required: true, fullWidth: true },
                { type: 'section', label: 'New Packaging Hierarchy' },
                { name: 'hierarchy', label: 'Packaging Hierarchy (Top = Innermost Unit)', type: 'packaging-hierarchy' }
            ]
        };
        return fields[actionType] || [];
    }
    addHierarchyRow(container, isInner = false) {
        const row = document.createElement('div');
        row.className = 'hierarchy-row';
        row.style.display = 'flex';
        row.style.gap = '6px';
        row.style.alignItems = 'center';

        const typeSel = document.createElement('select');
        typeSel.className = 'hierarchy-type input-field';
        typeSel.style.flex = '2';
        typeSel.style.padding = '8px 6px';
        typeSel.innerHTML = `
            <option value="1">Bottle</option>
            <option value="2">Carton</option>
            <option value="3">Can</option>
            <option value="4">Case</option>
            <option value="6">Packet</option>
            <option value="10">Tetra Pak</option>
        `;
        if (!isInner) typeSel.value = '4'; // Default to Case for outer containers

        const bcIn = document.createElement('input');
        bcIn.type = 'text';
        bcIn.className = 'hierarchy-bc input-field';
        bcIn.placeholder = 'Barcode';
        bcIn.style.flex = '3';
        bcIn.style.padding = '8px 6px';

        const qtyIn = document.createElement('input');
        qtyIn.type = 'number';
        qtyIn.className = 'hierarchy-qty input-field';
        qtyIn.placeholder = 'Qty';
        qtyIn.value = isInner ? '1' : '';
        qtyIn.style.flex = '1.2';
        qtyIn.style.padding = '8px 6px';

        const volIn = document.createElement('input');
        volIn.type = 'number';
        volIn.step = 'any';
        volIn.className = 'hierarchy-vol input-field';
        volIn.placeholder = 'Vol';
        volIn.style.flex = '1.2';
        volIn.style.padding = '8px 6px';

        row.appendChild(typeSel);
        row.appendChild(bcIn);
        row.appendChild(qtyIn);
        row.appendChild(volIn);

        if (!isInner) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.innerHTML = '×';
            removeBtn.style.cssText = 'background:none; border:none; color:#ef4444; cursor:pointer; font-size:20px; font-weight:bold; padding:0 4px;';
            removeBtn.onclick = () => row.remove();
            row.appendChild(removeBtn);
        } else {
            const spacer = document.createElement('div');
            spacer.style.width = '24px';
            row.appendChild(spacer);
        }

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
        if (field.fullWidth || field.type === 'checkbox-group') group.classList.add('full-width');

        // Skip adding the standard label for the checkbox group to keep the UI clean
        if (field.type !== 'checkbox-group') {
            const label = document.createElement('label');
            label.textContent = field.label;
            group.appendChild(label);
        }

        if (field.type === 'select') {
            const select = document.createElement('select');
            select.dataset.fieldName = field.name;
            if (field.required) select.required = true;

            field.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                if (field.value === opt.value) option.selected = true;
                select.appendChild(option);
            });

            group.appendChild(select);
            return group;
        }

        if (field.type === 'checkbox-group') {
            const checkboxWrap = document.createElement('div');
            checkboxWrap.className = 'update-button-group';
            checkboxWrap.dataset.fieldName = field.name;

            const selectedValues = Array.isArray(field.value) ? field.value : [];
            
            field.options.forEach(opt => {
                const row = document.createElement('label');
                row.className = 'update-toggle-btn'; // No more theme classes
                
                const isChecked = selectedValues.includes(opt.value);
                if (isChecked) row.classList.add('selected');

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'field-checkbox';
                checkbox.dataset.fieldValue = opt.value;
                checkbox.checked = isChecked;

                checkbox.addEventListener('change', (e) => {
                    if(e.target.checked) row.classList.add('selected');
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
            addBtn.innerHTML = '+ Add Outer Container';
            addBtn.style.width = '100%';
            addBtn.onclick = () => this.addHierarchyRow(listContainer);
            
            wrapper.appendChild(addBtn);

            // Automatically inject the required innermost unit row
            this.addHierarchyRow(listContainer, true);

            return wrapper;
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
        const checkboxGroup = document.querySelector('#productFormFields [data-field-name="updateFields"]');
        if (!checkboxGroup) return;

        const checkedValues = Array.from(checkboxGroup.querySelectorAll('.field-checkbox:checked'))
            .map(el => el.dataset.fieldValue)
            .filter(Boolean);
        const editorPanel = document.querySelector('#productFormFields .update-editor-panel');
        if (!editorPanel) return;

        const selectedFields = this.getFormFields('update')
            .filter(field => field.type === 'conditional-input' && checkedValues.includes(field.dependsValue));
        const selectedNames = new Set(selectedFields.map(field => field.name));

        editorPanel.querySelectorAll('.conditional-field').forEach(element => {
            if (!selectedNames.has(element.dataset.fieldName)) element.remove();
        });

        selectedFields.forEach(field => {
            const exists = editorPanel.querySelector(`.conditional-field[data-field-name="${field.name}"]`);
            if (!exists) {
                const element = this.createFormField(field);
                element.classList.remove('hidden');
                editorPanel.appendChild(element);
            }
        });
    }

    collectFormData() {
        const actionType = document.getElementById('actionType').value;
        const fieldDefs = this.getFormFields(actionType).filter(f => f.type !== 'section');
        const data = {};

        fieldDefs.forEach(field => {
            if (field.type === 'checkbox-group') {
                const selectedValues = Array.from(document.querySelectorAll(`#productFormFields [data-field-name="${field.name}"] .field-checkbox:checked`))
                    .map(el => el.dataset.fieldValue)
                    .filter(Boolean);
                data[field.name] = selectedValues;
                return;
            }

            if (field.type === 'conditional-input') {
                const checkboxGroup = document.querySelector('#productFormFields [data-field-name="updateFields"]');
                const selectedValues = Array.from(checkboxGroup ? checkboxGroup.querySelectorAll('.field-checkbox:checked') : [])
                    .map(el => el.dataset.fieldValue)
                    .filter(Boolean);
                if (!selectedValues.includes(field.dependsValue)) {
                    data[field.name] = '';
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
                        quantity: parseInt(row.querySelector('.hierarchy-qty').value) || (index === 0 ? 1 : 0),
                        volume: parseFloat(row.querySelector('.hierarchy-vol').value) || 0
                    });
                });
                data[field.name] = hierarchy;
                return;
            }

            const fieldElement = document.querySelector(`#productFormFields [data-field-name="${field.name}"]`);
            const el = fieldElement && /^(INPUT|SELECT)$/.test(fieldElement.tagName)
                ? fieldElement
                : fieldElement?.querySelector('input, select');
            const raw = el ? el.value : '';
            if (field.name === 'manufacturer' && raw === '__other__') {
                const otherInput = fieldElement?.querySelector('[data-field-name="manufacturerOther"]');
                data[field.name] = otherInput ? otherInput.value.trim() : '';
            } else {
                data[field.name] = field.numeric ? (parseFloat(raw) || 0) : raw;
            }
        });

        if (!data.productName) {
            this.showStatus('Display Name is required', 'error');
            return null;
        }

        if (actionType === 'update' && (!Array.isArray(data.updateFields) || data.updateFields.length === 0)) {
            this.showStatus('Select at least one field to update.', 'error');
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

            if (field.type === 'checkbox-group') {
                const checkboxGroup = document.querySelector(`#productFormFields [data-field-name="${field.name}"]`);
                if (!checkboxGroup) return;
                const selectedValues = Array.isArray(field.value) ? field.value : [];
                checkboxGroup.querySelectorAll('.field-checkbox').forEach(checkbox => {
                    checkbox.checked = selectedValues.includes(checkbox.dataset.fieldValue);
                });
                return;
            }

            if (field.type === 'conditional-input') {
                const el = document.querySelector(`#productFormFields [data-field-name="${field.name}"]`);
                if (!el) return;
                el.classList.add('hidden');
                const input = el.querySelector('input, select');
                if (input) {
                    input.disabled = true;
                }
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

            const el = document.querySelector(`#productFormFields [data-field-name="${field.name}"]`);
            if (!el) return;
            el.value = field.value !== undefined ? field.value : '';
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

        tbody.innerHTML = this.products.map((p, idx) => `
            <tr>
                <td><span class="product-action-badge ${p.action}">${p.action}</span></td>
                <td><strong>${p.productName}</strong></td>
                <td class="product-details-cell">
                    ${p.productCode ? `Item #: ${p.productCode}<br>` : ''}
                    ${p.productUse ? `Use: ${p.productUse}<br>` : ''}
                    ${p.updateFields ? `Fields: ${p.updateFields.join(', ')}<br>` : ''}
                    ${p.measurementVolume ? `Vol: ${p.measurementVolume} ${p.measurementUnit || 'mL'}` : ''}
                </td>
                <td>
                    <div class="product-row-actions">
                        <!-- Text Hyperlink Preview -->
                        <button class="preview-link-btn preview-product-btn" data-index="${idx}" title="View Details">Preview</button>
                        <!-- Remove Button -->
                        <button class="action-icon-btn remove-product-btn" data-index="${idx}" title="Remove">×</button>
                    </div>
                </td>
            </tr>
        `).join('');

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
            // Remove trademarks and trim extra spaces
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

        try {
            const config = {
                seederNumber: this.seederNumber,
                quarter: this.buildInfo.quarter,
                actionType: this.currentAction,
                products: this.products,
                buildInfo: this.buildInfo
            };

            this.generatedSeeder = seederGenerator.generateSeeder(config);
            document.getElementById('seederPreview').textContent = this.generatedSeeder;
            this.showOutput(true);
        } catch (error) {
            this.showStatus(`Generation error: ${error.message}`, 'error');
        }
    }

    showOutput(show) {
        if (show) {
            this.goToStep(3); // Updated to point to step-3 panel
            
            // Show Auto-Write if folder is successfully linked
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
        const fileName = `DATA${this.seederNumber}.php`;

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
            
            // This safely writes the file to the drive
            await fsAccessManager.writeSeederFile(this.seedersDirHandle, fileName, this.generatedSeeder);
            
            // Automatically advance the counter for the next product!
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
        this.detectBuild();
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
        
        // Add visual icons based on success or failure!
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
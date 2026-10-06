/**
 * Data Seeder Generator - Native File System Version
 * Features professional UI and true offline file counting.
 */

const UPDATE_FIELD_DEFINITIONS = [
    { value: 'manufacturer', label: 'Manufacturer', type: 'text', placeholder: 'e.g., Abbott Nutrition' },
    { value: 'shortName', label: 'Short Name', type: 'text', placeholder: 'e.g., Similac' },
    { value: 'hl7Reference', label: 'HL7 Reference', type: 'text', placeholder: 'e.g., MLT-17' },
    { value: 'hl7Fortifier', label: 'Fortifier HL7 Ref', type: 'text', placeholder: 'e.g., FORT-09' },
    { value: 'productType', label: 'Product Type', type: 'select', placeholder: 'Select product type', options: [
        { value: '3', label: 'Powder' },
        { value: '2', label: 'Liquid Concentrate' },
        { value: '1', label: 'Ready-to-Feed Liquid' }
    ]},
    { value: 'productUse', label: 'Product Use', type: 'select', placeholder: 'Select product use', options: [
        { value: 'base', label: 'Base Formula' },
        { value: 'fortifier', label: 'Fortifier' },
        { value: 'modular', label: 'Modular' }
    ]},
    { value: 'categoryId', label: 'Category', type: 'select', placeholder: 'Select category', options: [
        { value: '3', label: 'Formula (Default)' },
        { value: '5', label: 'Additive / Fortifier' },
        { value: '1', label: 'EBM' },
        { value: '2', label: 'DHM' }
    ]},
    { value: 'caloricValue', label: 'Caloric Density', type: 'number', step: 0.1, numeric: true, placeholder: 'e.g., 22' },
    { value: 'displacement', label: 'Displacement', type: 'number', step: 0.01, numeric: true, placeholder: 'e.g., 1.0' },
    { value: 'expirationOpened', label: 'Expiration Once Opened (Hours)', type: 'number', numeric: true, placeholder: 'e.g., 48' },
    { value: 'expirationPrepared', label: 'Expiration Once Prepared (Hours)', type: 'number', numeric: true, placeholder: 'e.g., 48' },
    { value: 'containerType', label: 'Type of Container', type: 'select', placeholder: 'Select container', options: [
        { value: '1', label: 'Bottle' },
        { value: '2', label: 'Carton' },
        { value: '3', label: 'Can' },
        { value: '4', label: 'Case' },
        { value: '6', label: 'Packet' },
        { value: '10', label: 'Tetra Pak' }
    ]},
    { value: 'unitQuantity', label: 'Number of Containers', type: 'number', numeric: true, placeholder: 'e.g., 1' },
    { value: 'measurementVolume', label: 'Unit Volume', type: 'number', step: 0.1, numeric: true, placeholder: 'e.g., 100' },
    { value: 'measurementUnit', label: 'Measurement Unit', type: 'select', placeholder: 'Select unit', options: [
        { value: 'ml', label: 'mL' },
        { value: 'g', label: 'g' },
        { value: 'oz', label: 'oz' }
    ]}
];

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
        this.editingProductIndex = index; // Track which product we are editing
        const product = this.products[index];
        if (!product) return;

        // Expanded mappings to ensure dropdowns work for all categorical fields
        const mappings = {
            productType: { '1': 'Ready-to-Feed Liquid', '2': 'Liquid Concentrate', '3': 'Powder' },
            categoryId: { '1': 'EBM', '2': 'DHM', '3': 'Formula', '5': 'Additive / Fortifier' },
            containerType: { '1': 'Bottle', '2': 'Carton', '3': 'Can', '4': 'Case', '6': 'Packet', '10': 'Tetra Pak' },
            productUse: { 'base': 'Base Formula', 'fortifier': 'Fortifier', 'modular': 'Modular' },
            measurementUnit: { 'ml': 'mL', 'g': 'g', 'oz': 'oz' },
            action: { 'create': 'Create', 'update': 'Update', 'barcode-update': 'Barcode Update' }
        };

        const orderedKeys = [
            'action', 'manufacturer', 'productName', 'shortName', 'productCode', 'barcode',
            'hl7Reference', 'hl7Fortifier', 'productType', 'productUse', 'categoryId',
            'caloricValue', 'displacement', 'expirationOpened', 'expirationPrepared',
            'containerType', 'unitQuantity', 'measurementVolume', 'measurementUnit'
        ];

        const detailsContainer = document.getElementById('previewDetails');
        let html = '';
        
        for (const key of orderedKeys) {
            let value = product[key] !== undefined && product[key] !== null ? product[key] : '';
            
            let formattedLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            if (key === 'productCode') formattedLabel = 'Item Number';
            if (key === 'barcode') formattedLabel = 'Barcode';
            if (key === 'hl7Reference') formattedLabel = 'Base HL7 Reference';
            if (key === 'hl7Fortifier') formattedLabel = 'Fortifier HL7 Reference';

            let inputHtml = '';
            
            // Generate Select dropdowns for mapped fields
            if (mappings[key]) {
                inputHtml = `<select class="preview-input" data-key="${key}">`;
                for (const [optVal, optLabel] of Object.entries(mappings[key])) {
                    const selected = (value.toString() === optVal.toString()) ? 'selected' : '';
                    inputHtml += `<option value="${optVal}" ${selected}>${optLabel}</option>`;
                }
                inputHtml += `</select>`;
            } else {
                // Generate Text/Number inputs for everything else
                const isNumber = ['caloricValue', 'displacement', 'expirationOpened', 'expirationPrepared', 'unitQuantity', 'measurementVolume'].includes(key);
                const type = isNumber ? 'number' : 'text';
                const step = isNumber ? 'any' : '';
                const safeValue = value.toString().replace(/"/g, '&quot;'); // Prevent HTML breaking on quotes
                
                inputHtml = `<input type="${type}" step="${step}" class="preview-input" data-key="${key}" value="${safeValue}" placeholder="(Blank)">`;
            }

            html += `
                <div class="preview-grid">
                    <div class="preview-label">${formattedLabel}</div>
                    <div class="preview-value">${inputHtml}</div>
                </div>
            `;
        }

        document.getElementById('previewTitle').textContent = `Edit: ${product.productName || 'Product'}`;
        detailsContainer.innerHTML = html;
        
        // Upgrade the close button to a "Save" button
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

        // Scrape all the inputs and save them back to the product object
        const inputs = document.querySelectorAll('#previewDetails .preview-input');
        inputs.forEach(input => {
            const key = input.dataset.key;
            let val = input.value;
            
            // Ensure numbers stay as numbers in the data object
            const isNumber = ['caloricValue', 'displacement', 'expirationOpened', 'expirationPrepared', 'unitQuantity', 'measurementVolume'].includes(key);
            if (isNumber) val = parseFloat(val) || 0;
            
            product[key] = val;
        });

        // Re-render the main table to reflect changes and notify user
        this.renderProductsTable();
        this.showStatus('Product updated successfully!', 'success');
        this.editingProductIndex = null;
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
                'Type of Container', 'Barcode', 'Number of Containers', 'Volume'
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
                return val.toLowerCase() === 'na' ? '' : val;
            };

            const rawName = getVal('Display Name');
            const rawBarcode = getVal('Barcode');
            const rawItemNum = getVal('Item Number');
            const rawMfg = getVal('Manufacturer');
            const rawType = getVal('Product Type');
            const rawUse = getVal('Product Use');
            const rawCaloric = getVal('Caloric Density') || getVal('Caloric Range');
            const rawDisplacement = getVal('Displacement');
            const rawExpOpen = getVal('Expiration Once Opened');
            const rawExpPrep = getVal('Expiration Once Prepared');
            const rawHl7Base = getVal('Base Formula HL7 Reference Code');
            const rawHl7Fort = getVal('Fortifier HL7 Reference Code');
            const rawContainer = getVal('Type of Container');
            const rawVolume = getVal('Unit Volume') || getVal('Volume');
            
            // NEW: HL7 Validation logic
            // If the string contains MSH, PID, ORC segments, or too many delimiters, it's a raw dump.
            const isRawHl7Message = (str) => {
                if (!str) return false;
                const upperStr = str.toUpperCase();
                // Check for standard HL7 segment headers or excessive caret delimiters
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

            // --- Smart Schema Mapping ---
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

            // Create object explicitly mapping Item Number and Barcode separately
            const product = {
                action: 'create',
                manufacturer: rawMfg,
                productName: rawName,
                shortName: rawName, 
                productCode: rawItemNum,      // The actual Item Number (e.g. 69310)
                barcode: rawBarcode,          // The actual Barcode (e.g. 070074693095)
                hl7Reference: rawHl7Base,
                hl7Fortifier: rawHl7Fort,
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
                hl7Reference: cleanHl7Base,   // Updated to use the clean version
                hl7Fortifier: cleanHl7Fort,
                measurementUnit: unitVal
            };

            this.currentAction = 'create';
            this.products.push(product);
            this.renderProductsTable();
            
            this.showStatus(`Extracted ${rawName} from document!`, 'success');

        } catch (error) {
            const errorEl = document.getElementById('docParseError');
            errorEl.textContent = error.message;
            errorEl.style.display = 'block';
            this.showStatus('Mapping failed.', 'error');
        }
    }

    setupEventListeners() {
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
            const dirHandle = await fsAccessManager.getSeedersDirHandle(this.buildInfo, rootHandle);

            if (!dirHandle) {
                throw new Error("Could not trace the path to ClientDataUpdates. You might have selected the wrong folder.");
            }

            this.seedersDirHandle = dirHandle;
            
            // Count the files!
            const highest = await fsAccessManager.getHighestSeederNumber(dirHandle);
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
            const selectorPanel = document.createElement('div');
            selectorPanel.className = 'update-field-selector-panel';
            const editorPanel = document.createElement('div');
            editorPanel.className = 'update-field-editor-panel';

            fields.forEach(field => {
                if (field.type === 'checkbox-group') {
                    selectorPanel.appendChild(this.createFormField(field));
                } else if (field.type === 'conditional-input') {
                    editorPanel.appendChild(this.createFormField(field));
                } else {
                    gridWrapper.appendChild(this.createFormField(field));
                }
            });

            const helperText = document.createElement('div');
            helperText.className = 'field-selection-hint';
            helperText.textContent = 'Check each field you want to update. The value field appears on the right only when selected.';
            selectorPanel.appendChild(helperText);

            const layout = document.createElement('div');
            layout.className = 'update-field-layout';
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
                { name: 'containerType', label: 'Type of Container', type: 'select', value: '1', options: [
                    { value: '1', label: 'Bottle' },
                    { value: '2', label: 'Carton' },
                    { value: '3', label: 'Can' },
                    { value: '4', label: 'Case' },
                    { value: '6', label: 'Packet' },
                    { value: '10', label: 'Tetra Pak' }
                ]},
                { name: 'unitQuantity', label: 'Number of Containers', type: 'number', value: 1, numeric: true },
                { name: 'measurementVolume', label: 'Unit Volume', type: 'number', value: 100, step: 0.1, numeric: true },
                { name: 'measurementUnit', label: 'Measurement Unit', type: 'select', value: 'ml', options: [
                    { value: 'ml', label: 'mL' },
                    { value: 'g', label: 'g' },
                    { value: 'oz', label: 'oz' }
                ]},
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
                    value: field.type === 'select' ? (field.options?.[0]?.value || '') : ''
                }))
            ],
            'barcode-update': [
                { name: 'productName', label: 'Product Name *', type: 'text', required: true, fullWidth: true },
                { name: 'oldProductCode', label: 'Old Barcode *', type: 'text', required: true },
                { name: 'newProductCode', label: 'New Barcode *', type: 'text', required: true },
            ]
        };
        return fields[actionType] || [];
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
        if (field.fullWidth) group.classList.add('full-width');

        const label = document.createElement('label');
        label.textContent = field.label;
        group.appendChild(label);

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
            checkboxWrap.className = 'field-checkbox-group';
            checkboxWrap.dataset.fieldName = field.name;

            const selectedValues = Array.isArray(field.value) ? field.value : [];
            field.options.forEach(opt => {
                const row = document.createElement('label');
                row.className = 'field-checkbox-row';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'field-checkbox';
                checkbox.dataset.fieldValue = opt.value;
                checkbox.checked = selectedValues.includes(opt.value);

                const text = document.createElement('span');
                text.textContent = opt.label;

                row.appendChild(checkbox);
                row.appendChild(text);
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
                field.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    if (field.value === opt.value) option.selected = true;
                    select.appendChild(option);
                });
                wrapper.appendChild(select);
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
        this.showStatus('Product added!', 'success');
    }

    syncConditionalFieldVisibility() {
        const checkboxGroup = document.querySelector('#productFormFields [data-field-name="updateFields"]');
        if (!checkboxGroup) return;

        const checkedValues = Array.from(checkboxGroup.querySelectorAll('.field-checkbox:checked'))
            .map(el => el.dataset.fieldValue)
            .filter(Boolean);

        document.querySelectorAll('#productFormFields .conditional-field').forEach(field => {
            const dependsValue = field.dataset.dependsValue;
            const isVisible = checkedValues.includes(dependsValue);
            field.classList.toggle('hidden', !isVisible);

            const input = field.querySelector('input, select');
            if (input) {
                input.disabled = !isVisible;
                if (!isVisible) {
                    input.value = input.tagName === 'SELECT' ? (input.options[0]?.value || '') : '';
                }
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

            const el = document.querySelector(`#productFormFields [data-field-name="${field.name}"] input, #productFormFields [data-field-name="${field.name}"] select`);
            const raw = el ? el.value : '';
            data[field.name] = field.numeric ? (parseFloat(raw) || 0) : raw;
        });

        if (!data.productName) {
            this.showStatus('Display Name is required', 'error');
            return null;
        }

        if (actionType === 'update' && (!Array.isArray(data.updateFields) || data.updateFields.length === 0)) {
            this.showStatus('Select at least one field to update.', 'error');
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

    removeProduct(index) {
        this.products.splice(index, 1);
        this.renderProductsTable();
        this.showStatus('Product removed', 'success');
    }

    clearAllProducts() {
        if (confirm('Clear all products?')) {
            this.products = [];
            this.renderProductsTable();
            this.showStatus('All products cleared', 'success');
        }
    }

    switchFormTab(tabName) {
        document.querySelectorAll('.form-tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
        document.querySelectorAll('.form-tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
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
        this.showSuccessModal('Seeder Generated!', `${fileName} downloaded successfully.`);
    }

    copyToClipboard() {
        navigator.clipboard.writeText(this.generatedSeeder).then(() => {
            this.seederNumber++;
            this.updateSeederNumberDisplay(this.seederNumber, this.seedersDirHandle ? 'verified' : 'saved');
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
        this.loadFavorites();
        this.updateStepIndicator();
        this.showStep(1);
        this.renderProductsTable();
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => { app = new DataSeederApp(); });
function closeSuccessModal() { document.getElementById('successModal').classList.add('hidden'); }
function closeErrorModal() { document.getElementById('errorModal').classList.add('hidden'); }
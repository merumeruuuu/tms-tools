import { defaultProducts } from '../label-simulator/libs/tms-products.js';
import { milkBanks, DEMO_PRODUCT_SIGNATURES } from '../label-simulator/js/label-core/configs.js';
import { TimelessEncryption } from '../label-simulator/js/label-core/encryption.js';
import { getMilkBankTemplate } from '../label-simulator/js/label-core/demoTemplates.js';

const barcodeFormats = [
  { label: 'GS1 DataMatrix (2D)', value: 'datamatrix' },
  { label: 'QR Code (2D)', value: 'qrcode' },
  { label: 'Aztec Code (2D)', value: 'azteccode' },
  { label: 'GS1-128 (Clinical 1D)', value: 'gs1-128' },
  { label: 'UPC-A (Retail 1D)', value: 'upca' },
  { label: 'EAN-13 (1D)', value: 'ean13' },
  { label: 'ITF-14 (Case 1D)', value: 'itf14' }
];

const ui = {
  modeButtons: Array.from(document.querySelectorAll('.mode-pill')),
  selectedSummary: document.getElementById('selectedSummary'),
  gtinLock: document.getElementById('gtinLock'),
  gtinValue: document.getElementById('gtinValue'),
  productFields: document.getElementById('productFields'),
  milkbankFields: document.getElementById('milkbankFields'),
  productSearch: document.getElementById('productSearch'),
  productDropdown: document.getElementById('productDropdown'),
  barcodeFormat: document.getElementById('barcodeFormat'),
  startSerial: document.getElementById('startSerial'),
  lotNumber: document.getElementById('lotNumber'),
  expiryDate: document.getElementById('expiryDate'),
  milkBankSearch: document.getElementById('milkBankSearch'),
  milkBankDropdown: document.getElementById('milkBankDropdown'),
  volume: document.getElementById('volume'),
  calories: document.getElementById('calories'),
  batchNumber: document.getElementById('batchNumber'),
  milkType: document.getElementById('milkType'),
  quantity: document.getElementById('quantity'),
  generatedType: document.getElementById('generatedType'),
  generateBtn: document.getElementById('generateBtn'),
  outputArea: document.getElementById('outputArea'),
  outputStatus: document.getElementById('outputStatus'),
  outputCount: document.getElementById('outputCount'),
  previewList: document.getElementById('previewList'),
  copyBtn: document.getElementById('copyBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  clearBtn: document.getElementById('clearBtn')
};

const encryption = new TimelessEncryption('1LQHS67FJ8X3-O0Z5IYK9B4VDWGTEP_MUCANR2');
const today = new Date();
const defaultExpiry = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() + 1).padStart(2, '0')}`;

const state = {
  mode: 'milkbank',
  selectedProduct: null,
  selectedMilkBank: milkBanks.find((bank) => bank.id === '1') || milkBanks[0],
  productSearchQuery: '',
  milkBankSearchQuery: 'Timeless Training',
  generatedLabels: [],
  generatedZpl: ''
};

const demoSettings = {
  labelType: 'milkbank',
  gtin: '',
  productName: '',
  lot: 'DEMO01',
  startSerial: 1,
  volume: 120,
  calories: 20,
  batchNumber: '001319-1',
  milkType: 'Term',
  expiryDate: defaultExpiry,
  quantity: 5,
  barcodeFormat: 'datamatrix',
  facilityName: 'Timeless Training',
  baseId: '013174'
};

defaultProducts.sort((a, b) => a.name.localeCompare(b.name));

function normalize(text) {
  return String(text || '').replace(/^[\[][^\]]*[\]\s*/, '').trim().toLowerCase();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function trunc(str, maxLen) {
  if (!str) return '';
  const value = String(str);
  return value.length > maxLen ? `${value.slice(0, maxLen - 3)}...` : value;
}

function getAllowedBarcodeFormats(category = '') {
  const normalized = String(category || '').trim();

  if (normalized === 'Prolacta') return barcodeFormats.filter((item) => item.value === 'datamatrix');
  if (normalized === 'Cera Products' || normalized === 'Cera') return barcodeFormats.filter((item) => ['upca', 'itf14', 'ean13'].includes(item.value));
  if (normalized === 'Nestle' || normalized === 'Nutricia') return barcodeFormats.filter((item) => ['datamatrix', 'itf14', 'ean13'].includes(item.value));
  if (normalized === 'Abbott' || normalized === 'MJN') return barcodeFormats.filter((item) => ['datamatrix', 'gs1-128', 'itf14', 'ean13'].includes(item.value));
  return barcodeFormats;
}

function setMode(mode) {
  state.mode = mode;
  demoSettings.labelType = mode;
  ui.modeButtons.forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  ui.productFields.classList.toggle('hidden', mode !== 'product');
  ui.milkbankFields.classList.toggle('hidden', mode !== 'milkbank');
  ui.generatedType.value = mode === 'product' ? 'Product' : 'Milk Bank';
  syncSelectionSummary();
  renderFormatOptions();
  renderDropdowns();
  syncGenerateButton();
}

function syncGenerateButton() {
  ui.generateBtn.textContent = `✨ Generate ${Math.max(1, parseInt(demoSettings.quantity, 10) || 1)} Label/s`;
}

function syncSelectionSummary() {
  if (state.mode === 'product') {
    const summary = state.selectedProduct
      ? `Product: ${state.selectedProduct.name} • ${state.selectedProduct.category || 'UNK'} • ${demoSettings.gtin || 'No GTIN loaded'}`
      : 'Select a product to start generating labels.';
    ui.selectedSummary.textContent = summary;
    ui.gtinLock.classList.toggle('hidden', !demoSettings.gtin);
    ui.gtinValue.textContent = demoSettings.gtin || '';
  } else {
    ui.selectedSummary.textContent = state.selectedMilkBank
      ? `Target Milk Bank: ${state.selectedMilkBank.name}`
      : 'Select a milk bank to start generating labels.';
    ui.gtinLock.classList.add('hidden');
    ui.gtinValue.textContent = '';
  }
}

function renderFormatOptions() {
  const options = getAllowedBarcodeFormats(state.selectedProduct?.category);
  if (!options.some((item) => item.value === demoSettings.barcodeFormat)) {
    demoSettings.barcodeFormat = options[0]?.value || 'datamatrix';
  }
  ui.barcodeFormat.innerHTML = options.map((option) => `<option value="${option.value}">${option.label}</option>`).join('');
  ui.barcodeFormat.value = demoSettings.barcodeFormat;
}

function renderDropdowns() {
  const productMatches = defaultProducts
    .filter((product) => {
      if (!state.productSearchQuery) return true;
      const query = normalize(state.productSearchQuery);
      return [product.name, product.category, product.productId].some((field) => String(field || '').toLowerCase().includes(query));
    })
    .slice(0, 12);

  ui.productDropdown.classList.toggle('open', state.productSearchQuery.length > 0 || document.activeElement === ui.productSearch);
  ui.productDropdown.innerHTML = productMatches.length
    ? productMatches.map((product) => `
        <div class="dropdown-item ${state.selectedProduct?.productId === product.productId ? 'active' : ''}" data-product-id="${product.productId}">
          <strong>[${escapeHtml(product.category || 'UNK')}] ${escapeHtml(product.name)}</strong><br>
          <span style="color:#64748b; font-size:12px;">ID: ${escapeHtml(product.productId || 'N/A')} • ${product.barcodes ? product.barcodes.length : 0} barcodes</span>
        </div>
      `).join('')
    : '<div class="dropdown-empty">No products found.</div>';

  const bankMatches = milkBanks
    .filter((bank) => {
      if (!state.milkBankSearchQuery) return true;
      const query = normalize(state.milkBankSearchQuery);
      return bank.name.toLowerCase().includes(query);
    })
    .slice(0, 14);

  ui.milkBankDropdown.classList.toggle('open', state.milkBankSearchQuery.length > 0 || document.activeElement === ui.milkBankSearch);
  ui.milkBankDropdown.innerHTML = bankMatches.length
    ? bankMatches.map((bank) => `
        <div class="dropdown-item ${state.selectedMilkBank?.id === bank.id ? 'active' : ''}" data-bank-id="${bank.id}">
          <strong>${escapeHtml(bank.name)}</strong>
        </div>
      `).join('')
    : '<div class="dropdown-empty">No milk banks found.</div>';
}

function selectProduct(product) {
  state.selectedProduct = product;
  state.productSearchQuery = `${product.name}`;
  ui.productSearch.value = state.productSearchQuery;
  demoSettings.productName = product.name;
  demoSettings.gtin = product.barcodes?.[0]?.value || '';
  demoSettings.facilityName = state.selectedMilkBank?.name || demoSettings.facilityName;
  demoSettings.barcodeFormat = getAllowedBarcodeFormats(product.category)[0]?.value || 'datamatrix';
  ui.barcodeFormat.value = demoSettings.barcodeFormat;
  syncSelectionSummary();
  renderFormatOptions();
  renderDropdowns();
}

function selectMilkBank(bank) {
  state.selectedMilkBank = bank;
  state.milkBankSearchQuery = bank.name;
  ui.milkBankSearch.value = bank.name;
  demoSettings.facilityName = bank.name;
  syncSelectionSummary();
  renderDropdowns();
}

function buildProductBarcodeData(index, serialText) {
  const product = state.selectedProduct;
  const category = product?.category || 'General';
  const rawGtin = (demoSettings.gtin || '00000000000000').replace(/\s+/g, '');
  const gtinPadded = rawGtin.padStart(14, '0');
  const lot = demoSettings.lot || 'DEMO01';
  const expiry = (demoSettings.expiryDate || defaultExpiry).split('-');
  const expFormatted = `${expiry[0].slice(2)}${expiry[1]}${expiry[2]}`;

  if (category === 'Prolacta') {
    return `01${gtinPadded}10${lot}17${expFormatted}21${serialText}`;
  }

  if (['Abbott', 'Nestle', 'Nutricia'].includes(category)) {
    return `01${gtinPadded}17${expFormatted}10${lot}`;
  }

  if (category === 'Gerber') {
    return rawGtin.padStart(12, '0');
  }

  return rawGtin;
}

function buildProductLabel(index) {
  const product = state.selectedProduct;
  const category = product?.category || 'General';
  const format = demoSettings.barcodeFormat || 'datamatrix';
  const productName = trunc(demoSettings.productName || product?.name || 'PRODUCT', 40);
  const rawGtin = (demoSettings.gtin || '00000000000000').replace(/\s+/g, '');
  const gtinPadded = rawGtin.padStart(14, '0');
  const safeGtin = trunc(gtinPadded, 22);
  const lot = trunc(demoSettings.lot || 'DEMO01', 18);
  const quantityTag = String(index + 1).padStart(2, '0');
  const currentSerial = String((parseInt(demoSettings.startSerial, 10) || 1) + index).padStart(3, '0');
  const dateParts = (demoSettings.expiryDate || defaultExpiry).split('-');
  const humanExpDate = `${dateParts[1]}/${dateParts[2]}/${dateParts[0].slice(2)}`;
  const barcodeData = buildProductBarcodeData(index, currentSerial);

  let barcodeCommand = '';

  if (format === 'upca') {
    const upc = rawGtin.length > 12 ? rawGtin.slice(-12) : rawGtin;
    barcodeCommand = `^FO15,50^BY2,2,100^BCN,100,N,N,N,A^FD${upc}^FS\n^FO15,155^A0N,28,28^FD${upc}^FS`;
  } else if (format === 'ean13') {
    const ean = rawGtin.length > 13 ? rawGtin.slice(-13) : rawGtin;
    barcodeCommand = `^FO45,55^BY3,2,80^BEN,80,Y,N^FD${ean}^FS`;
  } else if (format === 'gs1-128') {
    barcodeCommand = `^FO15,50^BY2,2,100^BCN,100,N,N,N,A^FD${barcodeData}^FS\n^FO15,155^A0N,28,28^FD${barcodeData}^FS`;
  } else if (format === 'itf14') {
    barcodeCommand = `^FO15,50^BY3,2,100^B2N,100,N,N,N^FD${gtinPadded}^FS\n^FO15,155^A0N,28,28^FD${gtinPadded}^FS`;
  } else if (format === 'qrcode') {
    barcodeCommand = `^FO15,50^BQN,2,4^FDQA,${barcodeData}^FS`;
  } else if (format === 'azteccode') {
    barcodeCommand = `^FO20,50^B0N,4,N,0,N,1,0^FD${barcodeData}^FS`;
  } else {
    const dmSize = barcodeData.length > 20 ? 5 : 8;
    barcodeCommand = `^FO20,50^BXN,${dmSize},200^FD${barcodeData}^FS`;
  }

  const is1D = ['gs1-128', 'itf14'].includes(format);

  if (format === 'upca') {
    return `^XA\n^FX_TMS_DEMO^FS\n^FO20,15^A0N,24,24^FD${productName}^FS\n^FO20,40^GB410,2,2^FS\n${barcodeCommand}\n^FO20,180^A0N,22,22^FDLOT: ${lot}^FS\n^FO240,180^A0N,22,22^FDEXP: ${humanExpDate}^FS\n^FO340,15^A0N,20,20^FD${quantityTag}^FS\n^XZ\n`;
  }

  if (format === 'ean13') {
    return `^XA\n^FX_TMS_DEMO^FS\n^FO20,15^A0N,24,24^FD${productName}^FS\n^FO20,45^GB410,2,2^FS\n${barcodeCommand}\n^FO20,170^A0N,22,22^FDLOT: ${lot}^FS\n^FO240,170^A0N,22,22^FDEXP: ${humanExpDate}^FS\n^FO370,55^A0N,20,20^FD${quantityTag}^FS\n^XZ\n`;
  }

  if (format === 'qrcode' || format === 'azteccode') {
    return `^XA\n^FX_TMS_DEMO^FS\n^FO20,15^A0N,23,23^FD${productName}^FS\n^FO20,40^GB410,2,2^FS\n^FO145,50^A0N,22,22^FDGTIN: ${safeGtin}^FS\n^FO145,80^A0N,22,22^FDLOT:  ${lot}^FS\n^FO145,110^A0N,22,22^FDEXP:  ${demoSettings.expiryDate || defaultExpiry}^FS\n^FO145,140^A0N,22,22^FDSN:   (21) ${currentSerial}^FS\n${barcodeCommand}\n^FO15,175^A0N,20,20^FD${category || 'UNK'}^FS\n^FO350,175^A0N,20,20^FD${quantityTag}^FS\n^XZ\n`;
  }

  if (is1D) {
    return `^XA\n^FX_TMS_DEMO^FS\n^FO25,15^A0N,25,25^FD${productName}^FS\n^FO10,40^GB400,2,2^FS\n${barcodeCommand}\n^FO25,180^A0N,22,22^FDLot : ${lot}  |  Expiry: ${humanExpDate}^FS\n^FO370,50^A0N,22,22^FD${quantityTag}^FS\n^XZ\n`;
  }

  return `^XA\n^FX_TMS_DEMO^FS\n^FO20,15^A0N,23,23^FD${productName}^FS\n^FO20,40^GB410,2,2^FS\n^FO145,50^A0N,22,22^FDGTIN: ${safeGtin}^FS\n^FO145,80^A0N,22,22^FDLOT:  ${lot}^FS\n^FO145,110^A0N,22,22^FDEXP:  ${demoSettings.expiryDate || defaultExpiry}^FS\n^FO145,140^A0N,22,22^FDSN:   (21) ${currentSerial}^FS\n${barcodeCommand}\n^FO15,175^A0N,20,20^FD${category || 'UNK'}^FS\n^FO350,175^A0N,20,20^FD${quantityTag}^FS\n^XZ\n`;
}

function buildMilkBankLabel(index) {
  const activeBank = state.selectedMilkBank || milkBanks[0];
  const displayFac = activeBank?.name || 'Timeless Training';
  const dbId = activeBank?.id || '1';
  const displayId = demoSettings.batchNumber || Math.floor(100000 + Math.random() * 900000).toString();
  const rawDate = demoSettings.expiryDate || defaultExpiry;
  const d = new Date(`${rawDate}T00:00:00`);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateParts = rawDate.split('-');
  const mmddyy = `${dateParts[1]}${dateParts[2]}${dateParts[0].slice(2)}`;
  const volPadded = Math.round(parseFloat(demoSettings.volume) * 100).toString();
  const calPadded = String(demoSettings.calories);
  const currentSerial = String((parseInt(demoSettings.startSerial, 10) || 1) + index).padStart(3, '0');
  const rawTextToEncrypt = `V04_${dbId}_${displayId}_${currentSerial}_${mmddyy}_${volPadded}_${calPadded}_0`;
  const barcodePayload = encryption.encrypt(rawTextToEncrypt.toUpperCase());
  const safeBankName = trunc(displayFac, 45);

  const context = {
    demoSettings: { ...demoSettings },
    displayId,
    milkType: demoSettings.milkType,
    currentSerial,
    barcodePayload,
    safeBankName,
    trunc,
    d,
    months
  };

  return getMilkBankTemplate(displayFac, context);
}

function generateLabels() {
  const count = Math.max(1, parseInt(demoSettings.quantity, 10) || 1);
  const labels = [];
  const blocks = [];

  for (let i = 0; i < count; i += 1) {
    const code = state.mode === 'product' ? buildProductLabel(i) : buildMilkBankLabel(i);
    labels.push({
      index: i + 1,
      title: state.mode === 'product' ? (state.selectedProduct?.name || 'Product Label') : (state.selectedMilkBank?.name || 'Milk Bank Label'),
      mode: state.mode,
      code
    });
    blocks.push(code.trim());
  }

  state.generatedLabels = labels;
  state.generatedZpl = blocks.join('\n\n');
  ui.outputArea.value = state.generatedZpl;
  ui.outputStatus.textContent = `Generated ${labels.length} label${labels.length === 1 ? '' : 's'}`;
  ui.outputCount.textContent = `${labels.length} labels`;
  renderPreviewList();
}

function renderPreviewList() {
  if (!state.generatedLabels.length) {
    ui.previewList.innerHTML = '';
    return;
  }

  ui.previewList.innerHTML = state.generatedLabels.map((label) => `
    <article class="preview-card">
      <header>
        <div>
          <h3>${escapeHtml(label.title)}</h3>
          <p>${label.mode === 'product' ? 'Product label' : 'Milk bank label'} • ${label.index}</p>
        </div>
        <span class="badge">Label ${label.index}</span>
      </header>
      <div class="preview-snippet">${escapeHtml(label.code.slice(0, 420))}${label.code.length > 420 ? '\n…' : ''}</div>
    </article>
  `).join('');
}

async function copyOutput() {
  if (!state.generatedZpl.trim()) return;
  await navigator.clipboard.writeText(state.generatedZpl);
  ui.outputStatus.textContent = 'Copied to clipboard';
}

function downloadOutput() {
  if (!state.generatedZpl.trim()) return;
  const blob = new Blob([state.generatedZpl], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `barcode-generator-${state.mode}.zpl`;
  anchor.click();
  URL.revokeObjectURL(url);
  ui.outputStatus.textContent = 'Downloaded';
}

function clearOutput() {
  state.generatedZpl = '';
  state.generatedLabels = [];
  ui.outputArea.value = '';
  ui.previewList.innerHTML = '';
  ui.outputStatus.textContent = 'Cleared';
  ui.outputCount.textContent = '0 labels';
}

function attachDropdownHandlers() {
  ui.productDropdown.addEventListener('mousedown', (event) => {
    const item = event.target.closest('.dropdown-item[data-product-id]');
    if (!item) return;
    const product = defaultProducts.find((entry) => entry.productId === item.dataset.productId);
    if (product) selectProduct(product);
  });

  ui.milkBankDropdown.addEventListener('mousedown', (event) => {
    const item = event.target.closest('.dropdown-item[data-bank-id]');
    if (!item) return;
    const bank = milkBanks.find((entry) => entry.id === item.dataset.bankId);
    if (bank) selectMilkBank(bank);
  });
}

function wireEvents() {
  ui.modeButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  });

  ui.productSearch.addEventListener('input', () => {
    state.productSearchQuery = ui.productSearch.value;
    renderDropdowns();
  });
  ui.productSearch.addEventListener('focus', renderDropdowns);
  ui.productSearch.addEventListener('blur', () => setTimeout(() => { ui.productDropdown.classList.remove('open'); }, 150));

  ui.milkBankSearch.addEventListener('input', () => {
    state.milkBankSearchQuery = ui.milkBankSearch.value;
    renderDropdowns();
  });
  ui.milkBankSearch.addEventListener('focus', renderDropdowns);
  ui.milkBankSearch.addEventListener('blur', () => setTimeout(() => { ui.milkBankDropdown.classList.remove('open'); }, 150));

  ui.barcodeFormat.addEventListener('change', () => {
    demoSettings.barcodeFormat = ui.barcodeFormat.value;
    syncSelectionSummary();
  });

  ui.startSerial.addEventListener('input', () => { demoSettings.startSerial = ui.startSerial.value; });
  ui.lotNumber.addEventListener('input', () => { demoSettings.lot = ui.lotNumber.value; });
  ui.expiryDate.addEventListener('input', () => { demoSettings.expiryDate = ui.expiryDate.value; });
  ui.volume.addEventListener('input', () => { demoSettings.volume = ui.volume.value; });
  ui.calories.addEventListener('input', () => { demoSettings.calories = ui.calories.value; });
  ui.batchNumber.addEventListener('input', () => { demoSettings.batchNumber = ui.batchNumber.value; });
  ui.milkType.addEventListener('change', () => { demoSettings.milkType = ui.milkType.value; });
  ui.quantity.addEventListener('input', () => { demoSettings.quantity = ui.quantity.value; syncGenerateButton(); });

  ui.generateBtn.addEventListener('click', generateLabels);
  ui.copyBtn.addEventListener('click', () => copyOutput().catch(() => {}));
  ui.downloadBtn.addEventListener('click', downloadOutput);
  ui.clearBtn.addEventListener('click', clearOutput);
}

function initializeDefaults() {
  const firstProduct = defaultProducts.find((product) => product.barcodes && product.barcodes.length) || defaultProducts[0];
  if (firstProduct) {
    selectProduct(firstProduct);
    ui.productSearch.value = firstProduct.name;
  }

  if (state.selectedMilkBank) {
    ui.milkBankSearch.value = state.selectedMilkBank.name;
  }

  ui.expiryDate.value = demoSettings.expiryDate;
  ui.startSerial.value = demoSettings.startSerial;
  ui.lotNumber.value = demoSettings.lot;
  ui.volume.value = demoSettings.volume;
  ui.calories.value = demoSettings.calories;
  ui.batchNumber.value = demoSettings.batchNumber;
  ui.quantity.value = demoSettings.quantity;
  ui.milkType.value = demoSettings.milkType;
  syncSelectionSummary();
  syncGenerateButton();
  setMode(state.mode);
  renderDropdowns();
}

attachDropdownHandlers();
wireEvents();
initializeDefaults();

# TMS Tools Suite (v2.0) — System Architecture Reference

## 1. System Overview & Manifest Configuration

**TMS Tools Suite** is a 100% local, offline-capable Chrome Manifest V3 extension designed for Timeless Medical Systems (TMS) engineering, QA, and support workflows.

### Manifest & Extension Boundaries (`manifest.json`, `background.js`)
* **Manifest Version:** `3` (`name: "TMS Tools Suite"`, `version: "2.0"`)
* **Entry Point (`background.js`):** Defines no `default_popup`; listens to `chrome.action.onClicked` and opens `dashboard/index.html` in a new browser tab.
* **Declared Permissions:** `storage`, `unlimitedStorage`, `downloads`, `clipboardWrite`
* **Host Permissions:** `http://*.local/*`, `https://*.local/*`, `https://*.timelessmedical.com/*`
* **Content Security Policy (CSP):**
  * `extension_pages`: `script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; object-src 'self'`
  * `sandbox`: `sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'unsafe-inline' 'unsafe-eval'; child-src 'self' blob:; worker-src 'self' blob:;`
* **Sandboxed Pages:** `tools/label-simulator/sandbox.html`
* **Web Accessible Resources:** `tools/phi-scrubber/worker.min.js`, `tools/phi-scrubber/mirth.min.js`, `tools/phi-scrubber/tesseract-core.wasm.js`, `tools/phi-scrubber/eng.traineddata.gz`
* **Build Maintenance Script (`update.js`):** Local Node.js CLI utility (not loaded at runtime) that rewrites relative `../libs/` and `vue.esm-browser.prod.js` paths inside `tools/label-simulator/js/app.js` and sanitizes script tags in `sandbox.html`.

---

## 2. Directory Topology & Suite Navigation

```text
tms-tools/
├── manifest.json             # MV3 configuration, CSP, permissions, sandbox declarations
├── background.js             # Service worker launching dashboard/index.html on icon click
├── update.js                 # Local Node.js path-patching helper for label-simulator
├── assets/icons/             # Shared extension & tool icons (icon16, icon48, icon128, label-icon)
├── dashboard/
│   ├── index.html            # Main tool launcher grid
│   ├── dashboard.js          # Click handler routing .tool-card[data-path] via window.location.href
│   └── dashboard.css         # Suite theme tokens (--primary: #0f766e, --bg-main: #f8fafc)
└── tools/
    ├── label-simulator/      # Two-layer (shell + sandboxed iframe) ZPL/EPL renderer & calibrator
    ├── data-seeder-generator/# 3-step Laravel seeder & SQL generator with WAMP FS access
    ├── json-studio/          # 3-pane JSON formatter, structural differ, & PHP array builder
    ├── phi-scrubber/         # 3-pane HL7/ZPL/text PHI scrubber IDE, tree inspector, & popup
    ├── barcode-generator/    # Legacy/standalone module (card commented out in dashboard/index.html)
    └── barcode-simulator/    # Unlinked directory on disk (no active dashboard card)
```

---

## 3. Module Architectures

### 3.1 Virtual Label Simulator (`tools/label-simulator/`)

#### Two-Layer Sandbox & Deferred Boot
Because Vue runtime template compilation, Monaco Editor workers, and legacy rendering libraries require `'unsafe-eval'` and `blob:` workers, the simulator splits execution across two contexts:
1. **Privileged Outer Shell (`index.html`, `index.js`):**
   * Runs under `extension_pages` CSP with full access to `chrome.storage.local`, host-permitted `fetch()` (bypassing CORS), and the File System Access API (`window.showDirectoryPicker`).
   * Imports shared utilities `../data-seeder-generator/js/wamp-detector.js` and `../data-seeder-generator/js/fs-access.js`.
   * Embeds `<iframe id="sandboxFrame" src="sandbox.html" sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin">`.
2. **Sandboxed Inner App (`sandbox.html`, `js/shield.js`, `js/app.js`):**
   * `js/shield.js` loads synchronously in `<head>` before any other script, replacing `window.localStorage` and `window.sessionStorage` with an in-memory `memoryStorage` proxy that forwards writes to the parent via `SAVE_STORAGE`.
   * On `frame.onload`, `index.js` reads `chrome.storage.local.get(null)` and sends `SYNC_STORAGE` to `sandbox.html`. Only after `shield.js` receives `SYNC_STORAGE` does it dynamically append `<script type="module" src="./js/app.js">` to boot Vue 3 (`#tms-label-app`).

#### `postMessage` Bridge Contract (`sandbox.html` ↔ `index.js`)
| Action | Direction | Payload / Behavior |
| :--- | :--- | :--- |
| `SYNC_STORAGE` | `index.js` → `sandbox` | `{ data: Object }` — Hydrates `memoryStorage._data` from `chrome.storage.local` and boots `app.js`. |
| `SAVE_STORAGE` | `sandbox` → `index.js` | `{ key, value }` — Persists `tms_products`, `tms_client_defaults`, `tms_calibrations`, `tms_qa_urls`, etc. to `chrome.storage.local`. |
| `CLEAR_ALL_STORAGE` | `sandbox` → `index.js` | Calls `chrome.storage.local.clear()` (triggered by `nukeCache` / `Shift+C` in calibration mode). |
| `RELOAD_APP` | `sandbox` → `index.js` | Calls `window.location.reload()` on the outer shell (used after toggling hidden Dev Mode via 5 clicks on `#secret-trigger`). |
| `GO_DASHBOARD` | `sandbox` → `index.js` | Navigates outer shell to `../../dashboard/index.html`. |
| `FETCH_API` | `sandbox` → `index.js` | `{ id, url, headers, method }` — Executes `fetch()` from extension origin and replies with `FETCH_SUCCESS` (`{ id, data }`) or `FETCH_ERROR` (`{ id, error }`). |
| `SWITCH_BUILD_FOLDER` | `sandbox` → `index.js` | `{ id }` — Opens `showDirectoryPicker({ id: 'label-simulator-build-root', mode: 'readwrite' })`, stores handle in `fsAccessManager`, replies with `SWITCH_BUILD_FOLDER_RESULT`. |
| `INJECT_API` | `sandbox` → `index.js` | `{ id, url, apiKey }` — Locates local WAMP Laravel build, injects `fetchQaLabels` & `downloadQaLabel` into `vendor/timeless/customers/.../UtilityController.php` and `api.php`, deletes `bootstrap/cache/routes*.php`, replies with `INJECT_API_RESULT`. |

#### Rendering, Calibration & Demo Generation (`js/app.js`, `js/label-core/*`)
* **ZPL Pipeline:** Converts ZPL text/graphics via `libs/zpl-renderer.min.js` (`zplToBase64Async`), strips barcode commands (`^BX`, `^B0`, `^BQ`, `^BU`, `^BC`, `^B2`), and composites crisp barcodes onto a 2D `<canvas>` overlay using `libs/bwip-js-min.js` so X/Y/size calibration offsets apply uniformly.
* **EPL Pipeline:** Pure local `<canvas>` renderer (`renderLabelLocally`) parsing `A` (text with per-font scalars `1`–`6`), `b` (2D barcodes via `bwip-js`), `B` (1D barcodes), and `LE/LO/LS/LW/X` (lines/boxes).
* **Signature Calibration (`configs.js`):** Matches per-label rules by deterministic signatures (`[DEMO_]ZPL_<BC>_<X>_<Y>` and `[DEMO_]EPL_<BC>_<X>_<Y>[_F<fonts>]`), printer hardware profiles (`printerConfigs`), and URL keyword presets (`clientDefaults`).
* **Demo Generator (`demoTemplates.js`, `encryption.js`):** Generates product labels (GS1 DataMatrix, GS1-128, UPC-A, EAN-13, ITF-14, QR, Aztec) and facility-specific milk bank templates using `TimelessEncryption` (`D04...` payloads keyed from `<meta name="tms-env">`).
* **Printing & Editor:** Integrates local **QZ Tray** WebSockets (`libs/qz-tray.min.js`) and **Monaco Editor** (`libs/monaco-editor/` via Blob worker).

---

### 3.2 Data Seeder Generator (`tools/data-seeder-generator/`)

#### Execution & Shared Utilities (`index.html`)
Runs directly in `extension_pages` context, loading vanilla JS singletons sequentially via `<script>` tags (`mammoth.browser.min.js`, `wamp-detector.js`, `seeder-generator.js`, `csv-handler.js`, `fs-access.js`, `idb-keyval.js`, `app.js`, `constants.js`, `templates/q3-template.js`, `api-service.js`, `templates/v6-sql-template.js`, `templates/v7-sql-template.js`).

#### 3-Step Wizard (`js/app.js` → `DataSeederApp`)
1. **Step 1 — Target Build Detection (`wamp-detector.js`, `fs-access.js`):**
   * `wampDetector.parseUrl()` parses `.local` hostnames (e.g., `chla7-v7-3-5.local`) into `{ clientName, version, quarter, hostname, buildFolderName }`, mapping `v7-23`/`q1`/`v22` → `Q1`, `v7-2` → `Q2`, `v7-3` → `Q3`, and `v7-4` → `Q4`.
   * `fsAccessManager` persists `FileSystemDirectoryHandle` / `FileSystemFileHandle` entries in IndexedDB (`seeder-fs-handles`), resolves Apache `<VirtualHost>` `.conf` files and Windows `hosts` entries, locates `vendor/timeless/customers/src/Database/Seeds/ClientDataUpdates`, and scans existing `DATA(\d+)\.php` files (`getHighestSeederNumber`) to compute the next seeder number.
2. **Step 2 — Batch Input (4 Modes):**
   * **Manual Entry:** Supports 6 actions (`create`, `add-form-factor`, `update` with conditional field toggles from `UPDATE_FIELD_DEFINITIONS`, `barcode-update`, `add-manufacturer`, `add-unit`) plus a dynamic container packaging hierarchy builder (outermost container at top in UI, reversed to innermost-first in `product.hierarchy`).
   * **Products From TMNS (`api-service.js`):** Authenticates with Bearer token (`localStorage['tms_api_config']`), fetches facilities (`GET /api/internal/cpoe/v1/get-facilities`), paginates product catalogs (`GET /api/internal/cpoe/v1/get-product-by-facility/{facilityId}/{offset}/1`) into IndexedDB (`cachedApiProducts`), and fetches nutrient/item details when rows are checked (`GET /api/internal/cpoe/v1/get-product-by-itemid/{facilityId}/{itemIds}`).
   * **Doc Import:** Extracts `.docx` request forms offline via `mammoth.extractRawText()` and regex boundary splitting (`processExtractedDocText`).
   * **CSV Import (`csv-handler.js`):** Parses quoted/multiline CSVs matching CHKD Product List headers and converts multiline `Form Factors` columns into `hierarchy` arrays.
3. **Step 3 — Code Preview & Export:**
   * Switches live between `php-v7` (`SeederTemplates.Q3`), `sql-v7` (`SeederTemplates.SQL_V7`), and `sql-v6` (`SeederTemplates.SQL_V6`).
   * Exports via **Auto-Write** (`fsAccessManager.writeSeederFile`, available on `php-v7` when a directory handle is linked), **Download** (`.php`/`.sql` Blob), or **Copy Code**, incrementing `seederNumber` after each export.

#### Schema & Template Engine (`constants.js`, `templates/q3-template.js`)
* `DB_SCHEMA` centralizes table and column names (`nutrition_product_types`, `nutrition_product_type_items`, `nutrition_product_type_form_factors`, `nutrition_product_types_history` with action codes `9000` create / `9001` update, `nutrition_product_types_manufacturer`, `nutrition_product_types__applicable_form_factor_types`, `nutrition_product_types__additive_context_units`, and `units`).
* `SeederTemplates.Q3` wraps all blocks in `DB::beginTransaction()` with `SET FOREIGN_KEY_CHECKS=0/1`, constructs parent-child `NutritionProductTypeFormFactor` chains, and logs completion to `AutomatedUpdates`.

---

### 3.3 JSON Studio (`tools/json-studio/`)

* **Execution & Layout (`index.html`, `app.css`, `app.js`):** Runs in `extension_pages` with a 3-pane top workspace (`leftInput`, `rightInput`, `resultOutput`) and a bottom `compare-panel`.
* **Per-Pane History:** Maintains independent undo/redo stacks (`history.left`, `history.right`) bound to `Ctrl+Z`, `Ctrl+Y`, and `Ctrl+Shift+Z`, plus formatting modes (`beautify`, `minify`, `sort`, `compact-arrays`).
* **Structural Diff & Selective Merge:**
  * `deepDiff()` compares parsed trees (`normalizeForCompare()` with optional order-insensitive array matching via `stableSignature()`), classifying nodes as `add`, `remove`, `change`, or `equal`.
  * Users filter diff types via checkboxes (`.diff-merge-type`), merge selected diffs left or right (`setAtPath`, `deleteAtPath`), and generate PHP/Laravel array syntax (`buildConsolidatedArrayPreview()` → `$settings = [...]`).

---

### 3.4 PHI Scrubber (`tools/phi-scrubber/`)

* **Primary Dashboard App (`app.html`, `app.js`):**
  * Runs in `extension_pages` and persists custom replacement values (`savedPrefix`, `savedFirst`, `savedMiddle`, `savedLast`, `savedNickname`, `savedId`, `savedPhone`, `savedEmail`, `savedAddress`, `savedDate`) in `chrome.storage.local`.
  * **Paste Auto-Formatter (`autoFormatData`):** Intercepts `paste` events on `raw-editor` to restore newlines on flattened or OCR-corrupted HL7 messages (`MSH`, `EVN`, `PID`, `PD1`, `NK1`, `PV1`, `PV2`, `OBX`, `ORC`, `OBR`, `IN1`, `IN2`, `GT1`, `AL1`, `DG1`, `PR1`, `MRG`, `RXO`, `RXE`, `SCH`, `REF`, `NTE`, `ODS`, `Z`, plus `MSH|^~\&` header repair) and ZPL commands (`^XA`, `^FO`, `^A0`, `^FD`, `^FS`, `^XZ`).
  * **Dual-Mode PHI Engine (`runCoreEngine(text, mode)`):**
    * `diff` mode: Three-pane synchronized IDE (`raw-editor` with `<mark class="phi-red">`, center `action-editor` gutter with per-line undo `↺` / redo `↻` backed by `originalLinesStore` / `modifiedLeftStore` / `modifiedRightStore`, and `clean-editor` with `<mark class="phi-green">`).
    * `scan` mode: Audits text in place without replacement (`<mark class="phi-yellow">`) and reports safe/unsafe match counts.
    * Uses structured HL7 field-index mapping (`hl7Map` across `PID`, `NK1`, `PV1`, `PV2`, `ORC`, `OBR`, `OBX`, `IN1`, `IN2`, `GT1`, `MRG`, `PR1`, `DG1`, `PD1` with `IGNORE` rules for `MSH`/`EVN`), regex fallbacks (`fallbackPatterns` for test keywords, SSN, phone, email, dates excluding `Expires:`/`Exp:`, addresses, HL7 `Last^First` tokens, quoted/comma names), and whitelist checks (`isTextSafe`, `blacklist`, `nameIgnore`).
  * **HL7 Tree Inspector (`hl7Dictionary`):** Parses HL7 lines from `raw-editor` into an expandable segment-and-field tree (`MSH-1`, `PID-5`, etc.).
* **Popup Utility (`popup.html`, `popup.js`):** Lightweight popup supporting regex text redaction and `.txt`/`.csv`/`.json` file scrubbing exported via `chrome.downloads.download({ saveAs: true })`.

---

## 4. Storage & Persistence Map

| Storage Mechanism | Key(s) | Owner Module | Purpose |
| :--- | :--- | :--- | :--- |
| `chrome.storage.local` | `tms_products`, `tms_client_defaults`, `tms_calibrations`, `tms_qa_urls` | `label-simulator` (`index.js` ↔ `shield.js`) | Persists product barcode overrides, URL hardware defaults, calibration rules, and saved build URLs across sandbox reloads. |
| `chrome.storage.local` | `savedPrefix`, `savedFirst`, `savedMiddle`, `savedLast`, `savedNickname`, `savedId`, `savedPhone`, `savedEmail`, `savedAddress`, `savedDate` | `phi-scrubber` (`app.js`) | Persists custom dummy replacement values. |
| `localStorage` | `seederFavorites`, `seederNumbers`, `tms_api_config` | `data-seeder-generator` (`app.js`, `wamp-detector.js`, `api-service.js`) | Stores saved WAMP builds, last-used `DATA{n}` numbers, and TMNS CPOE API credentials/facility selection. |
| `sessionStorage` | `dataSeederWorkflow` | `data-seeder-generator` (`app.js`) | Auto-saves mid-wizard step, form inputs, hierarchy rows, and staged batch across page refreshes. |
| `IndexedDB` (`seeder-fs-handles`) | `wamp-root`, `apache-vhost-root`, `windows-hosts-file`, `build-parent-roots`, `build:<host>\|<root>` | `data-seeder-generator` & `label-simulator` (`fs-access.js`) | Persists File System Access API directory/file handles across sessions. |
| `IndexedDB` (`keyval-store`) | `cachedApiProducts` | `data-seeder-generator` (`app.js` via `idb-keyval.js`) | Caches the full facility product catalog fetched from TMNS CPOE API. |

---

## 5. Architectural Invariants & Guardrails

1. **Zero External Network Calls for PHI:** Never introduce remote CDNs, external analytics, or cloud API calls. `phi-scrubber` and `label-simulator` must process all data 100% locally.
2. **Respect Sandbox Isolation:** Never call `chrome.*` APIs inside `tools/label-simulator/sandbox.html` or its scripts; always route storage, CORS-bypassed fetches, and file system actions through `window.parent.postMessage` to `tools/label-simulator/index.js`.
3. **MV3 CSP Compliance:** Keep all HTML files free of inline `<script>` blocks (except inside `sandbox.html` where allowed by sandbox CSP) and avoid introducing npm/Webpack/Vite build steps—preserve the vanilla ES6+ and global script conventions.
4. **Cross-Tool Shared Files:** Changes to `tools/data-seeder-generator/js/wamp-detector.js` or `tools/data-seeder-generator/js/fs-access.js` directly affect `tools/label-simulator/index.js`—verify both tools whenever modifying those utilities.
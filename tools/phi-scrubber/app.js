document.addEventListener('DOMContentLoaded', () => {
  const overrideSegmentSelect = document.getElementById('override-segment');
  const customSegmentRow = document.getElementById('custom-segment-row');
  const overrideCustomSegmentInput = document.getElementById('override-custom-segment');
  const overrideFieldInput = document.getElementById('override-field');
  const overrideValueInput = document.getElementById('override-value');
  const fieldOptionsList = document.getElementById('field-options');
  const overrideListContainer = document.getElementById('override-list');

  const dummyPrefixInput = document.getElementById('dummy-prefix');
  const dummyFirstInput = document.getElementById('dummy-first');
  const dummyMiddleInput = document.getElementById('dummy-middle');
  const dummyLastInput = document.getElementById('dummy-last');
  const dummyNicknameInput = document.getElementById('dummy-nickname');
  const dummyPhoneInput = document.getElementById('dummy-phone');
  const dummyEmailInput = document.getElementById('dummy-email');
  const dummyAddressInput = document.getElementById('dummy-address');
  const dummyDateInput = document.getElementById('dummy-date');

  const rawEditor = document.getElementById('raw-editor');
  const cleanEditor = document.getElementById('clean-editor');
  const actionEditor = document.getElementById('action-editor');

  window.originalLinesStore = [];
  window.modifiedLeftStore = [];
  window.modifiedRightStore = [];

  // Array of { path: 'PID-3.1', label: 'MRN', value: '11111' }
  let segmentOverrides = [];

  const escapeHtml = (t) => String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const normalizeStr = (s) => s ? s.toString().replace(/[^a-z0-9]/gi, '').toLowerCase() : '';

  function randomizeString(str) {
    return str
      .replace(/[A-Z]/g, 'X')
      .replace(/[a-z]/g, 'x')
      .replace(/[0-9]/g, '0');
  }

  // --- CONTEXT-AWARE FIELD SUGGESTIONS PER HL7 SEGMENT ---
  const segmentFieldPresets = {
    PID: [
      { path: '3.1', label: 'MRN' },
      { path: '2.1', label: 'Patient ID' },
      { path: '4.1', label: 'Alternate ID' },
      { path: '5', label: 'Full Name (Last^First)' },
      { path: '5.1', label: 'Last Name' },
      { path: '5.2', label: 'First Name' },
      { path: '5.3', label: 'Middle Name' },
      { path: '6', label: "Mother's Maiden Name" },
      { path: '7', label: 'Date of Birth' },
      { path: '9', label: 'Patient Alias' },
      { path: '11', label: 'Address (Street^Apt^City^ST^Zip)' },
      { path: '13.1', label: 'Home Phone' },
      { path: '13.4', label: 'Email' },
      { path: '14.1', label: 'Work Phone' },
      { path: '18.1', label: 'Account / FIN' },
      { path: '19', label: 'SSN' },
      { path: '21.1', label: 'Mother MRN' }
    ],
    ORC: [
      { path: '2.1', label: 'Placer Order #' },
      { path: '3.1', label: 'Filler Order #' },
      { path: '4.1', label: 'Placer Group #' },
      { path: '10', label: 'Entered By (ID^Last^First)' },
      { path: '11', label: 'Verified By (ID^Last^First)' },
      { path: '12', label: 'Ordering Provider (ID^Last^First)' },
      { path: '12.1', label: 'Ordering Provider ID' },
      { path: '12.2', label: 'Ordering Provider Last' },
      { path: '12.3', label: 'Ordering Provider First' },
      { path: '14.1', label: 'Callback Phone' }
    ],
    PV1: [
      { path: '19.1', label: 'Visit / CSN #' },
      { path: '3', label: 'Assigned Location (Unit^Room^Bed)' },
      { path: '5.1', label: 'Preadmit #' },
      { path: '7', label: 'Attending Doctor (ID^Last^First)' },
      { path: '8', label: 'Referring Doctor (ID^Last^First)' },
      { path: '9', label: 'Consulting Doctor (ID^Last^First)' },
      { path: '17', label: 'Admitting Doctor (ID^Last^First)' }
    ],
    OBR: [
      { path: '2.1', label: 'Placer Order #' },
      { path: '3.1', label: 'Filler Order #' },
      { path: '16', label: 'Ordering Provider (ID^Last^First)' },
      { path: '28', label: 'Result Copies To' }
    ],
    NK1: [
      { path: '2', label: 'Next of Kin Name (Last^First)' },
      { path: '4', label: 'Address' },
      { path: '5.1', label: 'Home Phone' },
      { path: '6.1', label: 'Business Phone' },
      { path: '33.1', label: 'Identifier' }
    ],
    GT1: [
      { path: '2.1', label: 'Guarantor ID' },
      { path: '3', label: 'Guarantor Name (Last^First)' },
      { path: '5', label: 'Guarantor Address' },
      { path: '6.1', label: 'Guarantor Phone' },
      { path: '12', label: 'Guarantor SSN' }
    ],
    IN1: [
      { path: '2.1', label: 'Plan ID' },
      { path: '3.1', label: 'Company ID' },
      { path: '16', label: 'Insured Name (Last^First)' },
      { path: '36', label: 'Policy #' }
    ],
    MSH: [
      { path: '3', label: 'Sending Application' },
      { path: '4', label: 'Sending Facility' },
      { path: '5', label: 'Receiving Application' },
      { path: '6', label: 'Receiving Facility' }
    ],
    RXE: [
      { path: '15', label: 'Prescription #' }
    ],
    SPM: [
      { path: '2.1', label: 'Specimen ID' },
      { path: '3.1', label: 'Parent Specimen ID' }
    ]
  };

  function getActiveSegmentCode() {
    const selected = (overrideSegmentSelect.value || 'PID').toUpperCase();
    if (selected === 'CUSTOM') {
      return (overrideCustomSegmentInput.value || '').trim().toUpperCase();
    }
    return selected;
  }

  function updateFieldOptionsForSegment() {
    const isCustom = overrideSegmentSelect.value === 'CUSTOM';
    customSegmentRow.classList.toggle('hidden', !isCustom);

    const seg = getActiveSegmentCode().replace(/\[\d+\]$/, '');
    const presets = segmentFieldPresets[seg] || [];
    fieldOptionsList.innerHTML = '';

    presets.forEach((item) => {
      const opt = document.createElement('option');
      opt.value = `${item.path} (${item.label})`;
      fieldOptionsList.appendChild(opt);
    });

    if (presets.length > 0) {
      overrideFieldInput.placeholder = `e.g. ${presets[0].path} (${presets[0].label})`;
    } else {
      overrideFieldInput.placeholder = 'e.g. 3 or 4.1';
    }
  }

  overrideSegmentSelect.addEventListener('change', () => {
    overrideFieldInput.value = '';
    updateFieldOptionsForSegment();
  });
  overrideCustomSegmentInput.addEventListener('input', updateFieldOptionsForSegment);
  updateFieldOptionsForSegment();

  // Parse TMS HL7 field descriptor: <SEG>[<segIdx>]-<field>[<rep>].<comp>[<subcomp>]
  function parseTmsFieldDescriptor(descriptor) {
    const clean = (descriptor || '').trim();
    const match = clean.match(
      /^([A-Za-z][A-Za-z0-9]{2})(?:\[(\d+)\])?-(\d+)(?:\[(\d+)\])?(?:\.(\d+)(?:\[(\d+)\])?)?$/
    );
    if (!match) return null;
    return {
      segment: match[1].toUpperCase(),
      segmentIndex: match[2] ? parseInt(match[2], 10) : null,
      field: parseInt(match[3], 10),
      repetition: match[4] ? parseInt(match[4], 10) : null,
      component: match[5] ? parseInt(match[5], 10) : null,
      subcomponent: match[6] ? parseInt(match[6], 10) : null
    };
  }

  // Automatically resolves segment + field into a canonical TMS descriptor (e.g. ORC + "2.1 (Placer Order #)" -> "ORC-2.1")
  function buildCanonicalDescriptor(rawSeg, rawField) {
    const segPart = (rawSeg || '').trim().toUpperCase();
    let fieldPart = (rawField || '').trim();
    let label = '';

    const labelMatch = fieldPart.match(/^([^\s(]+)\s*\(([^)]+)\)$/);
    if (labelMatch) {
      fieldPart = labelMatch[1].trim();
      label = labelMatch[2].trim();
    } else {
      fieldPart = fieldPart.split(/\s+/)[0];
    }

    // If user typed a full descriptor in the Field box (e.g. "ORC-2.1"), auto-assign to that segment
    let fullPath = '';
    if (/^[A-Za-z][A-Za-z0-9]{2}(?:\[\d+\])?-\d+/.test(fieldPart)) {
      fullPath = fieldPart.toUpperCase();
    } else if (segPart && fieldPart) {
      fullPath = `${segPart}-${fieldPart.replace(/^-+/, '')}`.toUpperCase();
    }

    const parsed = parseTmsFieldDescriptor(fullPath);
    if (!parsed) return null;

    if (!label) {
      const presets = segmentFieldPresets[parsed.segment] || [];
      const shortPath = parsed.component ? `${parsed.field}.${parsed.component}` : `${parsed.field}`;
      const hit = presets.find(p => p.path === shortPath);
      if (hit) label = hit.label;
    }

    return { path: fullPath, label };
  }

  function renderOverrideList() {
    overrideListContainer.innerHTML = '';
    segmentOverrides.forEach((item, idx) => {
      const chip = document.createElement('div');
      chip.className = 'override-chip';
      const titleLabel = item.label ? `${item.path} (${item.label})` : item.path;
      chip.innerHTML = `
        <span class="override-chip-label" title="${escapeHtml(titleLabel)} = ${escapeHtml(item.value)}">
          <span class="override-chip-path">${escapeHtml(item.path)}</span>${item.label ? ` <span style="color:#64748b;">(${escapeHtml(item.label)})</span>` : ''} &rarr; ${escapeHtml(item.value)}
        </span>
        <button type="button" class="override-chip-remove" data-idx="${idx}" title="Remove">&times;</button>
      `;
      overrideListContainer.appendChild(chip);
    });
  }

  function addSegmentOverride() {
    const status = document.getElementById('save-status');
    const resolved = buildCanonicalDescriptor(getActiveSegmentCode(), overrideFieldInput.value);
    const val = overrideValueInput.value.trim();

    if (!resolved || !val) {
      status.style.color = 'var(--danger)';
      status.innerText = 'Select/enter a segment, field (e.g. 2.1), and value.';
      setTimeout(() => { status.innerText = ''; status.style.color = ''; }, 3000);
      return;
    }

    // Sync the Segment dropdown if user typed a full descriptor like "ORC-2.1" into the Field box
    const parsed = parseTmsFieldDescriptor(resolved.path);
    if (parsed) {
      const hasOption = Array.from(overrideSegmentSelect.options).some(opt => opt.value === parsed.segment);
      if (hasOption) {
        overrideSegmentSelect.value = parsed.segment;
      } else {
        overrideSegmentSelect.value = 'CUSTOM';
        overrideCustomSegmentInput.value = parsed.segment;
      }
      updateFieldOptionsForSegment();
    }

    const existingIdx = segmentOverrides.findIndex(r => r.path === resolved.path);
    if (existingIdx >= 0) {
      segmentOverrides[existingIdx].value = val;
      segmentOverrides[existingIdx].label = resolved.label;
    } else {
      segmentOverrides.push({ path: resolved.path, label: resolved.label, value: val });
    }

    overrideFieldInput.value = '';
    overrideValueInput.value = '';
    renderOverrideList();
  }

  document.getElementById('btn-add-override').addEventListener('click', addSegmentOverride);
  overrideValueInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSegmentOverride();
    }
  });

  overrideListContainer.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('override-chip-remove')) {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      if (!Number.isNaN(idx)) {
        segmentOverrides.splice(idx, 1);
        renderOverrideList();
      }
    }
  });

  // Load saved preferences from chrome.storage.local
  chrome.storage.local.get([
    'savedPrefix', 'savedFirst', 'savedMiddle', 'savedLast', 'savedNickname',
    'savedPhone', 'savedEmail', 'savedAddress', 'savedDate',
    'savedSegmentRules'
  ], (result) => {
    if (result.savedPrefix) dummyPrefixInput.value = result.savedPrefix;
    if (result.savedFirst) dummyFirstInput.value = result.savedFirst;
    if (result.savedMiddle) dummyMiddleInput.value = result.savedMiddle;
    if (result.savedLast) dummyLastInput.value = result.savedLast;
    if (result.savedNickname) dummyNicknameInput.value = result.savedNickname;
    if (result.savedPhone) dummyPhoneInput.value = result.savedPhone;
    if (result.savedEmail) dummyEmailInput.value = result.savedEmail;
    if (result.savedAddress) dummyAddressInput.value = result.savedAddress;
    if (result.savedDate) dummyDateInput.value = result.savedDate;

    if (Array.isArray(result.savedSegmentRules)) {
      segmentOverrides = result.savedSegmentRules.filter(r => r && r.path && r.value);
      renderOverrideList();
    }
  });

  document.getElementById('btn-save-settings').addEventListener('click', () => {
    chrome.storage.local.set({
      savedPrefix: dummyPrefixInput.value,
      savedFirst: dummyFirstInput.value,
      savedMiddle: dummyMiddleInput.value,
      savedLast: dummyLastInput.value,
      savedNickname: dummyNicknameInput.value,
      savedPhone: dummyPhoneInput.value,
      savedEmail: dummyEmailInput.value,
      savedAddress: dummyAddressInput.value,
      savedDate: dummyDateInput.value,
      savedSegmentRules: segmentOverrides
    }, () => {
      const status = document.getElementById('save-status');
      status.style.color = 'var(--secondary)';
      status.innerText = 'Settings Saved!';
      setTimeout(() => { status.innerText = ''; }, 3000);
    });
  });

  // --- TAB LOGIC ---
  const tabText = document.getElementById('tab-text');
  const tabInspector = document.getElementById('tab-inspector');
  const viewText = document.getElementById('view-text');
  const viewInspector = document.getElementById('view-inspector');

  function switchTab(activeTab, activeView) {
    [tabText, tabInspector].forEach(t => t.classList.remove('active'));
    [viewText, viewInspector].forEach(v => {
      v.classList.remove('active');
      v.classList.add('hidden');
    });

    activeTab.classList.add('active');
    activeView.classList.add('active');
    activeView.classList.remove('hidden');
  }

  tabText.addEventListener('click', () => switchTab(tabText, viewText));
  tabInspector.addEventListener('click', () => switchTab(tabInspector, viewInspector));

  // --- SYNCHRONIZED SCROLLING ---
  let isSyncingScroll = false;
  function handleScroll(e) {
    if (isSyncingScroll) return;
    isSyncingScroll = true;
    const top = e.target.scrollTop;
    const left = e.target.scrollLeft;

    if (e.target !== rawEditor) {
      rawEditor.scrollTop = top;
      rawEditor.scrollLeft = left;
    }
    if (e.target !== cleanEditor) {
      cleanEditor.scrollTop = top;
      cleanEditor.scrollLeft = left;
    }
    if (e.target !== actionEditor) {
      actionEditor.scrollTop = top;
    }
    setTimeout(() => { isSyncingScroll = false; }, 20);
  }

  rawEditor.addEventListener('scroll', handleScroll);
  cleanEditor.addEventListener('scroll', handleScroll);

  // --- TMS HL7 DELIMITER & PARSING HELPERS (ALIGNED WITH HL7.php / MSH.php) ---
  function extractHl7Delimiters(lines) {
    const config = {
      fieldSep: '|',
      compSep: '^',
      repSep: '~',
      escChar: '\\',
      subCompSep: '&'
    };

    const headerLine = lines.find(l => /^(?:MSH|FHS|BHS)[^A-Za-z0-9]/.test(l));
    if (headerLine && headerLine.length >= 4) {
      config.fieldSep = headerLine[3];
      const secondSepIdx = headerLine.indexOf(config.fieldSep, 4);
      const encodingChars = secondSepIdx > 4
        ? headerLine.slice(4, secondSepIdx)
        : headerLine.slice(4, 8);
      if (encodingChars.length >= 1) config.compSep = encodingChars[0];
      if (encodingChars.length >= 2) config.repSep = encodingChars[1];
      if (encodingChars.length >= 3) config.escChar = encodingChars[2];
      if (encodingChars.length >= 4) config.subCompSep = encodingChars[3];
    }

    return config;
  }

  function splitUnescaped(str, sep, escChar = '\\') {
    if (!str || !sep) return [str];
    const parts = [];
    let current = '';

    for (let i = 0; i < str.length; i++) {
      if (str[i] === sep) {
        let escCount = 0;
        let k = i - 1;
        while (k >= 0 && str[k] === escChar) {
          escCount++;
          k--;
        }
        if (escCount % 2 === 0) {
          parts.push(current);
          current = '';
          continue;
        }
      }
      current += str[i];
    }
    parts.push(current);
    return parts;
  }

  function unescapeHl7Text(str, delims) {
    if (!str || !delims.escChar || !str.includes(delims.escChar)) return str;
    const e = escapeRegex(delims.escChar);
    return str
      .replace(new RegExp(`${e}F${e}`, 'g'), delims.fieldSep)
      .replace(new RegExp(`${e}R${e}`, 'g'), delims.repSep)
      .replace(new RegExp(`${e}S${e}`, 'g'), delims.compSep)
      .replace(new RegExp(`${e}T${e}`, 'g'), delims.subCompSep)
      .replace(new RegExp(`${e}E${e}`, 'g'), delims.escChar);
  }

  function parseDummyAddress(addressStr) {
    const raw = (addressStr || '123 Fake St, City, ST').trim();
    const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
    const street = parts[0] || '123 Fake St';
    const city = parts[1] || 'City';
    let state = 'ST';
    let zip = '00000';

    if (parts[2]) {
      const stateZip = parts[2].split(/\s+/);
      if (stateZip[0]) state = stateZip[0];
      if (stateZip[1]) zip = stateZip[1];
    }
    if (parts[3] && /^\d{5}/.test(parts[3])) {
      zip = parts[3];
    }

    return { full: raw, street, city, state, zip };
  }

  function parseDummyDateParts(dateStr) {
    const raw = (dateStr || '01/01/2000').trim();
    if (/^\d{8}$/.test(raw)) {
      return { year: raw.slice(0, 4), month: raw.slice(4, 6), day: raw.slice(6, 8) };
    }
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(raw)) {
      const [y, m, d] = raw.split(/[-/]/);
      return { year: y, month: m.padStart(2, '0'), day: d.padStart(2, '0') };
    }
    const slashParts = raw.split(/[-/]/);
    if (slashParts.length === 3) {
      return {
        month: slashParts[0].padStart(2, '0'),
        day: slashParts[1].padStart(2, '0'),
        year: slashParts[2].length === 2 ? `20${slashParts[2]}` : slashParts[2]
      };
    }
    return { year: '2000', month: '01', day: '01' };
  }

  function formatDummyDate(originalToken, dummyDateStr) {
    const { year, month, day } = parseDummyDateParts(dummyDateStr);
    const clean = (originalToken || '').trim();

    const hl7Match = clean.match(/^(\d{8})(\d{2,6}(?:\.\d+)?)?([+-]\d{4})?$/);
    if (hl7Match) {
      const timePart = hl7Match[2] ? hl7Match[2].replace(/\d/g, '0') : '';
      const tzPart = hl7Match[3] || '';
      return `${year}${month}${day}${timePart}${tzPart}`;
    }

    const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(.*)$/);
    if (isoMatch) {
      const suffix = isoMatch[4] ? isoMatch[4].replace(/\d/g, '0') : '';
      return `${year}-${month}-${day}${suffix}`;
    }

    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(clean)) {
      return `${month}-${day}-${year}`;
    }

    return `${month}/${day}/${year}`;
  }

  function resolveIdToken(configuredId, originalToken) {
    if (!configuredId || configuredId.toUpperCase() === '[RANDOM]' || configuredId.includes('000000')) {
      return randomizeString(originalToken);
    }
    return configuredId;
  }

  // --- COMPILE ACTIVE SEGMENT OVERRIDE RULES ---
  function buildOverrideLookup() {
    const structuredRules = [];
    segmentOverrides.forEach((rule) => {
      const parsed = parseTmsFieldDescriptor(rule.path);
      if (parsed) {
        let score = 0;
        if (parsed.segmentIndex !== null) score += 8;
        if (parsed.repetition !== null) score += 4;
        if (parsed.component !== null) score += 2;
        if (parsed.subcomponent !== null) score += 1;
        structuredRules.push({ ...parsed, value: rule.value, specificity: score });
      }
    });
    structuredRules.sort((a, b) => b.specificity - a.specificity);
    return structuredRules;
  }

  function findOverrideForPath(rules, seg, segIdx, field, rep, comp, subcomp) {
    for (const rule of rules) {
      if (rule.segment !== seg) continue;
      if (rule.segmentIndex !== null && rule.segmentIndex !== segIdx) continue;
      if (rule.field !== field) continue;
      if (rule.repetition !== null && rule.repetition !== rep) continue;
      if (rule.component !== null && rule.component !== comp) continue;
      if (rule.subcomponent !== null && rule.subcomponent !== subcomp) continue;
      return rule;
    }
    return null;
  }

  // --- AUTO-FORMATTER FOR HL7, ZPL & EPL ---
  function autoFormatData(text) {
    const trimmed = text.trim();
    if (!trimmed) return text;

    if (/\b(FHS|BHS|MSH)[^A-Za-z0-9]/i.test(trimmed)) {
      let flat = trimmed.replace(/\r?\n/g, ' ');
      flat = flat.replace(/\s*\|\s*/g, '|');
      flat = flat.replace(/A{2,}/g, match => '^'.repeat(match.length));
      flat = flat.replace(/~{2,}/g, match => '^'.repeat(match.length));
      flat = flat.replace(/ /g, '^');

      const validSegments = [
        'FHS', 'BHS', 'MSH', 'EVN', 'PID', 'PD1', 'NK1', 'PV1', 'PV2',
        'OBX', 'ORC', 'OBR', 'IN1', 'IN2', 'GT1', 'AL1', 'DG1', 'PR1',
        'MRG', 'RXO', 'RXE', 'SCH', 'REF', 'NTE', 'ODS', 'SPM', 'SAC',
        'TQ1', 'TQ2', 'ROL', 'AIP', 'AIL', 'AIS', 'ARQ', 'BTS', 'FTS',
        'Z[A-Z0-9]{2}'
      ];
      const segRegex = new RegExp(`(?<!^)\\s*\\b(${validSegments.join('|')})\\|`, 'gi');
      flat = flat.replace(segRegex, (match, p1) => '\n' + p1.toUpperCase() + '|');
      flat = flat.replace(/MSH\|A~\\&/gi, 'MSH|^~\\&');

      const headerMatch = flat.match(/\b(FHS|BHS|MSH)[^A-Za-z0-9]/i);
      if (headerMatch && headerMatch.index > 0) {
        flat = flat.substring(headerMatch.index);
      }

      return flat
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
    }

    if (/\b(AXA|APON|AFS|7FS|AFO|7FO|A0|A@|FDDB)\b/i.test(trimmed) || /\^XA/i.test(trimmed)) {
      let zpl = trimmed.replace(/\r?\n/g, ' ');
      zpl = zpl.replace(/,\s+/g, ',');
      zpl = zpl.replace(/(?:[A7~4\s]|^)(XA|PON|LH|PW|LL|PQ|BY|BX|BC|BQ|B0|B3|BU|GB|CF|FX|FH|FB|FT|FR|FD|FS)\b/gi, '^$1');
      zpl = zpl.replace(/(?:[A7~4\s]|^)F[O0]/gi, '^FO');
      zpl = zpl.replace(/(?:[A7~4\s]|^)A[@QO0]/gi, '^A0');
      zpl = zpl.replace(/(?:[A7~4\s]|^)C[I1l]([0O]|28)/gi, '^CI$1');
      zpl = zpl.replace(/(?:[A7~4\s]|^)X[Z7]\b/gi, '^XZ');
      zpl = zpl.replace(/\^\s+/g, '^');
      zpl = zpl.replace(/\^([a-z0-9]{2})/g, (match, p1) => '^' + p1.toUpperCase());
      zpl = zpl.replace(/(?<!^)(\^(?:XA|PON|CI0|CI28|PW|LL|LH|PQ|BY|FO|FT|FX|GB|XZ))/gi, '\n$1');

      return zpl
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
    }

    return text;
  }

  rawEditor.addEventListener('paste', (e) => {
    e.preventDefault();
    const clipboardData = e.clipboardData || window.clipboardData;
    const rawPastedText = clipboardData.getData('text/plain');
    if (rawPastedText) {
      const formattedText = autoFormatData(rawPastedText);
      document.execCommand('insertText', false, formattedText);
    }
  });

  // --- DOMAIN WHITELISTS & SAFE TOKEN CHECKS ---
  const dummyKeywordRegex = /\b(?:test|testing|timeless|timelesstest|timelessbaby|sample|dummy|tmstest|zzztesting)\b/i;

  function isTextSafe(str, safeStrings) {
    if (!str || str.trim().length === 0) return true;
    const trimmed = str.trim();

    if (trimmed === '""') return true;

    const norm = normalizeStr(trimmed);
    if (safeStrings.includes(norm)) return true;

    if (/^[Xx0\s\-\.,\^():\[\]]+$/.test(trimmed)) return true;

    if (dummyKeywordRegex.test(trimmed)) return false;

    if (/^(ep\d+|12345\d*|0000\d+|9999\d+)$/i.test(trimmed)) return true;
    if (/^(doctor|mom|dad|sister|brother|father|mother|physician|nurse|clinician|guardian|guarantor)$/i.test(trimmed)) return true;

    return false;
  }

  const domainBlacklist = [
    'DEPID', 'CMAH', 'NOT', 'HISPA', 'UNK', 'UNKNOWN', 'PATIENT', 'ACCESS', 'FAC', 'NPI', 'CMH', 'AUTO',
    'MALE', 'FEMALE', 'M', 'F', 'U', 'NONE', 'NO', 'YES', 'LATINO', 'HISPANIC', 'NUMBER', 'ACCOUNT',
    'HOME', 'MOBILE', 'EMAIL', 'CURRENT', 'SPANISH', 'ENGLISH', 'SINGLE', 'MARRIED', 'RESIDENT', 'PREFERENCE',
    'MRN', 'PHREE', 'FIN', 'NBR', 'HNAM', 'ORDE', 'HNAM_ORDE', 'ADT', 'NHC', 'NHCADTPA',
    'A01', 'A02', 'A03', 'A04', 'A08', 'ORM', 'ORU', 'ACK', 'RDE', 'RAS', 'MDM', 'SIU', 'DFT', 'BAR',
    'EPIC', 'CERNER', 'MEDITECH', 'ALLSCRIPTS', 'ATHENA', 'TIMELESS', 'TMNS', 'CPOE',
    'BANK', 'DENVER', 'MILK', 'MOTHERS', 'MOTHER', 'DONOR', 'MATERNAL', 'INFANT', 'BABY', 'NEONATAL',
    'CAL', 'OZ', 'ML', 'KG', 'GM', 'BATCH', 'LOT', 'SERIAL', 'GTIN', 'BARCODE', 'LABEL',
    'GENERAL', 'INTERNAL', 'LEVEL', 'PHY', 'SP', 'IN', 'PERSONNEL', 'VOLUME', 'FORMULA', 'FORTIFIER',
    'DENSITY', 'FREQUENCY', 'FEED', 'FEEDING', 'ROUTE', 'BOTTLE', 'GAVAGE', 'ORAL', 'ENTERAL', 'CALORIC',
    'PREMATURE', 'TERM', 'PRETERM', 'COLOSTRUM', 'TRANSITIONAL', 'EXPRESSED', 'PASTEURIZED', 'STANDARD',
    'ENFAMIL', 'ENFACARE', 'SIMILAC', 'NEOSURE', 'ELECARE', 'ALIMENTUM', 'NUTRAMIGEN', 'PREGESTIMIL', 'PROLACTA', 'MEDOLAC',
    'NICU', 'PICU', 'BASECAL', 'DIET', 'DIET2', 'DIETARY', 'SUPPLEMENT', 'ADDITIVE', 'HUMAN',
    'CONSENT', 'USE', 'FOR', 'WITH', 'WITHOUT', 'PER', 'DAY', 'HR', 'HRS',
    'WAITING', 'PROGRESS', 'CLOSED', 'OPEN', 'NEW', 'STATUS', 'ACTIVE', 'PENDING', 'COMPLETED',
    'CANCELLED', 'VERIFIED', 'DISPENSED', 'ADMINISTERED', 'EXPIRED', 'THAWED', 'FROZEN', 'REFRIGERATED',
    'ROOM', 'TEMP', 'TEMPERATURE', 'EXPIRES', 'EXP', 'BEST', 'PREPARED', 'PRINTED', 'UNIT', 'CARTON', 'CASE'
  ];

  const domainBlacklistSet = new Set(domainBlacklist.map(w => w.toUpperCase()));
  const blacklistPattern = domainBlacklist.map(escapeRegex).join('|');

  function isBlacklistedPhrase(phrase) {
    if (!phrase) return false;
    const words = phrase.split(/[\^,\s]+/).map(w => w.trim().toUpperCase()).filter(Boolean);
    return words.length > 0 && words.some(w => domainBlacklistSet.has(w));
  }

  const nameIgnore = [
    'NPI', 'MD', 'DO', 'NP', 'PA', 'RN', 'LPN', 'RD', 'IBCLC',
    'JR', 'SR', 'II', 'III', 'IV', 'ESQ', 'PHD',
    'L', 'M', 'D', 'A', 'B', 'C', 'I', 'N', 'P', 'S', 'T', 'U',
    'CMAH', 'EPC', 'CURRENT', 'PERSONNEL', 'PRI', 'PRN', 'ORN', 'WPN',
    'MOM', 'DAD', 'SISTER', 'BROTHER', 'FATHER', 'MOTHER', 'PHYSICIAN', 'BABY', 'BOY', 'GIRL', 'TWIN'
  ];

  // --- STRUCTURED TMS PARAMETER PARSING ---
  const paramNameKeys = [
    'patient_name', 'patientname', 'pat_name', 'patname', 'full_name', 'fullname', 'name', 'patient',
    'mother_name', 'mothername', 'mom_name', 'momname', 'mother', 'baby_name', 'babyname',
    'infant_name', 'infantname', 'donor_name', 'donorname', 'donor', 'guardian_name', 'guardianname',
    'guarantor_name', 'guarantorname', 'subscriber_name', 'insured_name', 'contact_name',
    'provider_name', 'ordering_provider', 'attending_doctor', 'admitting_doctor',
    'referring_doctor', 'consulting_doctor', 'clinician_name', 'clinician', 'recipient_name',
    'user_name', 'username'
  ];

  const paramFirstNameKeys = ['first_name', 'firstname', 'fname', 'given_name', 'givenname', 'mother_first_name', 'baby_first_name'];
  const paramMiddleNameKeys = ['middle_name', 'middlename', 'mname', 'middle_initial'];
  const paramLastNameKeys = ['last_name', 'lastname', 'lname', 'family_name', 'familyname', 'surname', 'maiden_name', 'maidenname', 'mother_last_name', 'baby_last_name'];
  const paramNicknameKeys = ['nickname', 'alias', 'preferred_name', 'preferredname'];
  const paramPrefixKeys = ['prefix', 'salutation', 'title'];

  const paramIdKeys = [
    'mrn', 'medical_record_number', 'patient_id', 'patientid', 'pat_id', 'patid',
    'mother_mrn', 'mothermrn', 'baby_mrn', 'babymrn', 'infant_mrn', 'infantmrn',
    'donor_id', 'donorid', 'account_number', 'accountnumber', 'acct_no', 'acct',
    'fin', 'visit_number', 'visitnumber', 'visit_id', 'visitid',
    'encounter_id', 'encounterid', 'encounter_number', 'csn', 'har',
    'ssn', 'social_security', 'social_security_number',
    'subscriber_id', 'member_id', 'policy_number', 'medicaid_id', 'medicare_id',
    'external_id', 'chart_number'
  ];

  const paramDobKeys = [
    'dob', 'date_of_birth', 'dateofbirth', 'birth_date', 'birthdate',
    'baby_dob', 'babydob', 'mother_dob', 'motherdob', 'infant_dob', 'donor_dob',
    'deceased_date', 'death_date'
  ];

  const paramPhoneKeys = [
    'phone', 'phone_number', 'phonenumber', 'mobile', 'mobile_phone', 'cell', 'cell_phone',
    'home_phone', 'work_phone', 'business_phone', 'telephone', 'tel', 'fax', 'callback_phone'
  ];

  const paramEmailKeys = [
    'email', 'email_address', 'emailaddress', 'e_mail', 'patient_email', 'mother_email', 'donor_email'
  ];

  const paramAddressKeys = [
    'address', 'street', 'street_address', 'streetaddress', 'address_1', 'address1',
    'address_line_1', 'home_address', 'mailing_address', 'guarantor_address'
  ];

  const paramAddressSubKeys = ['address_2', 'address2', 'apt', 'suite', 'city', 'zip', 'zip_code', 'zipcode', 'postal_code'];

  const multiWordParamKeys = new Set([
    ...paramNameKeys, ...paramFirstNameKeys, ...paramMiddleNameKeys, ...paramLastNameKeys,
    ...paramNicknameKeys, ...paramAddressKeys, ...paramAddressSubKeys
  ]);

  const allParamKeys = [
    ...paramNameKeys, ...paramFirstNameKeys, ...paramMiddleNameKeys, ...paramLastNameKeys,
    ...paramNicknameKeys, ...paramPrefixKeys, ...paramIdKeys, ...paramDobKeys,
    ...paramPhoneKeys, ...paramEmailKeys, ...paramAddressKeys, ...paramAddressSubKeys
  ].sort((a, b) => b.length - a.length);

  const parameterPairRegex = new RegExp(
    `(?:(?:["'\\[]?\\b(${allParamKeys.map(escapeRegex).join('|')})\\b["'\\]]?)\\s*(?::|=>|=)\\s*)` +
    `(?:(["'])([^"'\\r\\n]+?)\\2|([^"'\\r\\n;\\|\\^\\}&\\]\\)]+))`,
    'gi'
  );

  const hl7DescriptorPairRegex = /\b([A-Z][A-Z0-9]{2}(?:\[\d+\])?-\d+(?:\[\d+\])?(?:\.\d+(?:\[\d+\])?)?)\s*(?::|=>|=)\s*(?:(["'])([^"'\r\n]+?)\2|([^\s,;|&\r\n]+))/g;

  const fallbackPatterns = [
    {
      label: 'Test Data',
      regex: /\b(?:test|testing|timeless|timelesstest|timelessbaby|sample|dummy|tmstest|zzztesting)\b/gi
    },
    {
      label: 'SSN',
      regex: /\b\d{3}-\d{2}-\d{4}\b/g
    },
    {
      label: 'Phone',
      regex: /(?<!\d)(?:\+?1[-.\s]?)?(?:\([0-9]{3}\)|[0-9]{3})[-.\s][0-9]{3}[-.\s][0-9]{4}(?:\s*(?:ext|x)\.?\s*\d{1,5})?(?!\d)/gi
    },
    {
      label: 'Email',
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
    },
    {
      label: 'Date',
      regex: /(?<!(?:Exp|Expires|Expiration|Exp Date|Use By|Best By|Prepared|Prep|Thawed|Fortified|Printed|Created|Updated|Timestamp):\s?)\b(?:\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])|(?:0?[1-9]|1[0-2])[\/-](?:0?[1-9]|[12]\d|3[01])[\/-]\d{4})\b/gi
    },
    {
      label: 'Address',
      regex: /\b\d{1,6}\s+(?:[NSEW]\.?\s+)?[A-Za-z0-9.\s]{2,35}?\b(?:Avenue|Lane|Road|Boulevard|Drive|Street|Court|Circle|Way|Parkway|Terrace|Place|Ave|Dr|Rd|Blvd|Ln|St|Ct|Cir|Pkwy|Ter|Pl)\.?(?:,\s*(?:Apt|Suite|Ste|Unit|#)\s*[A-Za-z0-9-]+)?(?:,\s*[A-Za-z\s]+,\s*[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?)?\b/gi
    },
    {
      label: 'NICU Name',
      regex: new RegExp(`\\b(?:Baby\\s+(?:Boy|Girl)|Infant\\s+of|Twin\\s+[A-Z])\\s+(?!(?:${blacklistPattern})\\b)[A-Z][A-Za-z\\-']+(?:\\s+(?!(?:${blacklistPattern})\\b)[A-Z][A-Za-z\\-']+)?\\b`, 'g')
    },
    {
      label: 'HL7 Name Fallback',
      regex: new RegExp(`(?<=^|\\^|\\|)(?!(?:${blacklistPattern})\\b)[A-Z][A-Za-z\\-']{1,}\\^(?!(?:${blacklistPattern})\\b)[A-Z][A-Za-z\\-']{1,}(?:\\^[A-Za-z\\-']*)*(?=\\^|\\||$)`, 'g')
    },
    {
      label: 'Quoted Name',
      regex: new RegExp(`(?<=")(?!(?:${blacklistPattern})\\b)[A-Z][A-Za-z\\-']+(?:,\\s*|\\s+)(?!(?:${blacklistPattern})\\b)[A-Z][A-Za-z\\-']+(?:\\s+[A-Z](?:\\.|(?!(?:${blacklistPattern})\\b)[A-Za-z\\-']+))?(?=")`, 'g')
    },
    {
      label: 'Name',
      regex: new RegExp(`\\b(?!(?:${blacklistPattern})\\b)[A-Z][A-Za-z\\-']{1,},[ \\t]*(?!(?:${blacklistPattern})\\b)[A-Z][A-Za-z\\-']{1,}(?:[ \\t]+(?!(?:${blacklistPattern})\\b)[A-Z][A-Za-z\\-'.]*)?(?=\\^|FS|$|\\b)`, 'g')
    }
  ];

  const hl7Map = {
    'FHS': { 2: 'IGNORE', 3: 'IGNORE', 4: 'IGNORE', 5: 'IGNORE', 6: 'IGNORE', 7: 'IGNORE', 8: 'IGNORE', 9: 'IGNORE', 10: 'IGNORE', 11: 'IGNORE', 12: 'IGNORE' },
    'BHS': { 2: 'IGNORE', 3: 'IGNORE', 4: 'IGNORE', 5: 'IGNORE', 6: 'IGNORE', 7: 'IGNORE', 8: 'IGNORE', 9: 'IGNORE', 10: 'IGNORE', 11: 'IGNORE', 12: 'IGNORE' },
    'MSH': { 2: 'IGNORE', 3: 'IGNORE', 4: 'IGNORE', 5: 'IGNORE', 6: 'IGNORE', 7: 'IGNORE', 8: 'IGNORE', 9: 'IGNORE', 10: 'IGNORE', 11: 'IGNORE', 12: 'IGNORE', 13: 'IGNORE', 14: 'IGNORE', 15: 'IGNORE', 16: 'IGNORE', 17: 'IGNORE', 18: 'IGNORE', 19: 'IGNORE', 20: 'IGNORE', 21: 'IGNORE' },
    'EVN': { 1: 'IGNORE', 2: 'IGNORE', 3: 'IGNORE', 4: 'IGNORE', 5: 'IGNORE', 6: 'IGNORE', 7: 'IGNORE' },
    'PID': { 1: 'IGNORE', 2: 'ID', 3: 'ID', 4: 'ID', 5: 'NAME', 6: 'NAME', 7: 'DATE', 8: 'IGNORE', 9: 'NAME', 10: 'IGNORE', 11: 'ADDRESS', 13: 'PHONE', 14: 'PHONE', 15: 'IGNORE', 16: 'IGNORE', 17: 'IGNORE', 18: 'ID', 19: 'SSN', 20: 'ID', 21: 'ID', 22: 'IGNORE', 29: 'DATE', 30: 'IGNORE' },
    'PD1': { 3: 'IGNORE', 4: 'PROVIDER' },
    'NK1': { 1: 'IGNORE', 2: 'NAME', 3: 'IGNORE', 4: 'ADDRESS', 5: 'PHONE', 6: 'PHONE', 13: 'IGNORE', 30: 'NAME', 31: 'PHONE', 32: 'ADDRESS', 33: 'ID' },
    'PV1': { 1: 'IGNORE', 2: 'IGNORE', 3: 'IGNORE', 4: 'IGNORE', 5: 'ID', 6: 'IGNORE', 7: 'PROVIDER', 8: 'PROVIDER', 9: 'PROVIDER', 10: 'IGNORE', 14: 'IGNORE', 15: 'IGNORE', 17: 'PROVIDER', 18: 'IGNORE', 19: 'ID', 20: 'IGNORE', 36: 'IGNORE', 44: 'IGNORE', 45: 'IGNORE' },
    'PV2': { 3: 'TEXT' },
    'ORC': { 1: 'IGNORE', 2: 'ID', 3: 'ID', 4: 'ID', 5: 'IGNORE', 10: 'PROVIDER', 11: 'PROVIDER', 12: 'PROVIDER', 14: 'PHONE' },
    'OBR': { 1: 'IGNORE', 2: 'ID', 3: 'ID', 4: 'IGNORE', 16: 'PROVIDER', 25: 'IGNORE', 28: 'PROVIDER' },
    'OBX': { 1: 'IGNORE', 2: 'IGNORE', 3: 'IGNORE', 4: 'IGNORE', 5: 'TEXT', 6: 'IGNORE', 7: 'IGNORE', 8: 'IGNORE', 11: 'IGNORE', 15: 'IGNORE', 16: 'PROVIDER', 18: 'IGNORE' },
    'IN1': { 1: 'IGNORE', 2: 'ID', 3: 'ID', 4: 'IGNORE', 5: 'ADDRESS', 6: 'NAME', 7: 'PHONE', 8: 'ID', 11: 'IGNORE', 16: 'NAME', 17: 'IGNORE', 18: 'DATE', 36: 'ID', 43: 'NAME' },
    'IN2': { 1: 'IGNORE', 2: 'SSN', 6: 'ID', 8: 'NAME', 9: 'ID' },
    'GT1': { 1: 'IGNORE', 2: 'ID', 3: 'NAME', 4: 'NAME', 5: 'ADDRESS', 6: 'PHONE', 7: 'PHONE', 8: 'DATE', 9: 'IGNORE', 11: 'IGNORE', 12: 'SSN' },
    'MRG': { 1: 'ID', 2: 'ID', 3: 'ID', 4: 'ID', 5: 'ID', 6: 'ID', 7: 'NAME' },
    'PR1': { 1: 'IGNORE', 3: 'IGNORE', 4: 'IGNORE', 8: 'PROVIDER', 11: 'PROVIDER', 12: 'PROVIDER' },
    'DG1': { 1: 'IGNORE', 3: 'IGNORE', 4: 'IGNORE', 16: 'PROVIDER' },
    'AL1': { 1: 'IGNORE', 2: 'IGNORE', 3: 'IGNORE', 4: 'IGNORE', 5: 'IGNORE' },
    'RXO': { 1: 'IGNORE', 2: 'IGNORE', 3: 'IGNORE', 4: 'IGNORE', 14: 'ID' },
    'RXE': { 1: 'IGNORE', 2: 'IGNORE', 3: 'IGNORE', 4: 'IGNORE', 5: 'IGNORE', 15: 'ID', 21: 'TEXT' },
    'SCH': { 1: 'ID', 2: 'ID', 12: 'NAME', 13: 'PHONE', 16: 'NAME', 17: 'PHONE', 26: 'ID' },
    'REF': { 1: 'ID', 2: 'IGNORE', 3: 'IGNORE', 5: 'PROVIDER', 6: 'IGNORE' },
    'NTE': { 1: 'IGNORE', 2: 'IGNORE', 3: 'TEXT' },
    'ODS': { 1: 'IGNORE', 2: 'IGNORE', 3: 'IGNORE', 4: 'TEXT' },
    'SPM': { 1: 'IGNORE', 2: 'ID', 3: 'ID', 4: 'IGNORE' },
    'SAC': { 1: 'IGNORE', 2: 'ID', 3: 'ID', 4: 'ID' }
  };

  function resolveNameReplacement(rawVal, rPrefix, rFirst, rMiddle, rLast) {
    const trimmed = rawVal.trim();
    if (trimmed.includes('^')) {
      const parts = trimmed.split('^');
      return parts.map((part, idx) => {
        if (!part || nameIgnore.includes(part.toUpperCase())) return part;
        if (idx === 0) return rLast;
        if (idx === 1) return rFirst;
        if (idx === 2) return dummyMiddleInput.value ? rMiddle : randomizeString(part);
        if (idx === 4) return dummyPrefixInput.value ? rPrefix : randomizeString(part);
        return randomizeString(part);
      }).join('^');
    }
    if (trimmed.includes(',')) {
      return `${rLast}, ${rFirst}`;
    }
    const words = trimmed.split(/\s+/);
    if (words.length >= 3) {
      return `${rFirst} ${rMiddle} ${rLast}`;
    }
    if (words.length === 2) {
      return `${rFirst} ${rLast}`;
    }
    return `${rFirst} ${rLast}`;
  }

  function resolveParameterReplacement(paramKey, rawVal, ctx) {
    const k = paramKey.toLowerCase();
    const { rPrefix, rFirst, rMiddle, rLast, rNickname, rId, rPhone, rEmail, addrObj, rawDateStr } = ctx;

    if (paramFirstNameKeys.includes(k)) return rFirst;
    if (paramMiddleNameKeys.includes(k)) return rMiddle;
    if (paramLastNameKeys.includes(k)) return rLast;
    if (paramNicknameKeys.includes(k)) return rNickname;
    if (paramPrefixKeys.includes(k)) return rPrefix;
    if (paramNameKeys.includes(k)) {
      return resolveNameReplacement(rawVal, rPrefix, rFirst, rMiddle, rLast);
    }
    if (paramIdKeys.includes(k)) {
      return resolveIdToken(rId, rawVal);
    }
    if (paramDobKeys.includes(k)) {
      return formatDummyDate(rawVal, rawDateStr);
    }
    if (paramPhoneKeys.includes(k)) {
      return rPhone;
    }
    if (paramEmailKeys.includes(k)) {
      return rEmail;
    }
    if (paramAddressKeys.includes(k)) {
      return addrObj.full;
    }
    if (paramAddressSubKeys.includes(k)) {
      if (k === 'city') return addrObj.city;
      if (k.startsWith('zip') || k === 'postal_code') return addrObj.zip;
      return 'Unit 1';
    }
    return randomizeString(rawVal);
  }

  function resolveDescriptorReplacement(descInfo, rawVal, ctx) {
    const { overrideRules } = ctx;
    const explicitRule = findOverrideForPath(
      overrideRules,
      descInfo.segment,
      descInfo.segmentIndex || 1,
      descInfo.field,
      descInfo.repetition || 1,
      descInfo.component || 1,
      descInfo.subcomponent || 1
    );
    if (explicitRule) {
      return explicitRule.value.toUpperCase() === '[RANDOM]' ? randomizeString(rawVal) : explicitRule.value;
    }

    const segRules = hl7Map[descInfo.segment] || {};
    const ruleType = segRules[descInfo.field];
    const { rPrefix, rFirst, rMiddle, rLast, rId, rPhone, rEmail, addrObj, rawDateStr } = ctx;

    if (!ruleType || ruleType === 'IGNORE') return null;

    if (ruleType === 'NAME') {
      if (descInfo.component === 1) return rLast;
      if (descInfo.component === 2) return rFirst;
      if (descInfo.component === 3) return rMiddle;
      if (descInfo.component === 5) return rPrefix;
      return resolveNameReplacement(rawVal, rPrefix, rFirst, rMiddle, rLast);
    }
    if (ruleType === 'PROVIDER') {
      if (descInfo.component === 1) return resolveIdToken(rId, rawVal);
      if (descInfo.component === 2) return rLast;
      if (descInfo.component === 3) return rFirst;
      if (descInfo.component === 4) return rMiddle;
      if (descInfo.component === 6) return rPrefix;
      return resolveNameReplacement(rawVal, rPrefix, rFirst, rMiddle, rLast);
    }
    if (ruleType === 'ID' || ruleType === 'SSN') {
      return resolveIdToken(rId, rawVal);
    }
    if (ruleType === 'DATE') {
      return formatDummyDate(rawVal, rawDateStr);
    }
    if (ruleType === 'PHONE') {
      return rawVal.includes('@') ? rEmail : rPhone;
    }
    if (ruleType === 'ADDRESS') {
      if (descInfo.component === 1) return addrObj.street;
      if (descInfo.component === 2) return 'Unit 1';
      if (descInfo.component === 3) return addrObj.city;
      if (descInfo.component === 4) return addrObj.state;
      if (descInfo.component === 5) return addrObj.zip;
      return addrObj.full;
    }
    return randomizeString(rawVal);
  }

  // --- TOKEN-LEVEL REGEX & TMS PARAMETER PROCESSOR ---
  function processRegexTokens(text, mode, safeStrings, ctx) {
    const { rPrefix, rFirst, rMiddle, rLast, rId, rPhone, rEmail, addrObj, rawDateStr } = ctx;
    const matches = [];

    const protectedRanges = [];
    const barcodeFieldRegex = /\^(?:BX|BC|BQ|B0|B3|BU)[^\^]*\^FD([^\^]+)\^FS/gi;
    for (const bm of text.matchAll(barcodeFieldRegex)) {
      const fdContent = bm[1];
      const fdStart = bm.index + bm[0].indexOf(fdContent);
      protectedRanges.push({ start: fdStart, end: fdStart + fdContent.length });
    }

    const isInsideProtectedRange = (start, end) =>
      protectedRanges.some(r => start >= r.start && end <= r.end);

    hl7DescriptorPairRegex.lastIndex = 0;
    for (const dm of text.matchAll(hl7DescriptorPairRegex)) {
      const descStr = dm[1];
      const val = dm[3] !== undefined ? dm[3] : dm[4];
      const descInfo = parseTmsFieldDescriptor(descStr);
      if (!descInfo || !val || isTextSafe(val, safeStrings)) continue;

      const rep = resolveDescriptorReplacement(descInfo, val, ctx);
      if (!rep) continue;

      const valOffset = dm[0].lastIndexOf(val);
      const start = dm.index + valOffset;
      const end = start + val.length;
      if (isInsideProtectedRange(start, end)) continue;

      matches.push({
        start,
        end,
        text: val,
        priority: 12,
        p: { label: 'HL7 Descriptor', replacement: rep }
      });
    }

    parameterPairRegex.lastIndex = 0;
    for (const pm of text.matchAll(parameterPairRegex)) {
      const key = pm[1];
      let val = pm[3] !== undefined ? pm[3] : pm[4];
      if (!val || val.trim().length === 0) continue;

      if (pm[3] === undefined && !multiWordParamKeys.has(key.toLowerCase())) {
        val = val.split(/\s+/)[0];
      } else {
        val = val.trim();
      }

      if (!val || isTextSafe(val, safeStrings)) continue;

      const valOffsetInMatch = pm[0].lastIndexOf(val);
      const start = pm.index + valOffsetInMatch;
      const end = start + val.length;
      if (isInsideProtectedRange(start, end)) continue;

      matches.push({
        start,
        end,
        text: val,
        priority: 10,
        p: { label: 'Parameter', paramKey: key }
      });
    }

    fallbackPatterns.forEach((pattern, idx) => {
      pattern.regex.lastIndex = 0;
      for (const m of text.matchAll(pattern.regex)) {
        const start = m.index;
        const end = start + m[0].length;
        if (isInsideProtectedRange(start, end)) continue;

        matches.push({
          start,
          end,
          text: m[0],
          priority: 5 - idx * 0.01,
          p: pattern
        });
      }
    });

    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.text.length - a.text.length;
    });

    const validTokens = [];
    let lastEnd = 0;
    for (const m of matches) {
      if (m.start >= lastEnd) {
        validTokens.push(m);
        lastEnd = m.end;
      }
    }

    let leftHtml = '';
    let rightHtml = '';
    let sHtml = '';
    let cursor = 0;
    let localMatchCount = 0;

    for (const token of validTokens) {
      const textBefore = text.substring(cursor, token.start);
      leftHtml += escapeHtml(textBefore);
      rightHtml += escapeHtml(textBefore);
      sHtml += escapeHtml(textBefore);

      const mText = token.text;
      let isTokenSafe = isTextSafe(mText, safeStrings);

      // Case-insensitive TMS domain term exclusion for fallback Name/HL7 Name detections (e.g., Donor^Milk, Enfacare)
      if (!isTokenSafe && token.p.label.includes('Name') && isBlacklistedPhrase(mText)) {
        isTokenSafe = true;
      }

      if (token.p.label.includes('Fallback')) {
        const parts = mText.split(/([\^]+)/);
        if (parts[0] && isTextSafe(parts[0], safeStrings)) isTokenSafe = true;
      }

      if (token.p.label === 'Test Data' && !safeStrings.includes(normalizeStr(mText))) {
        isTokenSafe = false;
      }

      if (isTokenSafe) {
        leftHtml += escapeHtml(mText);
        rightHtml += escapeHtml(mText);
        sHtml += escapeHtml(mText);
        cursor = token.end;
        continue;
      }

      localMatchCount++;

      if (token.p.label === 'HL7 Descriptor') {
        if (mode === 'diff') {
          leftHtml += `<mark class="phi-red">${escapeHtml(mText)}</mark>`;
          rightHtml += `<mark class="phi-green">${escapeHtml(token.p.replacement)}</mark>`;
        } else {
          sHtml += `<mark class="phi-yellow">${escapeHtml(mText)}</mark>`;
        }
      } else if (token.p.label === 'Parameter') {
        const rep = resolveParameterReplacement(token.p.paramKey, mText, ctx);
        if (mode === 'diff') {
          leftHtml += `<mark class="phi-red">${escapeHtml(mText)}</mark>`;
          rightHtml += `<mark class="phi-green">${escapeHtml(rep)}</mark>`;
        } else {
          sHtml += `<mark class="phi-yellow">${escapeHtml(mText)}</mark>`;
        }
      } else if (token.p.label.includes('Fallback')) {
        const parts = mText.split(/([\^]+)/);
        for (let p = 0; p < parts.length; p++) {
          if (p % 2 === 0 && parts[p].trim().length > 0 && !nameIgnore.includes(parts[p].toUpperCase())) {
            let rep = '';
            if (p === 0) rep = rLast;
            else if (p === 2) rep = rFirst;
            else if (p === 4) rep = dummyMiddleInput.value ? rMiddle : randomizeString(parts[p]);
            else if (p === 8) rep = dummyPrefixInput.value ? rPrefix : randomizeString(parts[p]);
            else rep = randomizeString(parts[p]);

            if (mode === 'diff') {
              leftHtml += `<mark class="phi-red">${escapeHtml(parts[p])}</mark>`;
              rightHtml += `<mark class="phi-green">${escapeHtml(rep)}</mark>`;
            } else {
              sHtml += `<mark class="phi-yellow">${escapeHtml(parts[p])}</mark>`;
            }
          } else if (mode === 'diff') {
            leftHtml += escapeHtml(parts[p]);
            rightHtml += escapeHtml(parts[p]);
          } else {
            sHtml += escapeHtml(parts[p]);
          }
        }
      } else {
        let rep = '';
        if (token.p.label === 'NICU Name') {
          const prefixMatch = mText.match(/^(Baby\s+(?:Boy|Girl)|Infant\s+of|Twin\s+[A-Z])\s+(.*)$/i);
          if (prefixMatch) {
            const remainderWords = prefixMatch[2].trim().split(/\s+/);
            const scrubbedPerson = remainderWords.length >= 2 ? `${rFirst} ${rLast}` : rLast;
            rep = `${prefixMatch[1]} ${scrubbedPerson}`;
          } else {
            rep = `${rFirst} ${rLast}`;
          }
        } else if (token.p.label.includes('Name')) {
          rep = resolveNameReplacement(mText, rPrefix, rFirst, rMiddle, rLast);
        } else if (token.p.label === 'Test Data') {
          rep = randomizeString(mText);
        } else if (token.p.label.includes('SSN')) {
          rep = resolveIdToken(rId, mText);
        } else if (token.p.label.includes('Phone')) {
          rep = rPhone;
        } else if (token.p.label.includes('Email')) {
          rep = rEmail;
        } else if (token.p.label.includes('Address')) {
          rep = addrObj.full;
        } else if (token.p.label.includes('Date')) {
          rep = formatDummyDate(mText, rawDateStr);
        }

        if (mode === 'diff') {
          leftHtml += `<mark class="phi-red">${escapeHtml(mText)}</mark>`;
          rightHtml += `<mark class="phi-green">${escapeHtml(rep)}</mark>`;
        } else {
          sHtml += `<mark class="phi-yellow">${escapeHtml(mText)}</mark>`;
        }
      }

      cursor = token.end;
    }

    const textAfter = text.substring(cursor);
    if (mode === 'diff') {
      leftHtml += escapeHtml(textAfter);
      rightHtml += escapeHtml(textAfter);
    } else {
      sHtml += escapeHtml(textAfter);
    }

    return { hasPhi: localMatchCount > 0, matchCount: localMatchCount, leftHtml, rightHtml, sHtml };
  }

  // --- STRUCTURED HL7 FIELD SCRUBBER WITH AUTO-ASSIGNED SEGMENT OVERRIDES ---
  function scrubHl7TypedField(rawField, ruleType, mode, safeStrings, ctx, delims, meta) {
    const { rPrefix, rFirst, rMiddle, rLast, rNickname, rId, rPhone, rEmail, addrObj, rawDateStr, overrideRules } = ctx;
    const { compSep, repSep, escChar, subCompSep } = delims;
    const { segment, segOccurrence, fieldNum } = meta;
    let fieldHasPhi = false;
    let fieldMatchCount = 0;

    const repetitions = splitUnescaped(rawField, repSep, escChar);
    const leftReps = [];
    const rightReps = [];
    const scanReps = [];

    for (let r = 0; r < repetitions.length; r++) {
      const repNum = r + 1;
      const repVal = repetitions[r];
      if (!repVal || repVal.trim() === '' || repVal.trim() === '""') {
        const cleanRep = escapeHtml(repVal);
        leftReps.push(cleanRep);
        rightReps.push(cleanRep);
        scanReps.push(cleanRep);
        continue;
      }

      // Check field-level override (e.g. PID-3=11111, PID-5=SMITH^JANE, ORC-2=222222)
      const fieldOverride = findOverrideForPath(overrideRules, segment, segOccurrence, fieldNum, repNum, null, null);
      if (fieldOverride && fieldOverride.component === null && fieldOverride.subcomponent === null) {
        const overrideVal = fieldOverride.value;
        if (overrideVal.includes(compSep) || !repVal.includes(compSep)) {
          const resolvedWholeField = overrideVal.toUpperCase() === '[RANDOM]'
            ? randomizeString(repVal)
            : overrideVal;

          if (normalizeStr(repVal) !== normalizeStr(resolvedWholeField)) {
            fieldHasPhi = true;
            fieldMatchCount++;
            if (mode === 'diff') {
              leftReps.push(`<mark class="phi-red">${escapeHtml(repVal)}</mark>`);
              rightReps.push(`<mark class="phi-green">${escapeHtml(resolvedWholeField)}</mark>`);
            } else {
              scanReps.push(`<mark class="phi-yellow">${escapeHtml(repVal)}</mark>`);
            }
            continue;
          }
        }
      }

      if (ruleType === 'TEXT') {
        const res = processRegexTokens(repVal, mode, safeStrings, ctx);
        if (res.hasPhi) {
          fieldHasPhi = true;
          fieldMatchCount += res.matchCount;
        }
        leftReps.push(res.leftHtml);
        rightReps.push(res.rightHtml);
        scanReps.push(res.sHtml);
        continue;
      }

      const comps = splitUnescaped(repVal, compSep, escChar);
      const nameTypeCode = comps[6] ? comps[6].trim().toUpperCase() : '';

      const leftComps = [];
      const rightComps = [];
      const scanComps = [];

      for (let compIndex = 0; compIndex < comps.length; compIndex++) {
        const compNum = compIndex + 1;
        const rawPart = comps[compIndex];
        const pt = rawPart.trim();

        if (!pt || pt === '""') {
          const cleanComp = escapeHtml(rawPart);
          leftComps.push(cleanComp);
          rightComps.push(cleanComp);
          scanComps.push(cleanComp);
          continue;
        }

        let compOverride = findOverrideForPath(overrideRules, segment, segOccurrence, fieldNum, repNum, compNum, 1);
        if (!compOverride && compNum === 1 && fieldOverride && !fieldOverride.value.includes(compSep)) {
          compOverride = fieldOverride;
        }

        let isTarget = false;
        let rep = '';

        if (compOverride) {
          isTarget = true;
          rep = compOverride.value.toUpperCase() === '[RANDOM]' ? randomizeString(pt) : compOverride.value;
        } else if (ruleType === 'NAME') {
          if (compIndex <= 4 && !nameIgnore.includes(pt.toUpperCase())) {
            isTarget = true;
            if (compIndex === 0) {
              const subParts = splitUnescaped(pt, subCompSep, escChar);
              rep = /^\d+$/.test(subParts[0])
                ? resolveIdToken(rId, pt)
                : subParts.map((sp, sIdx) => (sp ? (sIdx === 0 ? rLast : randomizeString(sp)) : '')).join(subCompSep);
            } else if (compIndex === 1) {
              rep = nameTypeCode === 'A' ? rNickname : rFirst;
            } else if (compIndex === 2) {
              rep = dummyMiddleInput.value ? rMiddle : randomizeString(pt);
            } else if (compIndex === 4) {
              rep = dummyPrefixInput.value ? rPrefix : randomizeString(pt);
            } else {
              rep = randomizeString(pt);
            }
          }
        } else if (ruleType === 'PROVIDER') {
          if (compIndex === 0 && !nameIgnore.includes(pt.toUpperCase())) {
            isTarget = true;
            rep = resolveIdToken(rId, pt);
          } else if (compIndex >= 1 && compIndex <= 5 && !nameIgnore.includes(pt.toUpperCase())) {
            isTarget = true;
            if (compIndex === 1) rep = rLast;
            else if (compIndex === 2) rep = rFirst;
            else if (compIndex === 3) rep = dummyMiddleInput.value ? rMiddle : randomizeString(pt);
            else if (compIndex === 5) rep = dummyPrefixInput.value ? rPrefix : randomizeString(pt);
            else rep = randomizeString(pt);
          }
        } else if (ruleType === 'ID' || ruleType === 'SSN') {
          if (compIndex === 0) {
            isTarget = true;
            rep = resolveIdToken(rId, pt);
          }
        } else if (ruleType === 'ADDRESS') {
          if (compIndex <= 4) {
            isTarget = true;
            if (compIndex === 0) rep = addrObj.street;
            else if (compIndex === 1) rep = 'Unit 1';
            else if (compIndex === 2) rep = addrObj.city;
            else if (compIndex === 3) rep = addrObj.state;
            else if (compIndex === 4) rep = addrObj.zip;
          }
        } else if (ruleType === 'PHONE') {
          if (compIndex === 0) {
            isTarget = true;
            rep = pt.includes('@') ? rEmail : rPhone;
          } else if (compIndex === 3 && pt.includes('@')) {
            isTarget = true;
            rep = rEmail;
          } else if (compIndex === 5 && /^\d{3}$/.test(pt)) {
            isTarget = true;
            const digits = rPhone.replace(/\D/g, '');
            rep = digits.length >= 10 ? digits.slice(-10, -7) : '555';
          } else if (compIndex === 6 && /^\d{7}$/.test(pt)) {
            isTarget = true;
            const digits = rPhone.replace(/\D/g, '');
            rep = digits.length >= 7 ? digits.slice(-7) : '5550199';
          } else if (compIndex === 7 && /^\d+$/.test(pt)) {
            isTarget = true;
            rep = randomizeString(pt);
          }
        } else if (ruleType === 'DATE') {
          if (compIndex === 0) {
            isTarget = true;
            rep = formatDummyDate(pt, rawDateStr);
          }
        }

        if (isTarget) {
          let isAlreadyDummy = isTextSafe(pt, safeStrings);
          if (!safeStrings.includes(normalizeStr(pt)) && dummyKeywordRegex.test(pt)) {
            isAlreadyDummy = false;
          }
          if (compOverride && normalizeStr(pt) !== normalizeStr(rep)) {
            isAlreadyDummy = false;
          }

          if (isAlreadyDummy) {
            leftComps.push(escapeHtml(rawPart));
            rightComps.push(escapeHtml(rawPart));
            scanComps.push(escapeHtml(rawPart));
          } else {
            fieldHasPhi = true;
            fieldMatchCount++;
            if (mode === 'diff') {
              leftComps.push(`<mark class="phi-red">${escapeHtml(rawPart)}</mark>`);
              rightComps.push(`<mark class="phi-green">${escapeHtml(rep)}</mark>`);
            } else {
              scanComps.push(`<mark class="phi-yellow">${escapeHtml(rawPart)}</mark>`);
            }
          }
        } else {
          leftComps.push(escapeHtml(rawPart));
          rightComps.push(escapeHtml(rawPart));
          scanComps.push(escapeHtml(rawPart));
        }
      }

      const escapedCompSep = escapeHtml(compSep);
      leftReps.push(leftComps.join(escapedCompSep));
      rightReps.push(rightComps.join(escapedCompSep));
      scanReps.push(scanComps.join(escapedCompSep));
    }

    const escapedRepSep = escapeHtml(repSep);
    return {
      hasPhi: fieldHasPhi,
      matchCount: fieldMatchCount,
      leftHtml: leftReps.join(escapedRepSep),
      rightHtml: rightReps.join(escapedRepSep),
      sHtml: scanReps.join(escapedRepSep)
    };
  }

  // --- CORE ENGINE (DIFF & SCAN MODES) ---
  function runCoreEngine(text, mode) {
    const lines = text.split(/\r?\n/);
    if (mode === 'diff') {
      window.originalLinesStore = [...lines];
      window.modifiedLeftStore = new Array(lines.length);
      window.modifiedRightStore = new Array(lines.length);
    }

    const leftLinesHtml = [];
    const centerLinesHtml = [];
    const rightLinesHtml = [];
    let scanHtml = '';
    let matchCount = 0;

    const rPrefix = dummyPrefixInput.value || 'Dr.';
    const rFirst = dummyFirstInput.value || 'John';
    const rMiddle = dummyMiddleInput.value || 'A';
    const rLast = dummyLastInput.value || 'Doe';
    const rNickname = dummyNicknameInput.value || 'Johnny';
    const rId = '[RANDOM]';
    const rPhone = dummyPhoneInput.value || '555-0199';
    const rEmail = dummyEmailInput.value || 'test@email.com';
    const addrObj = parseDummyAddress(dummyAddressInput.value);
    const rawDateStr = dummyDateInput.value || '01/01/2000';
    const hl7Date = formatDummyDate('20000101', rawDateStr);
    const overrideRules = buildOverrideLookup();

    const ctx = {
      rPrefix,
      rFirst,
      rMiddle,
      rLast,
      rNickname,
      rId,
      rPhone,
      rEmail,
      addrObj,
      rawDateStr,
      overrideRules
    };

    const overrideSafeTokens = [];
    overrideRules.forEach((rule) => {
      if (rule.value && rule.value.toUpperCase() !== '[RANDOM]') {
        overrideSafeTokens.push(rule.value);
        rule.value.split(/[\^~&,]/).forEach(part => {
          if (part.trim()) overrideSafeTokens.push(part.trim());
        });
      }
    });

    const safeStrings = [
      `${rFirst} ${rLast}`,
      `${rLast}, ${rFirst}`,
      `${rFirst} ${rMiddle} ${rLast}`,
      rFirst,
      rLast,
      rMiddle,
      rNickname,
      rPrefix,
      rPhone,
      rEmail,
      addrObj.full,
      addrObj.street,
      addrObj.city,
      addrObj.state,
      addrObj.zip,
      hl7Date,
      rawDateStr,
      formatDummyDate('2000-01-01', rawDateStr),
      ...overrideSafeTokens
    ].map(normalizeStr).filter(s => s.length > 0);

    const delims = extractHl7Delimiters(lines);
    const { fieldSep, repSep, escChar } = delims;
    const segmentCounts = {};

    lines.forEach((lineText, index) => {
      let hasPhi = false;
      let leftHtml = '';
      let rightHtml = '';
      let sHtml = '';

      const segRegex = new RegExp(`^[A-Z][A-Z0-9]{2}${escapeRegex(fieldSep)}`);
      if (segRegex.test(lineText)) {
        const fields = splitUnescaped(lineText, fieldSep, escChar);
        const segment = fields[0];
        segmentCounts[segment] = (segmentCounts[segment] || 0) + 1;
        const segOccurrence = segmentCounts[segment];

        const rules = hl7Map[segment] || {};
        const isHeaderSeg = segment === 'MSH' || segment === 'FHS' || segment === 'BHS';
        const isCustomZSegment = /^Z[A-Z0-9]{2}$/.test(segment);

        for (let i = 1; i < fields.length; i++) {
          const fieldNum = isHeaderSeg ? i + 1 : i;
          const prefixSep = i === 1 ? '' : escapeHtml(fieldSep);

          if (fields[i].trim().length === 0 || fields[i].trim() === '""') {
            const cleanEmpty = escapeHtml(fields[i]);
            leftHtml += prefixSep + cleanEmpty;
            rightHtml += prefixSep + cleanEmpty;
            sHtml += prefixSep + cleanEmpty;
            continue;
          }

          const hasExplicitOverride = overrideRules.some(
            r => r.segment === segment &&
              (r.segmentIndex === null || r.segmentIndex === segOccurrence) &&
              r.field === fieldNum
          );

          const ruleType = rules[fieldNum];
          if (ruleType === 'IGNORE' && !hasExplicitOverride) {
            const cleanField = escapeHtml(fields[i]);
            leftHtml += prefixSep + cleanField;
            rightHtml += prefixSep + cleanField;
            sHtml += prefixSep + cleanField;
            continue;
          }

          if (ruleType || hasExplicitOverride) {
            const fieldRes = scrubHl7TypedField(
              fields[i],
              ruleType || 'CUSTOM',
              mode,
              safeStrings,
              ctx,
              delims,
              { segment, segOccurrence, fieldNum }
            );
            if (fieldRes.hasPhi) {
              hasPhi = true;
              matchCount += fieldRes.matchCount;
            }
            leftHtml += prefixSep + fieldRes.leftHtml;
            rightHtml += prefixSep + fieldRes.rightHtml;
            sHtml += prefixSep + fieldRes.sHtml;
          } else {
            const reps = splitUnescaped(fields[i], repSep, escChar);
            const leftReps = [];
            const rightReps = [];
            const scanReps = [];
            let fieldMatched = false;

            for (let r = 0; r < reps.length; r++) {
              const res = processRegexTokens(reps[r], mode, safeStrings, ctx);
              if (res.hasPhi) {
                hasPhi = true;
                fieldMatched = true;
                matchCount += res.matchCount;
              }
              leftReps.push(res.leftHtml);
              rightReps.push(res.rightHtml);
              scanReps.push(res.sHtml);
            }

            if (isCustomZSegment || fieldMatched) {
              const escapedRepSep = escapeHtml(repSep);
              leftHtml += prefixSep + leftReps.join(escapedRepSep);
              rightHtml += prefixSep + rightReps.join(escapedRepSep);
              sHtml += prefixSep + scanReps.join(escapedRepSep);
            } else {
              const cleanField = escapeHtml(fields[i]);
              leftHtml += prefixSep + cleanField;
              rightHtml += prefixSep + cleanField;
              sHtml += prefixSep + cleanField;
            }
          }
        }

        if (mode === 'diff') {
          leftHtml = escapeHtml(segment + fieldSep) + leftHtml;
          rightHtml = escapeHtml(segment + fieldSep) + rightHtml;
        } else {
          sHtml = escapeHtml(segment + fieldSep) + sHtml;
        }
      } else {
        const res = processRegexTokens(lineText, mode, safeStrings, ctx);
        if (res.hasPhi) {
          hasPhi = true;
          matchCount += res.matchCount;
        }
        leftHtml = res.leftHtml;
        rightHtml = res.rightHtml;
        sHtml = res.sHtml;
      }

      if (mode === 'diff') {
        if (leftHtml === '') leftHtml = ' ';
        if (rightHtml === '') rightHtml = ' ';
        window.modifiedLeftStore[index] = leftHtml;
        window.modifiedRightStore[index] = rightHtml;
        leftLinesHtml.push(`<div class="ide-line" data-line-index="${index}">${leftHtml}</div>`);
        rightLinesHtml.push(`<div class="ide-line" data-line-index="${index}">${rightHtml}</div>`);

        if (hasPhi) {
          centerLinesHtml.push(
            `<div class="gutter-line" data-line-index="${index}">` +
            `<button class="action-btn undo-btn" data-line-index="${index}" title="Undo Line">&#8634;</button>` +
            `<button class="action-btn redo-btn" data-line-index="${index}" title="Redo Line">&#8635;</button>` +
            `</div>`
          );
        } else {
          centerLinesHtml.push(`<div class="gutter-line" data-line-index="${index}"></div>`);
        }
      } else {
        scanHtml += (sHtml === '' ? ' ' : sHtml) + '\n';
      }
    });

    if (mode === 'diff') {
      return {
        rawHtml: leftLinesHtml.join(''),
        cleanHtml: rightLinesHtml.join(''),
        gutterHtml: centerLinesHtml.join('')
      };
    }
    return { html: scanHtml, matches: matchCount };
  }

  // --- TOOLBAR HANDLERS ---
  document.getElementById('btn-scrub-text').addEventListener('click', () => {
    let input = rawEditor.innerText;
    const ts = document.getElementById('text-status');
    if (!input || !input.trim()) {
      ts.style.color = '';
      ts.innerText = 'Please input text first.';
      return;
    }
    input = autoFormatData(input);
    const diff = runCoreEngine(input, 'diff');
    rawEditor.innerHTML = diff.rawHtml;
    cleanEditor.innerHTML = diff.cleanHtml;
    actionEditor.innerHTML = diff.gutterHtml;
    ts.style.color = '';
    ts.innerText = 'Split-Pane IDE Diff Complete. Click \u21BA to Undo or \u21BB to Redo per line.';
  });

  document.getElementById('btn-scan-text').addEventListener('click', () => {
    let input = rawEditor.innerText;
    const ts = document.getElementById('text-status');
    if (!input || !input.trim()) {
      ts.style.color = '';
      ts.innerText = 'Please input text to scan.';
      return;
    }
    cleanEditor.innerHTML = '';
    actionEditor.innerHTML = '';
    input = autoFormatData(input);
    const scan = runCoreEngine(input, 'scan');

    if (scan.matches === 0) {
      ts.innerText = 'SAFE TO USE: 0 PHI elements detected.';
      ts.style.color = 'var(--success)';
      rawEditor.innerText = input;
    } else {
      ts.innerText = `UNSAFE: Found ${scan.matches} potential PHI or Test Data elements.`;
      ts.style.color = 'var(--danger)';
      rawEditor.innerHTML = scan.html;
    }
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    rawEditor.innerHTML = '';
    cleanEditor.innerHTML = '';
    actionEditor.innerHTML = '';
    const ts = document.getElementById('text-status');
    ts.innerText = '';
    ts.style.color = '';
    window.originalLinesStore = [];
    window.modifiedLeftStore = [];
    window.modifiedRightStore = [];
  });

  document.addEventListener('click', (e) => {
    if (e.target && (e.target.classList.contains('undo-btn') || e.target.classList.contains('redo-btn'))) {
      const lineIndex = parseInt(e.target.getAttribute('data-line-index'), 10);
      const isUndo = e.target.classList.contains('undo-btn');
      const targetLeft = rawEditor.querySelector(`.ide-line[data-line-index="${lineIndex}"]`);
      const targetRight = cleanEditor.querySelector(`.ide-line[data-line-index="${lineIndex}"]`);
      if (targetLeft && targetRight) {
        if (isUndo) {
          targetLeft.innerHTML = escapeHtml(window.originalLinesStore[lineIndex]);
          targetRight.innerHTML = escapeHtml(window.originalLinesStore[lineIndex]);
        } else {
          targetLeft.innerHTML = window.modifiedLeftStore[lineIndex];
          targetRight.innerHTML = window.modifiedRightStore[lineIndex];
        }
      }
    }
  });

  document.getElementById('btn-copy').addEventListener('click', () => {
    const textToCopy = cleanEditor.innerText;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      const btn = document.getElementById('btn-copy');
      btn.innerText = 'Copied!';
      setTimeout(() => { btn.innerText = 'Copy Cleaned Text'; }, 2000);
    });
  });

  // --- HL7 DICTIONARY & TMS 1-BASED TREE INSPECTOR ---
  const hl7Dictionary = {
    'FHS': { name: 'File Header', fields: { 1: 'File Field Separator', 2: 'File Encoding Characters', 3: 'File Sending Application', 4: 'File Sending Facility', 5: 'File Receiving Application', 6: 'File Receiving Facility', 7: 'File Creation Date/Time', 9: 'File Name/ID', 11: 'File Control ID' } },
    'BHS': { name: 'Batch Header', fields: { 1: 'Batch Field Separator', 2: 'Batch Encoding Characters', 3: 'Batch Sending Application', 4: 'Batch Sending Facility', 5: 'Batch Receiving Application', 6: 'Batch Receiving Facility', 7: 'Batch Creation Date/Time', 9: 'Batch Name/ID/Type', 11: 'Batch Control ID' } },
    'MSH': { name: 'Message Header', fields: { 1: 'Field Separator', 2: 'Encoding Characters', 3: 'Sending Application', 4: 'Sending Facility', 5: 'Receiving Application', 6: 'Receiving Facility', 7: 'Date/Time Of Message', 8: 'Security', 9: 'Message Type', 10: 'Message Control ID', 11: 'Processing ID', 12: 'Version ID', 15: 'Accept Acknowledgment Type', 16: 'Application Acknowledgment Type', 21: 'Message Profile Identifier' } },
    'EVN': { name: 'Event Type', fields: { 1: 'Event Type Code', 2: 'Recorded Date/Time', 3: 'Date/Time Planned Event', 4: 'Event Reason Code', 5: 'Operator ID', 6: 'Event Occurred', 7: 'Event Facility' } },
    'PID': { name: 'Patient Identification', fields: { 1: 'Set ID - PID', 2: 'Patient ID', 3: 'Patient Identifier List', 4: 'Alternate Patient ID - PID', 5: 'Patient Name', 6: "Mother's Maiden Name", 7: 'Date/Time of Birth', 8: 'Administrative Sex', 9: 'Patient Alias', 10: 'Race', 11: 'Patient Address', 12: 'County Code', 13: 'Phone Number - Home', 14: 'Phone Number - Business', 15: 'Primary Language', 16: 'Marital Status', 17: 'Religion', 18: 'Patient Account Number', 19: 'SSN Number - Patient', 20: "Driver's License Number", 21: "Mother's Identifier", 22: 'Ethnic Group', 23: 'Birth Place', 29: 'Patient Death Date and Time', 30: 'Patient Death Indicator' } },
    'PD1': { name: 'Patient Additional Demographic', fields: { 1: 'Living Dependency', 2: 'Living Arrangement', 3: 'Patient Primary Facility', 4: 'Patient Primary Care Provider', 11: 'Publicity Code', 12: 'Protection Indicator' } },
    'NK1': { name: 'Next of Kin / Associated Parties', fields: { 1: 'Set ID - NK1', 2: 'Name', 3: 'Relationship', 4: 'Address', 5: 'Phone Number', 6: 'Business Phone Number', 7: 'Contact Role', 13: 'Organization Name - NK1', 30: 'Contact Person Name', 31: 'Contact Person Telephone Number', 32: 'Contact Person Address', 33: 'Next of Kin/Associated Party Identifiers' } },
    'PV1': { name: 'Patient Visit', fields: { 1: 'Set ID - PV1', 2: 'Patient Class', 3: 'Assigned Patient Location', 4: 'Admission Type', 5: 'Preadmit Number', 6: 'Prior Patient Location', 7: 'Attending Doctor', 8: 'Referring Doctor', 9: 'Consulting Doctor', 10: 'Hospital Service', 14: 'Admit Source', 15: 'Ambulatory Status', 17: 'Admitting Doctor', 18: 'Patient Type', 19: 'Visit Number', 20: 'Financial Class', 36: 'Discharge Disposition', 44: 'Admit Date/Time', 45: 'Discharge Date/Time' } },
    'PV2': { name: 'Patient Visit - Additional Info', fields: { 3: 'Admit Reason', 8: 'Expected Admit Date/Time', 9: 'Expected Discharge Date/Time', 47: 'Expected Visit Return Date/Time' } },
    'OBX': { name: 'Observation / Result', fields: { 1: 'Set ID - OBX', 2: 'Value Type', 3: 'Observation Identifier', 4: 'Observation Sub-ID', 5: 'Observation Value', 6: 'Units', 7: 'References Range', 8: 'Abnormal Flags', 11: 'Observation Result Status', 14: 'Date/Time of the Observation', 15: "Producer's ID", 16: 'Responsible Observer', 18: 'Equipment Instance Identifier', 19: 'Date/Time of the Analysis' } },
    'ORC': { name: 'Common Order', fields: { 1: 'Order Control', 2: 'Placer Order Number', 3: 'Filler Order Number', 4: 'Placer Group Number', 5: 'Order Status', 7: 'Quantity/Timing', 9: 'Date/Time of Transaction', 10: 'Entered By', 11: 'Verified By', 12: 'Ordering Provider', 13: "Enterer's Location", 14: 'Call Back Phone Number', 15: 'Order Effective Date/Time', 16: 'Order Control Code Reason' } },
    'OBR': { name: 'Observation Request', fields: { 1: 'Set ID - OBR', 2: 'Placer Order Number', 3: 'Filler Order Number', 4: 'Universal Service Identifier', 6: 'Requested Date/Time', 7: 'Observation Date/Time', 16: 'Ordering Provider', 18: 'Placer Field 1', 19: 'Placer Field 2', 20: 'Filler Field 1', 21: 'Filler Field 2', 22: 'Results Rpt/Status Chng - Date/Time', 25: 'Result Status', 27: 'Quantity/Timing', 28: 'Result Copies To', 31: 'Reason for Study' } },
    'IN1': { name: 'Insurance', fields: { 1: 'Set ID - IN1', 2: 'Insurance Plan ID', 3: 'Insurance Company ID', 4: 'Insurance Company Name', 5: 'Insurance Company Address', 6: 'Insurance Co Contact Person', 7: 'Insurance Co Phone Number', 8: 'Group Number', 9: 'Group Name', 10: "Insured's Group Emp ID", 11: "Insured's Group Emp Name", 12: 'Plan Effective Date', 13: 'Plan Expiration Date', 15: 'Plan Type', 16: 'Name Of Insured', 17: "Insured's Relationship To Patient", 18: "Insured's Date Of Birth", 36: 'Policy Number', 43: 'Name Of Insured' } },
    'IN2': { name: 'Insurance Additional Information', fields: { 1: 'Set ID - IN2', 2: "Insured's Social Security Number", 3: "Insured's Employer's Name and ID", 6: 'Medicare Health Ins Card Number', 8: 'Medicaid Case Name', 9: 'Medicaid Case Number', 10: 'Military Handicap Program', 15: 'Plan Coverage Date' } },
    'GT1': { name: 'Guarantor', fields: { 1: 'Set ID - GT1', 2: 'Guarantor Number', 3: 'Guarantor Name', 4: 'Guarantor Spouse Name', 5: 'Guarantor Address', 6: 'Guarantor Ph Num-Home', 7: 'Guarantor Ph Num-Business', 8: 'Guarantor Date/Time Of Birth', 9: 'Guarantor Administrative Sex', 10: 'Guarantor Type', 11: 'Guarantor Relationship', 12: 'Guarantor SSN' } },
    'AL1': { name: 'Patient Allergy Information', fields: { 1: 'Set ID - AL1', 2: 'Allergen Type Code', 3: 'Allergen Code/Mnemonic/Description', 4: 'Allergy Severity Code', 5: 'Allergy Reaction Code', 6: 'Identification Date' } },
    'DG1': { name: 'Diagnosis', fields: { 1: 'Set ID - DG1', 2: 'Diagnosis Coding Method', 3: 'Diagnosis Code - DG1', 4: 'Diagnosis Description', 5: 'Diagnosis Date/Time', 6: 'Diagnosis Type', 15: 'Diagnosis Priority', 16: 'Diagnosing Clinician', 17: 'Diagnosis Classification' } },
    'PR1': { name: 'Procedures', fields: { 1: 'Set ID - PR1', 2: 'Procedure Coding Method', 3: 'Procedure Code', 4: 'Procedure Description', 5: 'Procedure Date/Time', 6: 'Procedure Functional Type', 8: 'Anesthesiologist', 11: 'Surgeon', 12: 'Procedure Practitioner', 14: 'Procedure Priority', 16: 'Procedure Code Modifier' } },
    'MRG': { name: 'Merge Patient Information', fields: { 1: 'Prior Patient Identifier List', 2: 'Prior Alternate Patient ID', 3: 'Prior Patient Account Number', 4: 'Prior Patient ID', 5: 'Prior Visit Number', 6: 'Prior Alternate Visit ID', 7: 'Prior Patient Name' } },
    'RXO': { name: 'Pharmacy/Treatment Order', fields: { 1: 'Requested Give Code', 2: 'Requested Give Amount - Minimum', 3: 'Requested Give Amount - Maximum', 4: 'Requested Give Units', 10: 'Requested Dispense Code', 11: 'Requested Dispense Amount', 12: 'Requested Dispense Units', 14: "Ordering Provider's DEA Number", 18: 'Requested Give Strength' } },
    'RXE': { name: 'Pharmacy/Treatment Encoded Order', fields: { 1: 'Quantity/Timing', 2: 'Give Code', 3: 'Give Amount - Minimum', 4: 'Give Amount - Maximum', 5: 'Give Units', 15: 'Prescription Number', 16: 'Number of Refills', 21: "Pharmacy/Treatment Supplier's Special Dispensing Instructions" } },
    'SCH': { name: 'Scheduling Activity Information', fields: { 1: 'Placer Appointment ID', 2: 'Filler Appointment ID', 6: 'Event Reason', 11: 'Appointment Timing Quantity', 12: 'Placer Contact Person', 13: 'Placer Contact Phone Number', 16: 'Filler Contact Person', 17: 'Filler Contact Phone Number', 26: 'Placer Order Number' } },
    'REF': { name: 'Patient Referral', fields: { 1: 'Referral Request Identifier', 2: 'Referral Status', 3: 'Referral Type', 5: 'Referred To Provider', 6: 'Referred To Clinic' } },
    'NTE': { name: 'Notes and Comments', fields: { 1: 'Set ID - NTE', 2: 'Source of Comment', 3: 'Comment', 4: 'Comment Type' } },
    'ODS': { name: 'Dietary Orders, Supplements, and Preferences', fields: { 1: 'Type', 2: 'Service Period', 3: 'Diet, Supplement, or Preference Code', 4: 'Text Instruction' } },
    'SPM': { name: 'Specimen', fields: { 1: 'Set ID - SPM', 2: 'Specimen ID', 3: 'Specimen Parent IDs', 4: 'Specimen Type', 17: 'Specimen Collection Date/Time', 18: 'Specimen Received Date/Time' } },
    'SAC': { name: 'Specimen Container Detail', fields: { 1: 'External Accession Identifier', 2: 'Accession Identifier', 3: 'Container Identifier', 4: 'Primary (Parent) Container Identifier' } }
  };

  document.getElementById('btn-build-tree').addEventListener('click', () => {
    let lines = [];
    const lineDivs = rawEditor.querySelectorAll('.ide-line');
    if (lineDivs.length > 0) {
      lineDivs.forEach(div => lines.push(div.innerText));
    } else {
      lines = autoFormatData(rawEditor.innerText).trim().split(/\r?\n/);
    }

    const container = document.getElementById('tree-container');
    const delims = extractHl7Delimiters(lines);
    const { fieldSep, compSep, repSep, escChar, subCompSep } = delims;

    const hasMSH = lines.some(line => new RegExp(`\\b(MSH|FHS|BHS)${escapeRegex(fieldSep)}`).test(line));
    if (!hasMSH) {
      container.innerHTML = `<p style="text-align:center; color:red; margin-top:20px;">No HL7 format detected in the IDE tab. Please paste a valid HL7 message first.</p>`;
      return;
    }

    if (typeof HL7 !== 'undefined') {
      try {
        const hl7Msg = new HL7(lines.join('\r\n'));
        hl7Msg.transform(() => {});
      } catch (e) {
        // Continue rendering tree even on partial HL7 snippets
      }
    }

    container.innerHTML = '';
    const segCounts = {};

    lines.forEach(line => {
      if (!line.trim() || !new RegExp(`^[A-Z][A-Z0-9]{2}${escapeRegex(fieldSep)}`).test(line)) return;
      const fields = splitUnescaped(line, fieldSep, escChar);
      const segmentName = fields[0];
      segCounts[segmentName] = (segCounts[segmentName] || 0) + 1;
      const segOccurrence = segCounts[segmentName];
      const segPrefix = segOccurrence > 1 ? `${segmentName}[${segOccurrence}]` : segmentName;

      const segMeta = hl7Dictionary[segmentName] || {
        name: /^Z[A-Z0-9]{2}$/.test(segmentName) ? 'Custom TMS / Vendor Z-Segment' : 'Custom / Vendor-Specific Segment',
        fields: {}
      };
      const segRules = hl7Map[segmentName] || {};

      const segDiv = document.createElement('div');
      const segRow = document.createElement('div');
      segRow.className = 'tree-row segment-header';

      const toggle = document.createElement('div');
      toggle.className = 'tree-toggle closed';

      const segId = document.createElement('div');
      segId.className = 'tree-field-id';
      segId.innerText = segPrefix;

      const segDesc = document.createElement('div');
      segDesc.className = 'tree-desc';
      segDesc.innerText = segMeta.name;

      const segVal = document.createElement('div');
      segVal.className = 'tree-value';
      segVal.innerText = line.substring(0, 75) + (line.length > 75 ? '...' : '');

      segRow.appendChild(toggle);
      segRow.appendChild(segId);
      segRow.appendChild(segDesc);
      segRow.appendChild(segVal);

      const childrenDiv = document.createElement('div');
      childrenDiv.className = 'tree-children';

      segRow.addEventListener('click', () => {
        toggle.classList.toggle('closed');
        toggle.classList.toggle('open');
        childrenDiv.classList.toggle('active');
      });

      const isHeaderSeg = segmentName === 'MSH' || segmentName === 'FHS' || segmentName === 'BHS';

      fields.forEach((fieldVal, index) => {
        if (index === 0 || !fieldVal) return;
        let fieldIndex = index;

        if (isHeaderSeg) {
          fieldIndex = index + 1;
          if (index === 1) {
            const sepRow = document.createElement('div');
            sepRow.className = 'tree-row';
            sepRow.innerHTML = `<div class="tree-toggle empty"></div><div class="tree-field-id">${segPrefix}-1</div><div class="tree-desc">${segMeta.fields[1] || 'Field Separator'}</div><div class="tree-value">${escapeHtml(fieldSep)}</div>`;
            childrenDiv.appendChild(sepRow);
          }
        }

        const ruleType = segRules[fieldIndex];
        const phiBadge = (ruleType && ruleType !== 'IGNORE') ? `<span class="phi-tag">${ruleType}</span>` : '';
        const fieldDescText = segMeta.fields[fieldIndex] || `Field ${fieldIndex}`;
        const reps = isHeaderSeg && fieldIndex === 2 ? [fieldVal] : splitUnescaped(fieldVal, repSep, escChar);
        const hasNested = !(isHeaderSeg && fieldIndex === 2) &&
          (reps.length > 1 || fieldVal.includes(compSep) || fieldVal.includes(subCompSep));

        const fieldRow = document.createElement('div');
        fieldRow.className = 'tree-row';
        fieldRow.innerHTML = `
          <div class="tree-toggle ${hasNested ? 'closed' : 'empty'}"></div>
          <div class="tree-field-id">${segPrefix}-${fieldIndex}</div>
          <div class="tree-desc">${fieldDescText}${phiBadge}</div>
          <div class="tree-value">${escapeHtml(unescapeHl7Text(fieldVal, delims))}</div>
        `;
        childrenDiv.appendChild(fieldRow);

        if (hasNested) {
          const subContainer = document.createElement('div');
          subContainer.className = 'tree-children';
          fieldRow.style.cursor = 'pointer';
          fieldRow.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const fToggle = fieldRow.querySelector('.tree-toggle');
            fToggle.classList.toggle('closed');
            fToggle.classList.toggle('open');
            subContainer.classList.toggle('active');
          });

          reps.forEach((repVal, rIdx) => {
            if (!repVal) return;
            const repLabel = reps.length > 1 ? `${segPrefix}-${fieldIndex}[${rIdx + 1}]` : `${segPrefix}-${fieldIndex}`;
            const comps = splitUnescaped(repVal, compSep, escChar);

            comps.forEach((compVal, cIdx) => {
              if (!compVal) return;
              const compLabel = `${repLabel}.${cIdx + 1}`;
              const subComps = splitUnescaped(compVal, subCompSep, escChar);

              if (subComps.length > 1) {
                subComps.forEach((scVal, scIdx) => {
                  if (!scVal) return;
                  const scRow = document.createElement('div');
                  scRow.className = 'tree-row';
                  scRow.innerHTML = `
                    <div class="tree-toggle empty"></div>
                    <div class="tree-field-id">${compLabel}[${scIdx + 1}]</div>
                    <div class="tree-desc">Rep ${rIdx + 1}, Comp ${cIdx + 1}, Sub ${scIdx + 1}</div>
                    <div class="tree-value">${escapeHtml(unescapeHl7Text(scVal, delims))}</div>
                  `;
                  subContainer.appendChild(scRow);
                });
              } else {
                const compRow = document.createElement('div');
                compRow.className = 'tree-row';
                compRow.innerHTML = `
                  <div class="tree-toggle empty"></div>
                  <div class="tree-field-id">${compLabel}</div>
                  <div class="tree-desc">${reps.length > 1 ? `Rep ${rIdx + 1}, ` : ''}Component ${cIdx + 1}</div>
                  <div class="tree-value">${escapeHtml(unescapeHl7Text(compVal, delims))}</div>
                `;
                subContainer.appendChild(compRow);
              }
            });
          });

          childrenDiv.appendChild(subContainer);
        }
      });

      segDiv.appendChild(segRow);
      segDiv.appendChild(childrenDiv);
      container.appendChild(segDiv);
    });
  });
});
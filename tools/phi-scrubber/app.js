document.addEventListener('DOMContentLoaded', () => {
  const dummyPrefixInput = document.getElementById('dummy-prefix');
  const dummyFirstInput = document.getElementById('dummy-first');
  const dummyMiddleInput = document.getElementById('dummy-middle');
  const dummyLastInput = document.getElementById('dummy-last');
  const dummyNicknameInput = document.getElementById('dummy-nickname');
  const dummyIdInput = document.getElementById('dummy-id');
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

  chrome.storage.local.get([
    'savedPrefix', 'savedFirst', 'savedMiddle', 'savedLast', 'savedNickname', 
    'savedId', 'savedPhone', 'savedEmail', 'savedAddress', 'savedDate'
  ], (result) => {
    if (result.savedPrefix) dummyPrefixInput.value = result.savedPrefix;
    if (result.savedFirst) dummyFirstInput.value = result.savedFirst;
    if (result.savedMiddle) dummyMiddleInput.value = result.savedMiddle;
    if (result.savedLast) dummyLastInput.value = result.savedLast;
    if (result.savedNickname) dummyNicknameInput.value = result.savedNickname;
    if (result.savedId) dummyIdInput.value = result.savedId.includes("000000") ? "[RANDOM]" : result.savedId;
    if (result.savedPhone) dummyPhoneInput.value = result.savedPhone;
    if (result.savedEmail) dummyEmailInput.value = result.savedEmail;
    if (result.savedAddress) dummyAddressInput.value = result.savedAddress;
    if (result.savedDate) dummyDateInput.value = result.savedDate;
  });

  document.getElementById('btn-save-settings').addEventListener('click', () => {
    chrome.storage.local.set({
      savedPrefix: dummyPrefixInput.value,
      savedFirst: dummyFirstInput.value,
      savedMiddle: dummyMiddleInput.value,
      savedLast: dummyLastInput.value,
      savedNickname: dummyNicknameInput.value,
      savedId: dummyIdInput.value,
      savedPhone: dummyPhoneInput.value,
      savedEmail: dummyEmailInput.value,
      savedAddress: dummyAddressInput.value,
      savedDate: dummyDateInput.value
    }, () => {
      const status = document.getElementById('save-status');
      status.innerText = "Settings Saved!";
      setTimeout(() => status.innerText = "", 3000);
    });
  });

  // --- UPDATED TAB LOGIC (File Tab Removed) ---
  const tabText = document.getElementById('tab-text');
  const tabInspector = document.getElementById('tab-inspector');

  const viewText = document.getElementById('view-text');
  const viewInspector = document.getElementById('view-inspector');

  function switchTab(activeTab, activeView) {
    [tabText, tabInspector].forEach(t => t.classList.remove('active'));
    [viewText, viewInspector].forEach(v => { v.classList.remove('active'); v.classList.add('hidden'); });
    
    activeTab.classList.add('active');
    activeView.classList.add('active');
    activeView.classList.remove('hidden');
  }

  tabText.addEventListener('click', () => switchTab(tabText, viewText));
  tabInspector.addEventListener('click', () => switchTab(tabInspector, viewInspector));

  let isSyncingScroll = false;
  function handleScroll(e) {
    if (isSyncingScroll) return;
    isSyncingScroll = true;
    const top = e.target.scrollTop;
    const left = e.target.scrollLeft;
    
    if (e.target !== rawEditor) { rawEditor.scrollTop = top; rawEditor.scrollLeft = left; }
    if (e.target !== cleanEditor) { cleanEditor.scrollTop = top; cleanEditor.scrollLeft = left; }
    if (e.target !== actionEditor) { actionEditor.scrollTop = top; }
    setTimeout(() => isSyncingScroll = false, 20);
  }
  rawEditor.addEventListener('scroll', handleScroll);
  cleanEditor.addEventListener('scroll', handleScroll);

  function autoFormatData(text) {
    let trimmed = text.trim();
    if (trimmed.toUpperCase().includes('MSH')) {
      let flat = trimmed.replace(/\r?\n/g, ' '); 
      flat = flat.replace(/\s*\|\s*/g, '|');
      flat = flat.replace(/A{2,}/g, match => '^'.repeat(match.length));
      flat = flat.replace(/~{2,}/g, match => '^'.repeat(match.length));
      flat = flat.replace(/°/g, '^');

      const validSegments = ['MSH', 'EVN', 'PID', 'PD1', 'NK1', 'PV1', 'PV2', 'OBX', 'ORC', 'OBR', 'IN1', 'IN2', 'GT1', 'AL1', 'DG1', 'PR1', 'MRG', 'RXO', 'RXE', 'SCH', 'REF', 'NTE', 'ODS', 'Z'];
      const segRegex = new RegExp(`(?<!^)\\s*\\b(${validSegments.join('|')})\\|`, 'gi');
      flat = flat.replace(segRegex, (match, p1) => '\n' + p1.toUpperCase() + '|');

      flat = flat.replace(/MSH\|A~\\&/gi, 'MSH|^~\\&');
      const mshIndex = flat.toUpperCase().indexOf('MSH|');
      if (mshIndex > -1) flat = flat.substring(mshIndex);

      return flat.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
    }
    
    if (/\b(AXA|APON|AFS|7FS|°FS|AFO|7FO|A0|A@|FDDB)\b/i.test(trimmed) || trimmed.includes('^XA')) {
      let zpl = trimmed.replace(/\r?\n/g, ' '); 
      zpl = zpl.replace(/,\s+/g, ',');
      zpl = zpl.replace(/(?:[A7~°4\s]|^)(XA|PON|LH|BX|FD|FS)\b/gi, '^$1');
      zpl = zpl.replace(/(?:[A7~°4\s]|^)F[O0]/gi, '^FO');
      zpl = zpl.replace(/(?:[A7~°4\s]|^)A[@QO0]/gi, '^A0');
      zpl = zpl.replace(/(?:[A7~°4\s]|^)C[I1l][0O]/gi, '^CI0');
      zpl = zpl.replace(/(?:[A7~°4\s]|^)X[Z7]\b/gi, '^XZ');
      zpl = zpl.replace(/\^\s+/g, '^');
      zpl = zpl.replace(/(\^(XA|PON|CI0|LH|FO|A0|XZ))/gi, '\n$1');
      zpl = zpl.replace(/\^([a-z0-9]{2})/g, (match, p1) => '^' + p1.toUpperCase());
      return zpl.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
    }

    return text; 
  }

  rawEditor.addEventListener('paste', (e) => {
    e.preventDefault(); 
    const clipboardData = e.clipboardData || window.clipboardData;
    let rawPastedText = clipboardData.getData('text/plain');
    if (rawPastedText) {
      let formattedText = autoFormatData(rawPastedText);
      document.execCommand('insertText', false, formattedText);
    }
  });

  function randomizeString(str) {
    return str.replace(/[A-Z]/g, 'X')
              .replace(/[a-z]/g, 'x')
              .replace(/[0-9]/g, '0'); 
  }

  const escapeHtml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const normalizeStr = (s) => s ? s.toString().replace(/[^a-z0-9]/gi, '').toLowerCase() : '';

  function isTextSafe(str, safeStrings) {
    if (!str || str.trim().length === 0) return true;
    
    const norm = normalizeStr(str);
    if (safeStrings.includes(norm)) return true;
    
    if (/^[Xx0\s\-\.,\^():]+$/.test(str.trim())) return true;
    
    const lower = str.toLowerCase();
    const dummyKeywords = ['test', 'timeless', 'sample', 'dummy', 'zzz', 'fake'];
    if (dummyKeywords.some(k => lower.includes(k))) return false;

    if (/^(ep\d+|12345\d*|0000\d+|9999\d+)$/i.test(str.trim())) return true;
    if (/^(doctor|mom|dad|sister|brother|father|mother|physician)$/i.test(str.trim())) return true;

    return false;
  }

  const blacklist = "DEPID|CMAH|NOT|HISPA|UNK|UNKNOWN|PATIENT|ACCESS|FAC|NPI|CMH|AUTO|Male|Female|M|F|U|None|No|Latino|Hispanic|Number|Account|Home|MOBILE|E-mail|Current|Spanish|Single|Resident|Preference|MRN|PHREE|FIN|NBR|HNAM|ORDE|HNAM_ORDE|ADT|NHC|NHCADTPA|A01|A02|A03|A04|A08|ORM|ORU|ACK|EPIC|CERNER|Bank|Denver|Milk|Mothers|Cal|Oz|Batch|GENERAL|INTERNAL|LEVEL|PHY|SP|IN|PERSONNEL|VOLUME|FORMULA|DENSITY|FREQUENCY|FEED|ROUTE|GAVAGE|CALORIC|INFANT|PREMATURE|ENFAMIL|NICU|BASECAL|DIET2";
  const nameIgnore = ["NPI", "MD", "DO", "L", "M", "D", "RN", "A", "CMAH", "EPC", "CURRENT", "PERSONNEL", "PRI", "PRN", "MOM", "DAD", "SISTER", "BROTHER", "FATHER", "MOTHER", "PHYSICIAN"];
  const testDataKeywords = "test|testing|timeless|timelesstest|timelessbaby|sample|dummy|tmstest|zzztesting";

  const fallbackPatterns = [
    { label: "Test Data", regex: new RegExp(`\\b(${testDataKeywords})\\b`, "gi") },
    { label: "SSN", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
    { label: "Phone", regex: /(?<!\d)(?:\+?1[- . ]?)?\(?[0-9]{3}\)?[- . ][0-9]{3}[- . ][0-9]{4}(?!\d)/g },
    { label: "Email", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
    { label: "Date", regex: /(?<!Expires:\s?)(?<!Exp:\s?)\b(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}\b/gi },
    { label: "Address", regex: /\b\d+\s+[A-Za-z0-9\s]+(?:Avenue|Lane|Road|Boulevard|Drive|Street|Ave|Dr|Rd|Blvd|Ln|St|RD)\b/gi },
    { label: "HL7 Name Fallback", regex: new RegExp(`(?<=^|\\^|\\|)(?!(?:${blacklist})\\b)[A-Za-z\\-']{2,}\\^(?!(?:${blacklist})\\b)[A-Za-z\\-']{2,}(?:\\^[A-Za-z\\-']*)*(?=\\^|\\||$)`, "gi") },
    { label: "Quoted Name", regex: /(?<=")(?!(?:Waiting|In[ \t]+Progress|Closed|Open|New|Status)\b)[A-Z][A-Za-z\-]+(?:,)?[ \t]*[A-Z][A-Za-z\-]+(?=")/g },
    { label: "Name", regex: /\b(?!(?:${blacklist})\b)[A-Z][A-Za-z\-']*,[ \t]*[A-Z][A-Za-z\- ']+(?=\^|FS|$|\b)/gi }
  ];

  const hl7Map = {
    'MSH': { 3: 'IGNORE', 4: 'IGNORE', 5: 'IGNORE', 6: 'IGNORE', 9: 'IGNORE', 10: 'IGNORE', 11: 'IGNORE', 12: 'IGNORE', 21: 'IGNORE' },
    'EVN': { 1: 'IGNORE', 4: 'IGNORE', 5: 'IGNORE', 7: 'IGNORE' },
    'PID': { 2: 'ID', 3: 'ID', 4: 'ID', 5: 'NAME', 6: 'NAME', 7: 'DATE', 11: 'ADDRESS', 13: 'PHONE', 14: 'PHONE', 18: 'ID', 19: 'SSN' },
    'NK1': { 2: 'NAME', 4: 'ADDRESS', 5: 'PHONE', 13: 'PHONE', 33: 'ID' },
    'PV1': { 2: 'IGNORE', 3: 'IGNORE', 7: 'NAME', 8: 'NAME', 9: 'NAME', 10: 'IGNORE', 17: 'NAME', 18: 'IGNORE', 19: 'ID' },
    'PV2': { 3: 'NAME' },
    'ORC': { 1: 'IGNORE', 2: 'ID', 3: 'ID', 4: 'ID', 5: 'IGNORE', 10: 'NAME', 12: 'NAME', 14: 'PHONE' },
    'OBR': { 1: 'IGNORE', 2: 'ID', 3: 'ID', 4: 'IGNORE', 16: 'NAME', 28: 'NAME' },
    'OBX': { 1: 'IGNORE', 2: 'IGNORE', 3: 'IGNORE', 4: 'IGNORE', 6: 'IGNORE', 16: 'NAME' },
    'IN1': { 2: 'ID', 3: 'ID', 4: 'NAME', 5: 'ADDRESS', 7: 'PHONE', 11: 'NAME', 16: 'NAME', 36: 'ID', 43: 'NAME' },
    'IN2': { 2: 'SSN', 6: 'ID', 8: 'NAME', 9: 'ID' },
    'GT1': { 2: 'ID', 3: 'NAME', 4: 'NAME', 5: 'ADDRESS', 6: 'PHONE', 11: 'NAME' },
    'MRG': { 1: 'ID', 2: 'ID', 4: 'ID', 7: 'NAME' },
    'PR1': { 8: 'NAME', 11: 'NAME', 12: 'NAME' },
    'DG1': { 16: 'NAME' },
    'PD1': { 3: 'IGNORE', 4: 'NAME' }
  };

  function processRegexTokens(text, mode, safeStrings, rPrefix, rFirst, rMiddle, rLast, rNickname, rId, rPhone, rEmail, rAddress, hl7Date) {
    let matches = [];
    fallbackPatterns.forEach(pattern => {
      for (const m of text.matchAll(pattern.regex)) {
        matches.push({ start: m.index, end: m.index + m[0].length, text: m[0], p: pattern });
      }
    });
    
    matches.sort((a, b) => {
      if (a.start === b.start) return b.text.length - a.text.length;
      return a.start - b.start;
    });

    let validTokens = []; let lastEnd = 0;
    for (const m of matches) { if (m.start >= lastEnd) { validTokens.push(m); lastEnd = m.end; } }

    let leftHtml = "", rightHtml = "", sHtml = "";
    let cursor = 0;
    let localMatchCount = 0;

    for (const token of validTokens) {
      let textBefore = text.substring(cursor, token.start);
      leftHtml += escapeHtml(textBefore); rightHtml += escapeHtml(textBefore); sHtml += escapeHtml(textBefore);
      
      let mText = token.text;
      
      let isTokenSafe = isTextSafe(mText, safeStrings);

      if (token.p.label.includes("Fallback")) {
        let parts = mText.split(/([\^]+)/); 
        if (parts[0] && isTextSafe(parts[0], safeStrings)) isTokenSafe = true;
      } 
      
      if (token.p.label === "Test Data" && !safeStrings.includes(normalizeStr(mText))) {
          isTokenSafe = false;
      }

      if (isTokenSafe) {
        leftHtml += escapeHtml(mText); rightHtml += escapeHtml(mText); sHtml += escapeHtml(mText);
        cursor = token.end;
        continue;
      }

      localMatchCount++;

      if (token.p.label.includes("Fallback")) {
        let parts = mText.split(/([\^]+)/); 
        for (let p = 0; p < parts.length; p++) {
          if (p % 2 === 0 && parts[p].trim().length > 0 && !nameIgnore.includes(parts[p].toUpperCase())) {
            let rep = "";
            if (p === 0) rep = rLast;
            else if (p === 2) rep = rFirst;
            else if (p === 4) rep = dummyMiddleInput.value ? rMiddle : randomizeString(parts[p]);
            else if (p === 8) rep = dummyPrefixInput.value ? rPrefix : randomizeString(parts[p]);
            else rep = randomizeString(parts[p]);

            if (mode === 'diff') {
              leftHtml += `<mark class="phi-red">${escapeHtml(parts[p])}</mark>`; rightHtml += `<mark class="phi-green">${escapeHtml(rep)}</mark>`;
            } else {
              sHtml += `<mark class="phi-yellow">${escapeHtml(parts[p])}</mark>`;
            }
          } else {
            if (mode === 'diff') { leftHtml += escapeHtml(parts[p]); rightHtml += escapeHtml(parts[p]); }
            else { sHtml += escapeHtml(parts[p]); }
          }
        }
      } else {
        let rep = "";
        if (token.p.label.includes("Name")) {
          if (mText.includes(',')) rep = `${rLast}, ${rFirst}`;
          else rep = `${rFirst} ${rLast}`;
        }
        else if (token.p.label === "Test Data") rep = randomizeString(mText);
        else if (token.p.label.includes("SSN")) rep = rId.includes("0000") || rId === "[RANDOM]" ? randomizeString(mText) : rId;
        else if (token.p.label.includes("Phone")) rep = rPhone;
        else if (token.p.label.includes("Email")) rep = rEmail;
        else if (token.p.label.includes("Address")) rep = rAddress;
        else if (token.p.label.includes("Date")) rep = hl7Date;

        if (mode === 'diff') {
          leftHtml += `<mark class="phi-red">${escapeHtml(mText)}</mark>`; rightHtml += `<mark class="phi-green">${escapeHtml(rep)}</mark>`;
        } else {
          sHtml += `<mark class="phi-yellow">${escapeHtml(mText)}</mark>`;
        }
      }
      cursor = token.end;
    }

    let textAfter = text.substring(cursor);
    if (mode === 'diff') { leftHtml += escapeHtml(textAfter); rightHtml += escapeHtml(textAfter); }
    else { sHtml += escapeHtml(textAfter); }

    return { hasPhi: localMatchCount > 0, matchCount: localMatchCount, leftHtml, rightHtml, sHtml };
  }

  function runCoreEngine(text, mode) {
    const lines = text.split(/\r?\n/);
    if (mode === 'diff') {
      window.originalLinesStore = [...lines]; window.modifiedLeftStore = new Array(lines.length); window.modifiedRightStore = new Array(lines.length);
    }
    let leftLinesHtml = [], centerLinesHtml = [], rightLinesHtml = [];
    let scanHtml = ""; let matchCount = 0;

    const rPrefix = dummyPrefixInput.value || "Dr.";
    const rFirst = dummyFirstInput.value || "John"; 
    const rMiddle = dummyMiddleInput.value || "A";
    const rLast = dummyLastInput.value || "Doe";
    const rNickname = dummyNicknameInput.value || "Johnny";
    const rId = dummyIdInput.value || "[RANDOM]"; 
    const rPhone = dummyPhoneInput.value || "555-0199";
    const rEmail = dummyEmailInput.value || "test@email.com"; 
    const rAddress = dummyAddressInput.value || "123 Fake St";
    let dParts = (dummyDateInput.value || "01/01/2000").split('/'); 
    let hl7Date = dParts.length === 3 ? `${dParts[2]}${dParts[0]}${dParts[1]}` : "20000101";

    const safeStrings = [
      `${rFirst} ${rLast}`, `${rLast}, ${rFirst}`,
      rFirst, rLast, rMiddle, rNickname, rPrefix,
      rPhone, rEmail, rAddress, rAddress.split(',')[0], 
      hl7Date, document.getElementById('dummy-date').value
    ].map(normalizeStr).filter(s => s.length > 0);
    
    if (rId && rId !== '[RANDOM]' && !rId.includes('0000')) {
        safeStrings.push(normalizeStr(rId));
    }

    lines.forEach((lineText, index) => {
      let hasPhi = false; let leftHtml = "", rightHtml = "", sHtml = "";

      if (/^[A-Z0-9]{3}\|/.test(lineText)) {
        let fields = lineText.split('|'); let segment = fields[0];
        let rules = hl7Map[segment] || {};

        for (let i = 1; i < fields.length; i++) {
          if (fields[i].trim().length === 0) {
            leftHtml += (i===1 ? "" : "|"); rightHtml += (i===1 ? "" : "|"); sHtml += (i===1 ? "" : "|");
            continue;
          }

          if (rules[i]) {
            if (rules[i] === 'IGNORE') {
              let cleanField = escapeHtml(fields[i]);
              leftHtml += (i===1 ? "" : "|") + cleanField; rightHtml += (i===1 ? "" : "|") + cleanField; sHtml += (i===1 ? "" : "|") + cleanField;
              continue; 
            }

            let original = fields[i];
            let origParts = original.split(/([\^]+)/);
            let leftFieldHtml = ""; let rightFieldHtml = ""; let sFieldHtml = "";

            for (let p = 0; p < origParts.length; p++) {
              let pt = origParts[p].trim();
              if (p % 2 !== 0 || pt.length === 0) {
                  leftFieldHtml += escapeHtml(origParts[p]); rightFieldHtml += escapeHtml(origParts[p]); sFieldHtml += escapeHtml(origParts[p]);
                  continue;
              }

              let isTarget = false;
              if (rules[i] === 'NAME' && !nameIgnore.includes(pt.toUpperCase())) {
                  isTarget = true;
              } else if (['ID', 'SSN', 'PHONE', 'ADDRESS', 'DATE'].includes(rules[i]) && p === 0) {
                  isTarget = true;
              }

              if (isTarget) {
                  let rep = "";
                  if (rules[i] === 'NAME') {
                      if (p === 0) rep = (/^\d+$/.test(pt)) ? (rId.toUpperCase() === "[RANDOM]" || rId.includes("000000") ? randomizeString(pt) : rId) : rLast;
                      else if (p === 2) rep = rFirst;
                      else if (p === 4) rep = dummyMiddleInput.value ? rMiddle : randomizeString(pt);
                      else if (p === 8) rep = dummyPrefixInput.value ? rPrefix : randomizeString(pt);
                      else rep = randomizeString(pt);
                  } else if (['ID', 'SSN'].includes(rules[i])) {
                      rep = (rId.toUpperCase() === "[RANDOM]" || rId.includes("000000")) ? randomizeString(pt) : rId;
                  } else if (rules[i] === 'PHONE') rep = rPhone;
                  else if (rules[i] === 'ADDRESS') rep = rAddress;
                  else if (rules[i] === 'DATE') rep = hl7Date;

                  let isAlreadyDummy = isTextSafe(pt, safeStrings);

                  if (!safeStrings.includes(normalizeStr(pt))) {
                      if (new RegExp(`\\b(${testDataKeywords})\\b`, 'i').test(pt)) {
                          isAlreadyDummy = false;
                      }
                  }

                  if (isAlreadyDummy) {
                      if (mode === 'diff') {
                        leftFieldHtml += escapeHtml(origParts[p]); 
                        rightFieldHtml += escapeHtml(origParts[p]);
                      } else {
                        sFieldHtml += escapeHtml(origParts[p]);
                      }
                  } else {
                      hasPhi = true; matchCount++;
                      if (mode === 'diff') {
                        leftFieldHtml += `<mark class="phi-red">${escapeHtml(origParts[p])}</mark>`; rightFieldHtml += `<mark class="phi-green">${escapeHtml(rep)}</mark>`;
                      } else {
                        sFieldHtml += `<mark class="phi-yellow">${escapeHtml(origParts[p])}</mark>`;
                      }
                  }
              } else {
                  let res = processRegexTokens(origParts[p], mode, safeStrings, rPrefix, rFirst, rMiddle, rLast, rNickname, rId, rPhone, rEmail, rAddress, hl7Date);
                  if (res.hasPhi) { hasPhi = true; matchCount += res.matchCount; }
                  if (mode === 'diff') { leftFieldHtml += res.leftHtml; rightFieldHtml += res.rightHtml; } 
                  else { sFieldHtml += res.sHtml; }
              }
            }

            if (mode === 'diff') { leftHtml += (i===1 ? "" : "|") + leftFieldHtml; rightHtml += (i===1 ? "" : "|") + rightFieldHtml; } 
            else { sHtml += (i===1 ? "" : "|") + sFieldHtml; }

          } else {
            let res = processRegexTokens(fields[i], mode, safeStrings, rPrefix, rFirst, rMiddle, rLast, rNickname, rId, rPhone, rEmail, rAddress, hl7Date);
            if (res.hasPhi) {
              hasPhi = true; matchCount += res.matchCount;
              if (mode === 'diff') { leftHtml += (i===1 ? "" : "|") + res.leftHtml; rightHtml += (i===1 ? "" : "|") + res.rightHtml; } 
              else { sHtml += (i===1 ? "" : "|") + res.sHtml; }
            } else {
              let cleanField = escapeHtml(fields[i]);
              leftHtml += (i===1 ? "" : "|") + cleanField; rightHtml += (i===1 ? "" : "|") + cleanField; sHtml += (i===1 ? "" : "|") + cleanField;
            }
          }
        }
        
        if (mode === 'diff') { leftHtml = escapeHtml(segment) + "|" + leftHtml; rightHtml = escapeHtml(segment) + "|" + rightHtml; } 
        else { sHtml = escapeHtml(segment) + "|" + sHtml; }

      } 
      else {
        let res = processRegexTokens(lineText, mode, safeStrings, rPrefix, rFirst, rMiddle, rLast, rNickname, rId, rPhone, rEmail, rAddress, dummyDateInput.value);
        if (res.hasPhi) hasPhi = true; matchCount += res.matchCount;
        leftHtml = res.leftHtml; rightHtml = res.rightHtml; sHtml = res.sHtml;
      }

      if (mode === 'diff') {
        if (leftHtml === '') leftHtml = ' '; if (rightHtml === '') rightHtml = ' ';
        window.modifiedLeftStore[index] = leftHtml; window.modifiedRightStore[index] = rightHtml;
        leftLinesHtml.push(`<div class="ide-line" data-line-index="${index}">${leftHtml}</div>`);
        rightLinesHtml.push(`<div class="ide-line" data-line-index="${index}">${rightHtml}</div>`);
        if (hasPhi) { centerLinesHtml.push(`<div class="gutter-line" data-line-index="${index}"><button class="action-btn undo-btn" data-line-index="${index}" title="Undo Line">↺</button><button class="action-btn redo-btn" data-line-index="${index}" title="Redo Line">↻</button></div>`); } 
        else { centerLinesHtml.push(`<div class="gutter-line" data-line-index="${index}"></div>`); }
      } else {
        scanHtml += (sHtml === '' ? ' ' : sHtml) + "\n";
      }
    });

    if (mode === 'diff') return { rawHtml: leftLinesHtml.join(''), cleanHtml: rightLinesHtml.join(''), gutterHtml: centerLinesHtml.join('') };
    return { html: scanHtml, matches: matchCount };
  }

  document.getElementById('btn-scrub-text').addEventListener('click', () => {
    let input = rawEditor.innerText;
    if (!input) { document.getElementById('text-status').innerText = "Please input text first."; return; }
    input = autoFormatData(input);
    const diff = runCoreEngine(input, 'diff');
    rawEditor.innerHTML = diff.rawHtml; cleanEditor.innerHTML = diff.cleanHtml; actionEditor.innerHTML = diff.gutterHtml;
    document.getElementById('text-status').innerText = "⚡ Split-Pane IDE Diff Complete. Click ↺ to Undo or ↻ to Redo per line.";
  });

  document.getElementById('btn-scan-text').addEventListener('click', () => {
    let input = rawEditor.innerText;
    const ts = document.getElementById('text-status');
    if (!input) { ts.innerText = "Please input text to scan."; return; }
    cleanEditor.innerHTML = ""; actionEditor.innerHTML = "";
    input = autoFormatData(input);
    const scan = runCoreEngine(input, 'scan');
    
    if (scan.matches === 0) { 
        ts.innerText = "✅ SAFE TO USE: 0 PHI elements detected."; ts.style.color = "var(--success)"; rawEditor.innerText = input; 
    } 
    else { 
        ts.innerText = `⚠️ UNSAFE: Found ${scan.matches} potential PHI or Test Data elements.`; ts.style.color = "var(--danger)"; rawEditor.innerHTML = scan.html; 
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
          const escapeHtml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          targetLeft.innerHTML = escapeHtml(window.originalLinesStore[lineIndex]); targetRight.innerHTML = escapeHtml(window.originalLinesStore[lineIndex]);
        } else {
          targetLeft.innerHTML = window.modifiedLeftStore[lineIndex]; targetRight.innerHTML = window.modifiedRightStore[lineIndex];
        }
      }
    }
  });

  document.getElementById('btn-copy').addEventListener('click', () => {
    const textToCopy = cleanEditor.innerText; 
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      const btn = document.getElementById('btn-copy'); btn.innerText = "Copied!"; setTimeout(() => btn.innerText = "Copy Cleaned Text", 2000);
    });
  });

  const hl7Dictionary = {
    "MSH": { name: "Message Header", fields: { 1: "Field Separator", 2: "Encoding Characters", 3: "Sending Application", 4: "Sending Facility", 5: "Receiving Application", 6: "Receiving Facility", 7: "Date/Time Of Message", 8: "Security", 9: "Message Type", 10: "Message Control ID", 11: "Processing ID", 12: "Version ID", 15: "Accept Acknowledgment Type", 16: "Application Acknowledgment Type", 21: "Message Profile Identifier" } },
    "EVN": { name: "Event Type", fields: { 1: "Event Type Code", 2: "Recorded Date/Time", 3: "Date/Time Planned Event", 4: "Event Reason Code", 5: "Operator ID", 6: "Event Occurred", 7: "Event Facility" } },
    "PID": { name: "Patient Identification", fields: { 1: "Set ID - PID", 2: "Patient ID", 3: "Patient Identifier List", 4: "Alternate Patient ID - PID", 5: "Patient Name", 6: "Mother's Maiden Name", 7: "Date/Time of Birth", 8: "Administrative Sex", 9: "Patient Alias", 10: "Race", 11: "Patient Address", 12: "County Code", 13: "Phone Number - Home", 14: "Phone Number - Business", 15: "Primary Language", 16: "Marital Status", 17: "Religion", 18: "Patient Account Number", 19: "SSN Number - Patient", 20: "Driver's License Number", 21: "Mother's Identifier", 22: "Ethnic Group", 23: "Birth Place", 29: "Patient Death Date and Time", 30: "Patient Death Indicator" } },
    "PD1": { name: "Patient Additional Demographic", fields: { 1: "Living Dependency", 2: "Living Arrangement", 3: "Patient Primary Facility", 4: "Patient Primary Care Provider", 11: "Publicity Code", 12: "Protection Indicator" } },
    "PV1": { name: "Patient Visit", fields: { 1: "Set ID - PV1", 2: "Patient Class", 3: "Assigned Patient Location", 4: "Admission Type", 5: "Preadmit Number", 6: "Prior Patient Location", 7: "Attending Doctor", 8: "Referring Doctor", 9: "Consulting Doctor", 10: "Hospital Service", 14: "Admit Source", 15: "Ambulatory Status", 17: "Admitting Doctor", 18: "Patient Type", 19: "Visit Number", 20: "Financial Class", 36: "Discharge Disposition", 44: "Admit Date/Time", 45: "Discharge Date/Time" } },
    "PV2": { name: "Patient Visit - Additional Info", fields: { 3: "Admit Reason", 8: "Expected Admit Date/Time", 9: "Expected Discharge Date/Time", 47: "Expected Visit Return Date/Time" } },
    "OBX": { name: "Observation / Result", fields: { 1: "Set ID - OBX", 2: "Value Type", 3: "Observation Identifier", 4: "Observation Sub-ID", 5: "Observation Value", 6: "Units", 7: "References Range", 8: "Abnormal Flags", 11: "Observation Result Status", 14: "Date/Time of the Observation", 15: "Producer's ID", 16: "Responsible Observer", 18: "Equipment Instance Identifier", 19: "Date/Time of the Analysis" } },
    "ORC": { name: "Common Order", fields: { 1: "Order Control", 2: "Placer Order Number", 3: "Filler Order Number", 4: "Placer Group Number", 5: "Order Status", 7: "Quantity/Timing", 9: "Date/Time of Transaction", 10: "Entered By", 11: "Verified By", 12: "Ordering Provider", 13: "Enterer's Location", 14: "Call Back Phone Number", 15: "Order Effective Date/Time", 16: "Order Control Code Reason" } },
    "OBR": { name: "Observation Request", fields: { 1: "Set ID - OBR", 2: "Placer Order Number", 3: "Filler Order Number", 4: "Universal Service Identifier", 6: "Requested Date/Time", 7: "Observation Date/Time", 16: "Ordering Provider", 18: "Placer Field 1", 19: "Placer Field 2", 20: "Filler Field 1", 21: "Filler Field 2", 22: "Results Rpt/Status Chng - Date/Time", 25: "Result Status", 27: "Quantity/Timing", 28: "Result Copies To", 31: "Reason for Study" } },
    "IN1": { name: "Insurance", fields: { 1: "Set ID - IN1", 2: "Insurance Plan ID", 3: "Insurance Company ID", 4: "Insurance Company Name", 5: "Insurance Company Address", 6: "Insurance Co Contact Person", 7: "Insurance Co Phone Number", 8: "Group Number", 9: "Group Name", 10: "Insured's Group Emp ID", 11: "Insured's Group Emp Name", 12: "Plan Effective Date", 13: "Plan Expiration Date", 15: "Plan Type", 16: "Name Of Insured", 17: "Insured's Relationship To Patient", 18: "Insured's Date Of Birth", 36: "Policy Number", 43: "Name Of Insured" } },
    "IN2": { name: "Insurance Additional Information", fields: { 1: "Set ID - IN2", 2: "Insured's Social Security Number", 3: "Insured's Employer's Name and ID", 6: "Medicare Health Ins Card Number", 8: "Medicaid Case Name", 9: "Medicaid Case Number", 10: "Military Handicap Program", 15: "Plan Coverage Date" } },
    "GT1": { name: "Guarantor", fields: { 1: "Set ID - GT1", 2: "Guarantor Number", 3: "Guarantor Name", 4: "Guarantor Spouse Name", 5: "Guarantor Address", 6: "Guarantor Ph Num-Home", 7: "Guarantor Ph Num-Business", 8: "Guarantor Date/Time Of Birth", 9: "Guarantor Administrative Sex", 10: "Guarantor Type", 11: "Guarantor Relationship", 12: "Guarantor SSN" } },
    "AL1": { name: "Patient Allergy Information", fields: { 1: "Set ID - AL1", 2: "Allergen Type Code", 3: "Allergen Code/Mnemonic/Description", 4: "Allergy Severity Code", 5: "Allergy Reaction Code", 6: "Identification Date" } },
    "DG1": { name: "Diagnosis", fields: { 1: "Set ID - DG1", 2: "Diagnosis Coding Method", 3: "Diagnosis Code - DG1", 4: "Diagnosis Description", 5: "Diagnosis Date/Time", 6: "Diagnosis Type", 15: "Diagnosis Priority", 16: "Diagnosing Clinician", 17: "Diagnosis Classification" } },
    "PR1": { name: "Procedures", fields: { 1: "Set ID - PR1", 2: "Procedure Coding Method", 3: "Procedure Code", 4: "Procedure Description", 5: "Procedure Date/Time", 6: "Procedure Functional Type", 11: "Surgeon", 12: "Procedure Practitioner", 14: "Procedure Priority", 16: "Procedure Code Modifier" } },
    "MRG": { name: "Merge Patient Information", fields: { 1: "Prior Patient Identifier List", 2: "Prior Alternate Patient ID", 3: "Prior Patient Account Number", 4: "Prior Patient ID", 5: "Prior Visit Number", 6: "Prior Alternate Visit ID", 7: "Prior Patient Name" } },
    "RXO": { name: "Pharmacy/Treatment Order", fields: { 1: "Requested Give Code", 2: "Requested Give Amount - Minimum", 3: "Requested Give Amount - Maximum", 4: "Requested Give Units", 10: "Requested Dispense Code", 11: "Requested Dispense Amount", 12: "Requested Dispense Units", 14: "Ordering Provider's DEA Number", 18: "Requested Give Strength" } },
    "RXE": { name: "Pharmacy/Treatment Encoded Order", fields: { 1: "Quantity/Timing", 2: "Give Code", 3: "Give Amount - Minimum", 4: "Give Amount - Maximum", 5: "Give Units", 15: "Prescription Number", 16: "Number of Refills", 21: "Pharmacy/Treatment Supplier's Special Dispensing Instructions" } },
    "SCH": { name: "Scheduling Activity Information", fields: { 1: "Placer Appointment ID", 2: "Filler Appointment ID", 6: "Event Reason", 11: "Appointment Timing Quantity", 26: "Placer Order Number" } },
    "REF": { name: "Patient Referral", fields: { 1: "Referral Request Identifier", 2: "Referral Status", 3: "Referral Type", 5: "Referred To Provider", 6: "Referred To Clinic" } }
  };

  document.getElementById('btn-build-tree').addEventListener('click', () => {
    let lines = [];
    const lineDivs = rawEditor.querySelectorAll('.ide-line');
    if (lineDivs.length > 0) {
        lineDivs.forEach(div => lines.push(div.innerText));
    } else {
        lines = rawEditor.innerText.trim().split(/\r?\n/);
    }
    
    const container = document.getElementById('tree-container');
    
    let hasMSH = lines.some(line => line.includes('MSH|'));
    if (!hasMSH) {
        container.innerHTML = `<p style="text-align:center; color:red; margin-top:20px;">No HL7 format detected in the IDE tab. Please paste a valid HL7 message first.</p>`;
        return;
    }

    container.innerHTML = '';

    lines.forEach(line => {
      if (!line.trim() || !/^[A-Z0-9]{3}\|/.test(line)) return;
      const fields = line.split('|');
      const segmentName = fields[0];
      const segMeta = hl7Dictionary[segmentName] || { name: "Custom / Vendor-Specific Segment", fields: {} };

      const segDiv = document.createElement('div');
      const segRow = document.createElement('div');
      segRow.className = 'tree-row segment-header';
      
      const toggle = document.createElement('div');
      toggle.className = 'tree-toggle closed';
      
      const segId = document.createElement('div');
      segId.className = 'tree-field-id';
      segId.innerText = segmentName;
      
      const segDesc = document.createElement('div');
      segDesc.className = 'tree-desc';
      segDesc.innerText = segMeta.name;
      
      const segVal = document.createElement('div');
      segVal.className = 'tree-value';
      segVal.innerText = line.substring(0, 75) + (line.length > 75 ? '...' : '');

      segRow.appendChild(toggle); segRow.appendChild(segId); segRow.appendChild(segDesc); segRow.appendChild(segVal);

      const childrenDiv = document.createElement('div');
      childrenDiv.className = 'tree-children';

      segRow.addEventListener('click', () => {
        toggle.classList.toggle('closed'); toggle.classList.toggle('open');
        childrenDiv.classList.toggle('active');
      });

      fields.forEach((fieldVal, index) => {
        if (index === 0 || !fieldVal) return; 
        let fieldIndex = index;
        
        if (segmentName === 'MSH') {
           fieldIndex = index + 1;
           if (index === 1) {
               const msh1 = document.createElement('div'); msh1.className = 'tree-row';
               msh1.innerHTML = `<div class="tree-toggle empty"></div><div class="tree-field-id">MSH-1</div><div class="tree-desc">Field Separator</div><div class="tree-value">|</div>`;
               childrenDiv.appendChild(msh1);
           }
        }

        const fieldRow = document.createElement('div');
        fieldRow.className = 'tree-row';
        const fieldDescText = segMeta.fields[fieldIndex] || `Field ${fieldIndex}`;
        
        fieldRow.innerHTML = `
          <div class="tree-toggle empty"></div>
          <div class="tree-field-id">${segmentName}-${fieldIndex}</div>
          <div class="tree-desc">${fieldDescText}</div>
          <div class="tree-value">${fieldVal.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>
        `;
        childrenDiv.appendChild(fieldRow);
      });

      segDiv.appendChild(segRow);
      segDiv.appendChild(childrenDiv);
      container.appendChild(segDiv);
    });
  });
});
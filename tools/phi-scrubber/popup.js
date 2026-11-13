document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const tabText = document.getElementById('tab-text');
  const tabFile = document.getElementById('tab-file');
  const viewText = document.getElementById('view-text');
  const viewFile = document.getElementById('view-file');
  const rawText = document.getElementById('raw-text');
  const cleanText = document.getElementById('clean-text');
  const fileUpload = document.getElementById('file-upload');
  const fileStatus = document.getElementById('file-status');

  // Dummy Data Inputs
  const dummyName = document.getElementById('dummy-name');
  const dummySsn = document.getElementById('dummy-ssn');
  const dummyContact = document.getElementById('dummy-contact');

  // Sync defaults with saved preferences from the full PHI Scrubber dashboard
  const savedPrefs = {
    first: 'John',
    last: 'Doe',
    id: '[RANDOM]',
    phone: '555-0199',
    email: 'test@email.com',
    address: '123 Fake St, City, ST',
    date: '01/01/2000'
  };

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get([
      'savedFirst', 'savedLast', 'savedId', 'savedPhone', 'savedEmail', 'savedAddress', 'savedDate'
    ], (res) => {
      if (res.savedFirst) savedPrefs.first = res.savedFirst;
      if (res.savedLast) savedPrefs.last = res.savedLast;
      if (res.savedId) savedPrefs.id = res.savedId;
      if (res.savedPhone) savedPrefs.phone = res.savedPhone;
      if (res.savedEmail) savedPrefs.email = res.savedEmail;
      if (res.savedAddress) savedPrefs.address = res.savedAddress;
      if (res.savedDate) savedPrefs.date = res.savedDate;
    });
  }

  // Tab Switching Logic
  tabText.addEventListener('click', () => {
    tabText.classList.add('active');
    tabFile.classList.remove('active');
    viewText.classList.add('active');
    viewText.classList.remove('hidden');
    viewFile.classList.add('hidden');
    viewFile.classList.remove('active');
  });

  tabFile.addEventListener('click', () => {
    tabFile.classList.add('active');
    tabText.classList.remove('active');
    viewFile.classList.add('active');
    viewFile.classList.remove('hidden');
    viewText.classList.add('hidden');
    viewText.classList.remove('active');
  });

  function randomizeString(str) {
    return str
      .replace(/[A-Z]/g, 'X')
      .replace(/[a-z]/g, 'x')
      .replace(/[0-9]/g, '0');
  }

  // Split by unescaped HL7 delimiter (mirrors HL7_Element::MaybeSplitSubItems)
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

  function autoFormatHL7(text) {
    const trimmedText = text.trim();
    if (!/\b(FHS|BHS|MSH)[^A-Za-z0-9]/.test(trimmedText)) {
      return text;
    }

    const lineCount = trimmedText.split(/[\r\n]+/).length;
    if (lineCount > 2) {
      return text;
    }

    const segmentPattern = /(?<!^)\s*([A-Z][A-Z0-9]{2}\|)/g;
    return trimmedText.replace(segmentPattern, '\n$1');
  }

  // Core Scrubber Function aligned with TMS HL7, ZPL/EPL, and parameter parsing
  function scrubData(text) {
    const nameRep = dummyName.value.trim() || `${savedPrefs.first} ${savedPrefs.last}`;
    const idRep = dummySsn.value.trim() || savedPrefs.id;
    const contactRep = dummyContact.value.trim() || savedPrefs.phone;
    const emailRep = dummyContact.value && dummyContact.value.includes('@') ? dummyContact.value.trim() : savedPrefs.email;

    const lines = autoFormatHL7(text).split(/\r?\n/);

    let fieldSep = '|';
    let compSep = '^';
    let repSep = '~';
    let escChar = '\\';
    const headerLine = lines.find(l => /^(?:MSH|FHS|BHS)[^A-Za-z0-9]/.test(l));
    if (headerLine && headerLine.length >= 8) {
      fieldSep = headerLine[3];
      compSep = headerLine[4] || '^';
      repSep = headerLine[5] || '~';
      escChar = headerLine[6] || '\\';
    }

    return lines.map((line) => {
      // Preserve MSH / FHS / BHS headers cleanly
      if (/^(?:MSH|FHS|BHS)[^A-Za-z0-9]/.test(line)) {
        return line;
      }

      // Structured HL7 segment scrubbing
      if (/^(PID|NK1|GT1|IN1|PV1|MRG|ORC|OBR|SCH|SPM|SAC)\|/.test(line)) {
        const fields = splitUnescaped(line, fieldSep, escChar);
        const seg = fields[0];
        const idFields = seg === 'PID' ? [2, 3, 4, 18, 19, 20, 21]
          : seg === 'PV1' ? [5, 19]
          : seg === 'MRG' ? [1, 2, 3, 4, 5, 6]
          : seg === 'IN1' ? [2, 3, 8, 36]
          : seg === 'ORC' ? [2, 3, 4]
          : seg === 'OBR' ? [2, 3]
          : seg === 'SCH' ? [1, 2, 26]
          : seg === 'SPM' ? [2, 3]
          : seg === 'SAC' ? [1, 2, 3, 4]
          : [2, 12, 33];
        const nameFields = seg === 'PID' ? [5, 6, 9]
          : seg === 'PV1' ? [7, 8, 9, 17]
          : seg === 'MRG' ? [7]
          : seg === 'IN1' ? [6, 16, 43]
          : seg === 'ORC' ? [10, 11, 12]
          : seg === 'OBR' ? [16, 28]
          : seg === 'SCH' ? [12, 16]
          : [2, 3, 4];
        const contactFields = seg === 'PID' ? [13, 14]
          : seg === 'NK1' ? [5, 6, 31]
          : seg === 'GT1' ? [6, 7]
          : seg === 'ORC' ? [14]
          : seg === 'SCH' ? [13, 17]
          : [7];
        const addrFields = seg === 'PID' ? [11] : seg === 'NK1' ? [4, 32] : [5];
        const dobFields = seg === 'PID' ? [7, 29] : seg === 'IN1' ? [18] : seg === 'GT1' ? [8] : [];

        for (let i = 1; i < fields.length; i++) {
          if (!fields[i] || fields[i] === '""') continue;
          if (idFields.includes(i)) {
            fields[i] = splitUnescaped(fields[i], repSep, escChar).map(rep => {
              const comps = splitUnescaped(rep, compSep, escChar);
              if (comps[0] && comps[0] !== '""') {
                comps[0] = (idRep === '[RANDOM]' || idRep === '[REDACTED_ID]') ? randomizeString(comps[0]) : idRep;
              }
              return comps.join(compSep);
            }).join(repSep);
          } else if (nameFields.includes(i)) {
            fields[i] = splitUnescaped(fields[i], repSep, escChar).map(rep => {
              const comps = splitUnescaped(rep, compSep, escChar);
              const isProvider = seg === 'PV1' || seg === 'ORC' || seg === 'OBR';
              const startIdx = isProvider ? 1 : 0;
              if (isProvider && comps[0]) {
                comps[0] = (idRep === '[RANDOM]' || idRep === '[REDACTED_ID]') ? randomizeString(comps[0]) : idRep;
              }
              if (comps[startIdx]) comps[startIdx] = savedPrefs.last;
              if (comps[startIdx + 1]) comps[startIdx + 1] = savedPrefs.first;
              return comps.join(compSep);
            }).join(repSep);
          } else if (contactFields.includes(i)) {
            fields[i] = splitUnescaped(fields[i], repSep, escChar).map(rep => {
              const comps = splitUnescaped(rep, compSep, escChar);
              if (comps[0]) comps[0] = comps[0].includes('@') ? emailRep : contactRep;
              if (comps[3] && comps[3].includes('@')) comps[3] = emailRep;
              return comps.join(compSep);
            }).join(repSep);
          } else if (addrFields.includes(i)) {
            fields[i] = splitUnescaped(fields[i], repSep, escChar).map(rep => {
              const comps = splitUnescaped(rep, compSep, escChar);
              if (comps[0]) comps[0] = '123 Fake St';
              if (comps[2]) comps[2] = 'City';
              if (comps[3]) comps[3] = 'ST';
              if (comps[4]) comps[4] = '00000';
              return comps.join(compSep);
            }).join(repSep);
          } else if (dobFields.includes(i) && /^\d{8}/.test(fields[i])) {
            fields[i] = '20000101' + fields[i].slice(8).replace(/\d/g, '0');
          }
        }
        return fields.join(fieldSep);
      }

      let scrubbed = line;

      // 1. Key-value / JSON / PHP array / query parameter redaction
      scrubbed = scrubbed.replace(
        /(["'\[]?\b(?:patient_name|patientname|full_name|mother_name|baby_name|donor_name|first_name|last_name)\b["'\]]?\s*(?::|=>|=)\s*)(["']?)([^"'&,\r\n\}\]\^]+)\2/gi,
        (_, prefix, quote) => `${prefix}${quote}${nameRep}${quote}`
      );
      scrubbed = scrubbed.replace(
        /(["'\[]?\b(?:mrn|patient_id|patientid|mother_mrn|baby_mrn|donor_id|account_number|fin|visit_number|encounter_id|csn|ssn)\b["'\]]?\s*(?::|=>|=)\s*)(["']?)([^"'&,\r\n\}\]\^]+)\2/gi,
        (_, prefix, quote, val) => {
          const rep = (idRep === '[RANDOM]' || idRep === '[REDACTED_ID]') ? randomizeString(val) : idRep;
          return `${prefix}${quote}${rep}${quote}`;
        }
      );
      scrubbed = scrubbed.replace(
        /(["'\[]?\b(?:dob|date_of_birth|dateofbirth|birth_date|birthdate|baby_dob|mother_dob)\b["'\]]?\s*(?::|=>|=)\s*)(["']?)(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\d{8})\2/gi,
        (_, prefix, quote, val) => {
          const rep = val.includes('-') && val.indexOf('-') === 4 ? '2000-01-01' : savedPrefs.date;
          return `${prefix}${quote}${rep}${quote}`;
        }
      );

      // 2. SSN Pattern (XXX-XX-XXXX)
      scrubbed = scrubbed.replace(/\b\d{3}-\d{2}-\d{4}\b/g, idRep);

      // 3. Email Pattern
      scrubbed = scrubbed.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, emailRep);

      // 4. Phone Pattern
      scrubbed = scrubbed.replace(
        /(?<!\d)(?:\+?1[-.\s]?)?(?:\([0-9]{3}\)|[0-9]{3})[-.\s][0-9]{3}[-.\s][0-9]{4}(?!\d)/g,
        contactRep
      );

      // 5. Titles, NICU Baby/Infant Names, and Comma-Separated Names
      scrubbed = scrubbed.replace(
        /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|Baby\s+(?:Boy|Girl)|Infant\s+of|Twin\s+[A-Z])\s+[A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+)?\b/g,
        nameRep
      );
      scrubbed = scrubbed.replace(
        /\b(?!(?:City|Denver|Milk|Mothers|Volume|Calories|Status|Waiting|Pending|Active)\b)[A-Z][A-Za-z'-]{1,},\s*(?!(?:ST|CO|FL|CA|NY|TX|Term|Preterm)\b)[A-Z][A-Za-z'-]{1,}\b/g,
        nameRep
      );

      return scrubbed;
    }).join('\n');
  }

  // Handle Text Scrubbing
  document.getElementById('btn-scrub-text').addEventListener('click', () => {
    const input = rawText.value;
    if (!input) return;
    cleanText.value = scrubData(input);
  });

  // Handle Clipboard Copy
  document.getElementById('btn-copy').addEventListener('click', () => {
    if (!cleanText.value) return;
    navigator.clipboard.writeText(cleanText.value).then(() => {
      const btn = document.getElementById('btn-copy');
      btn.innerText = 'Copied!';
      setTimeout(() => { btn.innerText = 'Copy to Clipboard'; }, 2000);
    });
  });

  // Handle File Scrubbing & Download
  document.getElementById('btn-scrub-file').addEventListener('click', () => {
    const file = fileUpload.files[0];
    if (!file) {
      fileStatus.innerText = 'Please select a file first.';
      fileStatus.style.color = 'red';
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      const content = e.target.result;
      const scrubbedContent = scrubData(content);

      const blob = new Blob([scrubbedContent], { type: file.type || 'text/plain' });
      const url = URL.createObjectURL(blob);

      chrome.downloads.download({
        url: url,
        filename: `scrubbed_${file.name}`,
        saveAs: true
      }, () => {
        fileStatus.innerText = 'File scrubbed and downloaded successfully!';
        fileStatus.style.color = '#059669';
        URL.revokeObjectURL(url);
      });
    };

    reader.onerror = function () {
      fileStatus.innerText = 'Error reading file.';
      fileStatus.style.color = 'red';
    };

    reader.readAsText(file);
  });
});
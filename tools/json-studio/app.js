const leftInput = document.getElementById('leftInput');
const rightInput = document.getElementById('rightInput');
const formatMode = document.getElementById('formatMode');
const indentSize = document.getElementById('indentSize');
const keepFormatting = document.getElementById('keepFormatting');
const ignoreArrayOrder = document.getElementById('ignoreArrayOrder');
const resultOutput = document.getElementById('resultOutput');
const diffView = document.getElementById('diffView');
const diffSummary = document.getElementById('diffSummary');
const diffFilterButtons = Array.from(document.querySelectorAll('.diff-filter'));
const leftStatus = document.getElementById('leftStatus');
const rightStatus = document.getElementById('rightStatus');
const resultStatus = document.getElementById('resultStatus');

const beautifyBtn = document.getElementById('beautifyBtn');
const minifyBtn = document.getElementById('minifyBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const revertBtn = document.getElementById('revertBtn');
const copyBtn = document.getElementById('copyBtn');
const swapBtn = document.getElementById('swapBtn');
const mergeLeftBtn = document.getElementById('mergeLeftBtn');
const mergeRightBtn = document.getElementById('mergeRightBtn');

const initialLeftValue = '{"name":"TMS","items":[{"id":2,"value":"beta"},{"id":1,"value":"alpha"}],"meta":{"enabled":true,"tags":["b","a"]}}';
const initialRightValue = '{"name":"TMS","items":[{"id":1,"value":"alpha"},{"id":2,"value":"beta-updated"}],"meta":{"enabled":false,"tags":["a","b"]}}';

leftInput.value = initialLeftValue;
rightInput.value = initialRightValue;

const history = {
  left: { stack: [initialLeftValue], index: 0 },
  right: { stack: [initialRightValue], index: 0 }
};
let activeDiffFilter = 'all';

function activePane() {
  return document.activeElement === rightInput ? 'right' : 'left';
}

function paneInput(pane) {
  return pane === 'right' ? rightInput : leftInput;
}

function paneHistory(pane) {
  return history[pane === 'right' ? 'right' : 'left'];
}

function originalValue(pane) {
  return pane === 'right' ? initialRightValue : initialLeftValue;
}

function syncHistoryButtons() {
  const pane = activePane();
  const currentHistory = paneHistory(pane);
  undoBtn.disabled = currentHistory.index <= 0;
  redoBtn.disabled = currentHistory.index >= currentHistory.stack.length - 1;
  revertBtn.disabled = paneInput(pane).value === originalValue(pane);
}

function pushHistory(pane, value) {
  const currentHistory = paneHistory(pane);
  if (currentHistory.stack[currentHistory.index] === value) {
    syncHistoryButtons();
    return;
  }

  currentHistory.stack = currentHistory.stack.slice(0, currentHistory.index + 1);
  currentHistory.stack.push(value);
  currentHistory.index = currentHistory.stack.length - 1;
  syncHistoryButtons();
}

function applyHistory(pane, index) {
  const currentHistory = paneHistory(pane);
  const nextValue = currentHistory.stack[index];
  if (typeof nextValue !== 'string') return;

  currentHistory.index = index;
  paneInput(pane).value = nextValue;
  if (pane === 'left') {
    leftStatus.textContent = 'Restored';
  } else {
    rightStatus.textContent = 'Restored';
  }
  updateOutput(nextValue);
  renderDiff();
  syncHistoryButtons();
}

function revertPane(pane) {
  const resetValue = originalValue(pane);
  paneInput(pane).value = resetValue;
  pushHistory(pane, resetValue);
  if (pane === 'left') {
    leftStatus.textContent = 'Reverted';
  } else {
    rightStatus.textContent = 'Reverted';
  }
  updateOutput(resetValue);
  renderDiff();
}

function parseJson(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Paste JSON in both panes first.');
  }
  return JSON.parse(trimmed);
}

function indentText() {
  const value = indentSize.value;
  return value === 'tab' ? '\t' : Number(value);
}

function formatLikeSource(value, sourceText) {
  if (!/\r?\n/.test(sourceText.trim())) {
    return JSON.stringify(value);
  }

  const lines = sourceText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const indentLine = lines.find((line) => /^\s+/.test(line));

  if (indentLine && indentLine.includes('\t')) {
    return JSON.stringify(value, null, '\t');
  }

  if (indentLine) {
    const indentMatch = indentLine.match(/^(\s+)/);
    const indent = indentMatch ? indentMatch[1].length : indentText();
    return JSON.stringify(value, null, indent);
  }

  return JSON.stringify(value, null, indentText());
}

function sortDeep(value, compactArrays = false) {
  if (Array.isArray(value)) {
    const items = value.map((entry) => sortDeep(entry, compactArrays));
    if (compactArrays && items.every((item) => item === null || typeof item !== 'object')) {
      return items;
    }
    return items;
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = sortDeep(value[key], compactArrays);
      return acc;
    }, {});
  }

  return value;
}

function minify(text) {
  return JSON.stringify(parseJson(text));
}

function formatJson(text, mode) {
  const parsed = parseJson(text);
  const spacing = indentText();

  if (mode === 'minify') {
    return JSON.stringify(parsed);
  }

  if (mode === 'sort') {
    return JSON.stringify(sortDeep(parsed), null, spacing);
  }

  if (mode === 'compact-arrays') {
    return JSON.stringify(sortDeep(parsed, true), null, spacing);
  }

  return JSON.stringify(parsed, null, spacing);
}

function normalizeForCompare(value, options = {}) {
  if (Array.isArray(value)) {
    const normalizedItems = value.map((item) => normalizeForCompare(item, options));
    if (!options.ignoreArrayOrder) {
      return normalizedItems;
    }

    return normalizedItems
      .map((item) => ({ item, signature: stableSignature(item) }))
      .sort((a, b) => a.signature.localeCompare(b.signature))
      .map((entry) => entry.item);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = normalizeForCompare(value[key], options);
      return acc;
    }, {});
  }

  return value;
}

function stableSignature(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableSignature).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSignature(value[key])}`).join(',')}}`;
  }
  return `${typeof value}:${JSON.stringify(value)}`;
}

function deepDiff(left, right, path = '$', differences = [], options = {}) {
  if (left === right) {
    differences.push({ path, type: 'equal', left, right });
    return differences;
  }

  const leftIsArray = Array.isArray(left);
  const rightIsArray = Array.isArray(right);

  if (leftIsArray || rightIsArray) {
    if (leftIsArray && rightIsArray) {
      const leftItems = normalizeForCompare(left, options);
      const rightItems = normalizeForCompare(right, options);
      const rightUsed = new Array(rightItems.length).fill(false);

      leftItems.forEach((leftItem, leftIndex) => {
        let matchIndex = -1;
        for (let i = 0; i < rightItems.length; i += 1) {
          if (!rightUsed[i] && stableSignature(rightItems[i]) === stableSignature(leftItem)) {
            matchIndex = i;
            break;
          }
        }

        if (matchIndex === -1) {
          differences.push({ path: `${path}[${leftIndex}]`, type: 'remove', left: leftItem, right: undefined });
          return;
        }

        rightUsed[matchIndex] = true;
        deepDiff(leftItem, rightItems[matchIndex], `${path}[${leftIndex}]`, differences, options);
      });

      rightItems.forEach((rightItem, rightIndex) => {
        if (!rightUsed[rightIndex]) {
          differences.push({ path: `${path}[${rightIndex}]`, type: 'add', left: undefined, right: rightItem });
        }
      });
      return differences;
    }

    differences.push({ path, type: 'change', left, right });
    return differences;
  }

  const leftIsObject = left && typeof left === 'object';
  const rightIsObject = right && typeof right === 'object';

  if (leftIsObject && rightIsObject) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    [...keys].sort().forEach((key) => {
      if (!(key in left)) {
        differences.push({ path: `${path}.${key}`, type: 'add', left: undefined, right: right[key] });
        return;
      }
      if (!(key in right)) {
        differences.push({ path: `${path}.${key}`, type: 'remove', left: left[key], right: undefined });
        return;
      }
      deepDiff(left[key], right[key], `${path}.${key}`, differences, options);
    });
    return differences;
  }

  differences.push({ path, type: 'change', left, right });
  return differences;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function syntaxHighlight(value) {
  const json = typeof value === 'string' ? value : JSON.stringify(value, null, indentText());
  const escaped = escapeHtml(json);
  return escaped
    .replace(/(".*?"\s*:)/g, '<span class="token-key">$1</span>')
    .replace(/(".*?")/g, '<span class="token-string">$1</span>')
    .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="token-number">$1</span>')
    .replace(/\b(true|false)\b/g, '<span class="token-boolean">$1</span>')
    .replace(/\bnull\b/g, '<span class="token-null">null</span>');
}

function renderDiff() {
  try {
    const left = parseJson(leftInput.value);
    const right = parseJson(rightInput.value);
    const diffs = deepDiff(left, right, '$', [], { ignoreArrayOrder: ignoreArrayOrder.checked });
    const visibleDiffs = activeDiffFilter === 'all' ? diffs : diffs.filter((diff) => diff.type === activeDiffFilter);
    const counts = diffs.reduce((acc, diff) => {
      acc[diff.type] = (acc[diff.type] || 0) + 1;
      return acc;
    }, {});

    diffSummary.textContent = `${diffs.length} nodes | ${counts.change || 0} changed | ${counts.add || 0} added | ${counts.remove || 0} removed | showing ${visibleDiffs.length}`;
    diffView.innerHTML = visibleDiffs.map((diff) => {
      const leftClass = diff.type === 'add' ? 'diff-missing' : `diff-${diff.type}`;
      const rightClass = diff.type === 'remove' ? 'diff-missing' : `diff-${diff.type}`;
      return `
        <div class="diff-row">
          <div class="diff-cell ${leftClass}">
            <header><span class="diff-path">${escapeHtml(diff.path)}</span><span>Left</span></header>
            <div class="diff-value ${diff.type === 'add' ? 'token-add' : diff.type === 'remove' ? 'token-remove' : diff.type === 'change' ? 'token-change' : ''}">${diff.left === undefined ? '<em>missing</em>' : syntaxHighlight(diff.left)}</div>
          </div>
          <div class="diff-cell ${rightClass}">
            <header><span class="diff-path">${escapeHtml(diff.path)}</span><span>Right</span></header>
            <div class="diff-value ${diff.type === 'add' ? 'token-add' : diff.type === 'remove' ? 'token-remove' : diff.type === 'change' ? 'token-change' : ''}">${diff.right === undefined ? '<em>missing</em>' : syntaxHighlight(diff.right)}</div>
          </div>
        </div>
      `;
    }).join('') || '<div class="diff-cell diff-equal">No differences found for the selected filter.</div>';

    leftStatus.textContent = 'Parsed';
    rightStatus.textContent = 'Parsed';
  } catch (error) {
    diffSummary.textContent = 'Comparison unavailable';
    diffView.innerHTML = `<div class="diff-cell diff-change"><strong>Comparison error:</strong> ${escapeHtml(error.message)}</div>`;
    leftStatus.textContent = 'Needs valid JSON';
    rightStatus.textContent = 'Needs valid JSON';
  }
}

function updateOutput(text) {
  resultOutput.textContent = text;
  resultStatus.textContent = 'Updated';
}

function runFormat() {
  try {
    const formatted = formatJson(leftInput.value, formatMode.value);
    updateOutput(formatted);
    leftStatus.textContent = 'Formatted';
    pushHistory('left', formatted);
    renderDiff();
  } catch (error) {
    updateOutput(`Format error: ${error.message}`);
    resultStatus.textContent = 'Error';
    leftStatus.textContent = 'Invalid JSON';
  }
}

function mergeJson(direction) {
  try {
    const sourceText = direction === 'left' ? rightInput.value : leftInput.value;
    const targetText = direction === 'left' ? leftInput.value : rightInput.value;
    const source = parseJson(sourceText);
    const target = parseJson(targetText);
    const merged = mergeObjects(target, source);
    const output = keepFormatting.checked ? formatLikeSource(merged, targetText) : JSON.stringify(merged, null, indentText());

    if (direction === 'left') {
      leftInput.value = output;
      leftStatus.textContent = 'Merged';
      pushHistory('left', output);
    } else {
      rightInput.value = output;
      rightStatus.textContent = 'Merged';
      pushHistory('right', output);
    }
    updateOutput(output);
    renderDiff();
  } catch (error) {
    updateOutput(`Merge error: ${error.message}`);
    resultStatus.textContent = 'Error';
  }
}

function mergeObjects(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    return source.map((item, index) => {
      if (index < target.length) {
        return mergeObjects(target[index], item);
      }
      return item;
    });
  }

  if (target && typeof target === 'object' && source && typeof source === 'object' && !Array.isArray(target) && !Array.isArray(source)) {
    const result = { ...target };
    Object.keys(source).forEach((key) => {
      if (key in result) {
        result[key] = mergeObjects(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    });
    return result;
  }

  return source;
}

beautifyBtn.addEventListener('click', () => {
  try {
    const formatted = formatJson(leftInput.value, formatMode.value === 'beautify' ? 'beautify' : formatMode.value);
    leftInput.value = formatted;
    updateOutput(formatted);
    leftStatus.textContent = 'Beautified';
    pushHistory('left', formatted);
    renderDiff();
  } catch (error) {
    updateOutput(`Format error: ${error.message}`);
    resultStatus.textContent = 'Error';
  }
});

minifyBtn.addEventListener('click', () => {
  try {
    const minimized = minify(leftInput.value);
    leftInput.value = minimized;
    updateOutput(minimized);
    leftStatus.textContent = 'Minified';
    pushHistory('left', minimized);
    renderDiff();
  } catch (error) {
    updateOutput(`Minify error: ${error.message}`);
    resultStatus.textContent = 'Error';
  }
});

undoBtn.addEventListener('click', () => {
  const pane = activePane();
  const currentHistory = paneHistory(pane);
  if (currentHistory.index <= 0) return;
  applyHistory(pane, currentHistory.index - 1);
});

redoBtn.addEventListener('click', () => {
  const pane = activePane();
  const currentHistory = paneHistory(pane);
  if (currentHistory.index >= currentHistory.stack.length - 1) return;
  applyHistory(pane, currentHistory.index + 1);
});

revertBtn.addEventListener('click', () => revertPane(activePane()));

copyBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(resultOutput.textContent || '');
  resultStatus.textContent = 'Copied';
});

swapBtn.addEventListener('click', () => {
  const temp = leftInput.value;
  leftInput.value = rightInput.value;
  rightInput.value = temp;
  leftStatus.textContent = 'Swapped';
  rightStatus.textContent = 'Swapped';
  renderDiff();
});

mergeLeftBtn.addEventListener('click', () => mergeJson('left'));
mergeRightBtn.addEventListener('click', () => mergeJson('right'));

diffFilterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeDiffFilter = button.dataset.filter || 'all';
    diffFilterButtons.forEach((otherButton) => otherButton.classList.toggle('active', otherButton === button));
    renderDiff();
  });
});

[leftInput, rightInput].forEach((input) => input.addEventListener('input', renderDiff));
[leftInput, rightInput].forEach((input) => input.addEventListener('input', () => {
  pushHistory(input === rightInput ? 'right' : 'left', input.value);
  syncHistoryButtons();
}));
[formatMode, indentSize, keepFormatting, ignoreArrayOrder].forEach((control) => control.addEventListener('change', () => {
  renderDiff();
  if (resultOutput.textContent) {
    resultStatus.textContent = 'Settings updated';
  }
}));

[leftInput, rightInput].forEach((input) => input.addEventListener('focus', syncHistoryButtons));

window.addEventListener('keydown', (event) => {
  const pane = activePane();
  const currentHistory = paneHistory(pane);
  if (event.ctrlKey && event.key.toLowerCase() === 'z' && !event.shiftKey) {
    event.preventDefault();
    if (currentHistory.index > 0) applyHistory(pane, currentHistory.index - 1);
  }
  if ((event.ctrlKey && event.key.toLowerCase() === 'y') || (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'z')) {
    event.preventDefault();
    if (currentHistory.index < currentHistory.stack.length - 1) applyHistory(pane, currentHistory.index + 1);
  }
});

renderDiff();
updateOutput(JSON.stringify(parseJson(leftInput.value), null, indentText()));
syncHistoryButtons();

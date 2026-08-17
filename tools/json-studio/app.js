// ============ DOM ELEMENT REFERENCES ============
const leftInput = document.getElementById('leftInput')
const rightInput = document.getElementById('rightInput')
const formatMode = document.getElementById('formatMode')
const indentSize = document.getElementById('indentSize')
const keepFormatting = document.getElementById('keepFormatting')
const ignoreArrayOrder = document.getElementById('ignoreArrayOrder')
const resultOutput = document.getElementById('resultOutput')
const diffView = document.getElementById('diffView')
const diffSummary = document.getElementById('diffSummary')
const diffFilterButtons = Array.from(document.querySelectorAll('.diff-filter'))
const diffMergeTypeCheckboxes = Array.from(document.querySelectorAll('.diff-merge-type'))
const mergeSelectedLeftBtn = document.getElementById('mergeSelectedLeftBtn')
const mergeSelectedRightBtn = document.getElementById('mergeSelectedRightBtn')
const previewConsolidatedBtn = document.getElementById('previewConsolidatedBtn')
const mergedSelectedOutput = document.getElementById('mergedSelectedOutput')
const consolidatedArrayOutput = document.getElementById('consolidatedArrayOutput')
const copyCopyBtn = document.getElementById('copyCopyBtn')
const structuralStatus = document.getElementById('structuralStatus')
const expandButtons = Array.from(document.querySelectorAll('.expand-btn'))
const leftStatus = document.getElementById('leftStatus')
const rightStatus = document.getElementById('rightStatus')
const resultStatus = document.getElementById('resultStatus')
const beautifyBtn = document.getElementById('beautifyBtn')
const minifyBtn = document.getElementById('minifyBtn')
const undoBtn = document.getElementById('undoBtn')
const redoBtn = document.getElementById('redoBtn')
const revertBtn = document.getElementById('revertBtn')
const copyBtn = document.getElementById('copyBtn')
const swapBtn = document.getElementById('swapBtn')
const mergeLeftBtn = document.getElementById('mergeLeftBtn')
const mergeRightBtn = document.getElementById('mergeRightBtn')

// ============ INITIAL DATA ============
const initialLeftValue = '{"name":"TMS","items":[{"id":2,"value":"beta","count":42},{"id":1,"value":"alpha","count":10}],"meta":{"enabled":true,"tags":["b","a"],"version":"1.0","build":1}}'
const initialRightValue = '{"name":"TMS","items":[{"id":"1","value":"alpha","count":"42"},{"id":"2","value":"beta-updated","count":10}],"meta":{"enabled":false,"tags":["a","b"],"version":1,"build":"1"}}'

leftInput.value = initialLeftValue
rightInput.value = initialRightValue

// ============ STATE VARIABLES (MUST be before functions that use them) ============
const history = {
  left: { stack: [initialLeftValue], index: 0 },
  right: { stack: [initialRightValue], index: 0 }
}
let latestDiffs = []
let latestMergedSelection = []
let latestMergeDirection = 'left'

// ============ HISTORY & PANE FUNCTIONS ============
function activePane() {
  return document.activeElement === rightInput ? 'right' : 'left'
}

function paneInput(pane) {
  return pane === 'right' ? rightInput : leftInput
}

function paneHistory(pane) {
  return history[pane === 'right' ? 'right' : 'left']
}

function originalValue(pane) {
  return pane === 'right' ? initialRightValue : initialLeftValue
}

function syncHistoryButtons() {
  const pane = activePane()
  const currentHistory = paneHistory(pane)
  if (undoBtn) undoBtn.disabled = currentHistory.index <= 0
  if (redoBtn) redoBtn.disabled = currentHistory.index >= currentHistory.stack.length - 1
  if (revertBtn) revertBtn.disabled = paneInput(pane).value === originalValue(pane)
}

function pushHistory(pane, value) {
  const currentHistory = paneHistory(pane)
  if (currentHistory.stack[currentHistory.index] === value) {
    syncHistoryButtons()
    return
  }
  currentHistory.stack = currentHistory.stack.slice(0, currentHistory.index + 1)
  currentHistory.stack.push(value)
  currentHistory.index = currentHistory.stack.length - 1
  syncHistoryButtons()
}

function applyHistory(pane, index) {
  const currentHistory = paneHistory(pane)
  const nextValue = currentHistory.stack[index]
  if (typeof nextValue !== 'string') return
  currentHistory.index = index
  paneInput(pane).value = nextValue
  const statusEl = pane === 'left' ? leftStatus : rightStatus
  if (statusEl) statusEl.textContent = 'Restored'
  updateOutput(nextValue)
  renderDiff()
  syncHistoryButtons()
}

function revertPane(pane) {
  const resetValue = originalValue(pane)
  paneInput(pane).value = resetValue
  pushHistory(pane, resetValue)
  const statusEl = pane === 'left' ? leftStatus : rightStatus
  if (statusEl) statusEl.textContent = 'Reverted'
  updateOutput(resetValue)
  renderDiff()
}

// ============ JSON PARSING & FORMATTING ============
function parseJson(text) {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('Paste JSON in both panes first.')
  }
  return JSON.parse(trimmed)
}

function indentText() {
  const value = indentSize.value
  return value === 'tab' ? '\t' : Number(value)
}

function formatLikeSource(value, sourceText) {
  if (!/\r?\n/.test(sourceText.trim())) {
    return JSON.stringify(value)
  }
  const lines = sourceText.split(/\r?\n/).filter((line) => line.trim().length > 0)
  const indentLine = lines.find((line) => /^\s+/.test(line))
  if (indentLine && indentLine.includes('\t')) {
    return JSON.stringify(value, null, '\t')
  }
  if (indentLine) {
    const indentMatch = indentLine.match(/^(\s+)/)
    const indent = indentMatch ? indentMatch[1].length : indentText()
    return JSON.stringify(value, null, indent)
  }
  return JSON.stringify(value, null, indentText())
}

function sortDeep(value, compactArrays = false) {
  if (Array.isArray(value)) {
    const items = value.map((entry) => sortDeep(entry, compactArrays))
    if (compactArrays && items.every((item) => item === null || typeof item !== 'object')) {
      return items
    }
    return items
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = sortDeep(value[key], compactArrays)
      return acc
    }, {})
  }
  return value
}

function minify(text) {
  return JSON.stringify(parseJson(text))
}

function formatJson(text, mode) {
  const parsed = parseJson(text)
  const spacing = indentText()
  if (mode === 'minify') {
    return JSON.stringify(parsed)
  }
  if (mode === 'sort') {
    return JSON.stringify(sortDeep(parsed), null, spacing)
  }
  if (mode === 'compact-arrays') {
    return JSON.stringify(sortDeep(parsed, true), null, spacing)
  }
  return JSON.stringify(parsed, null, spacing)
}

// ============ COMPARISON & DIFF ============
function normalizeForCompare(value, options = {}) {
  if (Array.isArray(value)) {
    const normalizedItems = value.map((item) => normalizeForCompare(item, options))
    if (!options.ignoreArrayOrder) {
      return normalizedItems
    }
    return normalizedItems
      .map((item) => ({ item, signature: stableSignature(item) }))
      .sort((a, b) => a.signature.localeCompare(b.signature))
      .map((entry) => entry.item)
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = normalizeForCompare(value[key], options)
      return acc
    }, {})
  }
  return value
}

function stableSignature(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return `[${value.map(stableSignature).join(',')}]`
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSignature(value[key])}`).join(',')}}`
  }
  return `${typeof value}:${JSON.stringify(value)}`
}

function deepDiff(left, right, path = '$', differences = [], options = {}) {
  if (left === right) {
    differences.push({ path, type: 'equal', left, right })
    return differences
  }
  const leftIsArray = Array.isArray(left)
  const rightIsArray = Array.isArray(right)
  if (leftIsArray || rightIsArray) {
    if (leftIsArray && rightIsArray) {
      const leftItems = normalizeForCompare(left, options)
      const rightItems = normalizeForCompare(right, options)
      const rightUsed = new Array(rightItems.length).fill(false)
      leftItems.forEach((leftItem, leftIndex) => {
        let matchIndex = -1
        for (let i = 0; i < rightItems.length; i += 1) {
          if (!rightUsed[i] && stableSignature(rightItems[i]) === stableSignature(leftItem)) {
            matchIndex = i
            break
          }
        }
        if (matchIndex === -1) {
          differences.push({ path: `${path}[${leftIndex}]`, type: 'remove', left: leftItem, right: undefined })
          return
        }
        rightUsed[matchIndex] = true
        deepDiff(leftItem, rightItems[matchIndex], `${path}[${leftIndex}]`, differences, options)
      })
      rightItems.forEach((rightItem, rightIndex) => {
        if (!rightUsed[rightIndex]) {
          differences.push({ path: `${path}[${rightIndex}]`, type: 'add', left: undefined, right: rightItem })
        }
      })
      return differences
    }
    differences.push({ path, type: 'change', left, right })
    return differences
  }
  const leftIsObject = left && typeof left === 'object'
  const rightIsObject = right && typeof right === 'object'
  if (leftIsObject && rightIsObject) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)])
    ;[...keys].sort().forEach((key) => {
      if (!(key in left)) {
        differences.push({ path: `${path}.${key}`, type: 'add', left: undefined, right: right[key] })
        return
      }
      if (!(key in right)) {
        differences.push({ path: `${path}.${key}`, type: 'remove', left: left[key], right: undefined })
        return
      }
      deepDiff(left[key], right[key], `${path}.${key}`, differences, options)
    })
    return differences
  }
  differences.push({ path, type: 'change', left, right })
  return differences
}

// ============ RENDERING UTILITIES ============
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function syntaxHighlight(value) {
  const json = typeof value === 'string' ? value : JSON.stringify(value, null, indentText())
  const escaped = escapeHtml(json)
  return escaped
    .replace(/(".*?"\s*:)/g, '<span class="token-key">$1</span>')
    .replace(/(".*?")/g, '<span class="token-string">$1</span>')
    .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="token-number">$1</span>')
    .replace(/\b(true|false)\b/g, '<span class="token-boolean">$1</span>')
    .replace(/\bnull\b/g, '<span class="token-null">null</span>')
}

function getTypeBadge(value) {
  if (value === undefined) return ''
  if (value === null) return '<span class="type-badge type-null">null</span>'
  if (typeof value === 'string') return '<span class="type-badge type-string">string</span>'
  if (typeof value === 'number') return '<span class="type-badge type-number">number</span>'
  if (typeof value === 'boolean') return '<span class="type-badge type-boolean">boolean</span>'
  if (Array.isArray(value)) return '<span class="type-badge type-array">array</span>'
  if (typeof value === 'object') return '<span class="type-badge type-object">object</span>'
  return ''
}

function updateOutput(text) {
  resultOutput.textContent = text
  if (resultStatus) resultStatus.textContent = 'Updated'
}

// ============ STRUCTURAL DIFF PATH UTILITIES ============
function parseDiffPath(path) {
  const raw = String(path || '').replace(/^\$\.?/, '')
  if (!raw) return []
  const segments = []
  const segmentPattern = /([^.[\]]+)|\[(\d+)\]/g
  let match
  while ((match = segmentPattern.exec(raw)) !== null) {
    if (match[2] !== undefined) {
      segments.push(Number(match[2]))
    } else {
      segments.push(match[1])
    }
  }
  return segments
}

function valueAtPath(root, segments) {
  let current = root
  for (let i = 0; i < segments.length; i += 1) {
    current = current?.[segments[i]]
  }
  return current
}

function cloneJsonValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function setAtPath(root, segments, value) {
  if (!segments.length) {
    return cloneJsonValue(value)
  }
  let current = root
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i]
    const nextSegment = segments[i + 1]
    const expectedArray = typeof nextSegment === 'number'

    if (current[segment] === undefined || current[segment] === null || typeof current[segment] !== 'object') {
      current[segment] = expectedArray ? [] : {}
    }
    current = current[segment]
  }
  const lastSegment = segments[segments.length - 1]
  current[lastSegment] = cloneJsonValue(value)
  return root
}

function deleteAtPath(root, segments) {
  if (!segments.length) {
    return root
  }
  let current = root
  for (let i = 0; i < segments.length - 1; i += 1) {
    current = current?.[segments[i]]
    if (current === undefined || current === null) {
      return root
    }
  }
  const lastSegment = segments[segments.length - 1]
  if (Array.isArray(current) && typeof lastSegment === 'number') {
    if (lastSegment >= 0 && lastSegment < current.length) {
      current.splice(lastSegment, 1)
    }
    return root
  }
  if (current && typeof current === 'object') {
    delete current[lastSegment]
  }
  return root
}

function toConsolidatedKey(path) {
  const segments = parseDiffPath(path)
  if (!segments.length) return '$'
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    if (typeof segments[i] === 'string' && segments[i].length) {
      return segments[i]
    }
  }
  return segments.map((segment) => String(segment)).join('/')
}

// ============ STRUCTURAL DIFF FUNCTIONS ============
function selectedMergeTypes() {
  return new Set(
    diffMergeTypeCheckboxes
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value)
  )
}

function collectMergedSelectedDiffs(diffs, direction = latestMergeDirection) {
  const selectedTypes = selectedMergeTypes()
  return diffs
    .filter((diff) => selectedTypes.has(diff.type))
    .map((diff) => {
      const mergedValue = direction === 'right' ? diff.left : diff.right
      return {
        path: toConsolidatedKey(diff.path),
        type: diff.type,
        left: diff.left,
        right: diff.right,
        merged: mergedValue
      }
    })
}

function mergeSelectedInto(direction) {
  if (!latestDiffs.length) {
    if (structuralStatus) structuralStatus.textContent = 'No diffs to merge'
    return
  }

  latestMergeDirection = direction
  const targetInput = direction === 'left' ? leftInput : rightInput
  const targetPane = direction
  const mergedSnapshot = collectMergedSelectedDiffs(latestDiffs, direction)

  try {
    let targetJson = parseJson(targetInput.value)

    mergedSnapshot.forEach((row) => {
      if (row.merged === undefined) {
        deleteAtPath(targetJson, parseDiffPath(row.path))
      } else {
        const segments = parseDiffPath(row.path)
        targetJson = setAtPath(targetJson, segments, row.merged)
      }
    })

    const output = formatLikeSource(targetJson, targetInput.value)
    targetInput.value = output
    const statusEl = targetPane === 'left' ? leftStatus : rightStatus
    if (statusEl) statusEl.textContent = 'Merged'
    pushHistory(targetPane, output)

    latestMergedSelection = mergedSnapshot
    if (mergedSelectedOutput) {
      mergedSelectedOutput.textContent = renderMergedSelection(mergedSnapshot)
    }
    if (structuralStatus) {
      structuralStatus.textContent = `Merged ${mergedSnapshot.length} diffs to ${direction}`
    }

    renderDiff({ resetStructural: false })
  } catch (error) {
    if (structuralStatus) {
      structuralStatus.textContent = `Merge error: ${error.message}`
    }
  }
}

function renderMergedSelection(rows) {
  if (!rows.length) return 'No merged data yet.'
  return JSON.stringify(rows, null, 2)
}

function phpEscapeDoubleQuoted(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('$', '\\$')
}

function toPhpArrayValue(value, depth = 1) {
  const indent = '    '.repeat(depth)
  const closingIndent = '    '.repeat(Math.max(depth - 1, 0))

  if (value === null) return 'null'
  if (typeof value === 'string') return `"${phpEscapeDoubleQuoted(value)}"`
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'

  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    const lines = value.map((entry) => `${indent}${toPhpArrayValue(entry, depth + 1)},`)
    return `[\n${lines.join('\n')}\n${closingIndent}]`
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
    if (!keys.length) return '[]'
    const lines = keys.map((key) => `${indent}"${phpEscapeDoubleQuoted(key)}" => ${toPhpArrayValue(value[key], depth + 1)},`)
    return `[\n${lines.join('\n')}\n${closingIndent}]`
  }

  return 'null'
}

function buildConsolidatedArrayPreview(rows) {
  if (!rows.length) return 'No consolidated preview yet.'

  const root = {}
  rows.forEach((row) => {
    if (row.merged === undefined) return
    const segments = parseDiffPath(row.path)
    setAtPath(root, segments, row.merged)
  })

  if (!Object.keys(root).length) {
    return 'No consolidated preview yet.'
  }

  const lines = []
  Object.keys(root).sort().forEach((key) => {
    lines.push(`    "${phpEscapeDoubleQuoted(key)}" => ${toPhpArrayValue(root[key], 2)},`)
  })

  return `$settings = [\n${lines.join('\n')}\n];`
}

// ============ DIFF RENDERING ============
function renderDiff(options = {}) {
  const { resetStructural = true } = options

  try {
    const left = parseJson(leftInput.value)
    const right = parseJson(rightInput.value)
    const diffs = deepDiff(left, right, '$', [], { ignoreArrayOrder: ignoreArrayOrder.checked })

    latestDiffs = diffs

    if (resetStructural) {
      latestMergedSelection = []
      if (mergedSelectedOutput) mergedSelectedOutput.textContent = 'No merged data yet.'
      if (consolidatedArrayOutput) consolidatedArrayOutput.textContent = 'No consolidated preview yet.'
    }

    const selectedTypes = selectedMergeTypes()
    const visibleDiffs = selectedTypes.size === 4 ? diffs : diffs.filter((diff) => selectedTypes.has(diff.type))
    const counts = diffs.reduce((acc, diff) => {
      acc[diff.type] = (acc[diff.type] || 0) + 1
      return acc
    }, {})

    if (diffSummary) {
      diffSummary.textContent = `${diffs.length} nodes | ${counts.change || 0} changed | ${counts.add || 0} added | ${counts.remove || 0} removed | showing ${visibleDiffs.length}`
    }

    diffView.innerHTML =
      visibleDiffs
        .map((diff) => {
          const leftClass = diff.type === 'add' ? 'diff-missing' : `diff-${diff.type}`
          const rightClass = diff.type === 'remove' ? 'diff-missing' : `diff-${diff.type}`
          return `
        <div class="diff-row">
          <div class="diff-cell ${leftClass}">
            <header><span class="diff-path">${escapeHtml(diff.path)}</span><span>Left</span>${getTypeBadge(diff.left)}</header>
            <div class="diff-value ${diff.type === 'add' ? 'token-add' : diff.type === 'remove' ? 'token-remove' : diff.type === 'change' ? 'token-change' : ''}">${diff.left === undefined ? '<em>missing</em>' : syntaxHighlight(diff.left)}</div>
          </div>
          <div class="diff-cell ${rightClass}">
            <header><span class="diff-path">${escapeHtml(diff.path)}</span><span>Right</span>${getTypeBadge(diff.right)}</header>
            <div class="diff-value ${diff.type === 'add' ? 'token-add' : diff.type === 'remove' ? 'token-remove' : diff.type === 'change' ? 'token-change' : ''}">${diff.right === undefined ? '<em>missing</em>' : syntaxHighlight(diff.right)}</div>
          </div>
        </div>
      `
        })
        .join('') || '<div class="diff-cell diff-equal">No differences found for the selected filter.</div>'

    if (leftStatus) leftStatus.textContent = 'Parsed'
    if (rightStatus) rightStatus.textContent = 'Parsed'
  } catch (error) {
    latestDiffs = []
    if (resetStructural) {
      latestMergedSelection = []
      if (mergedSelectedOutput) mergedSelectedOutput.textContent = 'No merged data yet.'
      if (consolidatedArrayOutput) consolidatedArrayOutput.textContent = 'No consolidated preview yet.'
    }
    if (diffSummary) diffSummary.textContent = 'Comparison unavailable'
    diffView.innerHTML = `<div class="diff-cell diff-change"><strong>Comparison error:</strong> ${escapeHtml(error.message)}</div>`
    if (leftStatus) leftStatus.textContent = 'Needs valid JSON'
    if (rightStatus) rightStatus.textContent = 'Needs valid JSON'
  }
}

// ============ MERGE FUNCTIONS ============
function mergeObjects(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    return source.map((item, index) => {
      if (index < target.length) {
        return mergeObjects(target[index], item)
      }
      return item
    })
  }

  if (target && typeof target === 'object' && source && typeof source === 'object' && !Array.isArray(target) && !Array.isArray(source)) {
    const result = { ...target }
    Object.keys(source).forEach((key) => {
      if (key in result) {
        result[key] = mergeObjects(result[key], source[key])
      } else {
        result[key] = source[key]
      }
    })
    return result
  }

  return source
}

function mergeJson(direction) {
  try {
    const sourceText = direction === 'left' ? rightInput.value : leftInput.value
    const targetText = direction === 'left' ? leftInput.value : rightInput.value
    const source = parseJson(sourceText)
    const target = parseJson(targetText)
    const merged = mergeObjects(target, source)
    const output = keepFormatting.checked ? formatLikeSource(merged, targetText) : JSON.stringify(merged, null, indentText())

    if (direction === 'left') {
      leftInput.value = output
      if (leftStatus) leftStatus.textContent = 'Merged'
      pushHistory('left', output)
    } else {
      rightInput.value = output
      if (rightStatus) rightStatus.textContent = 'Merged'
      pushHistory('right', output)
    }
    updateOutput(output)
    renderDiff()
  } catch (error) {
    updateOutput(`Merge error: ${error.message}`)
    if (resultStatus) resultStatus.textContent = 'Error'
  }
}

// ============ EVENT LISTENERS ============

beautifyBtn?.addEventListener('click', () => {
  try {
    const formatted = formatJson(leftInput.value, formatMode.value === 'beautify' ? 'beautify' : formatMode.value)
    leftInput.value = formatted
    updateOutput(formatted)
    if (leftStatus) leftStatus.textContent = 'Beautified'
    pushHistory('left', formatted)
    renderDiff()
  } catch (error) {
    updateOutput(`Format error: ${error.message}`)
    if (resultStatus) resultStatus.textContent = 'Error'
  }
})

minifyBtn?.addEventListener('click', () => {
  try {
    const minimized = minify(leftInput.value)
    leftInput.value = minimized
    updateOutput(minimized)
    if (leftStatus) leftStatus.textContent = 'Minified'
    pushHistory('left', minimized)
    renderDiff()
  } catch (error) {
    updateOutput(`Minify error: ${error.message}`)
    if (resultStatus) resultStatus.textContent = 'Error'
  }
})

undoBtn?.addEventListener('click', () => {
  const pane = activePane()
  const currentHistory = paneHistory(pane)
  if (currentHistory.index <= 0) return
  applyHistory(pane, currentHistory.index - 1)
})

redoBtn?.addEventListener('click', () => {
  const pane = activePane()
  const currentHistory = paneHistory(pane)
  if (currentHistory.index >= currentHistory.stack.length - 1) return
  applyHistory(pane, currentHistory.index + 1)
})

revertBtn?.addEventListener('click', () => {
  revertPane(activePane())
})

copyBtn?.addEventListener('click', async () => {
  await navigator.clipboard.writeText(resultOutput.textContent || '')
  showCopyToast('Result copied to clipboard!')
})

swapBtn?.addEventListener('click', () => {
  const temp = leftInput.value
  leftInput.value = rightInput.value
  rightInput.value = temp
  if (leftStatus) leftStatus.textContent = 'Swapped'
  if (rightStatus) rightStatus.textContent = 'Swapped'
  renderDiff()
})

mergeLeftBtn?.addEventListener('click', () => {
  mergeJson('left')
})

mergeRightBtn?.addEventListener('click', () => {
  mergeJson('right')
})

// Structural Diff Buttons
mergeSelectedLeftBtn?.addEventListener('click', () => {
  mergeSelectedInto('left')
})

mergeSelectedRightBtn?.addEventListener('click', () => {
  mergeSelectedInto('right')
})

previewConsolidatedBtn?.addEventListener('click', () => {
  if (!latestMergedSelection.length) {
    latestMergeDirection = latestMergeDirection || 'left'
    latestMergedSelection = collectMergedSelectedDiffs(latestDiffs)
    if (mergedSelectedOutput) {
      mergedSelectedOutput.textContent = renderMergedSelection(latestMergedSelection)
    }
  }

  const preview = buildConsolidatedArrayPreview(latestMergedSelection)
  if (consolidatedArrayOutput) {
    consolidatedArrayOutput.textContent = preview
  }
  if (structuralStatus) {
    structuralStatus.textContent = latestMergedSelection.length ? 'Consolidated preview ready' : 'No selected diff data'
  }
})

copyCopyBtn?.addEventListener('click', async () => {
  const text = consolidatedArrayOutput.textContent || ''
  if (text === 'No consolidated preview yet.') {
    showCopyToast('Generate preview first')
    return
  }
  await navigator.clipboard.writeText(text)
  showCopyToast('Consolidated array copied!')
})

// Expand Buttons
expandButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const targetId = button.dataset.expandTarget
    const target = targetId ? document.getElementById(targetId) : null
    if (!target) return

    const expanded = target.classList.toggle('expanded-panel')
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false')
    button.textContent = expanded ? 'Collapse' : 'Expand'
  })
})

// Merge Type Checkboxes - control both display and merge selection
diffMergeTypeCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    renderDiff()
  })
})

// Input Listeners
;[leftInput, rightInput].forEach((input) => {
  input.addEventListener('input', () => {
    renderDiff()
  })

  input.addEventListener('input', () => {
    pushHistory(input === rightInput ? 'right' : 'left', input.value)
    syncHistoryButtons()
  })

  input.addEventListener('focus', syncHistoryButtons)
})

;[formatMode, indentSize, keepFormatting, ignoreArrayOrder].forEach((control) => {
  control?.addEventListener('change', () => {
    renderDiff()
    if (resultOutput.textContent) {
      if (resultStatus) resultStatus.textContent = 'Settings updated'
    }
  })
})

// Keyboard Shortcuts
window.addEventListener('keydown', (event) => {
  const pane = activePane()
  const currentHistory = paneHistory(pane)
  if (event.ctrlKey && event.key.toLowerCase() === 'z' && !event.shiftKey) {
    event.preventDefault()
    if (currentHistory.index > 0) applyHistory(pane, currentHistory.index - 1)
  }
  if ((event.ctrlKey && event.key.toLowerCase() === 'y') || (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'z')) {
    event.preventDefault()
    if (currentHistory.index < currentHistory.stack.length - 1) applyHistory(pane, currentHistory.index + 1)
  }
})

// Toast notification for copy feedback
function showCopyToast(message = 'Copied to clipboard!') {
  const toast = document.createElement('div')
  toast.className = 'copy-toast'
  toast.textContent = message
  document.body.appendChild(toast)
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show')
  })
  
  // Remove after 2 seconds
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 300)
  }, 2000)
}
updateOutput(JSON.stringify(parseJson(leftInput.value), null, indentText()))
syncHistoryButtons()

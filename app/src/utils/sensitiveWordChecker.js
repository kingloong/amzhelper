function isAsciiAlphaNumeric(char) {
  if (!char) {
    return false
  }

  const code = char.charCodeAt(0)
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122)
  )
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeTerm(value) {
  return value.trim().replace(/\s+/g, ' ')
}

function buildTermPattern(term) {
  return normalizeTerm(term)
    .split(' ')
    .map(escapeRegExp)
    .join('\\s+')
}

function isBoundaryMatch(text, start, end) {
  return !isAsciiAlphaNumeric(text[start - 1]) && !isAsciiAlphaNumeric(text[end])
}

function mergeMatches(matches) {
  const merged = []

  for (const match of matches) {
    const previous = merged[merged.length - 1]

    if (!previous || match.start >= previous.end) {
      merged.push(match)
      continue
    }
  }

  return merged
}

export function parseSensitiveTerms(text) {
  const seen = new Set()
  const terms = []

  for (const rawPart of text.split(/[\r\n,，]+/)) {
    const display = rawPart.trim()

    if (!display) {
      continue
    }

    const normalized = normalizeTerm(display).toLowerCase()

    if (seen.has(normalized)) {
      continue
    }

    seen.add(normalized)
    terms.push({
      id: normalized,
      display,
      pattern: buildTermPattern(display),
    })
  }

  return terms
}

export function validateSensitiveCheckerInput(copyText, termText, maxLength = 5000) {
  if (!copyText.trim()) {
    return {
      valid: false,
      message: '请输入文案内容',
    }
  }

  if (!termText.trim()) {
    return {
      valid: false,
      message: '请输入敏感词列表或使用通用模板',
    }
  }

  if (copyText.length > maxLength) {
    return {
      valid: false,
      message: `文本长度超过 ${maxLength} 字符`,
    }
  }

  return {
    valid: true,
    message: '',
  }
}

export function analyzeSensitiveTerms(copyText, terms) {
  const rawMatches = []
  const matchedTermIds = new Set()

  for (const term of terms) {
    const regex = new RegExp(term.pattern, 'gi')

    for (const match of copyText.matchAll(regex)) {
      const matchedText = match[0]
      const start = match.index ?? 0
      const end = start + matchedText.length

      if (!isBoundaryMatch(copyText, start, end)) {
        continue
      }

      matchedTermIds.add(term.id)
      rawMatches.push({
        start,
        end,
        termId: term.id,
      })
    }
  }

  rawMatches.sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start
    }

    return (right.end - right.start) - (left.end - left.start)
  })

  const matches = mergeMatches(rawMatches)

  return {
    matches,
    matchedTermIds,
    totalTermsCount: terms.length,
    matchedTermsCount: matchedTermIds.size,
    matchCount: matches.length,
  }
}

export function renderHighlightedHtml(text, matches) {
  if (!matches.length) {
    return escapeHtml(text)
  }

  let cursor = 0
  let html = ''

  for (const match of matches) {
    html += escapeHtml(text.slice(cursor, match.start))
    html += `<mark class="rounded bg-yellow-200 px-1 text-gray-900">${escapeHtml(text.slice(match.start, match.end))}</mark>`
    cursor = match.end
  }

  html += escapeHtml(text.slice(cursor))
  return html
}

export const DISPLAY_COUNTS = [5, 10, 20, 50, 100]

export const PHRASE_OPTIONS = [
  { value: 1, label: '一个单词', termLabel: '单词' },
  { value: 2, label: '两个单词组合', termLabel: '词组' },
  { value: 3, label: '三个单词组合', termLabel: '词组' },
]

const STOP_WORDS = new Set([
  'a', 'an', 'the',
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'at', 'before',
  'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'by', 'down', 'during', 'except',
  'for', 'from', 'in', 'inside', 'into', 'near', 'of', 'off', 'on', 'out', 'outside', 'over',
  'past', 'since', 'through', 'throughout', 'till', 'to', 'toward', 'under', 'underneath',
  'until', 'up', 'upon', 'with', 'within', 'without',
  'and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'although', 'because', 'if', 'since', 'though',
  'unless', 'until', 'when', 'where', 'while', 'after', 'before', 'as',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
  'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
  'whose',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
  'not', 'no', 'yes', 'very', 'just', 'only', 'also', 'too', 'more', 'most', 'other', 'some',
  'such', 'same', 'all', 'each', 'every', 'both', 'few', 'many', 'much',
])

const CHUNK_SIZE = 50000

function isAlphaNumeric(char) {
  const code = char.charCodeAt(0)
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122)
  )
}

function forEachToken(text, callback) {
  let carry = ''

  for (let index = 0; index < text.length; index += CHUNK_SIZE) {
    const segment = carry + text.slice(index, index + CHUNK_SIZE)
    let token = ''

    for (const char of segment) {
      if (isAlphaNumeric(char)) {
        token += char
        continue
      }

      if (token) {
        callback(token)
        token = ''
      }
    }

    carry = token
  }

  if (carry) {
    callback(carry)
  }
}

function countSentenceGroups(text) {
  return text.match(/[.!?]+(?=\s|$)/g)?.length ?? 0
}

function sortRows(left, right) {
  if (right.count !== left.count) {
    return right.count - left.count
  }

  return left.term.localeCompare(right.term, 'en')
}

function toTermRows(counts, totalTerms, topN) {
  return Array.from(counts.entries())
    .map(([term, count]) => ({
      term,
      count,
      ratio: totalTerms > 0 ? count / totalTerms : 0,
    }))
    .sort(sortRows)
    .slice(0, topN)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      ratioText: `${(row.ratio * 100).toFixed(2)}%`,
    }))
}

function normalizePhraseSize(value) {
  return [1, 2, 3].includes(value) ? value : 1
}

function normalizeTopN(value) {
  return DISPLAY_COUNTS.includes(value) ? value : 10
}

function getPhraseLabel(phraseSize) {
  return PHRASE_OPTIONS.find(option => option.value === phraseSize)?.label ?? '一个单词'
}

function getTermLabel(phraseSize) {
  return PHRASE_OPTIONS.find(option => option.value === phraseSize)?.termLabel ?? '单词'
}

export function analyzeText(text, options = {}) {
  const caseSensitive = options.caseSensitive ?? false
  const excludeStopWords = options.excludeStopWords ?? true
  const phraseSize = normalizePhraseSize(options.phraseSize ?? 1)
  const topN = normalizeTopN(options.topN ?? 10)

  const counts = new Map()
  const phraseWindow = []
  let rawWordCount = 0
  let totalTerms = 0

  forEachToken(text, rawToken => {
    rawWordCount += 1

    const lowerToken = rawToken.toLowerCase()

    if (excludeStopWords && STOP_WORDS.has(lowerToken)) {
      return
    }

    const normalizedToken = caseSensitive ? rawToken : lowerToken

    if (phraseSize === 1) {
      totalTerms += 1
      counts.set(normalizedToken, (counts.get(normalizedToken) ?? 0) + 1)
      return
    }

    phraseWindow.push(normalizedToken)

    if (phraseWindow.length > phraseSize) {
      phraseWindow.shift()
    }

    if (phraseWindow.length === phraseSize) {
      const phrase = phraseWindow.join(' ')
      totalTerms += 1
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1)
    }
  })

  return {
    summary: {
      characterCount: text.length,
      wordCount: rawWordCount,
      sentenceCount: countSentenceGroups(text),
    },
    settings: {
      caseSensitive,
      excludeStopWords,
      phraseSize,
      phraseLabel: getPhraseLabel(phraseSize),
      topN,
    },
    termLabel: getTermLabel(phraseSize),
    hasContent: text.trim().length > 0,
    hasResults: totalTerms > 0,
    totalTerms,
    totalUniqueTerms: counts.size,
    rows: toTermRows(counts, totalTerms, topN),
  }
}

function escapeCsvCell(value) {
  const stringValue = String(value ?? '')
  if (!/[",\r\n]/.test(stringValue)) {
    return stringValue
  }

  return `"${stringValue.replace(/"/g, '""')}"`
}

function toCsvLine(values) {
  return values.map(escapeCsvCell).join(',')
}

function buildTimestamp(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

export function downloadAnalysisCsv(analysis) {
  const lines = [
    toCsvLine(['统计摘要']),
    toCsvLine(['总字符数', analysis.summary.characterCount]),
    toCsvLine(['总单词数', analysis.summary.wordCount]),
    toCsvLine(['总句子数', analysis.summary.sentenceCount]),
    toCsvLine(['区分大小写', analysis.settings.caseSensitive ? '是' : '否']),
    toCsvLine(['是否排除语法词', analysis.settings.excludeStopWords ? '是' : '否']),
    toCsvLine(['词组类型', analysis.settings.phraseLabel]),
    toCsvLine(['显示数量', analysis.settings.topN]),
    '',
    toCsvLine(['排名', '词/词组', '次数', '占比']),
    ...analysis.rows.map(row => toCsvLine([row.rank, row.term, row.count, row.ratioText])),
  ]

  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `word-frequency-${buildTimestamp(new Date())}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

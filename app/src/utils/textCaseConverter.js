export function validateEnglishText(text, maxLength = 5000) {
  if (!text.trim()) {
    return {
      valid: false,
      message: '请输入文本',
    }
  }

  if (text.length > maxLength) {
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

function capitalizeToken(token) {
  const lowerToken = token.toLowerCase()
  let result = ''

  for (let index = 0; index < lowerToken.length; index += 1) {
    const char = lowerToken[index]
    const prevChar = lowerToken[index - 1]
    const shouldUppercase =
      index === 0 ||
      prevChar === '-' ||
      (prevChar === "'" && index === 2)

    result += shouldUppercase ? char.toUpperCase() : char
  }

  return result
}

export function capitalizeWords(text) {
  return text.replace(/[A-Za-z]+(?:'[A-Za-z]+)*/g, capitalizeToken)
}

export function toUppercase(text) {
  return text.toUpperCase()
}

export function toLowercase(text) {
  return text.toLowerCase()
}

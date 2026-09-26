import { CharInfo } from '@/types/game'

// 判断字符是否为符号
export function isSymbol(char: string): boolean {
  const symbolRegex = /[^\u4e00-\u9fa5a-zA-Z0-9]/
  return symbolRegex.test(char)
}

// 处理文本，转换为字符信息数组（提前将所有大写转换为小写）
export function processText(text: string): CharInfo[] {
  const normalizedText = text.toLowerCase()
  return normalizedText.split('').map((char, index) => ({
    char,
    index,
    isRevealed: isSymbol(char), // 符号默认显示
    isSymbol: isSymbol(char)
  }))
}

// 检查是否完成游戏（标题所有非符号字符都已猜出）
export function checkGameComplete(titleChars: CharInfo[]): boolean {
  return titleChars.every(char => char.isSymbol || char.isRevealed)
}

export interface TextUnit {
  text: string
  key: string
  index: number
  isWord: boolean
  isChinese: boolean
  isSymbol: boolean
  isNewline: boolean
}

// 判断是否为空格字符
export function isSpace(text: string): boolean {
  return text === ' ' || text === '\u3000' || text === '\t' || text === '\u00A0'
}

// 判断是否为斜杠字符
export function isSlash(text: string): boolean {
  return text === '/' || text === '／' || text === '\\'
}

/**
 * 处理正文段落文本为单元数组：
 * - 英文单词（由字母/数字组成，包含单引号如 don't）作为一个独立单元
 * - 单个汉字作为一个独立单元
 * - 空格、换行、标点符号作为非交互符号保留
 */
export function processParagraphUnits(text: string): TextUnit[] {
  // 预处理：统一转为小写（无大写字母展示）
  const normalizedText = text.toLowerCase()

  // 正则按优先级匹配：
  // 1. 换行符 (\r?\n)
  // 2. 英文单词 / 数字单词 ([a-zA-Z0-9]+(?:['’][a-zA-Z0-9]+)*)
  // 3. 中文字符 ([\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff])
  // 4. 空白字符 ([ \t\u3000\u00A0])
  // 5. 其他任意标点/符号 ([\s\S])
  const tokenRegex = /(\r?\n)|([a-zA-Z0-9]+(?:['’][a-zA-Z0-9]+)*)|([\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff])|([ \t\u3000\u00A0])|([\s\S])/g

  const units: TextUnit[] = []
  let match: RegExpExecArray | null
  let index = 0

  while ((match = tokenRegex.exec(normalizedText)) !== null) {
    const raw = match[0]
    if (match[1]) {
      // 换行
      units.push({
        text: raw,
        key: '',
        index: index++,
        isWord: false,
        isChinese: false,
        isSymbol: true,
        isNewline: true
      })
    } else if (match[2]) {
      // 英文单词 / 数字词组 (统归为词汇单元，统一小写无大写字母)
      const word = raw.toLowerCase()
      units.push({
        text: word,
        key: word,
        index: index++,
        isWord: true,
        isChinese: false,
        isSymbol: false,
        isNewline: false
      })
    } else if (match[3]) {
      // 单个中文字符
      units.push({
        text: raw,
        key: raw,
        index: index++,
        isWord: false,
        isChinese: true,
        isSymbol: false,
        isNewline: false
      })
    } else if (match[4]) {
      // 空白字符
      units.push({
        text: raw,
        key: '',
        index: index++,
        isWord: false,
        isChinese: false,
        isSymbol: true,
        isNewline: false
      })
    } else if (match[5]) {
      // 其他标点符号
      units.push({
        text: raw,
        key: '',
        index: index++,
        isWord: false,
        isChinese: false,
        isSymbol: true,
        isNewline: false
      })
    }
  }

  return units
}
import { CharInfo } from '@/types/game'

// 判断字符是否为符号
export function isSymbol(char: string): boolean {
  const symbolRegex = /[^\u4e00-\u9fa5a-zA-Z0-9]/
  return symbolRegex.test(char)
}

// 处理文本，转换为字符信息数组
export function processText(text: string): CharInfo[] {
  return text.split('').map((char, index) => ({
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
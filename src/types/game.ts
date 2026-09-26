export interface CharInfo {
  char: string
  index: number
  isRevealed: boolean
  isSymbol: boolean
  row?: number
  col?: number
}

export interface Player {
  id: number
  name: string
  score: number
}

export interface GameState {
  // 游戏设置
  players: Player[]
  currentPlayerIndex: number
  gameStarted: boolean

  // 文件内容
  fileContent: string
  title: string
  content: string
  titleChars: CharInfo[]
  contentChars: CharInfo[]

  // 游戏状态
  guessedChars: Set<string>
  errorChars: Set<string>
  isGameComplete: boolean
  winner?: Player
  isManuallyEnded: boolean

  // 回合状态
  hasExtraTurn: boolean
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
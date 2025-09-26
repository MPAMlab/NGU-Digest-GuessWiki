export interface CharInfo {
  char: string
  index: number
  isRevealed: boolean
  isSymbol: boolean
  row?: number
  col?: number
}

export interface GameState {
  title: string
  content: string
  titleChars: CharInfo[]
  contentChars: CharInfo[]
  guessedChars: Set<string>
  errorChars: Set<string>
  isGameComplete: boolean
}
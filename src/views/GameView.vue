<template>
  <div class="game-container">
    <!-- 游戏设置中 -->
    <div v-if="!gameState.gameStarted" class="setup-screen">
      <div class="loading">加载中...</div>
    </div>

    <!-- 游戏进行中 -->
    <div v-else class="game-area">
      <!-- 当前玩家提示 -->
      <div v-if="!gameState.isGameComplete && gameState.players.length > 1" class="current-player">
        <div class="player-indicator">
          当前玩家：<span class="player-name">{{ currentPlayer.name }}</span>
        </div>
        <div class="turn-indicator" v-if="gameState.hasExtraTurn">
          <span class="extra-turn">获得额外回合！</span>
        </div>
      </div>

      <!-- 标题区域 -->
      <div class="article-title monospace">
        <span
          v-for="charInfo in gameState.titleChars"
          :key="`title-${charInfo.index}`"
          class="char-block"
          :class="{ hidden: !charInfo.isRevealed, revealed: charInfo.isRevealed }"
        >
          {{ charInfo.isRevealed ? charInfo.char : '' }}
        </span>
      </div>

      <!-- 正文区域 -->
      <div class="article-content monospace">
        <span
          v-for="charInfo in gameState.contentChars"
          :key="`content-${charInfo.index}`"
          class="char-block"
          :class="{ hidden: !charInfo.isRevealed, revealed: charInfo.isRevealed }"
        >
          {{ charInfo.isRevealed ? charInfo.char : '' }}
        </span>
      </div>

      <!-- 猜字区域 -->
      <div class="guess-area" v-if="!gameState.isGameComplete">
        <input
          v-model="guessInput"
          type="text"
          class="guess-input"
          placeholder="请输入一个字"
          maxlength="1"
          @keyup.enter="handleGuess"
          :disabled="isGuessing"
        >
        <button
          class="guess-button"
          :disabled="!guessInput.trim() || isGuessing"
          @click="handleGuess"
        >
          提交
        </button>
        <button
          class="end-game-button"
          @click="endGameManually"
        >
          结束游戏
        </button>
      </div>

      <!-- 玩家分数 -->
      <div v-if="gameState.players.length > 1" class="scores">
        <h3>玩家得分</h3>
        <div class="score-list">
          <div
            v-for="player in gameState.players"
            :key="player.id"
            class="score-item"
            :class="{ active: player.id === currentPlayer.id }"
          >
            <span class="score-name">{{ player.name }}</span>
            <span class="score-value">{{ player.score }}</span>
          </div>
        </div>
      </div>

      <!-- 错误字符显示 -->
      <div v-if="gameState.errorChars.size > 0" class="error-chars">
        <div class="error-title">猜错的字：</div>
        <span
          v-for="char in Array.from(gameState.errorChars)"
          :key="`error-${char}`"
          class="error-tag"
        >
          {{ char }}
        </span>
      </div>

      <!-- 游戏完成提示 -->
      <div v-if="gameState.isGameComplete" class="game-complete">
        <h2>🎉 游戏结束！</h2>
        <p v-if="gameState.isManuallyEnded">
          游戏已手动结束，以下是完整文章内容
        </p>
        <p v-else-if="gameState.winner">
          获胜者：<strong>{{ gameState.winner.name }}</strong>
        </p>
        <p v-else>
          标题已被完全揭示！
        </p>
        <div v-if="gameState.players.length > 1 && !gameState.isManuallyEnded" class="final-scores">
          <h3>最终得分</h3>
          <div class="final-score-list">
            <div v-for="player in gameState.players" :key="player.id" class="final-score-item">
              <span>{{ player.name }}</span>
              <span>{{ player.score }} 分</span>
            </div>
          </div>
        </div>
        <button class="reset-button" @click="backToHome">返回首页</button>
      </div>
    </div>

    <!-- 消息提示 -->
    <div
      v-if="message.show"
      class="message"
      :class="message.type"
      @click="message.show = false"
    >
      {{ message.text }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { processText, checkGameComplete, isSymbol } from '@/utils/textProcessor'
import { GameState, Player } from '@/types/game'

export default defineComponent({
  name: 'GameView',
  setup() {
    const router = useRouter()
    const guessInput = ref('')
    const isGuessing = ref(false)

    const message = reactive({
      show: false,
      text: '',
      type: 'success' as 'success' | 'warning' | 'error'
    })

    const gameState = reactive<GameState>({
      players: [],
      currentPlayerIndex: 0,
      gameStarted: false,
      fileContent: '',
      title: '',
      content: '',
      titleChars: [],
      contentChars: [],
      guessedChars: new Set(),
      errorChars: new Set(),
      isGameComplete: false,
      hasExtraTurn: false,
      isManuallyEnded: false
    })

    // 当前玩家
    const currentPlayer = computed(() => {
      return gameState.players[gameState.currentPlayerIndex] || { name: '', score: 0 }
    })

    // 显示消息
    const showMessage = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
      message.text = text
      message.type = type
      message.show = true
      setTimeout(() => {
        message.show = false
      }, 3000)
    }

    // 初始化游戏
    const initGame = () => {
      const gameData = sessionStorage.getItem('gameData')
      if (!gameData) {
        router.push('/')
        return
      }

      const { fileContent, players } = JSON.parse(gameData)
      gameState.fileContent = fileContent
      gameState.players = players

      // 处理文件内容
      const lines = fileContent.split('\n').filter(line => line.trim())
      gameState.title = lines[0].trim()
      gameState.content = lines.length > 1 ? lines.slice(1).join('\n').trim() : ''

      // 处理字符
      gameState.titleChars = processText(gameState.title)
      gameState.contentChars = processText(gameState.content)

      gameState.gameStarted = true
      showMessage('游戏开始！')
    }

    // 处理猜字
    const handleGuess = () => {
      const char = guessInput.value.trim()
      if (!char) return

      isGuessing.value = true

      // 检查是否为符号
      if (isSymbol(char)) {
        showMessage('符号不能作为猜测内容', 'warning')
        guessInput.value = ''
        isGuessing.value = false
        return
      }

      // 检查是否已经猜过
      if (gameState.guessedChars.has(char) || gameState.errorChars.has(char)) {
        const isCorrect = gameState.guessedChars.has(char)
        showMessage(isCorrect ? `"${char}" 已经猜对了，它在文章中` : `"${char}" 已经猜过了，但不在文章中`, 'warning')
        guessInput.value = ''
        isGuessing.value = false
        return
      }

      // 检查文字是否在文章中
      let isFound = false
      let foundInTitle = false

      // 检查标题
      gameState.titleChars.forEach(charInfo => {
        if (charInfo.char === char && !charInfo.isSymbol) {
          charInfo.isRevealed = true
          isFound = true
          foundInTitle = true
        }
      })

      // 检查正文
      gameState.contentChars.forEach(charInfo => {
        if (charInfo.char === char && !charInfo.isSymbol) {
          charInfo.isRevealed = true
          isFound = true
        }
      })

      if (isFound) {
        gameState.guessedChars.add(char)

        // 增加当前玩家分数
        currentPlayer.value.score++

        let messageText = `猜对了！"${char}" 在文章中出现了`

        // 如果猜中标题中的字，获得额外回合
        if (foundInTitle) {
          gameState.hasExtraTurn = true
          messageText += '，获得额外回合！'
        }

        showMessage(messageText)

        // 检查游戏是否完成
        gameState.isGameComplete = checkGameComplete(gameState.titleChars)
        if (gameState.isGameComplete) {
          gameState.winner = currentPlayer.value
          showMessage(`恭喜 ${gameState.winner.name} 获得胜利！`)
        } else if (!gameState.hasExtraTurn) {
          // 没有额外回合，切换到下一个玩家
          nextPlayer()
        }
      } else {
        gameState.errorChars.add(char)
        showMessage(`"${char}" 不在文章中`, 'error')
        // 猜错了，切换到下一个玩家
        nextPlayer()
      }

      guessInput.value = ''
      isGuessing.value = false
    }

    // 切换到下一个玩家
    const nextPlayer = () => {
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length
      gameState.hasExtraTurn = false
    }

    // 手动结束游戏
    const endGameManually = () => {
      // 显示所有文字
      gameState.titleChars.forEach(charInfo => {
        if (!charInfo.isSymbol) {
          charInfo.isRevealed = true
        }
      })
      gameState.contentChars.forEach(charInfo => {
        if (!charInfo.isSymbol) {
          charInfo.isRevealed = true
        }
      })

      gameState.isManuallyEnded = true
      gameState.isGameComplete = true
      showMessage('游戏已结束，显示完整文章')
    }

    // 返回首页
    const backToHome = () => {
      sessionStorage.removeItem('gameData')
      router.push('/')
    }

    onMounted(() => {
      initGame()
    })

    return {
      gameState,
      guessInput,
      isGuessing,
      currentPlayer,
      message,
      handleGuess,
      endGameManually,
      backToHome
    }
  }
})
</script>

<style scoped>
.setup-screen {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 24px;
  color: #666;
}

.current-player {
  text-align: center;
  margin-bottom: 20px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 8px;
}

.player-indicator {
  font-size: 18px;
  color: #333;
}

.player-name {
  color: #409eff;
  font-weight: bold;
}

.turn-indicator {
  margin-top: 8px;
}

.extra-turn {
  color: #67c23a;
  font-weight: bold;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}

.scores {
  margin-top: 30px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.scores h3 {
  margin-bottom: 12px;
  color: #333;
}

.score-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.score-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: white;
  border-radius: 6px;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.score-item.active {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.score-name {
  margin-right: 12px;
  color: #333;
}

.score-value {
  font-weight: bold;
  color: #409eff;
  font-size: 18px;
}

.game-complete p {
  margin: 10px 0;
  color: #666;
}

.game-complete strong {
  color: #67c23a;
  font-size: 24px;
}

.reset-button {
  margin-top: 20px;
  background: #409eff;
}

.reset-button:hover {
  background: #66b1ff;
}

.final-scores {
  margin: 20px 0;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.final-scores h3 {
  margin-bottom: 12px;
  color: #333;
  text-align: center;
}

.final-score-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.final-score-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  background: white;
  border-radius: 6px;
  font-size: 16px;
}

.final-score-item span:first-child {
  color: #333;
}

.final-score-item span:last-child {
  color: #409eff;
  font-weight: bold;
}
</style>
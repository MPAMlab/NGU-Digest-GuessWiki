<template>
  <div class="game-container">
    <!-- 文件上传区域 -->
    <div v-if="!gameState.content" class="upload-card">
      <div class="card-header">上传百科文本文件</div>
      <div
        class="upload-area"
        :class="{ 'drag-over': isDragOver }"
        @drop.prevent="handleDrop"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @click="triggerFileInput"
      >
        <div class="upload-icon">📁</div>
        <div class="upload-text">
          将txt文件拖到此处，或<em>点击上传</em>
        </div>
        <div class="upload-tip">
          文本格式：第一行为标题，其余为正文内容
        </div>
      </div>
      <input
        type="file"
        ref="fileInput"
        accept=".txt"
        style="display: none"
        @change="handleFileSelect"
      >
    </div>

    <!-- 游戏区域 -->
    <div v-else class="game-area">
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
        <h2>🎉 恭喜你完成了游戏！</h2>
        <p>你已成功猜出标题中的所有文字</p>
        <button class="reset-button" @click="resetGame">重新开始</button>
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
import { defineComponent, ref, reactive, watch } from 'vue'
import { processText, checkGameComplete } from '@/utils/textProcessor'
import { GameState } from '@/types/game'

export default defineComponent({
  name: 'GameView',
  setup() {
    const fileInput = ref<HTMLInputElement | null>(null)
    const guessInput = ref('')
    const isGuessing = ref(false)
    const isDragOver = ref(false)

    const message = reactive({
      show: false,
      text: '',
      type: 'success' as 'success' | 'warning' | 'error'
    })

    const gameState = reactive<GameState>({
      title: '',
      content: '',
      titleChars: [],
      contentChars: [],
      guessedChars: new Set(),
      errorChars: new Set(),
      isGameComplete: false
    })

    // 监听gameState变化
    watch(() => gameState.content, (newVal) => {
      console.log('gameState.content changed:', newVal)
    }, { deep: true })

    // 显示消息
    const showMessage = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
      message.text = text
      message.type = type
      message.show = true
      setTimeout(() => {
        message.show = false
      }, 3000)
    }

    // 触发文件选择
    const triggerFileInput = () => {
      fileInput.value?.click()
    }

    // 处理文件拖拽
    const handleDragOver = () => {
      isDragOver.value = true
    }

    const handleDragLeave = () => {
      isDragOver.value = false
    }

    const handleDrop = (e: DragEvent) => {
      isDragOver.value = false
      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
    }

    // 处理文件选择
    const handleFileSelect = (e: Event) => {
      const target = e.target as HTMLInputElement
      if (target.files && target.files.length > 0) {
        handleFile(target.files[0])
      }
    }

    // 处理文件
    const handleFile = (file: File) => {
      if (!file.name.endsWith('.txt')) {
        showMessage('请上传txt格式的文件', 'error')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        processFileContent(text)
      }
      reader.readAsText(file, 'UTF-8')
    }

    // 处理文件内容
    const processFileContent = (text: string) => {
      console.log('文件内容:', text)
      const lines = text.split('\n').filter(line => line.trim())
      console.log('分割后的行数:', lines.length)

      if (lines.length === 0) {
        showMessage('文件为空', 'error')
        return
      }

      gameState.title = lines[0].trim()
      // 如果只有一行，将整行内容作为正文
      gameState.content = lines.length > 1 ? lines.slice(1).join('\n').trim() : ''
      console.log('标题:', gameState.title)
      console.log('正文长度:', gameState.content.length)

      // 处理标题和正文的字符
      gameState.titleChars = processText(gameState.title)
      gameState.contentChars = processText(gameState.content)
      console.log('标题字符数:', gameState.titleChars.length)
      console.log('正文字符数:', gameState.contentChars.length)
      console.log('gameState.content:', gameState.content)

      // 即使没有正文，标题也可以用于猜字游戏
      showMessage('文件加载成功，开始游戏吧！')
    }

    // 处理猜字
    const handleGuess = () => {
      const char = guessInput.value.trim()
      if (!char) return

      isGuessing.value = true

      // 检查是否已经猜过
      if (gameState.guessedChars.has(char)) {
        showMessage(`"${char}" 已经猜对了，它在文章中`, 'warning')
        guessInput.value = ''
        isGuessing.value = false
        return
      }
      if (gameState.errorChars.has(char)) {
        showMessage(`"${char}" 已经猜过了，但不在文章中`, 'warning')
        guessInput.value = ''
        isGuessing.value = false
        return
      }

      // 检查文字是否在文章中
      let isFound = false

      // 检查标题
      gameState.titleChars.forEach(charInfo => {
        if (charInfo.char === char && !charInfo.isSymbol) {
          charInfo.isRevealed = true
          isFound = true
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
        showMessage(`猜对了！"${char}" 在文章中出现了`)

        // 检查游戏是否完成
        gameState.isGameComplete = checkGameComplete(gameState.titleChars)
        if (gameState.isGameComplete) {
          showMessage('恭喜你完成了游戏！')
        }
      } else {
        gameState.errorChars.add(char)
        showMessage(`"${char}" 不在文章中`, 'error')
      }

      guessInput.value = ''
      isGuessing.value = false
    }

    // 重置游戏
    const resetGame = () => {
      gameState.title = ''
      gameState.content = ''
      gameState.titleChars = []
      gameState.contentChars = []
      gameState.guessedChars.clear()
      gameState.errorChars.clear()
      gameState.isGameComplete = false
      guessInput.value = ''
    }

    return {
      fileInput,
      gameState,
      guessInput,
      isGuessing,
      isDragOver,
      message,
      triggerFileInput,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleFileSelect,
      handleGuess,
      resetGame
    }
  }
})
</script>
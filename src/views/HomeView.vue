<template>
  <div class="home-container">
    <div class="post-prod-banner">
      <span>🎬 视频后制进行中？</span>
      <router-link to="/" class="post-prod-link">进入【视频后制上帝模式】（1920x540 模拟视窗） &rarr;</router-link>
    </div>

    <h1>百科猜字游戏</h1>

    <!-- 文件上传区域 -->
    <div class="upload-section">
      <div class="upload-area" :class="{ 'drag-over': isDragOver }" @drop.prevent="handleDrop" @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave" @click="triggerFileInput">
        <div class="upload-icon">📁</div>
        <div class="upload-text">将txt文件拖到此处，或<em>点击上传</em></div>
        <div class="upload-tip">文本格式：第一行为标题，其余为正文内容</div>
        <div v-if="fileName" class="file-name">已选择: {{ fileName }}</div>
      </div>
      <input type="file" ref="fileInput" accept=".txt" style="display: none" @change="handleFileSelect">
    </div>

    <!-- 游戏模式选择 -->
    <div class="mode-section">
      <h2>游戏模式</h2>
      <div class="mode-buttons">
        <button class="mode-button" :class="{ active: gameMode === 'single' }" @click="gameMode = 'single'">单人模式</button>
        <button class="mode-button" :class="{ active: gameMode === 'multi' }" @click="gameMode = 'multi'">多人模式</button>
      </div>
    </div>

    <!-- 玩家设置 -->
    <div v-if="gameMode === 'multi'" class="players-section">
      <h2>玩家设置</h2>
      <div class="players-list">
        <div v-for="(player, index) in players" :key="player.id" class="player-item">
          <span class="player-number">{{ index + 1 }}.</span>
          <input v-model="player.name" placeholder="请输入昵称" class="player-name-input">
          <button v-if="players.length > 2" class="remove-player" @click="removePlayer(index)">×</button>
        </div>
      </div>
      <button v-if="players.length < 6" class="add-player" @click="addPlayer">+ 添加玩家</button>
    </div>

    <!-- 开始游戏按钮 -->
    <div class="start-section">
      <button class="start-button" :disabled="!canStartGame" @click="startGame">
        开始游戏
      </button>
      <div v-if="!canStartGame" class="start-tip">
        {{ startTip }}
      </div>
    </div>

    <!-- 消息提示 -->
    <div v-if="message.show" class="message" :class="message.type" @click="message.show = false">
      {{ message.text }}
    </div>

    <Footer />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Player } from '@/types/game'
import Footer from '@/components/Footer.vue'

export default defineComponent({
  name: 'HomeView',
  components: {
    Footer
  },
  setup() {
    const router = useRouter()
    const fileInput = ref<HTMLInputElement | null>(null)
    const fileContent = ref('')
    const fileName = ref('')
    const gameMode = ref<'single' | 'multi'>('single')
    const isDragOver = ref(false)

    const message = reactive({
      show: false,
      text: '',
      type: 'success' as 'success' | 'warning' | 'error'
    })

    const players = ref<Player[]>([
      { id: 1, name: '玩家1', score: 0 },
      { id: 2, name: '玩家2', score: 0 }
    ])

    // 计算是否可以开始游戏
    const canStartGame = computed(() => {
      if (!fileContent.value) return false
      if (gameMode.value === 'multi') {
        return players.value.every(p => p.name.trim())
      }
      return true
    })

    // 开始提示
    const startTip = computed(() => {
      if (!fileContent.value) return '请先上传文件'
      if (gameMode.value === 'multi') {
        const emptyNames = players.value.filter(p => !p.name.trim())
        if (emptyNames.length > 0) return '请填写所有玩家昵称'
      }
      return ''
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

    // 触发文件选择
    const triggerFileInput = () => {
      fileInput.value?.click()
    }

    // 处理拖拽
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

      fileName.value = file.name

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())

        if (lines.length === 0) {
          showMessage('文件为空', 'error')
          return
        }

        fileContent.value = text
        showMessage('文件上传成功！')
      }
      reader.readAsText(file, 'UTF-8')
    }

    // 添加玩家
    const addPlayer = () => {
      const newId = Math.max(...players.value.map(p => p.id)) + 1
      players.value.push({
        id: newId,
        name: `玩家${players.value.length + 1}`,
        score: 0
      })
    }

    // 移除玩家
    const removePlayer = (index: number) => {
      players.value.splice(index, 1)
    }

    // 开始游戏
    const startGame = () => {
      // 将游戏数据存储到 sessionStorage
      const gameData = {
        fileContent: fileContent.value,
        players: gameMode.value === 'single' ? [{ id: 1, name: '玩家', score: 0 }] : players.value.map(p => ({ ...p })),
        gameMode: gameMode.value
      }
      sessionStorage.setItem('gameData', JSON.stringify(gameData))

      // 跳转到游戏页面
      router.push('/game')
    }

    return {
      fileInput,
      fileName,
      gameMode,
      isDragOver,
      players,
      canStartGame,
      startTip,
      message,
      triggerFileInput,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleFileSelect,
      addPlayer,
      removePlayer,
      startGame
    }
  }
})
</script>

<style scoped>
.home-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px 60px;
}

.post-prod-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #1e293b, #334155);
  color: #ffffff;
  padding: 12px 18px;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.post-prod-link {
  color: #38bdf8;
  text-decoration: none;
  font-weight: 700;
  transition: color 0.2s;
}

.post-prod-link:hover {
  color: #7dd3fc;
  text-decoration: underline;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 40px;
}

/* 上传区域 */
.upload-section {
  margin-bottom: 30px;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.upload-area.drag-over {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-text {
  color: #666;
  margin-bottom: 8px;
}

.upload-text em {
  color: #409eff;
  font-style: normal;
}

.upload-tip {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.file-name {
  margin-top: 12px;
  color: #409eff;
  font-weight: bold;
}

/* 模式选择 */
.mode-section {
  margin-bottom: 30px;
}

h2 {
  color: #333;
  margin-bottom: 16px;
  font-size: 20px;
}

.mode-buttons {
  display: flex;
  gap: 10px;
}

.mode-button {
  flex: 1;
  padding: 12px 24px;
  border: 2px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 16px;
}

.mode-button:hover {
  border-color: #409eff;
}

.mode-button.active {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

/* 玩家设置 */
.players-section {
  margin-bottom: 30px;
}

.players-list {
  margin-bottom: 16px;
}

.player-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.player-number {
  width: 24px;
  color: #666;
  margin-right: 12px;
}

.player-name-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.player-name-input:focus {
  outline: none;
  border-color: #409eff;
}

.remove-player {
  width: 28px;
  height: 28px;
  margin-left: 12px;
  border: none;
  background: #f56c6c;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

.remove-player:hover {
  background: #f78989;
}

.add-player {
  width: 100%;
  padding: 10px;
  border: 1px dashed #409eff;
  background: transparent;
  color: #409eff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.add-player:hover {
  background: #ecf5ff;
}

/* 开始游戏 */
.start-section {
  text-align: center;
}

.start-button {
  padding: 14px 48px;
  background: #67c23a;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 18px;
  cursor: pointer;
  transition: background 0.3s;
}

.start-button:hover:not(:disabled) {
  background: #85ce61;
}

.start-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.start-tip {
  margin-top: 12px;
  color: #f56c6c;
  font-size: 14px;
}

/* 消息提示 */
.message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  z-index: 1000;
  animation: slideDown 0.3s ease;
}

.message.success {
  background-color: #67c23a;
}

.message.warning {
  background-color: #e6a23c;
}

.message.error {
  background-color: #f56c6c;
}

@keyframes slideDown {
  from {
    transform: translate(-50%, -100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}
</style>
<template>
  <div class="god-mode-view" :class="[theme, { 'is-dragging': isDraggingDivider || isDraggingBoxBottom }]">
    <!-- 顶部综合控制台 -->
    <header class="top-bar">
      <div class="bar-left">
        <div class="title-group">
          <span class="logo-tag">POST-PROD</span>
          <h1>百科猜字 · 视频后制上帝模式</h1>
        </div>

        <div class="upload-controls">
          <input
            ref="fileInputRef"
            type="file"
            accept=".txt"
            style="display: none"
            @change="handleFileSelect"
          />
          <button class="btn btn-primary" @click="triggerFileInput" title="上传文本（第一行标题，其余正文）">
            📁 上传TXT文件
          </button>
          <button class="btn btn-outline" @click="loadSampleText" title="重新载入内置示例文章">
            📄 载入示例
          </button>
          <span v-if="currentFileName" class="file-name-tag" :title="currentFileName">
            {{ currentFileName }}
          </span>
        </div>
      </div>

      <div class="bar-center">
        <!-- 统计与进度 -->
        <div class="stats-pill">
          <span>已揭示: <strong>{{ revealedNonSymbolCount }}</strong> / {{ totalNonSymbolCount }}</span>
          <span class="stats-percent">({{ revealProgress }}%)</span>
          <span class="stats-divider">|</span>
          <span>独立字符: <strong>{{ uniqueRevealedCount }}</strong> / {{ uniqueCharCount }}</span>
        </div>

        <!-- 批量操作 -->
        <div class="action-buttons">
          <button class="btn btn-sm btn-action" @click="revealAll" title="一键揭示所有文字">
            👁️ 全部揭示
          </button>
          <button class="btn btn-sm btn-action" @click="hideAll" title="全部重置为黑块">
            🔒 全部隐藏
          </button>
          <button class="btn btn-sm btn-action" :disabled="historyIndex <= 0" @click="undo" title="撤销操作 (Ctrl+Z)">
            ↩️ 撤销
          </button>
          <button class="btn btn-sm btn-action" :disabled="historyIndex >= historyStack.length - 1" @click="redo" title="重做操作 (Ctrl+Y)">
            ↪️ 重做
          </button>
        </div>
      </div>

      <div class="bar-right">
        <!-- 视图尺寸与录制选项 -->
        <div class="preset-group">
          <label>视窗预设:</label>
          <button
            class="btn btn-xs"
            :class="{ active: boxHeight === 540 && !isNativeBoarderHeight }"
            @click="setBoxHeight(540)"
            title="1080p视频半屏高 (1920x540)"
          >
            540p半屏
          </button>
          <button
            class="btn btn-xs"
            :class="{ active: isNativeBoarderHeight }"
            @click="setBoarderNativeSize"
            title="题目边框原生高度 (1920x500 呈现区)"
          >
            500p边框原生
          </button>
          <button
            class="btn btn-xs"
            :class="{ active: boxHeight === 1080 }"
            @click="setBoxHeight(1080)"
            title="1080p视频全屏高 (1920x1080)"
          >
            1080p全屏
          </button>
          <button
            class="btn btn-xs"
            :class="{ active: isAutoHeight }"
            @click="toggleAutoHeight"
            title="自动适应文本内容高度"
          >
            自适应
          </button>
        </div>

        <!-- 边框与纯净录屏切换 -->
        <div class="border-controls">
          <button
            class="btn btn-xs"
            :class="{ active: showBoarder }"
            @click="showBoarder = !showBoarder"
            title="切换题目周边 SVG 装饰边框"
          >
            🖼️ 题目边框: {{ showBoarder ? '开' : '关' }}
          </button>
          <button
            class="btn btn-xs"
            :class="{ active: !hideIndicators }"
            @click="hideIndicators = !hideIndicators"
            title="切换位于屏幕外的区域信息指示条"
          >
            🏷️ 外部指示栏: {{ hideIndicators ? '隐藏' : '显示' }}
          </button>
        </div>

        <!-- 录屏背景主题选择 -->
        <div class="theme-picker">
          <label>呈现区背景:</label>
          <select v-model="theme">
            <option value="theme-light">经典白底</option>
            <option value="theme-dark">暗黑模式</option>
            <option value="theme-green">绿幕抠像 (#00FF00)</option>
            <option value="theme-blue">蓝幕抠像 (#0000FF)</option>
            <option value="theme-transparent">透明背景</option>
          </select>
        </div>

        <!-- 缩放与比例 -->
        <div class="zoom-controls">
          <label>缩放:</label>
          <select v-model="zoomMode">
            <option value="fit">适应窗口</option>
            <option value="100">100% 原始(1920px)</option>
            <option value="75">75%</option>
            <option value="50">50%</option>
          </select>
        </div>

        <!-- 路由切换 -->
        <router-link to="/classic" class="nav-link-btn" title="进入原版游玩模式">
          🎮 原版游戏
        </router-link>
      </div>
    </header>

    <!-- 次级工具栏：微调与显示配置 -->
    <div class="sub-toolbar">
      <div class="sub-item">
        <label>字号大小:</label>
        <input type="range" min="14" max="38" step="1" v-model.number="fontSize" />
        <span class="range-val">{{ fontSize }}px</span>
      </div>

      <div class="sub-item">
        <label>字块间距:</label>
        <input type="range" min="0" max="10" step="1" v-model.number="charMargin" />
        <span class="range-val">{{ charMargin }}px</span>
      </div>

      <div class="sub-item">
        <label>总高度:</label>
        <input
          type="number"
          class="num-input"
          min="200"
          max="3000"
          step="10"
          :value="boxHeight"
          @change="onBoxHeightInputChange"
        />
        <span class="unit">px</span>
      </div>

      <div class="sub-item">
        <label>呈现区高:</label>
        <input
          type="number"
          class="num-input"
          min="60"
          max="2000"
          step="10"
          :value="upPartHeight"
          @change="onUpHeightInputChange"
        />
        <span class="unit">px</span>
      </div>

      <div class="sub-item">
        <label>参考区高:</label>
        <input
          type="number"
          class="num-input"
          min="60"
          max="2000"
          step="10"
          :value="downPartHeight"
          @change="onDownHeightInputChange"
        />
        <span class="unit">px</span>
      </div>

      <div class="sub-item">
        <label>垂直居中:</label>
        <button
          class="btn btn-xs toggle-action-btn"
          :class="{ active: isVerticalCenter }"
          @click="isVerticalCenter = !isVerticalCenter"
          title="切换文字在框内是否垂直居中"
        >
          {{ isVerticalCenter ? '↕️ 垂直居中: 开' : '↕️ 垂直居中: 关' }}
        </button>
      </div>

      <div class="sub-item">
        <label>文本对齐:</label>
        <button
          class="btn btn-xs toggle-action-btn"
          :class="{ active: textAlign === 'center' }"
          @click="textAlign = textAlign === 'center' ? 'left' : 'center'"
          title="切换水平对齐方式"
        >
          {{ textAlign === 'center' ? '↔️ 水平居中' : '⬅️ 靠左对齐' }}
        </button>
      </div>

      <div class="sub-item">
        <label>点击操作:</label>
        <button
          class="btn btn-xs toggle-action-btn"
          :class="{ active: clickMode === 'toggle' }"
          @click="clickMode = clickMode === 'toggle' ? 'reveal' : 'toggle'"
        >
          {{ clickMode === 'toggle' ? '🔄 点击切换(揭示/隐藏)' : '👁️ 仅点击揭示' }}
        </button>
      </div>

      <div class="sub-item sub-item-right">
        <span class="dim-hint">
          💡 提示：在【呈现区黑方块】或【参考区明文】上点击任意字符，均可同步揭示/隐藏全部相同字符；可拖动中间分割条与底部手柄调整高度。
        </span>
      </div>
    </div>

    <!-- 主舞台滚动容器（支持适应窗口与1:1滚动） -->
    <main
      ref="stageWrapperRef"
      class="stage-viewport"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="handleDrop"
    >
      <!-- 拖拽提示层 -->
      <div v-if="isDragOver" class="drag-drop-overlay">
        <div class="drag-drop-box">
          <span class="drag-icon">📥</span>
          <p>松开鼠标以上传 TXT 文件</p>
        </div>
      </div>

      <!-- 舞台内容区（根据缩放值调整外层尺寸与缩放） -->
      <div
        class="stage-scaler-container"
        :style="scalerContainerStyle"
      >
        <!-- 外部状态指示条 (位于 1080p 屏幕外，绝不挤占视窗内部空间) -->
        <div v-if="!hideIndicators" class="screen-outer-indicator-bar">
          <div class="outer-pill tag-game">
            <span class="pill-badge">📺 视频呈现区 (Game View)</span>
            <span class="pill-info">宽: 1920px | 高: {{ upPartHeight }}px | 边框: {{ showBoarder ? '开启' : '关闭' }}</span>
          </div>
          <div class="outer-pill tag-god">
            <span class="pill-badge">👑 上帝视角参考区 (God View)</span>
            <span class="pill-info">宽: 1920px | 高: {{ downPartHeight }}px | 点击任意明文揭示/隐藏</span>
          </div>
        </div>

        <!-- 1080p 固定宽 1920px 模拟视窗主体 -->
        <div
          ref="screenBoxRef"
          class="screen-box-1080p"
          :style="screenBoxStyle"
        >
          <!-- 1. 上半部分：呈现区（黑方块遮罩模式，模拟视频画面） -->
          <section
            class="box-part up-part"
            :class="{ 'has-boarder': showBoarder }"
            :style="{ height: `${upPartHeight}px`, fontSize: `${fontSize}px` }"
          >
            <!-- 题目边框装饰图层 (Question Boarder SVG) -->
            <div v-if="showBoarder" class="question-boarder-layer">
              <img :src="questionBoarderSvg" class="boarder-svg-img" alt="Question Border Frame" />
            </div>

            <div class="text-content-scroll" :class="{ 'with-boarder': showBoarder }" :style="textScrollStyle">
              <div class="text-inner-container" :class="{ 'is-v-centered': isVerticalCenter }">
                <!-- 文章标题 -->
                <h2 class="article-title-block">
                  <template v-for="(charInfo, idx) in titleChars" :key="`up-title-${idx}`">
                    <br v-if="charInfo.char === '\n'" />
                    <span
                      v-else-if="charInfo.isSymbol"
                      class="char-symbol"
                      :style="charMarginStyle"
                    >{{ charInfo.char === ' ' ? '&nbsp;' : charInfo.char }}</span>
                    <span
                      v-else
                      class="char-block"
                      :class="{
                        hidden: !isCharRevealed(charInfo.char),
                        revealed: isCharRevealed(charInfo.char),
                        'is-hover-match': isMatchHover(charInfo.char)
                      }"
                      :style="charMarginStyle"
                      @click="handleCharClick(charInfo.char)"
                      @mouseenter="setHoveredChar(charInfo.char)"
                      @mouseleave="clearHoveredChar"
                    >
                      {{ isCharRevealed(charInfo.char) ? charInfo.char : '' }}
                    </span>
                  </template>
                </h2>

                <!-- 文章正文 -->
                <div class="article-body-block">
                  <template v-for="(charInfo, idx) in contentChars" :key="`up-content-${idx}`">
                    <br v-if="charInfo.char === '\n'" />
                    <span
                      v-else-if="charInfo.isSymbol"
                      class="char-symbol"
                      :style="charMarginStyle"
                    >{{ charInfo.char === ' ' ? '&nbsp;' : charInfo.char }}</span>
                    <span
                      v-else
                      class="char-block"
                      :class="{
                        hidden: !isCharRevealed(charInfo.char),
                        revealed: isCharRevealed(charInfo.char),
                        'is-hover-match': isMatchHover(charInfo.char)
                      }"
                      :style="charMarginStyle"
                      @click="handleCharClick(charInfo.char)"
                      @mouseenter="setHoveredChar(charInfo.char)"
                      @mouseleave="clearHoveredChar"
                    >
                      {{ isCharRevealed(charInfo.char) ? charInfo.char : '' }}
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </section>

          <!-- 2. 中间可拖拽分割条 -->
          <div
            class="resize-divider"
            @mousedown="startDividerDrag"
            title="上下拖动调整两部分的高度分配"
          >
            <div class="divider-line"></div>
            <div class="divider-handle">
              <span class="handle-dots">⋮⋮⋮</span>
              <span class="handle-text">拖动调节上下分栏高度 (呈现区: {{ upPartHeight }}px / 参考区: {{ downPartHeight }}px)</span>
              <span class="handle-dots">⋮⋮⋮</span>
            </div>
            <div class="divider-line"></div>
          </div>

          <!-- 3. 下半部分：参考区（上帝视角无遮罩明文，点击可触发揭示） -->
          <section
            class="box-part down-part"
            :style="{ height: `${downPartHeight}px`, fontSize: `${fontSize}px` }"
          >
            <div class="text-content-scroll" :style="textScrollStyle">
              <div class="text-inner-container" :class="{ 'is-v-centered': isVerticalCenter }">
                <!-- 文章标题 -->
                <h2 class="article-title-block">
                  <template v-for="(charInfo, idx) in titleChars" :key="`down-title-${idx}`">
                    <br v-if="charInfo.char === '\n'" />
                    <span
                      v-else-if="charInfo.isSymbol"
                      class="char-symbol"
                      :style="charMarginStyle"
                    >{{ charInfo.char === ' ' ? '&nbsp;' : charInfo.char }}</span>
                    <span
                      v-else
                      class="god-char-block"
                      :class="{
                        'is-revealed': isCharRevealed(charInfo.char),
                        'is-hidden': !isCharRevealed(charInfo.char),
                        'is-hover-match': isMatchHover(charInfo.char)
                      }"
                      :style="charMarginStyle"
                      @click="handleCharClick(charInfo.char)"
                      @mouseenter="setHoveredChar(charInfo.char)"
                      @mouseleave="clearHoveredChar"
                    >
                      {{ charInfo.char }}
                    </span>
                  </template>
                </h2>

                <!-- 文章正文 -->
                <div class="article-body-block">
                  <template v-for="(charInfo, idx) in contentChars" :key="`down-content-${idx}`">
                    <br v-if="charInfo.char === '\n'" />
                    <span
                      v-else-if="charInfo.isSymbol"
                      class="char-symbol"
                      :style="charMarginStyle"
                    >{{ charInfo.char === ' ' ? '&nbsp;' : charInfo.char }}</span>
                    <span
                      v-else
                      class="god-char-block"
                      :class="{
                        'is-revealed': isCharRevealed(charInfo.char),
                        'is-hidden': !isCharRevealed(charInfo.char),
                        'is-hover-match': isMatchHover(charInfo.char)
                      }"
                      :style="charMarginStyle"
                      @click="handleCharClick(charInfo.char)"
                      @mouseenter="setHoveredChar(charInfo.char)"
                      @mouseleave="clearHoveredChar"
                    >
                      {{ charInfo.char }}
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </section>

          <!-- 4. 底部视窗总高度调节手柄 -->
          <div
            class="box-bottom-resizer"
            @mousedown="startBoxResizeDrag"
            title="上下拖拽调整整个1920px模拟视窗总高度"
          >
            <div class="resizer-bar"></div>
          </div>
        </div>
      </div>
    </main>

    <!-- 简易浮动提示通知 -->
    <transition name="fade">
      <div v-if="notification.show" class="notification-toast" :class="notification.type">
        {{ notification.message }}
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { isSymbol, processText } from '@/utils/textProcessor'
import { CharInfo } from '@/types/game'
import questionBoarderSvg from '@/assets/question-boarder.svg'

export default defineComponent({
  name: 'GodModeView',
  setup() {
    // 默认示例文章
    const sampleTitle = '地力'
    const sampleContent =
      '地力是指一个人所持有的基本实力。在音乐游戏中，这个词被广泛使用，特别是在IIDX中。虽然有多种解读方式，但核心还是指向一个人的实力水平。地力主要衡量一个人处理复杂谱面的能力，地力越强，处理复杂谱面的能力就越强。'

    const fileInputRef = ref<HTMLInputElement | null>(null)
    const stageWrapperRef = ref<HTMLElement | null>(null)
    const screenBoxRef = ref<HTMLElement | null>(null)

    const isDragOver = ref(false)
    const currentFileName = ref('')
    const titleText = ref('')
    const contentText = ref('')
    const titleChars = ref<CharInfo[]>([])
    const contentChars = ref<CharInfo[]>([])

    // 题目边框与录屏指示器配置
    const showBoarder = ref(true)
    const hideIndicators = ref(false)

    // 已揭示的字符集合（统一转小写规范匹配，英文字母大小写全解，中文字符直接匹配）
    const revealedCharSet = ref<Set<string>>(new Set())

    // 悬浮字符高亮追踪
    const hoveredChar = ref<string | null>(null)

    // 点击模式: 'toggle' (切换) 或 'reveal' (仅揭示)
    const clickMode = ref<'toggle' | 'reveal'>('toggle')

    // 撤销/重做栈（保存每次操作后的 Set 序列化数组）
    const historyStack = ref<string[][]>([])
    const historyIndex = ref(-1)

    // 样式与排版配置
    const theme = ref<'theme-light' | 'theme-dark' | 'theme-green' | 'theme-blue' | 'theme-transparent'>('theme-light')
    const fontSize = ref(22)
    const charMargin = ref(2)
    const isVerticalCenter = ref(true)
    const textAlign = ref<'left' | 'center'>('left')

    // 视窗尺寸配置：固定宽度 1920px，默认模拟半高 540px (1080 / 2)
    const DIVIDER_HEIGHT = 16
    const boxHeight = ref(540)
    const upPartHeight = ref(260)
    const downPartHeight = ref(264)
    const isAutoHeight = ref(false)

    const isNativeBoarderHeight = computed(() => {
      return upPartHeight.value === 500 && showBoarder.value
    })

    const setBoarderNativeSize = () => {
      showBoarder.value = true
      isAutoHeight.value = false
      upPartHeight.value = 500
      downPartHeight.value = 280
      boxHeight.value = 500 + 280 + DIVIDER_HEIGHT
      showToast('已调整为题目边框原生高度 (呈现区 1920x500)')
    }

    // 缩放模式与自适应缩放计算
    const zoomMode = ref<'fit' | '100' | '75' | '50'>('fit')
    const fitScale = ref(1)

    // 拖拽调整状态
    const isDraggingDivider = ref(false)
    const isDraggingBoxBottom = ref(false)
    let dragStartY = 0
    let initialUpHeight = 0
    let initialBoxHeight = 0

    // 通知提示
    const notification = reactive({
      show: false,
      message: '',
      type: 'info' as 'info' | 'success' | 'warning'
    })

    const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
      notification.message = message
      notification.type = type
      notification.show = true
      setTimeout(() => {
        notification.show = false
      }, 2500)
    }

    // 字符 Key 标准化
    const getCharKey = (char: string): string => {
      return char.toLowerCase()
    }

    // 判断字符是否已揭示
    const isCharRevealed = (char: string): boolean => {
      if (isSymbol(char)) return true
      return revealedCharSet.value.has(getCharKey(char))
    }

    // 判断当前字符是否与鼠标悬停的字符相同（用于全篇高亮对照）
    const isMatchHover = (char: string): boolean => {
      if (!hoveredChar.value || isSymbol(char)) return false
      return getCharKey(char) === hoveredChar.value
    }

    const setHoveredChar = (char: string) => {
      if (!isSymbol(char)) {
        hoveredChar.value = getCharKey(char)
      }
    }

    const clearHoveredChar = () => {
      hoveredChar.value = null
    }

    // 统计相关计算
    const allChars = computed(() => [...titleChars.value, ...contentChars.value])

    const nonSymbolChars = computed(() => {
      return allChars.value.filter(c => !isSymbol(c.char))
    })

    const totalNonSymbolCount = computed(() => nonSymbolChars.value.length)

    const revealedNonSymbolCount = computed(() => {
      return nonSymbolChars.value.filter(c => isCharRevealed(c.char)).length
    })

    const revealProgress = computed(() => {
      if (totalNonSymbolCount.value === 0) return 0
      return Math.round((revealedNonSymbolCount.value / totalNonSymbolCount.value) * 100)
    })

    const uniqueCharSet = computed(() => {
      const s = new Set<string>()
      nonSymbolChars.value.forEach(c => s.add(getCharKey(c.char)))
      return s
    })

    const uniqueCharCount = computed(() => uniqueCharSet.value.size)

    const uniqueRevealedCount = computed(() => {
      let count = 0
      uniqueCharSet.value.forEach(k => {
        if (revealedCharSet.value.has(k)) count++
      })
      return count
    })

    // 历史栈记录
    const saveStateToHistory = () => {
      const currentList = Array.from(revealedCharSet.value)
      if (historyIndex.value < historyStack.value.length - 1) {
        historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
      }
      historyStack.value.push(currentList)
      historyIndex.value = historyStack.value.length - 1
    }

    const undo = () => {
      if (historyIndex.value > 0) {
        historyIndex.value--
        revealedCharSet.value = new Set(historyStack.value[historyIndex.value])
        showToast('已撤销上一步操作')
      }
    }

    const redo = () => {
      if (historyIndex.value < historyStack.value.length - 1) {
        historyIndex.value++
        revealedCharSet.value = new Set(historyStack.value[historyIndex.value])
        showToast('已恢复操作')
      }
    }

    // 文本解析载入
    const loadText = (text: string, filename = '') => {
      const lines = text.split(/\r?\n/).map(l => l.trimEnd())
      if (lines.length === 0 || !lines.some(l => l.trim())) {
        showToast('上传文件内容为空', 'warning')
        return
      }

      titleText.value = lines[0].trim()
      contentText.value = lines.length > 1 ? lines.slice(1).join('\n').trim() : ''
      currentFileName.value = filename

      titleChars.value = processText(titleText.value)
      contentChars.value = processText(contentText.value)

      // 重置揭示状态与历史
      revealedCharSet.value.clear()
      historyStack.value = [[]]
      historyIndex.value = 0

      // 缓存到 sessionStorage
      try {
        sessionStorage.setItem('godMode_text', text)
        sessionStorage.setItem('godMode_fileName', filename)
      } catch (e) {
        // ignore
      }

      showToast(`已加载文章：${titleText.value}`, 'success')
    }

    // 载入示例
    const loadSampleText = () => {
      loadText(`${sampleTitle}\n${sampleContent}`, '示例.txt')
    }

    // 字符点击处理
    const handleCharClick = (char: string) => {
      if (isSymbol(char)) return

      const key = getCharKey(char)
      const isAlreadyRevealed = revealedCharSet.value.has(key)

      if (clickMode.value === 'toggle') {
        if (isAlreadyRevealed) {
          revealedCharSet.value.delete(key)
          showToast(`已隐藏字符: "${char}"`)
        } else {
          revealedCharSet.value.add(key)
          showToast(`已揭示字符: "${char}"`)
        }
      } else {
        if (!isAlreadyRevealed) {
          revealedCharSet.value.add(key)
          showToast(`已揭示字符: "${char}"`)
        }
      }

      saveStateToHistory()
    }

    // 批量操作
    const revealAll = () => {
      uniqueCharSet.value.forEach(k => revealedCharSet.value.add(k))
      saveStateToHistory()
      showToast('已全部揭示', 'success')
    }

    const hideAll = () => {
      revealedCharSet.value.clear()
      saveStateToHistory()
      showToast('已全部隐藏')
    }

    // 文件上传处理
    const triggerFileInput = () => {
      fileInputRef.value?.click()
    }

    const handleFileSelect = (e: Event) => {
      const target = e.target as HTMLInputElement
      if (target.files && target.files.length > 0) {
        processUploadedFile(target.files[0])
      }
    }

    const handleDrop = (e: DragEvent) => {
      isDragOver.value = false
      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        processUploadedFile(files[0])
      }
    }

    const processUploadedFile = (file: File) => {
      if (!file.name.endsWith('.txt')) {
        showToast('请上传 .txt 格式的文本文件', 'warning')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        loadText(text, file.name)
      }
      reader.readAsText(file, 'UTF-8')
    }

    // 视窗高度设置
    const setBoxHeight = (h: number) => {
      isAutoHeight.value = false
      boxHeight.value = h
      const half = Math.floor((h - DIVIDER_HEIGHT) / 2)
      upPartHeight.value = half
      downPartHeight.value = h - DIVIDER_HEIGHT - half
      showToast(`已将总高度设置为 ${h}px`)
    }

    const toggleAutoHeight = () => {
      isAutoHeight.value = !isAutoHeight.value
      if (isAutoHeight.value) {
        showToast('已开启自适应内容高度模式')
      } else {
        setBoxHeight(540)
      }
    }

    const onBoxHeightInputChange = (e: Event) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10)
      if (!isNaN(val) && val >= 200) {
        setBoxHeight(val)
      }
    }

    const onUpHeightInputChange = (e: Event) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10)
      if (!isNaN(val) && val >= 60) {
        upPartHeight.value = val
        if (!isAutoHeight.value) {
          downPartHeight.value = Math.max(60, boxHeight.value - DIVIDER_HEIGHT - val)
        } else {
          boxHeight.value = upPartHeight.value + downPartHeight.value + DIVIDER_HEIGHT
        }
      }
    }

    const onDownHeightInputChange = (e: Event) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10)
      if (!isNaN(val) && val >= 60) {
        downPartHeight.value = val
        if (!isAutoHeight.value) {
          upPartHeight.value = Math.max(60, boxHeight.value - DIVIDER_HEIGHT - val)
        } else {
          boxHeight.value = upPartHeight.value + downPartHeight.value + DIVIDER_HEIGHT
        }
      }
    }

    // 缩放计算
    const updateFitScale = () => {
      if (!stageWrapperRef.value) return
      const availableWidth = stageWrapperRef.value.clientWidth - 48
      if (availableWidth > 0 && availableWidth < 1920) {
        fitScale.value = Math.max(0.2, Number((availableWidth / 1920).toFixed(4)))
      } else {
        fitScale.value = 1
      }
    }

    const currentScale = computed(() => {
      if (zoomMode.value === '100') return 1
      if (zoomMode.value === '75') return 0.75
      if (zoomMode.value === '50') return 0.5
      return fitScale.value
    })

    const scalerContainerStyle = computed(() => {
      const scale = currentScale.value
      const scaledHeight = (isAutoHeight.value ? 'auto' : `${Math.round(boxHeight.value * scale)}px`)
      return {
        width: `${Math.round(1920 * scale)}px`,
        height: scaledHeight
      }
    })

    const screenBoxStyle = computed(() => {
      const scale = currentScale.value
      return {
        width: '1920px',
        height: isAutoHeight.value ? 'auto' : `${boxHeight.value}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left'
      }
    })

    const charMarginStyle = computed(() => ({
      margin: `0 ${charMargin.value}px`
    }))

    const textScrollStyle = computed(() => ({
      overflowY: isAutoHeight.value ? 'visible' : ('auto' as const),
      textAlign: textAlign.value
    }))

    // 拖拽调整分割线 (Divider Dragging)
    const startDividerDrag = (e: MouseEvent) => {
      isDraggingDivider.value = true
      dragStartY = e.clientY
      initialUpHeight = upPartHeight.value

      window.addEventListener('mousemove', handleDividerMouseMove)
      window.addEventListener('mouseup', stopDividerDrag)
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'row-resize'
    }

    const handleDividerMouseMove = (e: MouseEvent) => {
      if (!isDraggingDivider.value) return
      const deltaY = (e.clientY - dragStartY) / currentScale.value
      const minH = 60
      const totalAvailable = isAutoHeight.value
        ? upPartHeight.value + downPartHeight.value
        : boxHeight.value - DIVIDER_HEIGHT

      const newUp = Math.round(Math.max(minH, Math.min(totalAvailable - minH, initialUpHeight + deltaY)))
      upPartHeight.value = newUp
      downPartHeight.value = totalAvailable - newUp
    }

    const stopDividerDrag = () => {
      isDraggingDivider.value = false
      window.removeEventListener('mousemove', handleDividerMouseMove)
      window.removeEventListener('mouseup', stopDividerDrag)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    // 拖拽调整视窗底边总高度 (Box Bottom Resizer Dragging)
    const startBoxResizeDrag = (e: MouseEvent) => {
      isDraggingBoxBottom.value = true
      dragStartY = e.clientY
      initialBoxHeight = boxHeight.value

      window.addEventListener('mousemove', handleBoxResizeMouseMove)
      window.addEventListener('mouseup', stopBoxResizeDrag)
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'ns-resize'
    }

    const handleBoxResizeMouseMove = (e: MouseEvent) => {
      if (!isDraggingBoxBottom.value) return
      const deltaY = (e.clientY - dragStartY) / currentScale.value
      const newHeight = Math.round(Math.max(200, Math.min(3000, initialBoxHeight + deltaY)))
      const diff = newHeight - boxHeight.value
      boxHeight.value = newHeight
      downPartHeight.value = Math.max(60, downPartHeight.value + diff)
    }

    const stopBoxResizeDrag = () => {
      isDraggingBoxBottom.value = false
      window.removeEventListener('mousemove', handleBoxResizeMouseMove)
      window.removeEventListener('mouseup', stopBoxResizeDrag)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    // 键盘快捷键监听 (Ctrl+Z / Ctrl+Y)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        e.preventDefault()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo()
        e.preventDefault()
      }
    }

    onMounted(() => {
      // 检查之前是否有缓存文本
      const cachedText = sessionStorage.getItem('godMode_text')
      const cachedFileName = sessionStorage.getItem('godMode_fileName')
      if (cachedText) {
        loadText(cachedText, cachedFileName || '缓存文本.txt')
      } else {
        loadSampleText()
      }

      updateFitScale()
      window.addEventListener('resize', updateFitScale)
      window.addEventListener('keydown', handleKeyDown)
    })

    onUnmounted(() => {
      window.removeEventListener('resize', updateFitScale)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousemove', handleDividerMouseMove)
      window.removeEventListener('mouseup', stopDividerDrag)
      window.removeEventListener('mousemove', handleBoxResizeMouseMove)
      window.removeEventListener('mouseup', stopBoxResizeDrag)
    })

    return {
      fileInputRef,
      stageWrapperRef,
      screenBoxRef,
      isDragOver,
      currentFileName,
      titleText,
      contentText,
      titleChars,
      contentChars,
      hoveredChar,
      clickMode,
      theme,
      fontSize,
      charMargin,
      isVerticalCenter,
      textAlign,
      boxHeight,
      upPartHeight,
      downPartHeight,
      isAutoHeight,
      zoomMode,
      currentScale,
      scalerContainerStyle,
      screenBoxStyle,
      charMarginStyle,
      textScrollStyle,
      isDraggingDivider,
      isDraggingBoxBottom,
      notification,
      historyStack,
      historyIndex,
      totalNonSymbolCount,
      revealedNonSymbolCount,
      revealProgress,
      uniqueCharCount,
      uniqueRevealedCount,
      isCharRevealed,
      isMatchHover,
      setHoveredChar,
      clearHoveredChar,
      triggerFileInput,
      handleFileSelect,
      handleDrop,
      loadSampleText,
      handleCharClick,
      revealAll,
      hideAll,
      undo,
      redo,
      showBoarder,
      hideIndicators,
      questionBoarderSvg,
      isNativeBoarderHeight,
      setBoarderNativeSize,
      setBoxHeight,
      toggleAutoHeight,
      onBoxHeightInputChange,
      onUpHeightInputChange,
      onDownHeightInputChange,
      startDividerDrag,
      startBoxResizeDrag
    }
  }
})
</script>

<style scoped>
/* 全局基础设置 */
.god-mode-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background-color: #1e1e24;
  color: #e2e8f0;
  overflow: hidden;
  font-family: 'Noto Sans SC', sans-serif;
  user-select: none;
}

.god-mode-view.is-dragging {
  cursor: row-resize !important;
}

/* 顶部综合控制台 */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background-color: #252836;
  border-bottom: 1px solid #3b3e52;
  flex-shrink: 0;
  gap: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.bar-left, .bar-center, .bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-tag {
  background: linear-gradient(135deg, #ff4757, #ff6b81);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.title-group h1 {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  white-space: nowrap;
}

.upload-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name-tag {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  background-color: #1a1d29;
  color: #60a5fa;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #3b4261;
}

/* 统计药丸 */
.stats-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: #1a1d29;
  border: 1px solid #3b4261;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  color: #cbd5e1;
  white-space: nowrap;
}

.stats-pill strong {
  color: #38bdf8;
  font-weight: 700;
}

.stats-percent {
  color: #10b981;
  font-weight: 700;
}

.stats-divider {
  color: #475569;
}

/* 按钮基础 */
.btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
}

.btn-primary {
  background-color: #3b82f6;
  color: #ffffff;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-outline {
  background-color: transparent;
  border-color: #4b5563;
  color: #d1d5db;
}

.btn-outline:hover {
  background-color: #374151;
  color: #ffffff;
}

.btn-action {
  background-color: #334155;
  color: #e2e8f0;
  border-color: #475569;
}

.btn-action:hover:not(:disabled) {
  background-color: #475569;
  color: #ffffff;
}

.btn-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.btn-xs {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 4px;
  background-color: #334155;
  color: #cbd5e1;
  border: 1px solid #475569;
  cursor: pointer;
}

.btn-xs.active {
  background-color: #2563eb;
  color: #ffffff;
  border-color: #3b82f6;
}

.preset-group, .theme-picker, .zoom-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
}

select {
  background-color: #1a1d29;
  color: #e2e8f0;
  border: 1px solid #3b4261;
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 12px;
  outline: none;
}

.nav-link-btn {
  color: #94a3b8;
  font-size: 12px;
  text-decoration: none;
  padding: 4px 8px;
  border: 1px dashed #4b5563;
  border-radius: 4px;
  transition: all 0.2s;
  white-space: nowrap;
}

.nav-link-btn:hover {
  color: #ffffff;
  border-color: #60a5fa;
  background-color: #1e293b;
}

/* 次级微调工具栏 */
.sub-toolbar {
  display: flex;
  align-items: center;
  padding: 6px 20px;
  background-color: #1b1d26;
  border-bottom: 1px solid #2d3142;
  font-size: 12px;
  gap: 18px;
  flex-shrink: 0;
  overflow-x: auto;
}

.sub-item {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  color: #94a3b8;
}

.sub-item label {
  color: #cbd5e1;
}

.range-val {
  min-width: 32px;
  color: #38bdf8;
  font-family: monospace;
}

.num-input {
  width: 58px;
  padding: 2px 4px;
  background-color: #252836;
  border: 1px solid #3b4261;
  border-radius: 4px;
  color: #ffffff;
  font-size: 12px;
  text-align: center;
}

.unit {
  color: #64748b;
  font-size: 11px;
}

.toggle-action-btn {
  padding: 3px 10px;
}

.sub-item-right {
  margin-left: auto;
}

.dim-hint {
  color: #64748b;
  font-size: 11px;
}

/* 舞台视口滚动容器 */
.stage-viewport {
  flex: 1;
  overflow: auto;
  position: relative;
  background-color: #0f1015;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 20px;
}

/* 拖拽上传覆盖层 */
.drag-drop-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  backdrop-filter: blur(4px);
}

.drag-drop-box {
  padding: 40px 60px;
  border: 2px dashed #38bdf8;
  border-radius: 12px;
  text-align: center;
  color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.05);
}

.drag-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

/* 缩放外壳包装器 */
.stage-scaler-container {
  position: relative;
  flex-shrink: 0;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
}

/* 1080p 模拟视窗主体 (固定 1920px 宽) */
.screen-box-1080p {
  width: 1920px;
  min-width: 1920px;
  max-width: 1920px;
  display: flex;
  flex-direction: column;
  position: relative;
  border: 2px solid #3b4261;
  border-radius: 6px;
  background-color: #ffffff;
  overflow: hidden;
  box-sizing: border-box;
}

/* 呈现区与参考区共用样式 */
.box-part {
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}

/* 外部状态指示条 (位于 1080p 屏幕外，绝不挤占视窗内部空间) */
.screen-outer-indicator-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 1920px;
  margin-bottom: 8px;
  user-select: none;
  box-sizing: border-box;
}

.outer-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  background-color: #1e293b;
  color: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
}

.outer-pill.tag-game {
  border-left: 4px solid #3b82f6;
}

.outer-pill.tag-god {
  border-left: 4px solid #8b5cf6;
}

.outer-pill .pill-badge {
  font-weight: 700;
}

.outer-pill .pill-info {
  color: #94a3b8;
  font-family: monospace;
}

/* 文本滚动与排版区域 */
.text-content-scroll {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 48px;
  line-height: 1.8;
  letter-spacing: 0.06em;
  box-sizing: border-box;
  min-height: 0;
}

/* 题目外框图层 (Question Boarder SVG Layer) */
.question-boarder-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

.boarder-svg-img {
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
}

.box-part.up-part {
  position: relative;
}

.box-part.up-part .text-content-scroll {
  position: relative;
  z-index: 5;
}

/* 带有边框时的内边距，对称紧凑贴合 SVG 装饰内框 */
.text-content-scroll.with-boarder {
  padding: 24px 64px;
}

/* 内部文字容器：垂直居中支撑 */
.text-inner-container {
  width: 100%;
  box-sizing: border-box;
}

.text-inner-container.is-v-centered {
  margin-top: auto;
  margin-bottom: auto;
}

.up-part.has-boarder {
  background-color: transparent !important;
}

.up-part.has-boarder .article-title-block {
  margin-top: 0;
  margin-block-start: 0;
  border-bottom: none;
  color: #2b080b;
}

.up-part.has-boarder .article-body-block {
  color: #2b080b;
}

.up-part.has-boarder .char-block.hidden {
  background-color: #221215;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}

.up-part.has-boarder .char-block.hidden:hover {
  background-color: #4a1f26;
}

.up-part.has-boarder .char-block.revealed {
  color: #221215;
}

.article-title-block {
  margin-top: 0;
  margin-block-start: 0;
  font-size: 1.35em;
  font-weight: 700;
  margin-bottom: 8px;
  padding-bottom: 0;
  border-bottom: none;
  display: block;
  line-height: 1.4;
  text-align: inherit;
}

.article-body-block {
  font-size: 1em;
  line-height: 1.9;
  display: block;
  text-align: inherit;
}

/* 标点符号 */
.char-symbol {
  display: inline-block;
  vertical-align: middle;
}

/* 呈现区字符方块 (Black Square Mask) */
.char-block {
  display: inline-block;
  width: 1.25em;
  height: 1.25em;
  line-height: 1.25;
  text-align: center;
  vertical-align: middle;
  cursor: pointer;
  border-radius: 2px;
  transition: transform 0.15s, box-shadow 0.15s;
  position: relative;
  font-weight: 700;
  box-sizing: border-box;
}

.char-block.hidden {
  background-color: #1e1e1e;
  color: transparent;
}

.char-block.hidden:hover {
  background-color: #4a4a4a;
  transform: scale(1.1);
}

.char-block.revealed {
  background-color: transparent;
  color: #1e1e1e;
  animation: flipReveal 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.char-block.revealed:hover {
  transform: scale(1.1);
  opacity: 0.8;
}

/* 上帝视角参考区字符 (God Char Block) */
.god-char-block {
  display: inline-block;
  width: 1.25em;
  height: 1.25em;
  line-height: 1.25;
  text-align: center;
  vertical-align: middle;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.15s ease;
  position: relative;
  box-sizing: border-box;
}

/* 参考区未揭示字符：柔和底色，字体清晰可见 */
.god-char-block.is-hidden {
  background-color: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
}

.god-char-block.is-hidden:hover {
  background-color: #e2e8f0;
  color: #1e293b;
  transform: scale(1.1);
}

/* 参考区已揭示字符：高亮绿/蓝显示 */
.god-char-block.is-revealed {
  background-color: #e0f2fe;
  color: #0284c7;
  font-weight: 700;
  border: 1px solid #7dd3fc;
  box-shadow: 0 1px 3px rgba(2, 132, 199, 0.15);
}

.god-char-block.is-revealed:hover {
  background-color: #bae6fd;
  transform: scale(1.1);
}

/* 悬停匹配全篇高亮 (金色光晕) */
.char-block.is-hover-match,
.god-char-block.is-hover-match {
  outline: 2px solid #f59e0b !important;
  outline-offset: 1px !important;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.7) !important;
  z-index: 50 !important;
  transform: scale(1.12) !important;
}

/* 中间可拖拽分割条 */
.resize-divider {
  height: 16px;
  background-color: #1e293b;
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  user-select: none;
  transition: background-color 0.2s;
  border-top: 1px solid #334155;
  border-bottom: 1px solid #334155;
  position: relative;
  z-index: 60;
}

.resize-divider:hover {
  background-color: #3b82f6;
}

.resize-divider:hover .handle-text,
.resize-divider:hover .handle-dots {
  color: #ffffff;
}

.divider-line {
  flex: 1;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.15);
  margin: 0 12px;
}

.divider-handle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.handle-dots {
  color: #94a3b8;
  font-size: 12px;
  letter-spacing: -2px;
}

.handle-text {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
  letter-spacing: 0.05em;
}

/* 底部总高调节手柄 */
.box-bottom-resizer {
  height: 14px;
  background-color: #0f172a;
  cursor: ns-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-top: 1px solid #334155;
  transition: background-color 0.2s;
  z-index: 60;
}

.box-bottom-resizer:hover {
  background-color: #2563eb;
}

.resizer-bar {
  width: 60px;
  height: 4px;
  border-radius: 2px;
  background-color: #475569;
}

.box-bottom-resizer:hover .resizer-bar {
  background-color: #ffffff;
}

/* ==================== 录屏主题定制 ==================== */

/* 1. 经典白底 (Light) */
.god-mode-view.theme-light .screen-box-1080p {
  background-color: #ffffff;
}
.god-mode-view.theme-light .up-part {
  background-color: #ffffff;
  color: #1e1e1e;
}
.god-mode-view.theme-light .down-part {
  background-color: #f8fafc;
  color: #334155;
  border-top: 1px solid #e2e8f0;
}

/* 2. 暗黑模式 (Dark) */
.god-mode-view.theme-dark .screen-box-1080p {
  background-color: #121216;
  border-color: #2a2a36;
}
.god-mode-view.theme-dark .up-part {
  background-color: #121216;
  color: #f1f5f9;
}
.god-mode-view.theme-dark .up-part .char-block.hidden {
  background-color: #2d2d38;
}
.god-mode-view.theme-dark .up-part .char-block.hidden:hover {
  background-color: #3f3f4e;
}
.god-mode-view.theme-dark .up-part .char-block.revealed {
  color: #f8fafc;
}
.god-mode-view.theme-dark .down-part {
  background-color: #181820;
  color: #e2e8f0;
  border-top: 1px solid #2a2a36;
}
.god-mode-view.theme-dark .down-part .god-char-block.is-hidden {
  background-color: #242430;
  color: #94a3b8;
  border-color: #333344;
}
.god-mode-view.theme-dark .down-part .god-char-block.is-revealed {
  background-color: #0369a1;
  color: #ffffff;
  border-color: #38bdf8;
}

/* 3. 绿幕抠像模式 (Chroma Green) */
.god-mode-view.theme-green .up-part {
  background-color: #00ff00 !important;
  color: #000000;
}
.god-mode-view.theme-green .up-part .char-block.hidden {
  background-color: #000000;
}
.god-mode-view.theme-green .up-part .char-block.revealed {
  color: #000000;
}
.god-mode-view.theme-green .down-part {
  background-color: #f8fafc;
  color: #1e293b;
}

/* 4. 蓝幕抠像模式 (Chroma Blue) */
.god-mode-view.theme-blue .up-part {
  background-color: #0000ff !important;
  color: #ffffff;
}
.god-mode-view.theme-blue .up-part .char-block.hidden {
  background-color: #ffffff;
}
.god-mode-view.theme-blue .up-part .char-block.revealed {
  color: #ffffff;
}
.god-mode-view.theme-blue .down-part {
  background-color: #f8fafc;
  color: #1e293b;
}

/* 5. 透明背景模式 (Transparent) */
.god-mode-view.theme-transparent .screen-box-1080p {
  background-color: transparent;
}
.god-mode-view.theme-transparent .up-part {
  background-color: transparent !important;
  color: #1e1e1e;
}
.god-mode-view.theme-transparent .down-part {
  background-color: #ffffff;
  color: #1e293b;
}

/* 翻转揭示动画 */
@keyframes flipReveal {
  0% {
    transform: rotateY(90deg);
    opacity: 0.3;
  }
  100% {
    transform: rotateY(0deg);
    opacity: 1;
  }
}

/* 浮动提示通知 */
.notification-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 10px 18px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  z-index: 1000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.notification-toast.info {
  background-color: #2563eb;
}

.notification-toast.success {
  background-color: #059669;
}

.notification-toast.warning {
  background-color: #d97706;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>

<template>
  <div class="god-mode-view" :class="[theme]">
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
            :class="{ active: boxHeight === 350 && !isAutoHeight }"
            @click="setBoxHeight(350)"
            title="默认高度 (1920x350)"
          >
            350p默认
          </button>
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
            title="题目边框原生高度 (1920x500)"
          >
            500p边框原生
          </button>
          <button
            class="btn btn-xs"
            :class="{ active: boxHeight === 700 }"
            @click="setBoxHeight(700)"
            title="大屏高度 (1920x700)"
          >
            700p大屏
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
        <label>标题字号:</label>
        <input
          type="number"
          class="num-input"
          min="12"
          max="120"
          step="1"
          v-model.number="titleFontSize"
        />
        <span class="unit">px</span>
      </div>

      <div class="sub-item">
        <label>正文字号:</label>
        <input
          type="number"
          class="num-input"
          min="12"
          max="100"
          step="1"
          v-model.number="bodyFontSize"
        />
        <span class="unit">px</span>
      </div>

      <div class="sub-item">
        <label>字块间距:</label>
        <input
          type="number"
          class="num-input"
          min="0"
          max="20"
          step="1"
          v-model.number="charMargin"
        />
        <span class="unit">px</span>
      </div>

      <div class="sub-item">
        <label>视窗高度:</label>
        <input
          type="number"
          class="num-input"
          min="200"
          max="3000"
          step="10"
          v-model.number="boxHeight"
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
          💡 提示：在【呈现区黑方块】或【参考区明文】上点击任意字符，均可同步揭示/隐藏全部相同字符。
        </span>
      </div>
    </div>

    <!-- 点开顺序序列工具栏 (Sequence Recording & Export Bar) -->
    <div class="sequence-toolbar">
      <div class="seq-left">
        <span class="seq-title">
          🎬 点开顺序序列 <span class="seq-badge">{{ clickSequence.length }} 步</span>
        </span>
        <button
          class="btn btn-xs seq-record-btn"
          :class="{ active: isRecordingSequence }"
          @click="toggleRecording"
          :title="isRecordingSequence ? '点击暂停录制点击顺序 (快捷键: 空格 或 R)' : '点击恢复录制点击顺序 (快捷键: 空格 或 R)'"
        >
          <span class="record-dot" :class="{ pulsating: isRecordingSequence }">●</span>
          {{ isRecordingSequence ? '正在录制 (空格/R)' : '录制已暂停 (空格/R)' }}
        </button>
      </div>

      <!-- 步骤序列水平滚动标签 -->
      <div class="seq-scroll-container">
        <div v-if="clickSequence.length === 0" class="seq-empty-tip">
          👆 点击黑方块或参考区明文，将按点击顺序自动记录步骤序列，可一键批量导出 1920p 图片
        </div>
        <div
          v-for="(step, idx) in clickSequence"
          :key="step.id"
          class="seq-step-item"
          :class="{ active: currentPreviewStepIndex === idx }"
          @click="previewStep(idx)"
          @mouseenter="setHoveredChar(step.char)"
          @mouseleave="clearHoveredChar"
          :title="`第 ${step.order} 步：点开【${step.char}】(出现 ${step.count} 次) - 点击可预览此画面`"
        >
          <span class="step-num">{{ String(step.order).padStart(2, '0') }}</span>
          <span class="step-char">{{ step.char }}</span>
          <span class="step-count">x{{ step.count }}</span>
          <span class="step-delete" @click.stop="removeStep(idx)" title="移除此步">×</span>
        </div>
      </div>

      <div class="seq-actions">
        <button
          class="btn btn-xs"
          :disabled="clickSequence.length === 0"
          @click="undoLastStep"
          title="撤回序列最后一步"
        >
          ↩️ 撤回一步
        </button>
        <button
          class="btn btn-xs"
          :disabled="clickSequence.length === 0"
          @click="clearSequence"
          title="清空全部记录的顺序"
        >
          🗑️ 清空序列
        </button>
        <button
          class="btn btn-xs btn-primary export-btn"
          :disabled="clickSequence.length === 0 || isExporting"
          @click="openExportModal"
          title="将当前点开顺序逐帧导出为 1920p 图片组"
        >
          📸 批量导出图片 ({{ clickSequence.length }} 张)
        </button>
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
        <div class="stage-scaler-inner" :style="scalerInnerStyle">
          <!-- 1. 呈现区指示条 (位于 1080p 屏幕外，绝不挤占视窗内部空间) -->
          <div v-if="!hideIndicators" class="screen-outer-indicator-bar">
            <div class="outer-pill tag-game">
              <span class="pill-badge">📺 视频呈现区 (Game View)</span>
              <span class="pill-info">宽: 1920px | 高: {{ isAutoHeight ? '自适应' : `${boxHeight}px` }} | 边框: {{ showBoarder ? '开启' : '关闭' }}</span>
            </div>
          </div>

          <!-- Box 1：呈现区（黑方块遮罩模式，模拟视频画面，独立 1920px 视窗） -->
          <div
            ref="upPartRef"
            class="screen-box-1080p up-part"
            :class="{ 'has-boarder': showBoarder }"
            :style="singleBoxStyle"
          >
            <!-- 题目边框装饰图层 (Question Boarder SVG) -->
            <div v-if="showBoarder" class="question-boarder-layer">
              <img :src="questionBoarderSvg" class="boarder-svg-img" alt="Question Border Frame" />
            </div>

            <div class="text-content-scroll" :class="{ 'with-boarder': showBoarder }" :style="textScrollStyle">
              <div class="text-inner-container" :class="{ 'is-v-centered': isVerticalCenter }">
                <!-- 文章标题 -->
                <h2 class="article-title-block" :style="titleStyle">
                  <template v-for="(charInfo, idx) in titleChars" :key="`up-title-${idx}`">
                    <br v-if="charInfo.char === '\n'" />
                    <span
                      v-else-if="charInfo.isSymbol"
                      class="char-symbol"
                      :class="{ 'is-slash': isSlashChar(charInfo.char) }"
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
                <div class="article-body-block" :style="bodyStyle">
                  <template v-for="(charInfo, idx) in contentChars" :key="`up-content-${idx}`">
                    <br v-if="charInfo.char === '\n'" />
                    <span
                      v-else-if="charInfo.isSymbol"
                      class="char-symbol"
                      :class="{ 'is-slash': isSlashChar(charInfo.char) }"
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
          </div>

          <!-- 两个 Box 之间留空 -->
          <div class="boxes-gap-spacer"></div>

          <!-- 2. 参考区指示条 -->
          <div v-if="!hideIndicators" class="screen-outer-indicator-bar">
            <div class="outer-pill tag-god">
              <span class="pill-badge">👑 上帝视角参考区 (God View)</span>
              <span class="pill-info">宽: 1920px | 高: {{ isAutoHeight ? '自适应' : `${boxHeight}px` }} | 点击任意明文揭示/隐藏</span>
            </div>
          </div>

          <!-- Box 2：参考区（上帝视角无遮罩明文，独立 1920px 视窗，与呈现区共享高度） -->
          <div
            class="screen-box-1080p down-part"
            :style="singleBoxStyle"
          >
            <div class="text-content-scroll" :style="textScrollStyle">
              <div class="text-inner-container" :class="{ 'is-v-centered': isVerticalCenter }">
                <!-- 文章标题 -->
                <h2 class="article-title-block" :style="titleStyle">
                  <template v-for="(charInfo, idx) in titleChars" :key="`down-title-${idx}`">
                    <br v-if="charInfo.char === '\n'" />
                    <span
                      v-else-if="charInfo.isSymbol"
                      class="char-symbol"
                      :class="{ 'is-slash': isSlashChar(charInfo.char) }"
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
                <div class="article-body-block" :style="bodyStyle">
                  <template v-for="(charInfo, idx) in contentChars" :key="`down-content-${idx}`">
                    <br v-if="charInfo.char === '\n'" />
                    <span
                      v-else-if="charInfo.isSymbol"
                      class="char-symbol"
                      :class="{ 'is-slash': isSlashChar(charInfo.char) }"
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

    <!-- 批量导出模态弹窗 (Export Modal) -->
    <div v-if="exportModalVisible" class="modal-overlay" @click.self="!isExporting && (exportModalVisible = false)">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>📸 批量导出“视频呈现区”1920p图片序列</h3>
          <button class="modal-close" :disabled="isExporting" @click="exportModalVisible = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="export-summary-box">
            <div class="summary-item">
              <span class="label">🎯 导出目标:</span>
              <span class="val">视频呈现区 (Game View)</span>
            </div>
            <div class="summary-item">
              <span class="label">📐 输出规格:</span>
              <span class="val font-bold">固定宽 1920px × 当前高 {{ isAutoHeight ? '自适应' : `${boxHeight}px` }}</span>
            </div>
            <div class="summary-item">
              <span class="label">📑 对应文章:</span>
              <span class="val font-bold">{{ titleText || '未命名文章' }}</span>
            </div>
            <div class="summary-item">
              <span class="label">🎞️ 导出总帧数:</span>
              <span class="val highlight">{{ clickSequence.length + (includeInitialFrame ? 1 : 0) }} 张图片</span>
            </div>
          </div>

          <div class="export-options">
            <label class="option-check">
              <input type="checkbox" v-model="includeInitialFrame" :disabled="isExporting" />
              <span>包含第 00 步（全遮罩未点开初始画面：<code>00_{{ titleText || '标题' }}_初始.png</code>）</span>
            </label>

            <div class="option-group">
              <label class="group-title">📦 下载方式:</label>
              <div class="radio-row">
                <label class="radio-label">
                  <input type="radio" :value="true" v-model="exportAsZip" :disabled="isExporting" />
                  <span>打包为 ZIP 压缩包 (推荐，单个文件收录所有命名图片)</span>
                </label>
                <label class="radio-label">
                  <input type="radio" :value="false" v-model="exportAsZip" :disabled="isExporting" />
                  <span>逐张直接下载 PNG 图片</span>
                </label>
              </div>
            </div>

            <div class="naming-preview-box">
              <span class="naming-title">📁 文件命名规则预览：</span>
              <ul class="naming-list">
                <li v-if="includeInitialFrame">
                  <span class="badge">00</span> 00_{{ titleText || '标题' }}_初始.png
                </li>
                <li v-for="(step, idx) in clickSequence.slice(0, 3)" :key="step.id">
                  <span class="badge">{{ String(idx + 1).padStart(2, '0') }}</span>
                  {{ String(idx + 1).padStart(2, '0') }}_{{ titleText || '标题' }}_{{ step.char }}.png
                </li>
                <li v-if="clickSequence.length > 3" class="more-steps">
                  ... 及后续 {{ clickSequence.length - 3 }} 张点开字符图片
                </li>
              </ul>
            </div>
          </div>

          <!-- 导出进度条展示 -->
          <div v-if="isExporting" class="export-progress-area">
            <div class="progress-bar-container">
              <div class="progress-bar-fill" :style="{ width: `${exportProgress}%` }"></div>
            </div>
            <div class="progress-status">
              <span class="spinner">⏳</span>
              <span class="status-text">{{ exportStatusText }}</span>
              <span class="percent">{{ exportProgress }}%</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn" :disabled="isExporting" @click="exportModalVisible = false">
            取消
          </button>
          <button
            class="btn btn-primary btn-lg"
            :disabled="isExporting || clickSequence.length === 0"
            @click="startExport"
          >
            {{ isExporting ? '正在生成并导出...' : '🚀 开始生成并导出' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { isSymbol, processText } from '@/utils/textProcessor'
import { CharInfo } from '@/types/game'
import questionBoarderSvg from '@/assets/question-boarder.svg'
import { toPng } from 'html-to-image'
import JSZip from 'jszip'

// 点开顺序步骤数据接口
export interface ClickSequenceStep {
  id: number
  order: number
  char: string
  revealedSnapshot: string[]
  count: number
}

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
    const upPartRef = ref<HTMLElement | null>(null)

    // 点开顺序序列追踪
    const clickSequence = ref<ClickSequenceStep[]>([])
    const isRecordingSequence = ref(true)
    const currentPreviewStepIndex = ref<number | null>(null)

    // 批量导出配置与状态
    const exportModalVisible = ref(false)
    const isExporting = ref(false)
    const exportProgress = ref(0)
    const exportStatusText = ref('')
    const includeInitialFrame = ref(true)
    const exportAsZip = ref(true)

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
    const titleFontSize = ref(45)
    const bodyFontSize = ref(30)
    const charMargin = ref(2)
    const isVerticalCenter = ref(true)
    const textAlign = ref<'left' | 'center'>('left')

    const titleStyle = computed(() => ({
      fontSize: `${titleFontSize.value}px`,
      fontWeight: 'bold' as const
    }))

    const bodyStyle = computed(() => ({
      fontSize: `${bodyFontSize.value}px`
    }))

    // 视窗尺寸配置：固定宽度 1920px，两个视窗共享高度，默认 350px
    const boxHeight = ref(350)
    const isAutoHeight = ref(false)

    const isNativeBoarderHeight = computed(() => {
      return boxHeight.value === 500 && showBoarder.value && !isAutoHeight.value
    })

    const setBoarderNativeSize = () => {
      showBoarder.value = true
      isAutoHeight.value = false
      boxHeight.value = 500
      showToast('已调整为题目边框原生高度 (1920x500)')
    }

    // 缩放模式与自适应缩放计算
    const zoomMode = ref<'fit' | '100' | '75' | '50'>('fit')
    const fitScale = ref(1)

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

    // 判断是否为斜杠字符（呈现为全宽方格样式）
    const isSlashChar = (char: string): boolean => {
      return char === '/' || char === '／' || char === '\\'
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

    // 文本解析载入（提前将所有大写字母转为小写）
    const loadText = (text: string, filename = '') => {
      const normalizedText = text.toLowerCase()
      const lines = normalizedText.split(/\r?\n/).map(l => l.trimEnd())
      if (lines.length === 0 || !lines.some(l => l.trim())) {
        showToast('上传文件内容为空', 'warning')
        return
      }

      titleText.value = lines[0].trim()
      contentText.value = lines.length > 1 ? lines.slice(1).join('\n').trim() : ''
      currentFileName.value = filename

      titleChars.value = processText(titleText.value)
      contentChars.value = processText(contentText.value)

      // 重置揭示状态与历史及序列
      revealedCharSet.value.clear()
      clickSequence.value = []
      currentPreviewStepIndex.value = null
      historyStack.value = [[]]
      historyIndex.value = 0

      // 缓存到 sessionStorage
      try {
        sessionStorage.setItem('godMode_text', normalizedText)
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

    // 记录点击步骤到序列
    const recordSequenceStep = (char: string) => {
      const key = getCharKey(char)
      const existing = clickSequence.value.find(s => getCharKey(s.char) === key)
      if (existing) {
        existing.revealedSnapshot = Array.from(revealedCharSet.value)
        return
      }

      const count = allChars.value.filter(c => getCharKey(c.char) === key).length
      clickSequence.value.push({
        id: Date.now() + Math.random(),
        order: clickSequence.value.length + 1,
        char,
        revealedSnapshot: Array.from(revealedCharSet.value),
        count
      })
    }

    // 撤回序列最后一步
    const undoLastStep = () => {
      if (clickSequence.value.length === 0) return
      const removed = clickSequence.value.pop()
      if (clickSequence.value.length === 0) {
        revealedCharSet.value.clear()
      } else {
        const lastStep = clickSequence.value[clickSequence.value.length - 1]
        revealedCharSet.value = new Set(lastStep.revealedSnapshot)
      }
      saveStateToHistory()
      showToast(`已撤回序列最后一步【${removed?.char}】`)
    }

    // 删除序列中的指定步骤
    const removeStep = (idx: number) => {
      if (idx < 0 || idx >= clickSequence.value.length) return
      const removed = clickSequence.value.splice(idx, 1)[0]
      clickSequence.value.forEach((s, i) => (s.order = i + 1))
      if (removed) {
        revealedCharSet.value.delete(getCharKey(removed.char))
      }
      saveStateToHistory()
      showToast(`已移除第 ${idx + 1} 步【${removed?.char}】`)
    }

    // 清空序列
    const clearSequence = () => {
      clickSequence.value = []
      currentPreviewStepIndex.value = null
      showToast('已清空点开顺序序列')
    }

    // 预览某一步骤状态
    const previewStep = (idx: number) => {
      if (idx < 0 || idx >= clickSequence.value.length) return
      const step = clickSequence.value[idx]
      revealedCharSet.value = new Set(step.revealedSnapshot)
      currentPreviewStepIndex.value = idx
      showToast(`正在预览第 ${step.order} 步画面（点开【${step.char}】）`)
    }

    // 字符点击处理
    const handleCharClick = (char: string) => {
      if (isSymbol(char)) return

      const key = getCharKey(char)
      const isAlreadyRevealed = revealedCharSet.value.has(key)

      if (clickMode.value === 'toggle') {
        if (isAlreadyRevealed) {
          revealedCharSet.value.delete(key)
          if (isRecordingSequence.value) {
            const idx = clickSequence.value.findIndex(s => getCharKey(s.char) === key)
            if (idx !== -1) {
              clickSequence.value.splice(idx, 1)
              clickSequence.value.forEach((s, i) => (s.order = i + 1))
            }
          }
          showToast(`已隐藏字符: "${char}"`)
        } else {
          revealedCharSet.value.add(key)
          if (isRecordingSequence.value) {
            recordSequenceStep(char)
          }
          showToast(`已揭示字符: "${char}"`)
        }
      } else {
        if (!isAlreadyRevealed) {
          revealedCharSet.value.add(key)
          if (isRecordingSequence.value) {
            recordSequenceStep(char)
          }
          showToast(`已揭示字符: "${char}"`)
        }
      }

      saveStateToHistory()
    }

    // 获取当前录屏主题对应的背景色
    const getThemeBackgroundColor = () => {
      switch (theme.value) {
        case 'theme-dark':
          return '#121216'
        case 'theme-green':
          return '#00ff00'
        case 'theme-blue':
          return '#0000ff'
        case 'theme-transparent':
          return undefined
        case 'theme-light':
        default:
          return '#ffffff'
      }
    }

    // 捕获呈现区 1920p 画面为 PNG Data URL
    const captureUpPartFrame = async (): Promise<string> => {
      if (!upPartRef.value) {
        throw new Error('未找到呈现区 DOM 元素')
      }

      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 80))

      const bg = getThemeBackgroundColor()
      // 当开启边框时，边框SVG应完整铺满整个画面，底色设为透明以杜绝任何底色白边漏出；若未开启边框，则填充对应录屏主题底色
      const canvasBg = showBoarder.value ? undefined : bg

      return await toPng(upPartRef.value, {
        width: 1920,
        height: boxHeight.value,
        pixelRatio: 1,
        cacheBust: false,
        backgroundColor: canvasBg,
        style: {
          width: '1920px',
          minWidth: '1920px',
          maxWidth: '1920px',
          height: `${boxHeight.value}px`,
          minHeight: `${boxHeight.value}px`,
          maxHeight: `${boxHeight.value}px`,
          transform: 'none',
          margin: '0',
          padding: '0',
          border: 'none',
          outline: 'none',
          boxShadow: 'none'
        }
      })
    }

    const downloadDataUrl = (dataUrl: string, filename: string) => {
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = filename
      link.click()
    }

    // 打开批量导出配置弹窗
    const openExportModal = () => {
      if (clickSequence.value.length === 0) {
        showToast('当前尚未记录点开顺序，请先在文字上点击字符', 'warning')
        return
      }
      exportModalVisible.value = true
    }

    // 开始执行批量导出
    const startExport = async () => {
      if (clickSequence.value.length === 0 || isExporting.value) return

      hoveredChar.value = null
      const originalRevealedState = new Set(revealedCharSet.value)
      isExporting.value = true
      exportProgress.value = 0
      exportStatusText.value = '准备渲染...'

      const safeTitle = (titleText.value.trim() || '未命名文章').replace(/[\\/:*?"<>|]/g, '_')
      const totalSteps = clickSequence.value.length + (includeInitialFrame.value ? 1 : 0)
      let completedSteps = 0

      try {
        if (exportAsZip.value) {
          const zip = new JSZip()
          const folder = zip.folder(`${safeTitle}_点开序列_1920p`) || zip

          // 1. 若勾选，先渲染第 00 步（初始全遮罩）
          if (includeInitialFrame.value) {
            exportStatusText.value = `正在渲染第 00 步: 00_${safeTitle}_初始.png (1 / ${totalSteps})`
            revealedCharSet.value = new Set()
            const dataUrl = await captureUpPartFrame()
            const base64Data = dataUrl.split(',')[1]
            folder.file(`00_${safeTitle}_初始.png`, base64Data, { base64: true })
            completedSteps++
            exportProgress.value = Math.round((completedSteps / totalSteps) * 90)
          }

          // 2. 逐帧渲染记录的每个点开步骤
          for (let i = 0; i < clickSequence.value.length; i++) {
            const step = clickSequence.value[i]
            const orderStr = String(step.order).padStart(2, '0')
            const safeChar = step.char.replace(/[\\/:*?"<>|]/g, '_')
            const filename = `${orderStr}_${safeTitle}_${safeChar}.png`

            exportStatusText.value = `正在渲染第 ${orderStr} 步: ${filename} (${completedSteps + 1} / ${totalSteps})`
            revealedCharSet.value = new Set(step.revealedSnapshot)

            const dataUrl = await captureUpPartFrame()
            const base64Data = dataUrl.split(',')[1]
            folder.file(filename, base64Data, { base64: true })

            completedSteps++
            exportProgress.value = Math.round((completedSteps / totalSteps) * 90)
          }

          // 3. 生成 ZIP 压缩包并下载
          exportStatusText.value = '正在打包 ZIP 压缩文件，请稍候...'
          const zipBlob = await zip.generateAsync(
            { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
            (metadata) => {
              exportProgress.value = 90 + Math.round(metadata.percent * 0.1)
            }
          )

          const downloadUrl = URL.createObjectURL(zipBlob)
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = `${safeTitle}_点开序列_1920p.zip`
          link.click()
          URL.revokeObjectURL(downloadUrl)
        } else {
          // 逐张单独下载 PNG
          if (includeInitialFrame.value) {
            exportStatusText.value = `正在导出: 00_${safeTitle}_初始.png (1 / ${totalSteps})`
            revealedCharSet.value = new Set()
            const dataUrl = await captureUpPartFrame()
            downloadDataUrl(dataUrl, `00_${safeTitle}_初始.png`)
            completedSteps++
            exportProgress.value = Math.round((completedSteps / totalSteps) * 100)
            await new Promise(resolve => setTimeout(resolve, 250))
          }

          for (let i = 0; i < clickSequence.value.length; i++) {
            const step = clickSequence.value[i]
            const orderStr = String(step.order).padStart(2, '0')
            const safeChar = step.char.replace(/[\\/:*?"<>|]/g, '_')
            const filename = `${orderStr}_${safeTitle}_${safeChar}.png`

            exportStatusText.value = `正在导出: ${filename} (${completedSteps + 1} / ${totalSteps})`
            revealedCharSet.value = new Set(step.revealedSnapshot)

            const dataUrl = await captureUpPartFrame()
            downloadDataUrl(dataUrl, filename)

            completedSteps++
            exportProgress.value = Math.round((completedSteps / totalSteps) * 100)
            await new Promise(resolve => setTimeout(resolve, 250))
          }
        }

        exportProgress.value = 100
        exportStatusText.value = '导出完成！'
        showToast(`🎉 成功导出 ${totalSteps} 张 1920p 高清图片！`, 'success')
        setTimeout(() => {
          exportModalVisible.value = false
        }, 600)
      } catch (err: any) {
        console.error('导出失败:', err)
        showToast(`导出失败: ${err.message || '渲染异常'}`, 'warning')
      } finally {
        isExporting.value = false
        revealedCharSet.value = originalRevealedState
      }
    }

    // 批量操作
    const revealAll = () => {
      uniqueCharSet.value.forEach(k => revealedCharSet.value.add(k))
      saveStateToHistory()
      showToast('已全部揭示', 'success')
    }

    const hideAll = () => {
      revealedCharSet.value.clear()
      clickSequence.value = []
      currentPreviewStepIndex.value = null
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
      showToast(`已将视窗高度设置为 ${h}px`)
    }

    const toggleAutoHeight = () => {
      isAutoHeight.value = !isAutoHeight.value
      if (isAutoHeight.value) {
        showToast('已开启自适应内容高度模式')
      } else {
        setBoxHeight(350)
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

    const totalUnscaledHeight = computed(() => {
      if (isAutoHeight.value) return 0
      const indicatorsHeight = hideIndicators.value ? 0 : 72
      const gapHeight = 32
      return boxHeight.value * 2 + indicatorsHeight + gapHeight
    })

    const scalerContainerStyle = computed(() => {
      const scale = isExporting.value ? 1 : currentScale.value
      return {
        width: isExporting.value ? '1920px' : `${Math.round(1920 * scale)}px`,
        height: isAutoHeight.value ? 'auto' : `${Math.round(totalUnscaledHeight.value * scale)}px`
      }
    })

    const scalerInnerStyle = computed(() => {
      const scale = isExporting.value ? 1 : currentScale.value
      return {
        width: '1920px',
        transform: isExporting.value ? 'none' : `scale(${scale})`,
        transformOrigin: 'top left'
      }
    })

    const singleBoxStyle = computed(() => ({
      width: '1920px',
      height: isAutoHeight.value ? 'auto' : `${boxHeight.value}px`,
      minHeight: isAutoHeight.value ? 'auto' : `${boxHeight.value}px`,
      maxHeight: isAutoHeight.value ? 'none' : `${boxHeight.value}px`
    }))

    const charMarginStyle = computed(() => ({
      margin: `0 ${charMargin.value}px`
    }))

    const textScrollStyle = computed(() => ({
      overflowY: isAutoHeight.value ? 'visible' : ('auto' as const),
      textAlign: textAlign.value
    }))

    // 切换录制开启 / 暂停状态
    const toggleRecording = () => {
      isRecordingSequence.value = !isRecordingSequence.value
      showToast(
        isRecordingSequence.value
          ? '⏺️ 已开始录制点开顺序 (快捷键: 空格 或 R 键可暂停)'
          : '⏸️ 已暂停录制点开顺序 (快捷键: 空格 或 R 键可恢复)',
        isRecordingSequence.value ? 'success' : 'info'
      )
    }

    // 键盘全局快捷键监听 (Ctrl+Z / Ctrl+Y / Space / R / Ctrl+E / Esc)
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInputFocused =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      // Esc 键: 关闭导出弹窗
      if (e.key === 'Escape') {
        if (exportModalVisible.value && !isExporting.value) {
          exportModalVisible.value = false
          e.preventDefault()
          return
        }
      }

      // 如果当前聚焦在文本输入框/数字框，不触发录制全局快捷键
      if (isInputFocused) return

      // 空格键 (Space) 或 R 键: 开始 / 暂停点开顺序录制 (Start / Stop Recording)
      if (e.key === ' ' || e.key.toLowerCase() === 'r') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          toggleRecording()
          e.preventDefault()
          return
        }
      }

      // Ctrl + E: 快捷打开批量导出图片弹窗
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        openExportModal()
        e.preventDefault()
        return
      }

      // 撤销 / 重做 (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
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
      titleFontSize,
      bodyFontSize,
      titleStyle,
      bodyStyle,
      charMargin,
      isVerticalCenter,
      textAlign,
      boxHeight,
      isAutoHeight,
      zoomMode,
      currentScale,
      scalerContainerStyle,
      scalerInnerStyle,
      singleBoxStyle,
      charMarginStyle,
      textScrollStyle,
      notification,
      historyStack,
      historyIndex,
      totalNonSymbolCount,
      revealedNonSymbolCount,
      revealProgress,
      uniqueCharCount,
      uniqueRevealedCount,
      isCharRevealed,
      isSlashChar,
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
      upPartRef,
      clickSequence,
      isRecordingSequence,
      currentPreviewStepIndex,
      exportModalVisible,
      isExporting,
      exportProgress,
      exportStatusText,
      includeInitialFrame,
      exportAsZip,
      undoLastStep,
      removeStep,
      clearSequence,
      previewStep,
      toggleRecording,
      openExportModal,
      startExport
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
  font-family: 'Noto Serif', 'Noto Sans SC', serif, sans-serif;
  user-select: none;
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

/* ==================== 点开顺序序列工具栏 ==================== */
.sequence-toolbar {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  background-color: #14161f;
  border-bottom: 1px solid #232738;
  gap: 12px;
  flex-shrink: 0;
  user-select: none;
  overflow-x: auto;
}

.seq-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.seq-title {
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.seq-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
  background-color: #2563eb;
  color: #ffffff;
  font-weight: 700;
}

.seq-record-btn {
  background-color: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.seq-record-btn.active {
  background-color: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.4);
  color: #86efac;
}

.record-dot {
  font-size: 10px;
}

.record-dot.pulsating {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}

/* 序列横向滑动容器 */
.seq-scroll-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding: 2px 4px;
  min-height: 32px;
}

.seq-empty-tip {
  font-size: 12px;
  color: #64748b;
  font-style: italic;
  white-space: nowrap;
}

.seq-step-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  background-color: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  position: relative;
}

.seq-step-item:hover {
  background-color: #334155;
  border-color: #38bdf8;
  color: #ffffff;
  transform: translateY(-1px);
}

.seq-step-item.active {
  background-color: #0369a1;
  border-color: #38bdf8;
  color: #ffffff;
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.4);
}

.step-num {
  font-size: 10px;
  font-family: monospace;
  background-color: #0f172a;
  padding: 1px 4px;
  border-radius: 3px;
  color: #94a3b8;
  font-weight: 700;
}

.step-char {
  font-weight: 700;
  color: #f8fafc;
  font-size: 13px;
}

.step-count {
  font-size: 10px;
  color: #64748b;
}

.step-delete {
  font-size: 12px;
  color: #94a3b8;
  margin-left: 2px;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.step-delete:hover {
  background-color: #ef4444;
  color: #ffffff;
}

.seq-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

.export-btn {
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  border: none;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(124, 58, 237, 0.3);
}

.export-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #1d4ed8, #6d28d9);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.45);
  transform: translateY(-1px);
}

/* ==================== 批量导出弹窗 ==================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-dialog {
  background-color: #1e2230;
  border: 1px solid #3b4261;
  border-radius: 12px;
  width: 100%;
  max-width: 580px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalIn 0.2s ease-out;
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #2d3142;
  background-color: #181a24;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.modal-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}

.modal-close:hover {
  color: #ffffff;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 75vh;
  overflow-y: auto;
}

.export-summary-box {
  background-color: #13151f;
  border: 1px solid #282c3f;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.summary-item .label {
  color: #94a3b8;
}

.summary-item .val {
  color: #e2e8f0;
}

.summary-item .highlight {
  color: #38bdf8;
  font-weight: 700;
  font-size: 14px;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #e2e8f0;
  cursor: pointer;
}

.option-check code {
  background-color: #0f172a;
  color: #38bdf8;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-title {
  font-size: 13px;
  font-weight: 600;
  color: #cbd5e1;
}

.radio-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 8px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #cbd5e1;
  cursor: pointer;
}

.naming-preview-box {
  background-color: #13151f;
  border: 1px solid #282c3f;
  border-radius: 8px;
  padding: 12px 16px;
}

.naming-title {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  display: block;
  margin-bottom: 6px;
}

.naming-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  font-family: monospace;
  color: #a5b4fc;
}

.naming-list .badge {
  background-color: #312e81;
  color: #c7d2fe;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
  margin-right: 4px;
}

.more-steps {
  color: #64748b;
  font-style: italic;
  padding-top: 2px;
}

/* 导出进度条 */
.export-progress-area {
  background-color: #13151f;
  border: 1px solid #282c3f;
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-bar-container {
  height: 8px;
  background-color: #0f172a;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  transition: width 0.2s ease;
}

.progress-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #cbd5e1;
}

.progress-status .spinner {
  font-size: 14px;
  margin-right: 6px;
}

.progress-status .status-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-status .percent {
  font-weight: 700;
  color: #38bdf8;
  font-family: monospace;
  margin-left: 8px;
}

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid #2d3142;
  background-color: #181a24;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.btn-lg {
  padding: 8px 18px;
  font-size: 14px;
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

.stage-scaler-inner {
  width: 1920px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 两个视窗之间的留空间隔 */
.boxes-gap-spacer {
  height: 32px;
  flex-shrink: 0;
}

/* 1080p 模拟视窗主体 (固定 1920px 宽，各独立成框) */
.screen-box-1080p {
  width: 1920px;
  min-width: 1920px;
  max-width: 1920px;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 0 0 2px #3b4261;
  border-radius: 6px;
  background-color: #ffffff;
  overflow: hidden;
  box-sizing: content-box;
  flex-shrink: 0;
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

/* 文本滚动与排版区域（确保高于背景边框图层） */
.text-content-scroll {
  position: relative;
  z-index: 5;
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
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

.boarder-svg-img {
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  object-fit: fill;
  display: block;
}

.up-part {
  width: 1920px;
  min-width: 1920px;
  max-width: 1920px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

.up-part .text-content-scroll {
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
  font-size: 45px;
  font-weight: 700;
  margin-bottom: 8px;
  padding-bottom: 0;
  border-bottom: none;
  display: block;
  line-height: 1.4;
  text-align: inherit;
}

.article-body-block {
  font-size: 30px;
  line-height: 1.9;
  display: block;
  text-align: inherit;
}

/* 标点符号 */
.char-symbol {
  display: inline-block;
  vertical-align: middle;
}

/* 斜杠全宽方格样式 (与字块方格 1.25em 对齐居中) */
.char-symbol.is-slash {
  display: inline-block;
  width: 1.25em;
  height: 1.25em;
  line-height: 1.25;
  text-align: center;
  vertical-align: middle;
  font-family: 'Noto Serif', 'Noto Sans SC', serif, sans-serif;
  font-weight: 700;
  box-sizing: border-box;
}

/* 呈现区字符方块 (Black Square Mask) */
.char-block {
  font-family: 'Noto Serif', 'Noto Sans SC', serif, sans-serif;
  display: inline-block;
  width: 1.25em;
  height: 1.25em;
  line-height: 1.25;
  text-align: center;
  vertical-align: middle;
  cursor: pointer;
  border-radius: 2px;
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
  animation: none;
  transform: none;
  transition: none;
}

.char-block.revealed:hover {
  opacity: 0.8;
}

/* 上帝视角参考区字符 (God Char Block) */
.god-char-block {
  font-family: 'Noto Serif', 'Noto Sans SC', serif, sans-serif;
  display: inline-block;
  width: 1.25em;
  height: 1.25em;
  line-height: 1.25;
  text-align: center;
  vertical-align: middle;
  cursor: pointer;
  border-radius: 3px;
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

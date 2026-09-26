<template>
  <div class="god-mode-view" :class="[theme]">
    <!-- 顶部综合控制台 -->
    <header class="top-bar">
      <div class="bar-left">
        <div class="title-group">
          <span class="logo-tag">EP2</span>
          <h1>百科猜字 · 视频后制上帝模式 (EP2)</h1>
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
          <span>已高亮: <strong>{{ highlightedNonSymbolCount }}</strong> / {{ totalNonSymbolCount }}</span>
          <span class="stats-percent">({{ highlightProgress }}%)</span>
          <span class="stats-divider">|</span>
          <span>独立单元: <strong>{{ uniqueHighlightedCount }}</strong> / {{ uniqueUnitCount }}</span>
        </div>

        <!-- 批量操作 -->
        <div class="action-buttons">
          <button class="btn btn-sm btn-action" @click="highlightAll" title="一键高亮正文所有内容">
            ✨ 全部高亮
          </button>
          <button class="btn btn-sm btn-action" @click="hideAll" title="全部取消高亮">
            🔒 全部取消
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
            title="横幅高度 (1920x350)"
          >
            350p横幅
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
            :class="{ active: boxHeight === 1080 && !isAutoHeight }"
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

      <!-- 分栏配置 -->
      <div class="sub-item">
        <label>分栏列数:</label>
        <select v-model.number="columnCount" class="num-input">
          <option :value="1">单栏 (1列)</option>
          <option :value="2">双栏 (2列)</option>
          <option :value="3">三栏 (3列)</option>
          <option :value="4">四栏 (4列)</option>
        </select>
      </div>

      <div class="sub-item" v-if="columnCount > 1">
        <label>栏间距:</label>
        <input
          type="number"
          class="num-input"
          min="10"
          max="200"
          step="10"
          v-model.number="columnGap"
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
          {{ clickMode === 'toggle' ? '🔄 点击切换(高亮/取消)' : '✨ 仅点击高亮' }}
        </button>
      </div>

      <div class="sub-item">
        <button
          class="btn btn-xs toggle-action-btn"
          :class="{ active: showSidebar }"
          @click="toggleSidebar"
          title="切换显示右侧已高亮词汇/字符侧边栏"
        >
          {{ showSidebar ? '📋 侧边栏: 显示' : '📋 侧边栏: 隐藏' }}
        </button>
      </div>

      <div class="sub-item">
        <button
          class="btn btn-xs toggle-action-btn"
          :class="{ active: showTopTurnBar }"
          @click="showTopTurnBar = !showTopTurnBar"
          title="切换是否在顶部显示独立回合与玩家横栏"
        >
          {{ showTopTurnBar ? '🎮 顶栏: 显示' : '🎮 顶栏: 隐藏' }}
        </button>
      </div>

      <div class="sub-item sub-item-right">
        <span class="dim-hint">
          💡 提示：点击正文中的任意单词或汉字，均可同步高亮/取消全部相同词汇/字符。标题始终正常展示。
        </span>
      </div>
    </div>

    <!-- 玩家与回合制控制台 (Player & Turn-Based Bar) -->
    <div v-if="showTopTurnBar" class="turn-player-bar">
      <!-- 玩家管理区域 (1~6人，各分配独占色彩) -->
      <div class="turn-bar-left">
        <div class="player-count-ctrl">
          <span class="ctrl-label">👥 玩家 ({{ players.length }}/6):</span>
          <div class="btn-group-tight">
            <button
              class="btn btn-xs count-btn"
              :disabled="players.length <= 1"
              @click="removePlayer"
              title="减少 1 位玩家 (最低 1 人)"
            >
              −
            </button>
            <button
              class="btn btn-xs count-btn"
              :disabled="players.length >= 6"
              @click="addPlayer"
              title="增加 1 位玩家 (最高 6 人)"
            >
              +
            </button>
          </div>
        </div>

        <div class="players-chips-container">
          <div
            v-for="(p, idx) in players"
            :key="p.id"
            class="player-chip"
            :class="{
              'is-current-turn': idx === currentPlayerIndex,
              'is-inactive': idx !== currentPlayerIndex
            }"
            @click="setCurrentPlayerIndex(idx)"
            :title="`【${p.name}】已高亮 ${getPlayerHighlightCount(p.id)} 个词/字 (双击可修改名称)`"
            @dblclick="renamePlayer(p)"
          >
            <span class="player-color-dot" :style="{ backgroundColor: p.color }"></span>
            <span class="player-name-text">{{ p.name }}</span>
            <span class="player-score-badge" :style="{ backgroundColor: p.color + '26', color: p.color }">
              {{ getPlayerHighlightCount(p.id) }}
            </span>
            <span v-if="idx === currentPlayerIndex" class="current-turn-badge-tag">行动中</span>
          </div>
        </div>
      </div>

      <!-- 回合进度与操作区域 (1~3个词) -->
      <div class="turn-bar-right">
        <div class="round-indicator">
          <span class="round-num">第 <strong>{{ currentRound }}</strong> 轮</span>
        </div>

        <div
          class="turn-status-card"
          :style="{ borderColor: currentPlayer.color, backgroundColor: currentPlayer.color + '15' }"
        >
          <span class="active-player-name" :style="{ color: currentPlayer.color }">
            ● {{ currentPlayer.name }}
          </span>
          <div class="quota-meter">
            <span class="quota-meter-label">本轮选择:</span>
            <div class="quota-steps">
              <span class="quota-pill" :class="{ filled: currentTurnPickedKeys.length >= 1 }">1</span>
              <span class="quota-pill" :class="{ filled: currentTurnPickedKeys.length >= 2 }">2</span>
              <span class="quota-pill" :class="{ filled: currentTurnPickedKeys.length >= 3 }">3</span>
            </div>
            <span class="quota-fraction">
              <strong>{{ currentTurnPickedKeys.length }}</strong> / 3
              <span v-if="currentTurnPickedKeys.length === 0" class="quota-tip-dim">(需选1~3个)</span>
              <span v-else-if="currentTurnPickedKeys.length === 3" class="quota-tip-success">(已满3个)</span>
              <span v-else class="quota-tip-ok">(可结束或继续)</span>
            </span>
          </div>
        </div>

        <button
          class="btn btn-sm btn-turn-action"
          :class="{
            'btn-ready': currentTurnPickedKeys.length >= 1 && currentTurnPickedKeys.length < 3,
            'btn-full': currentTurnPickedKeys.length === 3
          }"
          :disabled="currentTurnPickedKeys.length < 1"
          @click="endCurrentTurn"
          :title="currentTurnPickedKeys.length < 1 ? '请在正文至少高亮 1 个词/字才能结束回合 (快捷键: Enter)' : '完成本回合，进入下一位玩家 (快捷键: Enter)'"
        >
          <span v-if="currentTurnPickedKeys.length === 3">🎉 已选满 3 个 · 结束回合 ⏭️</span>
          <span v-else-if="currentTurnPickedKeys.length >= 1">⏭️ 结束本回合 ({{ currentTurnPickedKeys.length }}/3)</span>
          <span v-else>🔒 需选至少 1 个词</span>
        </button>

        <button
          v-if="currentTurnPickedKeys.length > 0"
          class="btn btn-xs btn-outline-danger"
          @click="cancelCurrentTurnPicks"
          title="撤回当前回合刚刚高亮的全部词汇"
        >
          ↺ 撤回本轮
        </button>

        <button
          class="btn btn-xs mode-toggle-btn"
          :class="{ active: turnBasedMode }"
          @click="turnBasedMode = !turnBasedMode"
          :title="turnBasedMode ? '当前为回合制限制模式 (每人每轮 1~3 个)，点击可切换为自由模式' : '当前为自由点击模式，点击开启回合制限制'"
        >
          {{ turnBasedMode ? '🎮 回合制: 开启' : '🔓 自由模式' }}
        </button>
      </div>
    </div>

    <!-- 点开顺序序列工具栏 (Sequence Recording & Export Bar) -->
    <div class="sequence-toolbar">
      <div class="seq-left">
        <span class="seq-title">
          🎬 高亮顺序序列 <span class="seq-badge">{{ clickSequence.length }} 步</span>
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
          👆 点击正文中的单词或汉字，将按点击顺序自动记录高亮序列，可一键批量导出 1920p 图片
        </div>
        <div
          v-for="(step, idx) in clickSequence"
          :key="step.id"
          class="seq-step-item"
          :class="{ active: currentPreviewStepIndex === idx }"
          @click="previewStep(idx)"
          @mouseenter="setHoveredKey(step.key)"
          @mouseleave="clearHoveredKey"
          :title="`第 ${step.order} 步：【${step.playerName || '玩家'}】高亮【${step.text}】(出现 ${step.count} 次) - 点击可预览此画面`"
        >
          <span class="step-num">{{ String(step.order).padStart(2, '0') }}</span>
          <span
            v-if="step.playerName"
            class="step-player-tag"
            :style="{ backgroundColor: step.playerColor || '#0284c7' }"
            :title="`玩家：${step.playerName}`"
          >{{ step.playerName.split(' ')[0] }}</span>
          <span class="step-char">{{ step.text }}</span>
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
          class="btn btn-xs export-current-btn"
          :disabled="isExporting"
          @click="exportCurrentFrame"
          title="不开启/不依赖顺序序列，直接将展示区当前画面导出为一张 1920p 图片"
        >
          📷 导出当前画面
        </button>
        <button
          class="btn btn-xs btn-primary export-btn"
          :disabled="clickSequence.length === 0 || isExporting"
          @click="openExportModal"
          title="将当前高亮顺序逐帧导出为 1920p 图片组"
        >
          📸 批量导出图片 ({{ clickSequence.length }} 张)
        </button>
      </div>
    </div>

    <!-- 工作区主体（舞台视口 + 高亮侧边栏） -->
    <div class="workspace-layout">
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
            <!-- 区域指示条 (位于 1080p 屏幕外，绝不挤占视窗内部空间) -->
            <div v-if="!hideIndicators" class="screen-outer-indicator-bar">
              <div class="outer-pill tag-god">
                <span class="pill-badge">👑 百科展示区 (God View)</span>
                <span class="pill-info">宽: 1920px | 高: {{ isAutoHeight ? '自适应' : `${boxHeight}px` }} | 边框: {{ showBoarder ? '开启' : '关闭' }} | 分栏: {{ columnCount > 1 ? `${columnCount}栏` : '单栏' }} | 点击正文单词或汉字高亮</span>
              </div>
            </div>

            <!-- 单一视窗：上帝模式展示区 (含边框、正文词汇/汉字高亮) -->
            <div
              ref="screenBoxRef"
              class="screen-box-1080p god-view-box"
              :class="{ 'has-boarder': showBoarder }"
              :style="singleBoxStyle"
            >
              <!-- 题目边框装饰图层 (Question Boarder SVG) -->
              <div v-if="showBoarder" class="question-boarder-layer">
                <img :src="boarderDataUrl" class="boarder-svg-img" alt="Question Border Frame" />
              </div>

              <div class="text-content-scroll" :class="{ 'with-boarder': showBoarder }" :style="textScrollStyle">
                <div class="text-inner-container" :class="{ 'is-v-centered': isVerticalCenter }">
                  <!-- 文章标题：正常展示，不参与高亮与选择 -->
                  <h2 class="article-title-block" :style="titleStyle">
                    {{ titleText }}
                  </h2>

                  <!-- 文章正文：单词 / 汉字单元化高亮 (支持多栏排版) -->
                  <div class="article-body-block" :style="bodyStyle">
                    <template v-for="(unit, idx) in paragraphUnits" :key="`unit-${idx}`">
                      <br v-if="unit.isNewline" />
                      <span
                        v-else-if="unit.isSymbol"
                        class="char-symbol"
                        :class="{ 'is-slash': isSlashChar(unit.text), 'is-space': isSpaceChar(unit.text) }"
                        :style="charMarginStyle"
                      >{{ isSpaceChar(unit.text) ? '\u00A0' : unit.text }}</span>
                      <span
                        v-else
                        class="god-char-block"
                        :class="{
                          'is-highlighted': isUnitHighlighted(unit.key),
                          'is-unselected': !isUnitHighlighted(unit.key),
                          'is-revealed': isUnitHighlighted(unit.key),
                          'is-hidden': !isUnitHighlighted(unit.key),
                          'is-hover-match': isMatchHover(unit.key),
                          'is-word': unit.isWord
                        }"
                        :style="[charMarginStyle, getUnitPlayerStyle(unit.key)]"
                        @click="handleUnitClick(unit.key, unit.text)"
                        @mouseenter="setHoveredKey(unit.key)"
                        @mouseleave="clearHoveredKey"
                      >
                        {{ unit.text }}
                      </span>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- 侧边栏：已高亮词汇与汉字面板 (独立于展示区外，不影响导出画质与结构) -->
      <aside v-if="showSidebar" class="highlight-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-title">
            <span class="sidebar-icon">📌</span>
            <h3>高亮词汇/字符</h3>
            <span class="sidebar-badge">{{ highlightedList.length }} / {{ allUniqueUnits.length }}</span>
          </div>
          <button class="sidebar-close-btn" @click="showSidebar = false" title="关闭侧边栏">✕</button>
        </div>

        <!-- 侧边栏内的玩家与回合控制面板 (Sidebar Player & Turn Panel) -->
        <div class="sidebar-turn-section">
          <div class="sidebar-turn-header" @click="isSidebarTurnSectionCollapsed = !isSidebarTurnSectionCollapsed">
            <div class="sidebar-turn-header-title">
              <span>🎮 回合与玩家</span>
              <span class="sidebar-mini-pill" :style="{ backgroundColor: currentPlayer.color }">
                ● {{ currentPlayer.name }} (第{{ currentRound }}轮)
              </span>
            </div>
            <button class="mini-collapse-btn" :title="isSidebarTurnSectionCollapsed ? '展开回合控制面板' : '折叠回合控制面板'">
              {{ isSidebarTurnSectionCollapsed ? '展开 ▸' : '收起 ▾' }}
            </button>
          </div>

          <div v-show="!isSidebarTurnSectionCollapsed" class="sidebar-turn-body">
            <!-- 顶部回合状态卡片 -->
            <div
              class="sidebar-turn-card"
              :style="{
                borderColor: currentPlayer.color,
                background: `linear-gradient(135deg, ${currentPlayer.color}15, rgba(24, 26, 36, 0.95))`
              }"
            >
              <div class="sidebar-turn-card-top">
                <span class="sidebar-round-tag">第 <strong>{{ currentRound }}</strong> 轮</span>
                <div class="sidebar-turn-right-actions">
                  <button
                    class="btn btn-xs mini-mode-btn"
                    :class="{ active: turnBasedMode }"
                    @click="turnBasedMode = !turnBasedMode"
                    :title="turnBasedMode ? '回合制模式已开启 (每人每轮 1~3 个)' : '自由点击模式'"
                  >
                    {{ turnBasedMode ? '🎮 回合制' : '🔓 自由' }}
                  </button>
                </div>
              </div>

              <!-- 当前行动玩家 -->
              <div class="sidebar-active-player-row">
                <span class="sidebar-active-avatar" :style="{ backgroundColor: currentPlayer.color }"></span>
                <div class="sidebar-active-info">
                  <div class="sidebar-active-name" :style="{ color: currentPlayer.color }">
                    {{ currentPlayer.name }}
                  </div>
                  <div class="sidebar-active-quota-status">
                    <span class="quota-mini-label">本轮选择:</span>
                    <div class="sidebar-quota-dots">
                      <span class="sidebar-quota-dot" :class="{ filled: currentTurnPickedKeys.length >= 1 }">1</span>
                      <span class="sidebar-quota-dot" :class="{ filled: currentTurnPickedKeys.length >= 2 }">2</span>
                      <span class="sidebar-quota-dot" :class="{ filled: currentTurnPickedKeys.length >= 3 }">3</span>
                    </div>
                    <span class="sidebar-quota-text">
                      <strong>{{ currentTurnPickedKeys.length }}</strong>/3
                    </span>
                  </div>
                </div>
              </div>

              <!-- 操作按钮组 -->
              <div class="sidebar-turn-actions-row">
                <button
                  class="btn btn-sm sidebar-end-turn-btn"
                  :class="{
                    'btn-ready': currentTurnPickedKeys.length >= 1 && currentTurnPickedKeys.length < 3,
                    'btn-full': currentTurnPickedKeys.length === 3
                  }"
                  :disabled="currentTurnPickedKeys.length < 1"
                  @click="endCurrentTurn"
                  :title="currentTurnPickedKeys.length < 1 ? '请在正文至少高亮 1 个词/字才能结束回合 (快捷键: Enter)' : '完成本回合，进入下一位玩家 (快捷键: Enter)'"
                >
                  <span v-if="currentTurnPickedKeys.length === 3">🎉 满3个 · 结束回合 ⏭️</span>
                  <span v-else-if="currentTurnPickedKeys.length >= 1">⏭️ 结束回合 ({{ currentTurnPickedKeys.length }}/3)</span>
                  <span v-else>🔒 需选 1~3 个词</span>
                </button>
                <button
                  v-if="currentTurnPickedKeys.length > 0"
                  class="btn btn-xs btn-outline-danger sidebar-cancel-turn-btn"
                  @click="cancelCurrentTurnPicks"
                  title="撤回当前回合刚刚高亮的全部词汇"
                >
                  ↺ 撤回
                </button>
              </div>
            </div>

            <!-- 玩家列表与管理 (1~6人) -->
            <div class="sidebar-players-group">
              <div class="sidebar-players-header">
                <span class="sidebar-section-subtitle">
                  👥 参与玩家 ({{ players.length }}/6)
                </span>
                <div class="btn-group-tight">
                  <button
                    class="btn btn-xs count-btn"
                    :disabled="players.length <= 1"
                    @click="removePlayer"
                    title="减少 1 位玩家 (最低 1 人)"
                  >
                    −
                  </button>
                  <button
                    class="btn btn-xs count-btn"
                    :disabled="players.length >= 6"
                    @click="addPlayer"
                    title="增加 1 位玩家 (最高 6 人)"
                  >
                    +
                  </button>
                </div>
              </div>

              <div class="sidebar-players-chips">
                <div
                  v-for="(p, idx) in players"
                  :key="p.id"
                  class="sidebar-player-chip"
                  :class="{
                    'is-current': idx === currentPlayerIndex,
                    'is-filtered': sidebarPlayerFilter === p.id
                  }"
                  @click="setCurrentPlayerIndex(idx)"
                  :title="`【${p.name}】已高亮 ${getPlayerHighlightCount(p.id)} 个词/字 (单击切换至此玩家，双击改名)`"
                  @dblclick="renamePlayer(p)"
                >
                  <span class="player-color-dot" :style="{ backgroundColor: p.color }"></span>
                  <span class="sidebar-chip-name">{{ p.name }}</span>
                  <span
                    class="sidebar-chip-count"
                    :style="{ backgroundColor: p.color + '26', color: p.color }"
                  >
                    {{ getPlayerHighlightCount(p.id) }}
                  </span>
                  <span v-if="idx === currentPlayerIndex" class="sidebar-chip-turn-tag">行</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="sidebar-tabs">
          <button
            class="tab-btn"
            :class="{ active: sidebarTab === 'highlighted' }"
            @click="sidebarTab = 'highlighted'"
          >
            已高亮 ({{ highlightedList.length }})
          </button>
          <button
            class="tab-btn"
            :class="{ active: sidebarTab === 'all' }"
            @click="sidebarTab = 'all'"
          >
            全部 ({{ allUniqueUnits.length }})
          </button>
        </div>

        <div class="sidebar-filter-bar">
          <!-- 玩家专属筛选行 -->
          <div class="sidebar-player-filter-row">
            <span class="player-filter-label">玩家:</span>
            <div class="player-filter-chips">
              <button
                class="player-filter-btn"
                :class="{ active: sidebarPlayerFilter === null }"
                @click="sidebarPlayerFilter = null"
                title="展示所有玩家的高亮词"
              >
                全部
              </button>
              <button
                v-for="p in players"
                :key="`filter-${p.id}`"
                class="player-filter-btn"
                :class="{ active: sidebarPlayerFilter === p.id }"
                :style="sidebarPlayerFilter === p.id ? { backgroundColor: p.color, borderColor: p.color, color: '#fff' } : { borderColor: p.color + '66' }"
                @click="sidebarPlayerFilter = sidebarPlayerFilter === p.id ? null : p.id"
                :title="`仅查看【${p.name}】高亮的内容`"
              >
                <span class="filter-dot" :style="{ backgroundColor: p.color }"></span>
                {{ p.name }}
              </button>
            </div>
          </div>

          <div class="sidebar-search-box">
            <span class="search-icon">🔍</span>
            <input
              v-model="sidebarSearch"
              type="text"
              placeholder="搜索词汇或汉字..."
              class="sidebar-search-input"
            />
            <button
              v-if="sidebarSearch"
              class="clear-search-btn"
              @click="sidebarSearch = ''"
            >✕</button>
          </div>

          <div class="sidebar-actions-row">
            <select v-model="sidebarSort" class="sidebar-sort-select" title="列表排序方式">
              <option value="freq">按频次 (高→低)</option>
              <option value="order">按全文出场先后</option>
              <option value="alpha">按字母/拼音</option>
            </select>
            <div class="sidebar-quick-btns">
              <button class="btn btn-xs" @click="highlightAll" title="高亮全部正文内容">全选</button>
              <button class="btn btn-xs" @click="hideAll" title="清空全部高亮">清空</button>
            </div>
          </div>
        </div>

        <div class="sidebar-list-container">
          <div v-if="displayedSidebarUnits.length === 0" class="sidebar-empty">
            <span class="empty-icon">📭</span>
            <p v-if="sidebarSearch">未找到与“{{ sidebarSearch }}”匹配的项目</p>
            <p v-else-if="sidebarTab === 'highlighted'">尚未高亮任何单词或字符<br/>点击画面中的词块即可高亮，或切换至【全部】标签选择</p>
            <p v-else>正文中没有可用词汇或字符</p>
          </div>

          <div
            v-for="item in displayedSidebarUnits"
            :key="item.key"
            class="sidebar-item"
            :class="{
              'is-highlighted': isUnitHighlighted(item.key),
              'is-hovered': isMatchHover(item.key)
            }"
            @mouseenter="setHoveredKey(item.key)"
            @mouseleave="clearHoveredKey"
            @click="handleUnitClick(item.key, item.text)"
          >
            <span class="item-type-badge" :class="item.isWord ? 'badge-word' : 'badge-char'">
              {{ item.isWord ? '词' : '字' }}
            </span>

            <span class="item-text" :title="item.text">{{ item.text }}</span>

            <!-- 归属玩家标签 -->
            <span
              v-if="getUnitOwnerPlayer(item.key)"
              class="item-player-badge"
              :style="{
                backgroundColor: getUnitOwnerPlayer(item.key)?.color + '22',
                color: getUnitOwnerPlayer(item.key)?.color,
                borderColor: getUnitOwnerPlayer(item.key)?.color
              }"
              :title="`归属：${getUnitOwnerPlayer(item.key)?.name}`"
            >
              {{ getUnitOwnerPlayer(item.key)?.name.split(' ')[0] }}
            </span>

            <span class="item-count" title="全文出现次数">×{{ item.count }}</span>

            <button
              v-if="isUnitHighlighted(item.key)"
              class="item-remove-btn"
              @click.stop="handleUnitClick(item.key, item.text)"
              title="取消高亮"
            >
              ✕
            </button>
            <button
              v-else
              class="item-add-btn"
              @click.stop="handleUnitClick(item.key, item.text)"
              title="点击高亮"
            >
              +
            </button>
          </div>
        </div>

        <div class="sidebar-footer">
          <span>正文词频覆盖率:</span>
          <strong class="coverage-percent">{{ highlightProgress }}%</strong>
          <span class="dim-stat">({{ highlightedNonSymbolCount }} / {{ totalNonSymbolCount }} 次)</span>
        </div>
      </aside>
    </div>

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
          <h3>📸 批量导出“百科展示区”1920p图片序列</h3>
          <button class="modal-close" :disabled="isExporting" @click="exportModalVisible = false">✕</button>
        </div>

        <div class="modal-body">
          <div class="export-summary-box">
            <div class="summary-item">
              <span class="label">🎯 导出目标:</span>
              <span class="val">百科展示区 (God View)</span>
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
              <span class="val highlight">{{ clickSequence.length + (includeInitialFrame ? 1 : 0) + (includeFinalFullRevealFrame ? 1 : 0) }} 张图片</span>
            </div>
          </div>

          <div class="export-options">
            <label class="option-check">
              <input type="checkbox" v-model="includeInitialFrame" :disabled="isExporting" />
              <span>包含第 00 步（全初始未高亮画面：<code>00_{{ titleText || '标题' }}_初始.png</code>）</span>
            </label>
            <label class="option-check">
              <input type="checkbox" v-model="includeFinalFullRevealFrame" :disabled="isExporting" />
              <span>包含最终步骤（全正文高亮画面：<code>{{ String(clickSequence.length + 1).padStart(2, '0') }}_{{ titleText || '标题' }}_全高亮.png</code>）</span>
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
                  {{ String(idx + 1).padStart(2, '0') }}_{{ titleText || '标题' }}_{{ step.text }}.png
                </li>
                <li v-if="clickSequence.length > 3" class="more-steps">
                  ... 及中间 {{ clickSequence.length - 3 }} 张高亮步骤图片
                </li>
                <li v-if="includeFinalFullRevealFrame">
                  <span class="badge">{{ String(clickSequence.length + 1).padStart(2, '0') }}</span>
                  {{ String(clickSequence.length + 1).padStart(2, '0') }}_{{ titleText || '标题' }}_全高亮.png
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
import { isSymbol, processParagraphUnits, TextUnit, isSpace, isSlash } from '@/utils/textProcessor'
import questionBoarderSvg from '@/assets/question-boarder.svg'
import { toBlob, getFontEmbedCSS } from 'html-to-image'
import JSZip from 'jszip'

// 玩家信息数据接口 (支持 1 到 6 人，不同高亮色彩体系)
export interface Player {
  id: number
  name: string
  color: string
  bgColor: string
  borderColor: string
  darkBgColor: string
  darkColor: string
  darkBorderColor: string
}

// 6 位预置玩家高对比色彩配置 (兼顾浅色、暗黑、抠像模式)
export const ALL_PRESET_PLAYERS: Player[] = [
  {
    id: 1,
    name: '玩家 1 (P1)',
    color: '#0284c7',
    bgColor: '#e0f2fe',
    borderColor: '#7dd3fc',
    darkBgColor: '#075985',
    darkColor: '#f0f9ff',
    darkBorderColor: '#38bdf8'
  },
  {
    id: 2,
    name: '玩家 2 (P2)',
    color: '#e11d48',
    bgColor: '#ffe4e6',
    borderColor: '#fda4af',
    darkBgColor: '#9f1239',
    darkColor: '#fff1f2',
    darkBorderColor: '#fb7185'
  },
  {
    id: 3,
    name: '玩家 3 (P3)',
    color: '#059669',
    bgColor: '#d1fae5',
    borderColor: '#6ee7b7',
    darkBgColor: '#065f46',
    darkColor: '#ecfdf5',
    darkBorderColor: '#34d399'
  },
  {
    id: 4,
    name: '玩家 4 (P4)',
    color: '#d97706',
    bgColor: '#fef3c7',
    borderColor: '#fcd34d',
    darkBgColor: '#92400e',
    darkColor: '#fffbeb',
    darkBorderColor: '#fbbf24'
  },
  {
    id: 5,
    name: '玩家 5 (P5)',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    borderColor: '#c4b5fd',
    darkBgColor: '#5b21b6',
    darkColor: '#f5f3ff',
    darkBorderColor: '#a78bfa'
  },
  {
    id: 6,
    name: '玩家 6 (P6)',
    color: '#c026d3',
    bgColor: '#fae8ff',
    borderColor: '#f0abfc',
    darkBgColor: '#86198f',
    darkColor: '#fdf4ff',
    darkBorderColor: '#f0abfc'
  }
]

// 单元归属记录接口
export interface UnitOwnerInfo {
  playerId: number
  round: number
}

// 高亮顺序步骤数据接口
export interface ClickSequenceStep {
  id: number
  order: number
  text: string
  key: string
  revealedSnapshot: [string, UnitOwnerInfo][]
  count: number
  playerId?: number
  playerName?: string
  playerColor?: string
  round?: number
}

// 历史快照接口
export interface HistoryState {
  owners: [string, UnitOwnerInfo][]
  turnPickedKeys: string[]
  playerIndex: number
  round: number
}

export default defineComponent({
  name: 'GodModeView',
  setup() {
    // 默认示例文章
    const sampleTitle = '地力'
    const sampleContent =
      '地力是指一个人所持有的基本实力。在音乐游戏中，这个词被广泛使用，特别是在iidx中。虽然有多种解读方式，但核心还是指向一个人的实力水平。地力主要衡量一个人处理复杂谱面的能力，地力越强，处理复杂谱面的能力就越强。'

    const fileInputRef = ref<HTMLInputElement | null>(null)
    const stageWrapperRef = ref<HTMLElement | null>(null)
    const screenBoxRef = ref<HTMLElement | null>(null)

    // 玩家配置 (min 1 人, max 6 人，默认 2 人)
    const players = ref<Player[]>([
      { ...ALL_PRESET_PLAYERS[0] },
      { ...ALL_PRESET_PLAYERS[1] }
    ])
    const currentPlayerIndex = ref(0)
    const currentRound = ref(1)
    const turnBasedMode = ref(true)

    // 当前行动玩家
    const currentPlayer = computed(() => {
      return players.value[currentPlayerIndex.value] || players.value[0]
    })

    // 当前回合内已选高亮的词汇 key 列表 (限制：最少 1 个，最多 3 个)
    const currentTurnPickedKeys = ref<string[]>([])

    // 已高亮的正文单元字典 (key -> { playerId, round })
    const unitOwnerMap = ref<Map<string, UnitOwnerInfo>>(new Map())

    // 兼容层：已高亮 unit key 集合
    const highlightedUnitSet = computed(() => new Set(unitOwnerMap.value.keys()))

    // 高亮顺序序列追踪
    const clickSequence = ref<ClickSequenceStep[]>([])
    const isRecordingSequence = ref(true)
    const currentPreviewStepIndex = ref<number | null>(null)

    // 批量导出配置与状态
    const exportModalVisible = ref(false)
    const isExporting = ref(false)
    const exportProgress = ref(0)
    const exportStatusText = ref('')
    const includeInitialFrame = ref(true)
    const includeFinalFullRevealFrame = ref(true)
    const exportAsZip = ref(true)

    const isDragOver = ref(false)
    const currentFileName = ref('')
    const titleText = ref('')
    const contentText = ref('')
    const paragraphUnits = ref<TextUnit[]>([])

    // 题目边框与录屏指示器配置 (默认关闭题目边框)
    const showBoarder = ref(false)
    const hideIndicators = ref(false)
    const boarderDataUrl = ref<string>(questionBoarderSvg)
    let sessionFontEmbedCSS: string | undefined = undefined

    // 悬浮单元高亮追踪 (存储 unit.key)
    const hoveredKey = ref<string | null>(null)

    // 点击模式: 'toggle' (切换) 或 'reveal' (仅高亮)
    const clickMode = ref<'toggle' | 'reveal'>('toggle')

    // 撤销/重做栈
    const historyStack = ref<HistoryState[]>([])
    const historyIndex = ref(-1)

    // 分栏排版配置 (默认 2 栏)
    const columnCount = ref(2)
    const columnGap = ref(50)

    // 侧边栏与高亮单元列表
    interface SidebarUnitItem {
      key: string
      text: string
      isWord: boolean
      count: number
      firstIndex: number
    }

    const showSidebar = ref(true)
    const showTopTurnBar = ref(true)
    const isSidebarTurnSectionCollapsed = ref(false)
    const sidebarPlayerFilter = ref<number | null>(null)
    const sidebarTab = ref<'highlighted' | 'all'>('highlighted')
    const sidebarSearch = ref('')
    const sidebarSort = ref<'freq' | 'order' | 'alpha'>('freq')

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

    const bodyStyle = computed(() => {
      const style: Record<string, string | number | undefined> = {
        fontSize: `${bodyFontSize.value}px`
      }
      if (columnCount.value > 1) {
        style.columnCount = columnCount.value
        style.columnGap = `${columnGap.value}px`
        style.columnRule = '1px dashed rgba(148, 163, 184, 0.25)'
      }
      return style
    })

    // 视窗尺寸配置：固定宽度 1920px，高度默认全屏 1080px
    const boxHeight = ref(1080)
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

    // 判断是否为斜杠字符
    const isSlashChar = (text: string): boolean => {
      return isSlash(text)
    }

    // 判断是否为空格字符
    const isSpaceChar = (text: string): boolean => {
      return isSpace(text)
    }

    // 判断单元是否已高亮
    const isUnitHighlighted = (key: string): boolean => {
      if (!key) return false
      return unitOwnerMap.value.has(key)
    }

    // 玩家与回合制操作方法
    const addPlayer = () => {
      if (players.value.length >= 6) {
        showToast('最多支持 6 位玩家', 'warning')
        return
      }
      const nextPreset = ALL_PRESET_PLAYERS[players.value.length]
      players.value.push({ ...nextPreset })
      showToast(`已增加玩家：【${nextPreset.name}】(高亮色: ${nextPreset.color})`, 'success')
    }

    const removePlayer = () => {
      if (players.value.length <= 1) {
        showToast('最少需要 1 位玩家', 'warning')
        return
      }
      const removed = players.value.pop()
      if (sidebarPlayerFilter.value === removed?.id) {
        sidebarPlayerFilter.value = null
      }
      if (currentPlayerIndex.value >= players.value.length) {
        currentPlayerIndex.value = 0
      }
      showToast(`已移除玩家：【${removed?.name}】`)
    }

    const renamePlayer = (p: Player) => {
      const newName = window.prompt(`修改玩家名称：`, p.name)
      if (newName && newName.trim()) {
        p.name = newName.trim()
        showToast(`已重命名为【${p.name}】`)
      }
    }

    const setCurrentPlayerIndex = (idx: number) => {
      if (idx < 0 || idx >= players.value.length) return
      if (idx === currentPlayerIndex.value) return
      if (currentTurnPickedKeys.value.length > 0) {
        const ok = window.confirm(`【${currentPlayer.value.name}】本回合还有已选词汇，切换玩家将提交当前选择并换人，是否继续？`)
        if (!ok) return
        currentTurnPickedKeys.value = []
      }
      currentPlayerIndex.value = idx
      showToast(`已切换至【${currentPlayer.value.name}】的回合`)
    }

    // 结束当前回合 (进入下一位玩家)
    const endCurrentTurn = () => {
      if (turnBasedMode.value && currentTurnPickedKeys.value.length < 1) {
        showToast('本回合至少需高亮 1 个词汇才能结束回合', 'warning')
        return
      }
      const prevPlayerName = currentPlayer.value.name
      const count = currentTurnPickedKeys.value.length

      // 切换到下一个玩家
      currentPlayerIndex.value = (currentPlayerIndex.value + 1) % players.value.length
      if (currentPlayerIndex.value === 0) {
        currentRound.value++
      }
      currentTurnPickedKeys.value = []
      saveStateToHistory()

      showToast(`【${prevPlayerName}】结束回合 (选了 ${count} 个)，轮到【${currentPlayer.value.name}】行动`, 'success')
    }

    // 撤回当前回合的选择
    const cancelCurrentTurnPicks = () => {
      if (currentTurnPickedKeys.value.length === 0) return
      currentTurnPickedKeys.value.forEach(k => {
        unitOwnerMap.value.delete(k)
        if (isRecordingSequence.value) {
          const sIdx = clickSequence.value.findIndex(s => s.key === k)
          if (sIdx !== -1) {
            clickSequence.value.splice(sIdx, 1)
          }
        }
      })
      if (isRecordingSequence.value) {
        clickSequence.value.forEach((s, i) => (s.order = i + 1))
      }
      unitOwnerMap.value = new Map(unitOwnerMap.value)
      currentTurnPickedKeys.value = []
      saveStateToHistory()
      showToast('已撤回本回合全部选择')
    }

    // 获取玩家高亮总数
    const getPlayerHighlightCount = (playerId: number): number => {
      let count = 0
      unitOwnerMap.value.forEach(v => {
        if (v.playerId === playerId) count++
      })
      return count
    }

    // 获取单元归属玩家
    const getUnitOwnerPlayer = (key: string): Player | null => {
      const ownerInfo = unitOwnerMap.value.get(key)
      if (!ownerInfo) return null
      return players.value.find(p => p.id === ownerInfo.playerId) || null
    }

    // 获取单元对应玩家的主题高亮样式 (支持不同玩家色彩与不同录屏主题)
    const getUnitPlayerStyle = (key: string) => {
      if (!isUnitHighlighted(key)) return {}
      const ownerInfo = unitOwnerMap.value.get(key)
      const playerId = ownerInfo?.playerId
      const player = players.value.find(p => p.id === playerId) || players.value[0]
      if (!player) return {}

      const isDark = theme.value === 'theme-dark'
      const isChroma = theme.value === 'theme-green' || theme.value === 'theme-blue'

      if (isChroma) {
        return {
          backgroundColor: player.color,
          color: '#ffffff',
          borderColor: '#ffffff',
          fontWeight: '700'
        }
      }

      if (isDark) {
        return {
          backgroundColor: player.darkBgColor,
          color: player.darkColor,
          borderColor: player.darkBorderColor,
          fontWeight: '700'
        }
      }

      return {
        backgroundColor: player.bgColor,
        color: player.color,
        borderColor: player.borderColor,
        fontWeight: '700'
      }
    }

    // 判断当前单元是否与鼠标悬停的单元相同（用于全篇高亮对照）
    const isMatchHover = (key: string): boolean => {
      if (!hoveredKey.value || !key) return false
      return hoveredKey.value === key
    }

    const setHoveredKey = (key: string) => {
      if (key) {
        hoveredKey.value = key
      }
    }

    const clearHoveredKey = () => {
      hoveredKey.value = null
    }

    // 统计相关计算
    const nonSymbolUnits = computed(() => {
      return paragraphUnits.value.filter(u => !u.isSymbol && !u.isNewline)
    })

    const totalNonSymbolCount = computed(() => nonSymbolUnits.value.length)

    const highlightedNonSymbolCount = computed(() => {
      return nonSymbolUnits.value.filter(u => isUnitHighlighted(u.key)).length
    })

    const highlightProgress = computed(() => {
      if (totalNonSymbolCount.value === 0) return 0
      return Math.round((highlightedNonSymbolCount.value / totalNonSymbolCount.value) * 100)
    })

    const uniqueUnitKeys = computed(() => {
      const s = new Set<string>()
      nonSymbolUnits.value.forEach(u => s.add(u.key))
      return s
    })

    const uniqueUnitCount = computed(() => uniqueUnitKeys.value.size)

    const uniqueHighlightedCount = computed(() => {
      return unitOwnerMap.value.size
    })

    // 侧边栏全部独立词汇/字符汇总
    const allUniqueUnits = computed<SidebarUnitItem[]>(() => {
      const map = new Map<string, SidebarUnitItem>()
      nonSymbolUnits.value.forEach((u, index) => {
        const existing = map.get(u.key)
        if (existing) {
          existing.count++
        } else {
          map.set(u.key, {
            key: u.key,
            text: u.text,
            isWord: !!u.isWord,
            count: 1,
            firstIndex: index
          })
        }
      })
      return Array.from(map.values())
    })

    // 已高亮词汇/字符列表
    const highlightedList = computed<SidebarUnitItem[]>(() => {
      return allUniqueUnits.value.filter(u => highlightedUnitSet.value.has(u.key))
    })

    // 侧边栏当前展示列表（结合检索、玩家筛选与排序规则）
    const displayedSidebarUnits = computed<SidebarUnitItem[]>(() => {
      const source = sidebarTab.value === 'highlighted' ? highlightedList.value : allUniqueUnits.value
      let list = source
      if (sidebarPlayerFilter.value !== null) {
        list = list.filter(item => {
          const owner = unitOwnerMap.value.get(item.key)
          return owner && owner.playerId === sidebarPlayerFilter.value
        })
      }
      if (sidebarSearch.value.trim()) {
        const q = sidebarSearch.value.trim().toLowerCase()
        list = list.filter(item => item.text.toLowerCase().includes(q))
      }
      return [...list].sort((a, b) => {
        if (sidebarSort.value === 'freq') {
          return b.count - a.count || a.firstIndex - b.firstIndex
        } else if (sidebarSort.value === 'order') {
          return a.firstIndex - b.firstIndex
        } else {
          return a.text.localeCompare(b.text, 'zh-CN')
        }
      })
    })

    const toggleSidebar = () => {
      showSidebar.value = !showSidebar.value
      nextTick(() => {
        updateFitScale()
      })
    }

    // 历史栈记录
    const saveStateToHistory = () => {
      const state: HistoryState = {
        owners: Array.from(unitOwnerMap.value.entries()),
        turnPickedKeys: [...currentTurnPickedKeys.value],
        playerIndex: currentPlayerIndex.value,
        round: currentRound.value
      }
      if (historyIndex.value < historyStack.value.length - 1) {
        historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
      }
      historyStack.value.push(state)
      historyIndex.value = historyStack.value.length - 1
    }

    const undo = () => {
      if (historyIndex.value > 0) {
        historyIndex.value--
        const state = historyStack.value[historyIndex.value]
        unitOwnerMap.value = new Map(state.owners)
        currentTurnPickedKeys.value = [...state.turnPickedKeys]
        currentPlayerIndex.value = state.playerIndex
        currentRound.value = state.round
        showToast('已撤销上一步操作')
      }
    }

    const redo = () => {
      if (historyIndex.value < historyStack.value.length - 1) {
        historyIndex.value++
        const state = historyStack.value[historyIndex.value]
        unitOwnerMap.value = new Map(state.owners)
        currentTurnPickedKeys.value = [...state.turnPickedKeys]
        currentPlayerIndex.value = state.playerIndex
        currentRound.value = state.round
        showToast('已恢复操作')
      }
    }

    // 文本解析载入（预处理：统一转为小写，无大写字母展示；第一行标题正常展示，第二行起正文按词汇与汉字单元化解析）
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

      paragraphUnits.value = processParagraphUnits(contentText.value)

      // 重置高亮状态与历史及序列
      unitOwnerMap.value.clear()
      unitOwnerMap.value = new Map()
      currentTurnPickedKeys.value = []
      sidebarPlayerFilter.value = null
      currentPlayerIndex.value = 0
      currentRound.value = 1
      clickSequence.value = []
      currentPreviewStepIndex.value = null
      historyStack.value = [{
        owners: [],
        turnPickedKeys: [],
        playerIndex: 0,
        round: 1
      }]
      historyIndex.value = 0
      sessionFontEmbedCSS = undefined

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
    const recordSequenceStep = (key: string, text: string, player: Player) => {
      const existing = clickSequence.value.find(s => s.key === key)
      if (existing) {
        existing.revealedSnapshot = Array.from(unitOwnerMap.value.entries())
        return
      }

      const count = nonSymbolUnits.value.filter(u => u.key === key).length
      clickSequence.value.push({
        id: Date.now() + Math.random(),
        order: clickSequence.value.length + 1,
        text,
        key,
        revealedSnapshot: Array.from(unitOwnerMap.value.entries()),
        count,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        round: currentRound.value
      })
    }

    // 撤回序列最后一步
    const undoLastStep = () => {
      if (clickSequence.value.length === 0) return
      const removed = clickSequence.value.pop()
      if (clickSequence.value.length === 0) {
        unitOwnerMap.value.clear()
        unitOwnerMap.value = new Map()
        currentTurnPickedKeys.value = []
      } else {
        const lastStep = clickSequence.value[clickSequence.value.length - 1]
        unitOwnerMap.value = new Map(lastStep.revealedSnapshot)
        currentTurnPickedKeys.value = currentTurnPickedKeys.value.filter(k => k !== removed?.key)
      }
      saveStateToHistory()
      showToast(`已撤回序列最后一步【${removed?.text}】`)
    }

    // 删除序列中的指定步骤
    const removeStep = (idx: number) => {
      if (idx < 0 || idx >= clickSequence.value.length) return
      const removed = clickSequence.value.splice(idx, 1)[0]
      clickSequence.value.forEach((s, i) => (s.order = i + 1))
      if (removed) {
        unitOwnerMap.value.delete(removed.key)
        unitOwnerMap.value = new Map(unitOwnerMap.value)
        currentTurnPickedKeys.value = currentTurnPickedKeys.value.filter(k => k !== removed.key)
      }
      saveStateToHistory()
      showToast(`已移除第 ${idx + 1} 步【${removed?.text}】`)
    }

    // 清空序列（重置正文回到未高亮状态）
    const clearSequence = () => {
      clickSequence.value = []
      currentPreviewStepIndex.value = null
      unitOwnerMap.value.clear()
      unitOwnerMap.value = new Map()
      currentTurnPickedKeys.value = []
      saveStateToHistory()
      showToast('已清空序列并恢复为未高亮状态')
    }

    // 预览某一步骤状态
    const previewStep = (idx: number) => {
      if (idx < 0 || idx >= clickSequence.value.length) return
      const step = clickSequence.value[idx]
      unitOwnerMap.value = new Map(step.revealedSnapshot)
      currentPreviewStepIndex.value = idx
      showToast(`正在预览第 ${step.order} 步画面（【${step.playerName || '玩家'}】高亮【${step.text}】）`)
    }

    // 单元点击处理（支持回合制限制 1~3 个，以及按玩家归属着色）
    const handleUnitClick = (key: string, text: string) => {
      if (!key) return

      const isAlreadyHighlighted = unitOwnerMap.value.has(key)

      if (isAlreadyHighlighted) {
        // 如果是在当前回合由当前玩家选中的，允许反选撤回
        if (currentTurnPickedKeys.value.includes(key)) {
          unitOwnerMap.value.delete(key)
          unitOwnerMap.value = new Map(unitOwnerMap.value)

          const idx = currentTurnPickedKeys.value.indexOf(key)
          if (idx !== -1) {
            currentTurnPickedKeys.value.splice(idx, 1)
          }

          if (isRecordingSequence.value) {
            const sIdx = clickSequence.value.findIndex(s => s.key === key)
            if (sIdx !== -1) {
              clickSequence.value.splice(sIdx, 1)
              clickSequence.value.forEach((s, i) => (s.order = i + 1))
            }
          }

          saveStateToHistory()
          showToast(`已取消选择【${text}】 (本回合已选 ${currentTurnPickedKeys.value.length}/3)`)
          return
        } else {
          const owner = getUnitOwnerPlayer(key)
          showToast(`【${text}】已被【${owner?.name || '其他回合'}】高亮，不可撤销`, 'warning')
          return
        }
      }

      // 尚未高亮，尝试高亮
      if (turnBasedMode.value && currentTurnPickedKeys.value.length >= 3) {
        showToast(`⚠️ 本回合已选满 3 个（已达上限），请点击“结束回合”或撤销当前选择`, 'warning')
        return
      }

      const curP = currentPlayer.value
      unitOwnerMap.value.set(key, { playerId: curP.id, round: currentRound.value })
      unitOwnerMap.value = new Map(unitOwnerMap.value)
      currentTurnPickedKeys.value.push(key)

      if (isRecordingSequence.value) {
        recordSequenceStep(key, text, curP)
      }

      saveStateToHistory()

      if (turnBasedMode.value && currentTurnPickedKeys.value.length === 3) {
        showToast(`🎉【${curP.name}】已选满 3 个！可点击“结束回合”轮到下一位玩家`, 'success')
      } else {
        showToast(`【${curP.name}】已高亮【${text}】(本轮 ${currentTurnPickedKeys.value.length}/3)`)
      }
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

    // 检查 unicode-range 是否命中目标文本中的任一字符
    const doesUnicodeRangeMatch = (unicodeRange: string, text: string): boolean => {
      if (!unicodeRange) return true
      const ranges = unicodeRange.split(',').map(r => r.trim())
      for (const char of text) {
        const code = char.codePointAt(0)
        if (code === undefined) continue
        for (const range of ranges) {
          const clean = range.replace(/^U\+/i, '').trim()
          if (clean.includes('-')) {
            const [startStr, endStr] = clean.split('-')
            const start = parseInt(startStr, 16)
            const end = parseInt(endStr, 16)
            if (code >= start && code <= end) return true
          } else if (clean.includes('?')) {
            const start = parseInt(clean.replace(/\?/g, '0'), 16)
            const end = parseInt(clean.replace(/\?/g, 'f'), 16)
            if (code >= start && code <= end) return true
          } else {
            if (code === parseInt(clean, 16)) return true
          }
        }
      }
      return false
    }

    // 根据当前文章内容，仅提取并嵌入实际使用到的字体规则（毫秒级极速打包，100% 避免字符遗漏与粗细不一）
    const compileArticleFontEmbedCSS = async (text: string): Promise<string> => {
      const fontRules: CSSFontFaceRule[] = []

      // 1. 遍历已载入的样式表规则，只筛选命中文本的 @font-face 切片
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const rules = sheet.cssRules || []
          for (const rule of Array.from(rules)) {
            if (rule instanceof CSSFontFaceRule) {
              const family = rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim()
              if (family === 'Noto Sans SC' || family === 'Noto Serif') {
                const range = rule.style.getPropertyValue('unicode-range')
                if (!range || doesUnicodeRangeMatch(range, text)) {
                  fontRules.push(rule)
                }
              }
            }
          }
        } catch {
          // 忽略跨域样式表受限
        }
      }

      // 2. 若命中规则，则转为 Base64 Data URL 嵌入
      if (fontRules.length > 0) {
        const embeddedList = await Promise.all(
          fontRules.map(async (rule) => {
            const css = rule.cssText
            const match = css.match(/url\((['"]?)(.*?)\1\)/)
            if (!match || !match[2] || match[2].startsWith('data:')) {
              return css
            }
            try {
              const res = await fetch(match[2])
              const blob = await res.blob()
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
              return css.replace(match[0], `url("${dataUrl}")`)
            } catch {
              return ''
            }
          })
        )
        const result = embeddedList.filter(Boolean).join('\n')
        if (result) return result
      }

      // 3. 降级回退
      if (screenBoxRef.value) {
        try {
          return await getFontEmbedCSS(screenBoxRef.value, { preferredFontFormat: 'woff2' })
        } catch {
          return ''
        }
      }

      return ''
    }

    // 捕获展示区 1920p 画面为 PNG Blob
    const captureScreenBoxBlob = async (): Promise<Blob> => {
      if (!screenBoxRef.value) {
        throw new Error('未找到展示区 DOM 元素')
      }

      await nextTick()
      await new Promise(resolve => requestAnimationFrame(resolve))

      const bg = getThemeBackgroundColor()
      // 当开启边框时，边框SVG应完整铺满整个画面，底色设为透明以杜绝任何底色白边漏出；若未开启边框，则填充对应录屏主题底色
      const canvasBg = showBoarder.value ? undefined : bg

      const blob = await toBlob(screenBoxRef.value, {
        width: 1920,
        height: boxHeight.value,
        pixelRatio: 1,
        cacheBust: false,
        fontEmbedCSS: sessionFontEmbedCSS,
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

      if (!blob) {
        throw new Error('生成图片失败')
      }

      return blob
    }

    // 导出当前画面（直接将展示区当前状态导出为一张 1920p 图片）
    const exportCurrentFrame = async () => {
      if (isExporting.value) return
      hoveredKey.value = null
      isExporting.value = true

      try {
        showToast('正在导出当前画面 1920p 高清图片...', 'info')

        if (!sessionFontEmbedCSS) {
          try {
            sessionFontEmbedCSS = await compileArticleFontEmbedCSS(titleText.value + ' ' + contentText.value)
          } catch (e) {
            console.warn('获取字体嵌入样式失败:', e)
            sessionFontEmbedCSS = ''
          }
        }

        const safeTitle = (titleText.value.trim() || '未命名文章').replace(/[\\/:*?"<>|]/g, '_')
        const filename = `${safeTitle}_当前画面.png`
        const blob = await captureScreenBoxBlob()

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 5000)

        showToast(`🎉 已成功导出当前画面：${filename}`, 'success')
      } catch (err: any) {
        console.error('导出当前画面失败:', err)
        showToast(`导出失败: ${err.message || '渲染异常'}`, 'warning')
      } finally {
        isExporting.value = false
      }
    }

    // 打开批量导出配置弹窗
    const openExportModal = () => {
      if (clickSequence.value.length === 0) {
        showToast('当前尚未记录高亮顺序，请先在正文点击单词或汉字', 'warning')
        return
      }
      exportModalVisible.value = true
    }

    // 开始执行批量导出
    const startExport = async () => {
      if (clickSequence.value.length === 0 || isExporting.value) return

      hoveredKey.value = null
      hoveredKey.value = null
      const originalOwnerState = new Map(unitOwnerMap.value)
      isExporting.value = true
      exportProgress.value = 0
      exportStatusText.value = '准备渲染...'

      const safeTitle = (titleText.value.trim() || '未命名文章').replace(/[\\/:*?"<>|]/g, '_')
      const totalSteps =
        clickSequence.value.length +
        (includeInitialFrame.value ? 1 : 0) +
        (includeFinalFullRevealFrame.value ? 1 : 0)
      let completedSteps = 0

      try {
        // 1. 首次导出预先提取当前文章命中的字体切片
        if (!sessionFontEmbedCSS) {
          exportStatusText.value = '正在预编译高清字体资源...'
          try {
            sessionFontEmbedCSS = await compileArticleFontEmbedCSS(titleText.value + ' ' + contentText.value)
          } catch (e) {
            console.warn('获取字体嵌入样式失败，将自动降级:', e)
            sessionFontEmbedCSS = ''
          }
        }

        if (exportAsZip.value) {
          const zip = new JSZip()
          const folder = zip.folder(`${safeTitle}_高亮序列_1920p`) || zip

          // 若勾选，先渲染第 00 步（全初始未高亮）
          if (includeInitialFrame.value) {
            exportStatusText.value = `正在渲染第 00 步: 00_${safeTitle}_初始.png (1 / ${totalSteps})`
            unitOwnerMap.value = new Map()
            const blob = await captureScreenBoxBlob()
            folder.file(`00_${safeTitle}_初始.png`, blob)
            completedSteps++
            exportProgress.value = Math.round((completedSteps / totalSteps) * 90)
            await new Promise(resolve => setTimeout(resolve, 20))
          }

          // 逐帧渲染记录的每个高亮步骤 (保持各自玩家高亮颜色)
          for (let i = 0; i < clickSequence.value.length; i++) {
            const step = clickSequence.value[i]
            const orderStr = String(step.order).padStart(2, '0')
            const safeText = step.text.replace(/[\\/:*?"<>|]/g, '_')
            const pPrefix = step.playerName ? `[${step.playerName.split(' ')[0]}]_` : ''
            const filename = `${orderStr}_${pPrefix}${safeTitle}_${safeText}.png`

            exportStatusText.value = `正在渲染第 ${orderStr} 步: ${filename} (${completedSteps + 1} / ${totalSteps})`
            unitOwnerMap.value = new Map(step.revealedSnapshot)

            const blob = await captureScreenBoxBlob()
            folder.file(filename, blob)

            completedSteps++
            exportProgress.value = Math.round((completedSteps / totalSteps) * 90)
            await new Promise(resolve => setTimeout(resolve, 20))
          }

          // 若勾选，渲染最后一步（全正文高亮）
          if (includeFinalFullRevealFrame.value) {
            const finalOrderStr = String(clickSequence.value.length + 1).padStart(2, '0')
            const filename = `${finalOrderStr}_${safeTitle}_全高亮.png`
            exportStatusText.value = `正在渲染最终步: ${filename} (${completedSteps + 1} / ${totalSteps})`
            const fullMap = new Map<string, UnitOwnerInfo>()
            uniqueUnitKeys.value.forEach(k => {
              fullMap.set(k, originalOwnerState.get(k) || { playerId: 1, round: 1 })
            })
            unitOwnerMap.value = fullMap

            const blob = await captureScreenBoxBlob()
            folder.file(filename, blob)

            completedSteps++
            exportProgress.value = Math.round((completedSteps / totalSteps) * 90)
            await new Promise(resolve => setTimeout(resolve, 20))
          }

          // 生成 ZIP 压缩包并下载
          exportStatusText.value = '正在快速打包 ZIP 压缩文件...'
          const zipBlob = await zip.generateAsync(
            { type: 'blob', compression: 'STORE' },
            (metadata) => {
              exportProgress.value = 90 + Math.round(metadata.percent * 0.1)
            }
          )

          const downloadUrl = URL.createObjectURL(zipBlob)
          const link = document.createElement('a')
          link.href = downloadUrl
          link.download = `${safeTitle}_高亮序列_1920p.zip`
          link.click()
          setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000)
        } else {
          // 逐张单独下载 PNG
          const downloadBlob = (blob: Blob, filename: string) => {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = filename
            link.click()
            setTimeout(() => URL.revokeObjectURL(url), 5000)
          }

          if (includeInitialFrame.value) {
            exportStatusText.value = `正在导出: 00_${safeTitle}_初始.png (1 / ${totalSteps})`
            unitOwnerMap.value = new Map()
            const blob = await captureScreenBoxBlob()
            downloadBlob(blob, `00_${safeTitle}_初始.png`)
            completedSteps++
            exportProgress.value = Math.round((completedSteps / totalSteps) * 100)
            await new Promise(resolve => setTimeout(resolve, 80))
          }

          for (let i = 0; i < clickSequence.value.length; i++) {
            const step = clickSequence.value[i]
            const orderStr = String(step.order).padStart(2, '0')
            const safeText = step.text.replace(/[\\/:*?"<>|]/g, '_')
            const pPrefix = step.playerName ? `[${step.playerName.split(' ')[0]}]_` : ''
            const filename = `${orderStr}_${pPrefix}${safeTitle}_${safeText}.png`

            exportStatusText.value = `正在导出: ${filename} (${completedSteps + 1} / ${totalSteps})`
            unitOwnerMap.value = new Map(step.revealedSnapshot)

            const blob = await captureScreenBoxBlob()
            downloadBlob(blob, filename)

            completedSteps++
            exportProgress.value = Math.round((completedSteps / totalSteps) * 100)
            await new Promise(resolve => setTimeout(resolve, 80))
          }

          if (includeFinalFullRevealFrame.value) {
            const finalOrderStr = String(clickSequence.value.length + 1).padStart(2, '0')
            const filename = `${finalOrderStr}_${safeTitle}_全高亮.png`
            exportStatusText.value = `正在导出: ${filename} (${completedSteps + 1} / ${totalSteps})`
            const fullMap = new Map<string, UnitOwnerInfo>()
            uniqueUnitKeys.value.forEach(k => {
              fullMap.set(k, originalOwnerState.get(k) || { playerId: 1, round: 1 })
            })
            unitOwnerMap.value = fullMap

            const blob = await captureScreenBoxBlob()
            downloadBlob(blob, filename)

            completedSteps++
            exportProgress.value = Math.round((completedSteps / totalSteps) * 100)
            await new Promise(resolve => setTimeout(resolve, 80))
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
        unitOwnerMap.value = originalOwnerState
      }
    }

    // 批量操作
    const highlightAll = () => {
      nonSymbolUnits.value.forEach(u => {
        if (!unitOwnerMap.value.has(u.key)) {
          unitOwnerMap.value.set(u.key, { playerId: currentPlayer.value.id, round: currentRound.value })
        }
      })
      unitOwnerMap.value = new Map(unitOwnerMap.value)
      saveStateToHistory()
      showToast('已全部高亮', 'success')
    }

    const hideAll = () => {
      unitOwnerMap.value.clear()
      unitOwnerMap.value = new Map()
      currentTurnPickedKeys.value = []
      clickSequence.value = []
      currentPreviewStepIndex.value = null
      saveStateToHistory()
      showToast('已取消全部高亮')
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
        setBoxHeight(1080)
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
      const indicatorsHeight = hideIndicators.value ? 0 : 36
      return boxHeight.value + indicatorsHeight + 20
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

      // Enter 键: 若当前回合已选 >= 1 个词，快捷结束回合
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (currentTurnPickedKeys.value.length >= 1) {
          endCurrentTurn()
          e.preventDefault()
          return
        }
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

      // 预先将题目边框 SVG 转换为 Data URL，避免导出逐帧重复网络请求
      if (questionBoarderSvg && !questionBoarderSvg.startsWith('data:')) {
        fetch(questionBoarderSvg)
          .then(res => res.blob())
          .then(blob => {
            const reader = new FileReader()
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                boarderDataUrl.value = reader.result
              }
            }
            reader.readAsDataURL(blob)
          })
          .catch(() => {})
      }
    })

    onUnmounted(() => {
      window.removeEventListener('resize', updateFitScale)
      window.removeEventListener('keydown', handleKeyDown)
    })

    return {
      players,
      currentPlayerIndex,
      currentRound,
      turnBasedMode,
      currentPlayer,
      currentTurnPickedKeys,
      unitOwnerMap,
      addPlayer,
      removePlayer,
      renamePlayer,
      setCurrentPlayerIndex,
      endCurrentTurn,
      cancelCurrentTurnPicks,
      getPlayerHighlightCount,
      getUnitOwnerPlayer,
      getUnitPlayerStyle,
      fileInputRef,
      stageWrapperRef,
      screenBoxRef,
      isDragOver,
      currentFileName,
      titleText,
      contentText,
      paragraphUnits,
      hoveredKey,
      clickMode,
      theme,
      titleFontSize,
      bodyFontSize,
      titleStyle,
      bodyStyle,
      charMargin,
      isVerticalCenter,
      textAlign,
      columnCount,
      columnGap,
      showSidebar,
      showTopTurnBar,
      isSidebarTurnSectionCollapsed,
      sidebarPlayerFilter,
      toggleSidebar,
      sidebarTab,
      sidebarSearch,
      sidebarSort,
      allUniqueUnits,
      highlightedList,
      displayedSidebarUnits,
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
      highlightedNonSymbolCount,
      highlightProgress,
      uniqueUnitCount,
      uniqueHighlightedCount,
      isUnitHighlighted,
      isSlashChar,
      isSpaceChar,
      isMatchHover,
      setHoveredKey,
      clearHoveredKey,
      triggerFileInput,
      handleFileSelect,
      handleDrop,
      loadSampleText,
      handleUnitClick,
      highlightAll,
      hideAll,
      undo,
      redo,
      showBoarder,
      hideIndicators,
      questionBoarderSvg,
      boarderDataUrl,
      isNativeBoarderHeight,
      setBoarderNativeSize,
      setBoxHeight,
      toggleAutoHeight,
      clickSequence,
      isRecordingSequence,
      currentPreviewStepIndex,
      exportModalVisible,
      isExporting,
      exportProgress,
      exportStatusText,
      includeInitialFrame,
      includeFinalFullRevealFrame,
      exportAsZip,
      undoLastStep,
      removeStep,
      clearSequence,
      previewStep,
      toggleRecording,
      exportCurrentFrame,
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
  font-family: 'Noto Serif', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'Source Han Sans SC', sans-serif;
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

/* ==================== 回合制与玩家控制面板 ==================== */
.turn-player-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: linear-gradient(180deg, #1c1e2a 0%, #161720 100%);
  border-bottom: 1px solid #2d3142;
  gap: 16px;
  flex-shrink: 0;
  z-index: 85;
}

.turn-bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.player-count-ctrl {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #cbd5e1;
  font-weight: 600;
  white-space: nowrap;
}

.btn-group-tight {
  display: flex;
  gap: 2px;
}

.count-btn {
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 4px;
  background-color: #272b3c;
  border: 1px solid #3d445f;
  color: #ffffff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.count-btn:hover:not(:disabled) {
  background-color: #3b82f6;
  border-color: #60a5fa;
}

.count-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.players-chips-container {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 4px;
}

.player-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  background-color: #202434;
  border: 1px solid #343b52;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  white-space: nowrap;
}

.player-chip:hover {
  background-color: #282d42;
  border-color: #4a5475;
  transform: translateY(-1px);
}

.player-chip.is-current-turn {
  background-color: #1e293b;
  border-color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.35);
  font-weight: 700;
}

.player-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.player-name-text {
  font-size: 12px;
  color: #e2e8f0;
}

.player-score-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
}

.current-turn-badge-tag {
  font-size: 10px;
  background-color: #38bdf8;
  color: #0f172a;
  padding: 1px 5px;
  border-radius: 8px;
  font-weight: 800;
}

.turn-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.round-indicator {
  font-size: 12px;
  color: #94a3b8;
  white-space: nowrap;
}

.round-indicator strong {
  color: #f59e0b;
  font-size: 14px;
}

.turn-status-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 12px;
  border-radius: 8px;
  border: 1px solid;
  transition: all 0.2s;
}

.active-player-name {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.quota-meter {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.quota-meter-label {
  color: #94a3b8;
}

.quota-steps {
  display: flex;
  gap: 4px;
}

.quota-pill {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: #272a3a;
  border: 1px solid #3d435c;
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.quota-pill.filled {
  background-color: #10b981;
  border-color: #34d399;
  color: #ffffff;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
}

.quota-fraction {
  font-size: 12px;
  color: #e2e8f0;
}

.quota-tip-dim {
  color: #64748b;
  font-size: 11px;
}

.quota-tip-ok {
  color: #38bdf8;
  font-size: 11px;
}

.quota-tip-success {
  color: #10b981;
  font-size: 11px;
  font-weight: 700;
}

.btn-turn-action {
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 6px;
  background-color: #334155;
  color: #94a3b8;
  border: 1px solid #475569;
  transition: all 0.2s;
}

.btn-turn-action.btn-ready {
  background: linear-gradient(135deg, #0284c7, #2563eb);
  color: #ffffff;
  border-color: #38bdf8;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
}

.btn-turn-action.btn-ready:hover {
  background: linear-gradient(135deg, #0369a1, #1d4ed8);
  transform: translateY(-1px);
}

.btn-turn-action.btn-full {
  background: linear-gradient(135deg, #059669, #10b981);
  color: #ffffff;
  border-color: #34d399;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.5);
  animation: pulseButton 1.5s infinite;
}

@keyframes pulseButton {
  0% { box-shadow: 0 0 8px rgba(16, 185, 129, 0.4); }
  50% { box-shadow: 0 0 16px rgba(16, 185, 129, 0.75); }
  100% { box-shadow: 0 0 8px rgba(16, 185, 129, 0.4); }
}

.btn-outline-danger {
  background-color: transparent;
  border: 1px solid #ef4444;
  color: #f87171;
}

.btn-outline-danger:hover {
  background-color: rgba(239, 68, 68, 0.15);
}

.mode-toggle-btn {
  background-color: #242838;
  border: 1px solid #3a425b;
  color: #94a3b8;
}

.mode-toggle-btn.active {
  background-color: #1e3a8a;
  border-color: #3b82f6;
  color: #bfdbfe;
}

/* 序列步骤中的玩家标签 */
.step-player-tag {
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
  padding: 1px 5px;
  border-radius: 3px;
  margin-right: 3px;
  letter-spacing: 0.02em;
}

/* 侧边栏中的玩家标签 */
.item-player-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  border: 1px solid;
  margin-left: auto;
  margin-right: 4px;
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

.export-current-btn {
  background-color: #0f766e;
  border: 1px solid #14b8a6;
  color: #ccfbf1;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(13, 148, 136, 0.3);
}

.export-current-btn:hover:not(:disabled) {
  background-color: #0d9488;
  border-color: #2dd4bf;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(20, 184, 166, 0.45);
  transform: translateY(-1px);
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

/* 工作区横向主体布局：主舞台与右侧侧边栏 */
.workspace-layout {
  flex: 1;
  display: flex;
  flex-direction: row;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

/* 舞台视口滚动容器 */
.stage-viewport {
  flex: 1;
  min-width: 0;
  overflow: auto;
  position: relative;
  background-color: #0f1015;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 20px;
}

/* ==================== 侧边栏：已高亮词汇/字符面板 ==================== */
.highlight-sidebar {
  width: 340px;
  min-width: 300px;
  max-width: 440px;
  background-color: #181a24;
  border-left: 1px solid #2d3142;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 20;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #1f2333;
  border-bottom: 1px solid #2d3142;
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-icon {
  font-size: 16px;
}

.sidebar-title h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
}

.sidebar-badge {
  background-color: #0ea5e9;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
}

.sidebar-close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.sidebar-close-btn:hover {
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.1);
}

/* 侧边栏内的玩家与回合制板块 */
.sidebar-turn-section {
  border-bottom: 1px solid #282c3d;
  background-color: #151722;
  display: flex;
  flex-direction: column;
}

.sidebar-turn-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: #191c28;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid #25293a;
  transition: background-color 0.15s;
}

.sidebar-turn-header:hover {
  background-color: #202434;
}

.sidebar-turn-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #f1f5f9;
}

.sidebar-mini-pill {
  font-size: 10px;
  font-weight: 700;
  color: #ffffff;
  padding: 1px 7px;
  border-radius: 10px;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
}

.mini-collapse-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
}

.sidebar-turn-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-turn-card {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.sidebar-turn-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-round-tag {
  font-size: 11px;
  color: #94a3b8;
}

.sidebar-round-tag strong {
  color: #f59e0b;
  font-size: 13px;
}

.mini-mode-btn {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #222638;
  border: 1px solid #373f5a;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
}

.mini-mode-btn.active {
  background-color: #1e3a8a;
  border-color: #3b82f6;
  color: #bfdbfe;
}

.sidebar-active-player-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-active-avatar {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 8px currentColor;
}

.sidebar-active-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-active-name {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-active-quota-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.quota-mini-label {
  color: #94a3b8;
  font-size: 10px;
}

.sidebar-quota-dots {
  display: flex;
  gap: 4px;
}

.sidebar-quota-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #272a3a;
  border: 1px solid #3d435c;
  color: #64748b;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.sidebar-quota-dot.filled {
  background-color: #10b981;
  border-color: #34d399;
  color: #ffffff;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
}

.sidebar-quota-text {
  font-size: 11px;
  color: #e2e8f0;
}

.sidebar-turn-actions-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sidebar-end-turn-btn {
  flex: 1;
  font-weight: 700;
  font-size: 11px;
  padding: 5px 8px;
  border-radius: 6px;
  background-color: #334155;
  color: #94a3b8;
  border: 1px solid #475569;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.sidebar-end-turn-btn.btn-ready {
  background: linear-gradient(135deg, #0284c7, #2563eb);
  color: #ffffff;
  border-color: #38bdf8;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
}

.sidebar-end-turn-btn.btn-ready:hover {
  background: linear-gradient(135deg, #0369a1, #1d4ed8);
}

.sidebar-end-turn-btn.btn-full {
  background: linear-gradient(135deg, #059669, #10b981);
  color: #ffffff;
  border-color: #34d399;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
  animation: pulseButton 1.5s infinite;
}

.sidebar-cancel-turn-btn {
  font-size: 11px;
  padding: 4px 8px;
  white-space: nowrap;
}

.sidebar-players-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar-players-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-section-subtitle {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.sidebar-players-chips {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(95px, 1fr));
  gap: 5px;
}

.sidebar-player-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 6px;
  background-color: #1f2333;
  border: 1px solid #2e344a;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.15s;
  user-select: none;
}

.sidebar-player-chip:hover {
  background-color: #272d42;
  border-color: #3d4666;
  transform: translateY(-1px);
}

.sidebar-player-chip.is-current {
  border-color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.12);
  font-weight: 700;
}

.sidebar-player-chip.is-filtered {
  box-shadow: 0 0 6px rgba(56, 189, 248, 0.5);
}

.sidebar-chip-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #e2e8f0;
  font-size: 11px;
}

.sidebar-chip-count {
  font-size: 10px;
  font-weight: 700;
  padding: 0 4px;
  border-radius: 4px;
  font-family: monospace;
}

.sidebar-chip-turn-tag {
  font-size: 9px;
  font-weight: 700;
  padding: 0 3px;
  border-radius: 3px;
  background-color: #38bdf8;
  color: #0f172a;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid #2d3142;
  background-color: #14161f;
}

.tab-btn {
  flex: 1;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  white-space: nowrap;
}

.tab-btn:hover {
  color: #cbd5e1;
  background-color: rgba(255, 255, 255, 0.03);
}

.tab-btn.active {
  color: #38bdf8;
  border-bottom-color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.08);
}

.sidebar-filter-bar {
  padding: 10px 12px;
  border-bottom: 1px solid #282c3d;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #1a1d29;
}

.sidebar-player-filter-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.player-filter-label {
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
}

.player-filter-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.player-filter-btn {
  background-color: #161822;
  border: 1px solid #33394f;
  color: #94a3b8;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}

.player-filter-btn:hover {
  background-color: #222638;
  color: #e2e8f0;
}

.player-filter-btn.active {
  background-color: #2563eb;
  border-color: #38bdf8;
  color: #ffffff;
}

.filter-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sidebar-search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.sidebar-search-box .search-icon {
  position: absolute;
  left: 8px;
  font-size: 12px;
  color: #64748b;
  pointer-events: none;
}

.sidebar-search-input {
  width: 100%;
  padding: 5px 28px 5px 26px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid #33394f;
  background-color: #12141c;
  color: #e2e8f0;
  outline: none;
  transition: border-color 0.2s;
}

.sidebar-search-input:focus {
  border-color: #38bdf8;
}

.clear-search-btn {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
}

.sidebar-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sidebar-sort-select {
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 4px;
  background-color: #12141c;
  border: 1px solid #33394f;
  color: #cbd5e1;
  outline: none;
}

.sidebar-quick-btns {
  display: flex;
  gap: 4px;
}

.sidebar-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 36px 16px;
  text-align: center;
  color: #64748b;
}

.sidebar-empty .empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.sidebar-empty p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background-color: #1f2333;
  border: 1px solid #2d3348;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}

.sidebar-item:hover {
  background-color: #272c40;
  border-color: #3f4765;
  transform: translateX(-2px);
}

.sidebar-item.is-hovered {
  outline: 2px solid #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
}

.sidebar-item.is-highlighted {
  border-color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.12);
}

.item-type-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
}

.badge-word {
  background-color: #3b82f6;
  color: #ffffff;
}

.badge-char {
  background-color: #8b5cf6;
  color: #ffffff;
}

.item-text {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Noto Sans SC', 'PingFang SC', monospace, sans-serif;
}

.item-player-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 0;
}

.item-count {
  font-size: 11px;
  color: #94a3b8;
  font-family: monospace;
  background-color: #12141c;
  padding: 1px 6px;
  border-radius: 4px;
}

.item-remove-btn {
  background: none;
  border: none;
  color: #f87171;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}

.item-remove-btn:hover {
  background-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.item-add-btn {
  background: none;
  border: none;
  color: #38bdf8;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}

.item-add-btn:hover {
  background-color: rgba(56, 189, 248, 0.2);
  color: #0ea5e9;
}

.sidebar-footer {
  padding: 8px 12px;
  border-top: 1px solid #282c3d;
  background-color: #14161f;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #94a3b8;
}

.sidebar-footer .coverage-percent {
  color: #10b981;
  font-size: 12px;
}

.sidebar-footer .dim-stat {
  color: #64748b;
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
  padding: 40px 80px;
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
  margin-bottom: 20px;
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
  column-fill: balance;
}

/* 标点符号 */
.char-symbol {
  display: inline-block;
  vertical-align: middle;
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
}

/* 斜杠全宽方格样式 (与字块方格 1.25em 对齐居中) */
.char-symbol.is-slash {
  display: inline-block;
  width: 1.25em;
  height: 1.25em;
  line-height: 1.25;
  text-align: center;
  vertical-align: middle;
  font-family: 'Noto Serif', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'Source Han Sans SC', sans-serif;
  font-weight: 700;
  box-sizing: border-box;
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
}

/* 空格占位 (作为符号默认直接显示) */
.char-symbol.is-space {
  display: inline-block;
  width: 0.5em;
  min-width: 0.5em;
  max-width: 0.5em;
  height: 1.25em;
  line-height: 1.25;
  text-align: center;
  vertical-align: middle;
  box-sizing: border-box;
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
}

/* 上帝视角单元格 (God Unit Block) */
.god-char-block {
  font-family: 'Noto Serif', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'Source Han Sans SC', sans-serif;
  display: inline-block;
  min-width: 1.25em;
  width: auto;
  padding: 0 0.15em;
  height: 1.25em;
  line-height: 1.25;
  text-align: center;
  vertical-align: middle;
  cursor: pointer;
  border-radius: 3px;
  position: relative;
  box-sizing: border-box;
  white-space: nowrap;
  user-select: none;
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
  page-break-inside: avoid;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s, transform 0.15s;
}

.god-char-block.is-word {
  padding: 0 0.35em;
  letter-spacing: 0.02em;
}

/* 未高亮单元：柔和底色，字体清晰可见 */
.god-char-block.is-unselected,
.god-char-block.is-hidden {
  background-color: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
}

.god-char-block.is-unselected:hover,
.god-char-block.is-hidden:hover {
  background-color: #e2e8f0;
  color: #1e293b;
  transform: scale(1.08);
}

/* 已高亮单元：高亮蓝显示 */
.god-char-block.is-highlighted,
.god-char-block.is-revealed {
  background-color: #e0f2fe;
  color: #0284c7;
  font-weight: 700;
  border: 1px solid #7dd3fc;
  box-shadow: 0 1px 3px rgba(2, 132, 199, 0.15);
}

.god-char-block.is-highlighted:hover,
.god-char-block.is-revealed:hover {
  background-color: #bae6fd;
  transform: scale(1.08);
}

/* 悬停匹配全篇高亮 (金色光晕) */
.god-char-block.is-hover-match {
  outline: 2px solid #f59e0b !important;
  outline-offset: 1px !important;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.7) !important;
  z-index: 50 !important;
  transform: scale(1.1) !important;
}

/* ==================== 录屏主题定制 ==================== */

/* 1. 经典白底 (Light) */
.god-mode-view.theme-light .screen-box-1080p {
  background-color: #ffffff;
  color: #0f172a;
}
.god-mode-view.theme-light .god-char-block.is-unselected,
.god-mode-view.theme-light .god-char-block.is-hidden {
  background-color: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
}
.god-mode-view.theme-light .god-char-block.is-highlighted,
.god-mode-view.theme-light .god-char-block.is-revealed {
  background-color: #e0f2fe;
  color: #0284c7;
  border-color: #7dd3fc;
}

/* 2. 暗黑模式 (Dark) */
.god-mode-view.theme-dark .screen-box-1080p {
  background-color: #121216;
  color: #f1f5f9;
  border-color: #2a2a36;
}
.god-mode-view.theme-dark .god-char-block.is-unselected,
.god-mode-view.theme-dark .god-char-block.is-hidden {
  background-color: #242430;
  color: #94a3b8;
  border: 1px solid #333344;
}
.god-mode-view.theme-dark .god-char-block.is-highlighted,
.god-mode-view.theme-dark .god-char-block.is-revealed {
  background-color: #0369a1;
  color: #ffffff;
  border-color: #38bdf8;
}

/* 3. 绿幕抠像模式 (Chroma Green) */
.god-mode-view.theme-green .screen-box-1080p {
  background-color: #00ff00 !important;
  color: #000000;
}
.god-mode-view.theme-green .god-char-block.is-unselected,
.god-mode-view.theme-green .god-char-block.is-hidden {
  background-color: #ffffff;
  color: #334155;
  border: 1px solid #94a3b8;
}
.god-mode-view.theme-green .god-char-block.is-highlighted,
.god-mode-view.theme-green .god-char-block.is-revealed {
  background-color: #0284c7;
  color: #ffffff;
  border-color: #0369a1;
}

/* 4. 蓝幕抠像模式 (Chroma Blue) */
.god-mode-view.theme-blue .screen-box-1080p {
  background-color: #0000ff !important;
  color: #ffffff;
}
.god-mode-view.theme-blue .god-char-block.is-unselected,
.god-mode-view.theme-blue .god-char-block.is-hidden {
  background-color: #ffffff;
  color: #1e293b;
  border: 1px solid #94a3b8;
}
.god-mode-view.theme-blue .god-char-block.is-highlighted,
.god-mode-view.theme-blue .god-char-block.is-revealed {
  background-color: #facc15;
  color: #000000;
  border-color: #eab308;
}

/* 5. 透明背景模式 (Transparent) */
.god-mode-view.theme-transparent .screen-box-1080p {
  background-color: transparent !important;
  color: #0f172a;
}
.god-mode-view.theme-transparent .god-char-block.is-unselected,
.god-mode-view.theme-transparent .god-char-block.is-hidden {
  background-color: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
}
.god-mode-view.theme-transparent .god-char-block.is-highlighted,
.god-mode-view.theme-transparent .god-char-block.is-revealed {
  background-color: #e0f2fe;
  color: #0284c7;
  border-color: #7dd3fc;
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

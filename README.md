# NGU Digest 百科猜字游戏

一个有趣的猜字游戏，读取百科文本内容，将所有文字隐藏为黑方块，通过猜字来逐步揭示内容。

## 游戏特色

- 支持单人和多人对战模式（2-6人）
- 智能文字识别，自动隐藏汉字、字母和数字，保留符号可见
- 猜中标题中的字可获得额外回合机会
- 纯CSS实现的黑方块效果，无需图片资源
- 响应式设计，支持拖拽上传文件

## 游戏规则

### 基本规则
1. 上传一个txt文件，第一行为标题，其余为正文
2. 所有汉字、字母和数字都会被隐藏为黑方块，符号保持可见
3. 每次只能输入一个字进行猜测，符号不能作为猜测内容
4. 猜对的字会在文章中所有位置显示出来
5. 猜错的字会显示在错误区域，并且不能重复提交

### 单人模式
- 猜出标题中的所有文字即可获胜
- 可随时手动结束游戏查看完整文章

### 多人模式
1. 玩家按顺序轮流猜字
2. 猜中任何字得1分
3. 猜中标题中的字获得额外回合机会
4. 猜错或只猜中正文中的字，轮到下一个玩家
5. 猜出标题最后一个字的玩家获胜

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run serve

# 构建生产版本
npm run build
```

访问 http://localhost:5173 开始游戏

## 技术栈

- Vue 3 + Composition API
- TypeScript
- Vue Router 4
- Vite
- SCSS

## 项目结构

```
src/
├── assets/          # 静态资源和样式
├── components/      # 通用组件
│   └── Footer.vue   # 页脚组件
├── router/          # 路由配置
├── types/           # TypeScript类型定义
│   └── game.ts      # 游戏相关类型
├── utils/           # 工具函数
│   └── textProcessor.ts  # 文本处理工具
├── views/           # 页面视图
│   ├── HomeView.vue # 首页 - 文件上传和玩家设置
│   └── GameView.vue # 游戏页面
├── App.vue          # 根组件
└── main.ts          # 入口文件
```

## 版权信息

(c) NGU Team, MPAM Laboratory. 本项目为 NGU Digest 视频企划中使用的内容，点此访问[GitHub Repo](https://github.com/mpamlab/NGU-Digest-GuessWiki)

本项目灵感来源：https://xiaoce.fun/baike/，本企划灵感来源：https://www.youtube.com/watch?v=JXl7-xxhGso

更多内容请参考本企划 [GitHub文档](https://github.com/MPAMlab/NGU-Digest-Documentation)

## License

GPL-2.0
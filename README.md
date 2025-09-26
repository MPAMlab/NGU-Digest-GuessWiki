# 百科猜字游戏

一个有趣的猜字游戏，读取百科文本内容，将所有文字隐藏为黑方块，通过猜字来逐步揭示内容。

## 游戏规则

1. 上传一个txt文件，第一行为标题，其余为正文
2. 所有汉字、字母和数字都会被隐藏为黑方块（■），符号保持可见
3. 每次只能输入一个字进行猜测
4. 猜对的字会在文章中所有位置显示出来
5. 猜错的字会显示在错误区域
6. 当标题中的所有文字都被猜出时，游戏胜利

## 技术栈

- Vue 3
- TypeScript
- Element Plus
- Vue Router

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run serve

# 构建生产版本
npm run build
```

## 项目结构

```
src/
├── assets/      # 静态资源
├── components/  # 组件
├── router/      # 路由配置
├── types/       # TypeScript类型定义
├── utils/       # 工具函数
├── views/       # 页面视图
├── App.vue      # 根组件
└── main.ts      # 入口文件
```
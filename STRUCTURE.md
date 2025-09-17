# 目录结构说明

## 新的项目结构

```
src/
├── App.jsx                                 # 主应用组件
├── main.jsx                               # 入口文件
├── components/                            # 组件目录
│   └── workspace/                         # 工作区模块
│       ├── Navigation.jsx                 # 导航组件
│       ├── ArchiveManager.jsx            # 资料管理组件
│       ├── ScriptEditor.jsx              # 脚本编辑器组件
│       └── modules/                       # 子模块
│           ├── TreeCanvas.jsx            # 画布组件
│           ├── NodeEditModal.jsx         # 节点编辑模态框
│           ├── NodeTooltip.jsx          # 节点悬停提示
│           └── ProjectInfoModal.jsx     # 项目信息模态框
└── styles/                                # 样式目录
    ├── index.css                          # 主样式文件（导入所有样式）
    ├── global.css                         # 全局基础样式
    ├── app.css                            # 应用主框架样式
    ├── workspace.css                      # 工作区样式
    ├── tree-vis.css                       # 树结构可视化样式
    ├── floating-button.css               # 浮动按钮样式
    └── node-edit-modal.css               # 节点编辑模态框样式
```

## 模块化说明

### 组件模块化
- `components/tree_editor/` - 包含所有树结构编辑器相关的组件
- 为未来的其他标签页（如结构生成器）预留了空间

### 样式模块化
- `styles/global.css` - 全局基础样式，包含重置样式和基础变量
- `styles/app.css` - 应用级别样式，包含导航栏和主布局
- `styles/tree-editor.css` - 树结构编辑器专用样式
- `styles/structure-generator.css` - 为未来的结构生成器预留样式
- `styles/index.css` - 主样式文件，使用@import导入所有模块样式

## 扩展指南

### 添加新标签页时：
1. 在 `components/` 下创建新的模块目录，如 `components/structure_generator/`
2. 在 `styles/` 下创建对应的样式文件
3. 在 `styles/index.css` 中导入新的样式文件
4. 在 `App.jsx` 中添加新的标签页逻辑

### 优势：
- **清晰的模块分离**：每个功能模块都有独立的文件夹
- **样式管理**：按功能模块分离CSS，便于维护
- **可扩展性**：为未来功能扩展预留了清晰的结构
- **维护性**：修改某个模块不会影响其他模块

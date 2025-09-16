# 节点悬停提示框功能实现

## 功能概述

在脚本创作页面添加了节点悬停提示框功能，当用户将鼠标悬停在节点上时，会显示包含节点详细信息的提示框。

## 实现细节

### 1. 核心组件

#### NodeTooltip.jsx
- 位置：`frontend/src/components/modules/NodeTooltip.jsx`
- 功能：显示节点详细信息的悬停提示框
- 特性：
  - 半透明背景，毛玻璃效果
  - 自动定位在鼠标上方
  - 显示节点ID、名称、摘要、用户选项、子节点信息
  - 支持统一的浅色主题设计
  - 渐入动画效果

#### NodeTooltip.css
- 位置：`frontend/src/styles/node-tooltip.css`
- 功能：提示框的样式定义
- 特性：
  - 响应式设计
  - 优雅的阴影和边框效果
  - 统一的浅色主题设计

### 2. 事件处理增强

#### EventHandler.js 修改
- 新增悬停状态管理
- 新增鼠标按下状态跟踪
- 添加 `handleHover()` 方法处理鼠标悬停逻辑
- 添加 `clearHover()` 方法清理悬停状态
- 添加 `handleMouseLeave()` 处理鼠标离开画布
- 支持配置化的悬停延迟时间
- 智能状态检测：只有在鼠标未按下时才显示悬停提示框

#### TreeCanvas.jsx 修改
- 新增悬停回调props: `onNodeHoverStart`, `onNodeHoverEnd`
- 更新鼠标移动事件处理，传递节点位置检测函数
- 添加鼠标离开画布事件处理

#### ScriptEditor.jsx 修改
- 集成 NodeTooltip 组件
- 添加提示框状态管理
- 设置悬停回调处理函数

### 3. 配置增强

#### config.js 更新
- 添加悬停配置选项：
  - `interaction.hover.delay`: 悬停延迟时间（默认500ms）
  - `interaction.hover.tolerance`: 鼠标移动容忍度

### 4. 样式集成

#### index.css 更新
- 导入 NodeTooltip.css 样式文件

## 用户体验

### 使用方式
1. 将鼠标悬停在任意节点上（不按下鼠标按键）
2. 等待500毫秒（可配置）
3. 自动显示包含节点信息的提示框
4. 鼠标移开时提示框自动隐藏
5. 按下鼠标按键（左键或右键）时提示框立即隐藏

### 显示信息
- **节点ID**: 显示为标签形式
- **节点名称**: 粗体显示，作为标题
- **摘要**: 节点的详细描述
- **用户选项**: 用户交互选项
- **内容**: 节点的具体内容（若空则显示"未生成"）
- **子节点信息**: 显示子节点数量和ID列表
- **叶子节点标识**: 对无子节点的节点特殊标注

### 视觉效果
- 半透明白色背景
- 毛玻璃模糊效果（backdrop-filter）
- 优雅的阴影和边框
- 简洁的圆角矩形样式
- 渐入动画效果
- 智能内容省略：长文本自动显示省略号
- 优雅的滚动条设计

## 技术特点

### 性能优化
- 使用定时器避免频繁显示/隐藏
- 鼠标移动时智能检测节点变化
- 离开画布时自动清理状态
- 智能交互检测：拖拽时自动隐藏提示框
- 长内容智能省略，避免提示框过大

### 可配置性
- 悬停延迟时间可配置
- 样式统一设计
- 位置自动计算和调整

### 兼容性
- 支持所有现代浏览器
- 响应式设计适配不同屏幕尺寸
- 与现有功能无冲突

## 文件清单

### 新增文件
1. `frontend/src/components/modules/NodeTooltip.jsx` - 提示框组件
2. `frontend/src/styles/node-tooltip.css` - 提示框样式
3. `frontend/src/components/modules/NodeTooltip.test.js` - 测试脚本

### 修改文件
1. `frontend/src/utils/script_editor/eventHandler.js` - 事件处理器
2. `frontend/src/components/modules/TreeCanvas.jsx` - 画布组件
3. `frontend/src/components/workspace/ScriptEditor.jsx` - 脚本编辑器
4. `frontend/src/utils/script_editor/config.js` - 配置文件
5. `frontend/src/styles/index.css` - 样式入口

## 测试建议

1. 悬停在不同节点上，检查信息显示是否正确
2. 快速移动鼠标，确认不会频繁闪烁
3. 在不同缩放级别下测试位置是否正确
4. 测试鼠标离开画布时提示框是否正确隐藏

## 未来增强

1. 添加更多节点信息（如创建时间、修改时间等）
2. 支持自定义提示框内容
3. 添加键盘快捷键显示/隐藏提示框
4. 支持提示框位置的智能避让（避免超出屏幕）
5. 添加提示框内容的国际化支持
# ScriptEditor 工具类说明

## 概述

为了提高代码的可维护性和可扩展性，我们将原本集中在 `TreeCanvas.jsx` 和其他组件中的各种功能拆分成了多个专门的工具类。每个工具类负责特定的功能领域，具有清晰的职责边界。

## 目录结构

```
src/utils/script_editor/
├── index.js                    # 工具类统一导出文件
├── config.js                   # 配置文件 - 统一管理所有数值设置
├── treeLayout.js              # 树结构自动布局算法
├── coordinateTransform.js     # 坐标转换工具
├── canvasRenderer.js          # Canvas渲染器
├── eventHandler.js            # 事件处理器
├── collisionDetector.js       # 碰撞检测工具
├── checkpointManager.js       # 版本控制和撤销/重做功能
├── treeStructureManager.js    # 树结构编辑管理器
├── treeValidator.js           # 树结构验证工具
├── treeTraversal.js           # 树遍历工具
├── cssHelper.js               # CSS样式处理工具
└── README.md                  # 说明文档
```

## 工具类结构

### 0. 配置管理 (`config.js`)
**职责**: 统一管理所有数值配置
- 节点尺寸配置 (宽度、高度)
- 布局配置 (层级间距、节点间距、起始位置等)
- 渲染配置 (颜色、线宽、字体等)
- 交互配置 (缩放参数、碰撞检测参数等)

**使用方式**:
```javascript
import { TREE_EDITOR_CONFIG } from './config.js';
// 使用配置
const nodeWidth = TREE_EDITOR_CONFIG.node.width;
const levelHeight = TREE_EDITOR_CONFIG.layout.levelHeight;
```

### 1. TreeLayoutManager (`treeLayout.js`)
**职责**: 树结构自动布局算法
- 计算节点的最优位置
- 避免节点重叠
- 保持层级清晰的树状结构
- 支持多根节点的布局

**主要方法**:
- `layoutNodes(nodes)`: 对整个节点数组进行布局
- `calculateSubtreeWidth(nodeId, nodeMap)`: 计算子树宽度
- `layoutTree(...)`: 递归布局单个树

### 2. CoordinateTransformer (`coordinateTransform.js`)
**职责**: 坐标系转换
- 画布坐标与屏幕坐标的转换
- 缩放和平移变换的计算
- 鼠标事件坐标的处理

**主要方法**:
- `setTransform(scale, translate)`: 设置变换参数
- `getNodeScreenPosition(node)`: 获取节点屏幕位置
- `getCanvasPosition(clientX, clientY, canvasRect)`: 客户端坐标转画布坐标
- `calculateZoomTransform(...)`: 计算缩放变换
- `calculateDragTransform(...)`: 计算拖拽变换

### 3. CanvasRenderer (`canvasRenderer.js`)
**职责**: Canvas绘制和渲染
- 节点的绘制
- 边和箭头的绘制
- 画布的清理和变换设置

**主要方法**:
- `setSize(width, height)`: 设置画布尺寸
- `renderTree(nodes, selectedNode, scale, translate)`: 完整渲染树结构
- `renderNodes(nodes, selectedNode)`: 渲染所有节点
- `renderEdges(nodes)`: 渲染所有边
- `clear()`: 清除画布

### 4. EventHandler (`eventHandler.js`)
**职责**: 鼠标交互事件处理
- 拖拽状态管理
- 上下文菜单状态
- 添加边的交互流程
- 事件回调的统一管理

**主要方法**:
- `on(eventType, callback)`: 注册事件回调
- `handleMouseDown/Move/Up(...)`: 鼠标事件处理
- `handleWheel(e)`: 滚轮缩放处理
- `handleContextMenu(...)`: 右键菜单处理
- `getState()`: 获取当前交互状态

### 5. CollisionDetector (`collisionDetector.js`)
**职责**: 碰撞检测和几何计算
- 点与节点的碰撞检测
- 点与边的碰撞检测
- 矩形相交判断
- 节点重叠检测

**主要方法**:
- `getNodeAtPosition(x, y, nodes, ...)`: 获取指定位置的节点
- `getNodesInRect(rect, nodes, ...)`: 获取矩形区域内的节点
- `getEdgeAtPosition(x, y, nodes, ...)`: 获取指定位置的边
- `nodesOverlap(node1, node2, margin)`: 判断节点是否重叠

### 6. CheckpointManager (`checkpointManager.js`)
**职责**: 版本控制和撤销/重做功能
- 创建和管理数据快照
- 撤销/重做操作
- 本地存储管理

**主要方法**:
- `createCheckpoint(data)`: 创建新的检查点
- `undo()`: 撤销到前一个状态
- `redo()`: 重做到下一个状态
- `canUndo()`: 检查是否可以撤销
- `canRedo()`: 检查是否可以重做

### 7. TreeStructureManager (`treeStructureManager.js`)
**职责**: 树结构编辑操作
- 节点的增删改查
- 边的添加和删除
- 树结构完整性维护

**主要方法**:
- `addNode(options)`: 添加新节点
- `deleteNode(nodeId)`: 删除节点
- `updateNode(nodeId, updates)`: 更新节点
- `addEdge(parentId, childId)`: 添加边
- `deleteEdge(parentId, childId)`: 删除边

### 8. TreeValidator (`treeValidator.js`)
**职责**: 树结构验证
- 检查树结构的有效性
- 发现循环引用
- 验证节点关系

**主要方法**:
- `isValidTree(treeData)`: 检查是否为有效树
- `getTreeValidationDetails(treeData)`: 获取详细验证信息
- `getTreeStatistics(treeData)`: 获取树统计信息

### 9. TreeTraversal (`treeTraversal.js`)
**职责**: 树遍历算法
- 深度优先搜索（DFS）
- 广度优先搜索（BFS）
- 节点查找和路径计算

**主要方法**:
- `flattenTreeDFS(structure)`: DFS平铺树结构
- `flattenTreeBFS(structure)`: BFS平铺树结构
- `findNodeById(structure, nodeId)`: 查找指定节点
- `getNodePath(structure, nodeId)`: 获取节点路径

### 10. CSSHelper (`cssHelper.js`)
**职责**: CSS样式处理
- Canvas文本样式应用
- 文本位置计算
- 文本溢出处理

**主要方法**:
- `applyTextStyle(ctx, textStyle)`: 应用文本样式
- `calculateTextPosition(...)`: 计算文本位置
- `truncateText(...)`: 处理文本溢出

## 使用示例

```javascript
import { 
  TreeLayoutManager, 
  CoordinateTransformer, 
  CanvasRenderer, 
  EventHandler, 
  CollisionDetector,
  CheckpointManager,
  TreeStructureManager,
  TREE_EDITOR_CONFIG
} from '../../utils/script_editor/index.js';

// 使用配置
console.log('节点宽度:', TREE_EDITOR_CONFIG.node.width);
console.log('层级间距:', TREE_EDITOR_CONFIG.layout.levelHeight);

// 创建工具类实例
const layoutManager = new TreeLayoutManager();
const coordinateTransformer = new CoordinateTransformer();
const renderer = new CanvasRenderer(canvas);
const eventHandler = new EventHandler();
const checkpointManager = new CheckpointManager();
const treeManager = new TreeStructureManager();

// 设置事件回调
eventHandler.on('nodeSelect', onNodeSelect);
eventHandler.on('canvasZoom', ({ mouseX, mouseY, delta }) => {
  // 处理缩放
});

// 执行布局
const positions = layoutManager.layoutNodes(nodes);

// 渲染画面
renderer.renderTree(nodes, selectedNode, scale, translate);

// 碰撞检测
const node = CollisionDetector.getNodeAtPosition(x, y, nodes, getScreenPos, scale);

// 版本控制
checkpointManager.createCheckpoint(treeData);
const undoResult = checkpointManager.undo();

// 树结构编辑
treeManager.addNode({ name: '新节点', position: { x: 100, y: 100 } });
```

## 配置系统

新增的配置系统通过 `config.js` 文件统一管理所有数值设置，包括：

### 📐 节点配置
- 节点宽度和高度
- 默认节点位置

### 🏗️ 布局配置  
- 层级间距
- 节点间最小间距
- 根节点起始位置和间距倍数
- 初始Y偏移量

### 🎨 渲染配置
- 边的颜色、宽度、箭头长度
- 节点的背景色、边框色、边框宽度
- 文本的颜色、字体、偏移量

### 🖱️ 交互配置
- 缩放的最大/最小值、缩放因子
- 碰撞检测的容错距离

这样的设计让调整视觉效果变得非常简单，只需要修改 `config.js` 文件中的数值即可。

## 设计原则

1. **单一职责**: 每个工具类只负责一个特定的功能领域
2. **松耦合**: 工具类之间相互独立，通过明确的接口交互
3. **高内聚**: 相关的方法和数据组织在同一个类中
4. **可扩展性**: 新功能可以通过扩展现有类或添加新类来实现
5. **可测试性**: 每个工具类都可以独立进行单元测试

## 优势

1. **代码组织更清晰**: 功能模块化，易于理解和维护
2. **复用性更好**: 工具类可以在其他组件中复用
3. **测试更容易**: 可以针对单个功能模块编写测试
4. **调试更简单**: 问题定位更精确
5. **扩展更方便**: 新功能的添加不会影响现有代码

## 独立性说明

现在 `script_editor` 模块完全独立，不再依赖 `tree_editor` 和 `content_generator` 模块：

- 所有必要的工具类都已复制到 `utils/script_editor/` 目录
- 所有组件的import路径都已更新
- 组件间的依赖关系已经梳理清楚
- 可以安全删除原始的 `tree_editor` 和 `content_generator` 模块

## 迁移说明

原本分散在不同模块中的功能现在统一整合到 `script_editor` 中：
- `TreeCanvas.jsx` 负责组件状态管理和UI渲染
- 所有业务逻辑都被移到了相应的工具类中
- 模块间的耦合度大大降低
- 代码结构更加清晰和可维护

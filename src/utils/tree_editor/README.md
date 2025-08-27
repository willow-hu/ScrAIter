# TreeEditor 工具类说明

## 概述

为了提高代码的可维护性和可扩展性，我们将原本集中在 `TreeCanvas.jsx` 中的各种功能拆分成了多个专门的工具类。每个工具类负责特定的功能领域，具有清晰的职责边界。

## 目录结构

```
src/utils/tree_editor/
├── index.js                    # 工具类统一导出文件
├── treeLayout.js              # 树结构自动布局算法
├── coordinateTransform.js     # 坐标转换工具
├── canvasRenderer.js          # Canvas渲染器
├── eventHandler.js            # 事件处理器
├── collisionDetector.js       # 碰撞检测工具
└── README.md                  # 说明文档
```

## 工具类结构

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

## 使用示例

```javascript
import { 
  TreeLayoutManager, 
  CoordinateTransformer, 
  CanvasRenderer, 
  EventHandler, 
  CollisionDetector 
} from '../../utils/tree_editor/index.js';

// 创建工具类实例
const layoutManager = new TreeLayoutManager();
const coordinateTransformer = new CoordinateTransformer();
const renderer = new CanvasRenderer(canvas);
const eventHandler = new EventHandler();

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
```

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

## 迁移说明

原本的 `TreeCanvas.jsx` 文件现在变得更加简洁，主要负责：
- 组件状态管理
- 工具类的协调和配置
- React生命周期的处理
- UI渲染逻辑

所有具体的业务逻辑都被移到了相应的工具类中，使得代码结构更加清晰和可维护。

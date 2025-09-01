# Content Generator 工具类

这个目录包含了与内容生成模块相关的工具函数，用于提高代码的模块化和可维护性。

## 文件结构

```
content_generator/
├── index.js              # 工具模块导出索引
├── treeTraversal.js       # 树结构遍历工具
└── README.md             # 文档说明
```

## 模块说明

### treeTraversal.js - 树结构遍历工具

提供了一套完整的树结构操作函数，支持各种遍历算法和节点操作。

#### 主要功能

1. **深度优先搜索 (DFS)**
   - `flattenTreeDFS(structure)` - 将树结构转换为DFS顺序的平铺数组

2. **广度优先搜索 (BFS)**
   - `flattenTreeBFS(structure)` - 将树结构转换为BFS顺序的平铺数组

3. **节点查找和操作**
   - `findNodeById(structure, targetId)` - 根据ID查找节点
   - `getNodeDescendants(structure, nodeId)` - 获取节点的所有子孙节点
   - `getNodePath(structure, targetId)` - 获取从根到指定节点的路径

4. **结构验证**
   - `validateTreeStructure(structure)` - 验证树结构的有效性

#### 使用示例

```javascript
import { flattenTreeDFS, findNodeById } from '../../utils/content_generator/treeTraversal';

// 将树结构转换为平铺数组
const treeData = [
  {id: 1, name: "root", child_ids: [2, 3]},
  {id: 2, name: "child1", child_ids: []},
  {id: 3, name: "child2", child_ids: [4]},
  {id: 4, name: "grandchild", child_ids: []}
];

const flatNodes = flattenTreeDFS(treeData);
// 结果: 按DFS顺序排列的节点数组

// 查找特定节点
const targetNode = findNodeById(treeData, 3);
```

#### 支持的数据格式

工具函数支持两种树结构格式：

1. **数组格式**（推荐）：
```javascript
[
  {id: 1, name: "root", child_ids: [2, 3]},
  {id: 2, name: "child1", child_ids: []},
  {id: 3, name: "child2", child_ids: []}
]
```

2. **嵌套对象格式**：
```javascript
{
  id: 1,
  name: "root",
  children: [
    {id: 2, name: "child1"},
    {id: 3, name: "child2"}
  ]
}
```

## 开发指南

### 添加新工具函数

1. 在相应的工具文件中添加新函数
2. 在文件末尾的导出语句中包含新函数
3. 在 `index.js` 中导出新函数
4. 更新此 README 文档

### 代码规范

- 所有函数都应包含详细的 JSDoc 注释
- 函数名使用 camelCase 命名法
- 复杂函数应包含使用示例
- 处理边界情况和错误输入

### 测试建议

建议为每个工具函数编写单元测试，特别是：
- 边界情况处理
- 错误输入处理
- 性能测试（大型树结构）
- 循环引用检测

## 性能考虑

- DFS/BFS算法的时间复杂度为 O(V + E)，其中V是节点数，E是边数
- 对于大型树结构，建议使用缓存机制
- 避免重复计算，特别是在频繁调用的场景中

## 未来扩展

计划添加的功能：
- 树结构比较工具
- 节点内容处理工具
- 数据格式转换工具
- 树结构可视化辅助工具

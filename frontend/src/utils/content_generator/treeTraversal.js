/**
 * 树结构遍历工具类
 * 提供深度优先搜索（DFS）等树遍历算法
 * 
 * @author AI Script Co-creator Team
 * @version 1.0.0
 */

/**
 * 深度优先搜索遍历辅助函数
 * @param {Object} node - 当前节点
 * @param {Array} allNodes - 所有节点数组（用于通过ID查找子节点）
 * @param {Array} result - 遍历结果数组
 * @param {Set} visited - 已访问节点ID集合，用于避免循环引用
 */
const dfsTraversal = (node, allNodes, result, visited) => {
  // 如果节点已访问，跳过（避免循环引用）
  if (visited.has(node.id)) {
    return;
  }
  
  // 标记为已访问并加入结果
  visited.add(node.id);
  result.push(node);
  
  // 递归处理子节点
  if (node.child_ids && Array.isArray(allNodes)) {
    node.child_ids.forEach(childId => {
      const childNode = allNodes.find(n => n.id === childId);
      if (childNode && !visited.has(childId)) {
        dfsTraversal(childNode, allNodes, result, visited);
      }
    });
  }
};

/**
 * 使用深度优先搜索将树结构转换为平铺数组
 * 支持两种输入格式：
 * 1. 数组格式：[{id, child_ids, ...}, ...]，自动识别根节点
 * 2. 单根节点格式：{id, child_ids, ...}
 * 
 * @param {Array|Object} structure - 树结构数据
 * @returns {Array} 按DFS顺序排列的节点数组
 * 
 * @example
 * // 数组格式示例
 * const treeArray = [
 *   {id: 1, name: "root", child_ids: [2, 3]},
 *   {id: 2, name: "child1", child_ids: []},
 *   {id: 3, name: "child2", child_ids: [4]},
 *   {id: 4, name: "grandchild", child_ids: []}
 * ];
 * const flattened = flattenTreeDFS(treeArray);
 * // 结果: [{id:1,...}, {id:2,...}, {id:3,...}, {id:4,...}]
 * 
 * @example
 * // 单根节点格式示例
 * const singleRoot = {
 *   id: 1,
 *   name: "root", 
 *   children: [{id: 2, name: "child"}]
 * };
 * const flattened = flattenTreeDFS(singleRoot);
 */
export const flattenTreeDFS = (structure) => {
  const result = [];
  const visited = new Set();
  
  // 如果是数组，需要找到根节点（没有被其他节点引用作为子节点的节点）
  if (Array.isArray(structure)) {
    // 收集所有被引用为子节点的ID
    const allChildIds = new Set();
    structure.forEach(node => {
      if (node.child_ids) {
        node.child_ids.forEach(id => allChildIds.add(id));
      }
    });
    
    // 找到根节点（不在任何child_ids中的节点）
    const rootNodes = structure.filter(node => !allChildIds.has(node.id));
    
    // 对每个根节点进行DFS遍历
    rootNodes.forEach(root => {
      dfsTraversal(root, structure, result, visited);
    });
  } else {
    // 单个根节点的情况
    dfsTraversal(structure, [], result, visited);
  }
  
  return result;
};

/**
 * 使用广度优先搜索将树结构转换为平铺数组
 * @param {Array|Object} structure - 树结构数据
 * @returns {Array} 按BFS顺序排列的节点数组
 */
export const flattenTreeBFS = (structure) => {
  const result = [];
  const visited = new Set();
  const queue = [];
  
  // 初始化队列
  if (Array.isArray(structure)) {
    // 找到根节点
    const allChildIds = new Set();
    structure.forEach(node => {
      if (node.child_ids) {
        node.child_ids.forEach(id => allChildIds.add(id));
      }
    });
    
    const rootNodes = structure.filter(node => !allChildIds.has(node.id));
    queue.push(...rootNodes.map(root => ({ node: root, allNodes: structure })));
  } else {
    queue.push({ node: structure, allNodes: [] });
  }
  
  // BFS遍历
  while (queue.length > 0) {
    const { node, allNodes } = queue.shift();
    
    if (visited.has(node.id)) {
      continue;
    }
    
    visited.add(node.id);
    result.push(node);
    
    // 将子节点加入队列
    if (node.child_ids && Array.isArray(allNodes)) {
      node.child_ids.forEach(childId => {
        const childNode = allNodes.find(n => n.id === childId);
        if (childNode && !visited.has(childId)) {
          queue.push({ node: childNode, allNodes });
        }
      });
    }
  }
  
  return result;
};

/**
 * 查找树中指定ID的节点
 * @param {Array|Object} structure - 树结构数据
 * @param {number|string} targetId - 目标节点ID
 * @returns {Object|null} 找到的节点，如果未找到则返回null
 */
export const findNodeById = (structure, targetId) => {
  if (Array.isArray(structure)) {
    return structure.find(node => node.id === targetId) || null;
  } else {
    // 对于单根节点，使用DFS搜索
    const flatten = flattenTreeDFS(structure);
    return flatten.find(node => node.id === targetId) || null;
  }
};

/**
 * 获取节点的所有子节点（递归）
 * @param {Array|Object} structure - 树结构数据
 * @param {number|string} nodeId - 节点ID
 * @returns {Array} 所有子节点数组
 */
export const getNodeDescendants = (structure, nodeId) => {
  const allNodes = Array.isArray(structure) ? structure : flattenTreeDFS(structure);
  const targetNode = allNodes.find(node => node.id === nodeId);
  
  if (!targetNode) {
    return [];
  }
  
  const descendants = [];
  const visited = new Set();
  
  const collectDescendants = (node) => {
    if (node.child_ids) {
      node.child_ids.forEach(childId => {
        if (!visited.has(childId)) {
          visited.add(childId);
          const childNode = allNodes.find(n => n.id === childId);
          if (childNode) {
            descendants.push(childNode);
            collectDescendants(childNode);
          }
        }
      });
    }
  };
  
  collectDescendants(targetNode);
  return descendants;
};

/**
 * 获取从根节点到指定节点的路径
 * @param {Array|Object} structure - 树结构数据
 * @param {number|string} targetId - 目标节点ID
 * @returns {Array} 从根到目标的节点路径数组
 */
export const getNodePath = (structure, targetId) => {
  const allNodes = Array.isArray(structure) ? structure : flattenTreeDFS(structure);
  const path = [];
  const visited = new Set();
  
  // 找到根节点
  let rootNodes;
  if (Array.isArray(structure)) {
    const allChildIds = new Set();
    structure.forEach(node => {
      if (node.child_ids) {
        node.child_ids.forEach(id => allChildIds.add(id));
      }
    });
    rootNodes = structure.filter(node => !allChildIds.has(node.id));
  } else {
    rootNodes = [structure];
  }
  
  // DFS搜索路径
  const findPath = (node, currentPath) => {
    if (visited.has(node.id)) {
      return false;
    }
    
    visited.add(node.id);
    currentPath.push(node);
    
    if (node.id === targetId) {
      path.push(...currentPath);
      return true;
    }
    
    if (node.child_ids) {
      for (const childId of node.child_ids) {
        const childNode = allNodes.find(n => n.id === childId);
        if (childNode && findPath(childNode, currentPath)) {
          return true;
        }
      }
    }
    
    currentPath.pop();
    visited.delete(node.id);
    return false;
  };
  
  // 尝试从每个根节点找路径
  for (const root of rootNodes) {
    visited.clear();
    if (findPath(root, [])) {
      break;
    }
  }
  
  return path;
};

/**
 * 验证树结构的有效性
 * @param {Array|Object} structure - 树结构数据
 * @returns {Object} 验证结果 {isValid: boolean, errors: string[]}
 */
export const validateTreeStructure = (structure) => {
  const errors = [];
  const allNodes = Array.isArray(structure) ? structure : flattenTreeDFS(structure);
  
  // 检查节点ID唯一性
  const nodeIds = allNodes.map(node => node.id);
  const uniqueIds = new Set(nodeIds);
  if (nodeIds.length !== uniqueIds.size) {
    errors.push('存在重复的节点ID');
  }
  
  // 检查child_ids引用的有效性
  allNodes.forEach(node => {
    if (node.child_ids) {
      node.child_ids.forEach(childId => {
        if (!uniqueIds.has(childId)) {
          errors.push(`节点${node.id}引用了不存在的子节点${childId}`);
        }
      });
    }
  });
  
  // 检查是否有循环引用
  const hasCycle = () => {
    const visited = new Set();
    const recursionStack = new Set();
    
    const dfsCheckCycle = (nodeId) => {
      if (recursionStack.has(nodeId)) {
        return true; // 发现循环
      }
      if (visited.has(nodeId)) {
        return false;
      }
      
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const node = allNodes.find(n => n.id === nodeId);
      if (node && node.child_ids) {
        for (const childId of node.child_ids) {
          if (dfsCheckCycle(childId)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    for (const nodeId of uniqueIds) {
      if (dfsCheckCycle(nodeId)) {
        return true;
      }
    }
    return false;
  };
  
  if (hasCycle()) {
    errors.push('树结构中存在循环引用');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// 默认导出所有函数
export default {
  flattenTreeDFS,
  flattenTreeBFS,
  findNodeById,
  getNodeDescendants,
  getNodePath,
  validateTreeStructure
};

/**
 * 树结构验证工具
 * 用于检测数据结构是否为合法的有向树
 */

/**
 * 检查数据结构是否为有效的有向树
 * @param {Object} treeData - 树数据对象
 * @param {Array} treeData.structure - 节点数组
 * @returns {boolean} 是否为有效的有向树
 */
export const isValidTree = (treeData) => {
  if (!treeData || !treeData.structure || treeData.structure.length === 0) {
    return false;
  }
  
  const nodes = treeData.structure;
  const nodeIds = new Set(nodes.map(n => n.id));
  
  // 1. 检查所有child_ids是否都存在
  for (const node of nodes) {
    for (const childId of node.child_ids || []) {
      if (!nodeIds.has(childId)) {
        return false;
      }
    }
  }
  
  // 2. 计算每个节点的入度（父节点数量）
  const inDegree = new Map();
  for (const nodeId of nodeIds) {
    inDegree.set(nodeId, 0);
  }
  
  for (const node of nodes) {
    for (const childId of node.child_ids || []) {
      inDegree.set(childId, inDegree.get(childId) + 1);
    }
  }
  
  // 3. 检查是否有且仅有一个根节点（入度为0）
  const rootNodes = Array.from(inDegree.entries()).filter(([_, degree]) => degree === 0);
  if (rootNodes.length !== 1) {
    return false;
  }
  
  // 4. 检查除根节点外，每个节点的入度是否都为1
  const nonRootNodes = Array.from(inDegree.entries()).filter(([_, degree]) => degree !== 0);
  if (nonRootNodes.some(([_, degree]) => degree !== 1)) {
    return false;
  }
  
  // 5. 检查连通性：从根节点是否能到达所有节点
  const rootId = rootNodes[0][0];
  const reachable = new Set();
  
  const dfs = (nodeId) => {
    reachable.add(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      for (const childId of node.child_ids || []) {
        if (!reachable.has(childId)) {
          dfs(childId);
        }
      }
    }
  };
  
  dfs(rootId);
  
  // 所有节点都应该从根节点可达
  return reachable.size === nodes.length;
};

/**
 * 获取树结构验证的详细信息
 * @param {Object} treeData - 树数据对象
 * @returns {Object} 验证结果详情
 */
export const getTreeValidationDetails = (treeData) => {
  const result = {
    isValid: false,
    errors: [],
    warnings: [],
    statistics: {
      totalNodes: 0,
      rootNodes: 0,
      leafNodes: 0,
      maxDepth: 0
    }
  };

  if (!treeData || !treeData.structure || treeData.structure.length === 0) {
    result.errors.push('树数据为空或不存在结构');
    return result;
  }

  const nodes = treeData.structure;
  const nodeIds = new Set(nodes.map(n => n.id));
  result.statistics.totalNodes = nodes.length;

  // 检查引用完整性
  const invalidReferences = [];
  for (const node of nodes) {
    for (const childId of node.child_ids || []) {
      if (!nodeIds.has(childId)) {
        invalidReferences.push(`节点 ${node.id} 引用了不存在的子节点 ${childId}`);
      }
    }
  }
  
  if (invalidReferences.length > 0) {
    result.errors.push(...invalidReferences);
  }

  // 计算入度
  const inDegree = new Map();
  for (const nodeId of nodeIds) {
    inDegree.set(nodeId, 0);
  }
  
  for (const node of nodes) {
    for (const childId of node.child_ids || []) {
      if (nodeIds.has(childId)) {
        inDegree.set(childId, inDegree.get(childId) + 1);
      }
    }
  }

  // 统计根节点和叶子节点
  const rootNodes = Array.from(inDegree.entries()).filter(([_, degree]) => degree === 0);
  result.statistics.rootNodes = rootNodes.length;
  result.statistics.leafNodes = nodes.filter(node => !node.child_ids || node.child_ids.length === 0).length;

  // 检查根节点数量
  if (rootNodes.length === 0) {
    result.errors.push('没有找到根节点（入度为0的节点）');
  } else if (rootNodes.length > 1) {
    result.errors.push(`找到多个根节点：${rootNodes.map(([id]) => id).join(', ')}`);
  }

  // 检查多父节点情况
  const multiParentNodes = Array.from(inDegree.entries()).filter(([_, degree]) => degree > 1);
  if (multiParentNodes.length > 0) {
    result.errors.push(`以下节点有多个父节点：${multiParentNodes.map(([id, degree]) => `${id}(${degree}个父节点)`).join(', ')}`);
  }

  // 如果有根节点，检查连通性和计算深度
  if (rootNodes.length === 1) {
    const rootId = rootNodes[0][0];
    const reachable = new Set();
    let maxDepth = 0;
    
    const dfs = (nodeId, depth = 0) => {
      reachable.add(nodeId);
      maxDepth = Math.max(maxDepth, depth);
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        for (const childId of node.child_ids || []) {
          if (!reachable.has(childId)) {
            dfs(childId, depth + 1);
          }
        }
      }
    };
    
    dfs(rootId);
    result.statistics.maxDepth = maxDepth;
    
    // 检查连通性
    if (reachable.size !== nodes.length) {
      const unreachableNodes = nodes.filter(node => !reachable.has(node.id)).map(node => node.id);
      result.errors.push(`以下节点从根节点不可达：${unreachableNodes.join(', ')}`);
    }
  }

  // 如果没有错误，则为有效树
  result.isValid = result.errors.length === 0;
  
  return result;
};

/**
 * 获取树结构的简单统计信息
 * @param {Object} treeData - 树数据对象
 * @returns {Object} 统计信息
 */
export const getTreeStatistics = (treeData) => {
  if (!treeData || !treeData.structure) {
    return {
      totalNodes: 0,
      totalEdges: 0,
      rootNodes: 0,
      leafNodes: 0,
      maxDepth: 0
    };
  }

  const nodes = treeData.structure;
  const nodeIds = new Set(nodes.map(n => n.id));
  
  // 计算入度
  const inDegree = new Map();
  for (const nodeId of nodeIds) {
    inDegree.set(nodeId, 0);
  }
  
  let totalEdges = 0;
  for (const node of nodes) {
    const childCount = node.child_ids ? node.child_ids.length : 0;
    totalEdges += childCount;
    
    for (const childId of node.child_ids || []) {
      if (nodeIds.has(childId)) {
        inDegree.set(childId, inDegree.get(childId) + 1);
      }
    }
  }

  const rootNodes = Array.from(inDegree.entries()).filter(([_, degree]) => degree === 0);
  const leafNodes = nodes.filter(node => !node.child_ids || node.child_ids.length === 0);

  // 计算最大深度
  let maxDepth = 0;
  if (rootNodes.length === 1) {
    const rootId = rootNodes[0][0];
    const visited = new Set();
    
    const dfs = (nodeId, depth = 0) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      maxDepth = Math.max(maxDepth, depth);
      
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        for (const childId of node.child_ids || []) {
          if (!visited.has(childId)) {
            dfs(childId, depth + 1);
          }
        }
      }
    };
    
    dfs(rootId);
  }

  return {
    totalNodes: nodes.length,
    totalEdges,
    rootNodes: rootNodes.length,
    leafNodes: leafNodes.length,
    maxDepth
  };
};

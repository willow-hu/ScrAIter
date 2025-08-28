/**
 * 树结构编辑管理器
 * 用于管理树结构的增删改查操作
 */

/**
 * 树结构编辑管理器类
 */
export class TreeStructureManager {
  constructor(onDataChange = null) {
    this.data = null;
    this.onDataChange = onDataChange; // 数据变化回调函数
  }

  /**
   * 设置树数据
   * @param {Object} treeData - 树数据
   */
  setData(treeData) {
    this.data = treeData;
  }

  /**
   * 获取当前树数据
   * @returns {Object} 当前树数据
   */
  getData() {
    return this.data;
  }

  /**
   * 触发数据变化回调
   * @param {Object} newData - 新的数据
   */
  notifyDataChange(newData) {
    this.data = newData;
    if (this.onDataChange) {
      this.onDataChange(newData);
    }
  }

  /**
   * 更新全局上下文
   * @param {Object} newContext - 新的全局上下文
   * @returns {Object} 操作结果
   */
  updateGlobalContext(newContext) {
    if (!this.data) {
      return { success: false, message: '树数据不存在' };
    }

    const updated = {
      ...this.data,
      global_context: { ...this.data.global_context, ...newContext }
    };

    this.notifyDataChange(updated);
    return { success: true, message: '全局上下文已更新', data: updated };
  }

  /**
   * 更新节点信息
   * @param {number} nodeId - 节点ID
   * @param {Object} updates - 更新的内容
   * @returns {Object} 操作结果
   */
  updateNode(nodeId, updates) {
    if (!this.data || !this.data.structure) {
      return { success: false, message: '树结构不存在' };
    }

    const nodeExists = this.data.structure.some(node => node.id === nodeId);
    if (!nodeExists) {
      return { success: false, message: `节点 ${nodeId} 不存在` };
    }

    const updated = {
      ...this.data,
      structure: this.data.structure.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      )
    };

    this.notifyDataChange(updated);
    return { success: true, message: `节点 ${nodeId} 已更新`, data: updated };
  }

  /**
   * 添加新节点
   * @param {Object} nodeOptions - 节点选项
   * @param {Object} nodeOptions.position - 节点位置
   * @param {string} nodeOptions.name - 节点名称
   * @param {string} nodeOptions.abstract - 节点摘要
   * @param {string} nodeOptions.user - 用户选项
   * @param {Array} nodeOptions.child_ids - 子节点ID数组
   * @returns {Object} 操作结果
   */
  addNode(nodeOptions = {}) {
    if (!this.data || !this.data.structure) {
      return { success: false, message: '树结构不存在' };
    }

    // 生成新的节点ID
    const maxId = Math.max(...this.data.structure.map(n => n.id), 0);
    const newNodeId = maxId + 1;

    const newNode = {
      id: newNodeId,
      name: nodeOptions.name || "新建节点",
      abstract: nodeOptions.abstract || "",
      user: nodeOptions.user || "",
      child_ids: nodeOptions.child_ids || [],
      position: nodeOptions.position || { x: 0, y: 0 }
    };

    const updated = {
      ...this.data,
      structure: [...this.data.structure, newNode]
    };

    this.notifyDataChange(updated);
    return { 
      success: true, 
      message: `节点 ${newNodeId} 已添加`, 
      data: updated,
      newNode
    };
  }

  /**
   * 删除节点
   * @param {number} nodeId - 要删除的节点ID
   * @returns {Object} 操作结果
   */
  deleteNode(nodeId) {
    if (!this.data || !this.data.structure) {
      return { success: false, message: '树结构不存在' };
    }

    const nodeExists = this.data.structure.some(node => node.id === nodeId);
    if (!nodeExists) {
      return { success: false, message: `节点 ${nodeId} 不存在` };
    }

    // 删除节点，并从所有父节点的child_ids中移除
    const updated = {
      ...this.data,
      structure: this.data.structure
        .filter(node => node.id !== nodeId)
        .map(node => ({
          ...node,
          child_ids: node.child_ids ? node.child_ids.filter(id => id !== nodeId) : []
        }))
    };

    this.notifyDataChange(updated);
    return { 
      success: true, 
      message: `节点 ${nodeId} 已删除`, 
      data: updated,
      deletedNodeId: nodeId
    };
  }

  /**
   * 添加边（父子关系）
   * @param {number} parentId - 父节点ID
   * @param {number} childId - 子节点ID
   * @returns {Object} 操作结果
   */
  addEdge(parentId, childId) {
    if (!this.data || !this.data.structure) {
      return { success: false, message: '树结构不存在' };
    }

    const parentNode = this.data.structure.find(node => node.id === parentId);
    const childNode = this.data.structure.find(node => node.id === childId);

    if (!parentNode) {
      return { success: false, message: `父节点 ${parentId} 不存在` };
    }
    if (!childNode) {
      return { success: false, message: `子节点 ${childId} 不存在` };
    }

    // 检查是否已经存在该边
    if (parentNode.child_ids && parentNode.child_ids.includes(childId)) {
      return { success: false, message: `边 ${parentId} -> ${childId} 已存在` };
    }

    // 检查是否会形成环
    if (this.wouldCreateCycle(childId, parentId)) {
      return { success: false, message: `添加边 ${parentId} -> ${childId} 会形成环` };
    }

    const updated = {
      ...this.data,
      structure: this.data.structure.map(node =>
        node.id === parentId
          ? { ...node, child_ids: [...(node.child_ids || []), childId] }
          : node
      )
    };

    this.notifyDataChange(updated);
    return { 
      success: true, 
      message: `边 ${parentId} -> ${childId} 已添加`, 
      data: updated
    };
  }

  /**
   * 删除边（父子关系）
   * @param {number} parentId - 父节点ID
   * @param {number} childId - 子节点ID
   * @returns {Object} 操作结果
   */
  deleteEdge(parentId, childId) {
    if (!this.data || !this.data.structure) {
      return { success: false, message: '树结构不存在' };
    }

    const parentNode = this.data.structure.find(node => node.id === parentId);
    if (!parentNode) {
      return { success: false, message: `父节点 ${parentId} 不存在` };
    }

    if (!parentNode.child_ids || !parentNode.child_ids.includes(childId)) {
      return { success: false, message: `边 ${parentId} -> ${childId} 不存在` };
    }

    const updated = {
      ...this.data,
      structure: this.data.structure.map(node =>
        node.id === parentId
          ? { ...node, child_ids: node.child_ids.filter(id => id !== childId) }
          : node
      )
    };

    this.notifyDataChange(updated);
    return { 
      success: true, 
      message: `边 ${parentId} -> ${childId} 已删除`, 
      data: updated
    };
  }

  /**
   * 更新节点位置
   * @param {number} nodeId - 节点ID
   * @param {Object} position - 新位置 {x, y}
   * @returns {Object} 操作结果
   */
  updateNodePosition(nodeId, position) {
    if (!this.data || !this.data.structure) {
      return { success: false, message: '树结构不存在' };
    }

    const nodeExists = this.data.structure.some(node => node.id === nodeId);
    if (!nodeExists) {
      return { success: false, message: `节点 ${nodeId} 不存在` };
    }

    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      return { success: false, message: '位置参数无效' };
    }

    const updated = {
      ...this.data,
      structure: this.data.structure.map(node =>
        node.id === nodeId ? { ...node, position } : node
      )
    };

    this.notifyDataChange(updated);
    return { 
      success: true, 
      message: `节点 ${nodeId} 位置已更新`, 
      data: updated
    };
  }

  /**
   * 批量更新节点位置
   * @param {Array} updates - 更新数组 [{nodeId, position}, ...]
   * @returns {Object} 操作结果
   */
  updateMultipleNodePositions(updates) {
    if (!this.data || !this.data.structure) {
      return { success: false, message: '树结构不存在' };
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return { success: false, message: '更新数据无效' };
    }

    let updated = { ...this.data };
    const updatedNodes = [];

    for (const update of updates) {
      const { nodeId, position } = update;
      const nodeExists = updated.structure.some(node => node.id === nodeId);
      
      if (!nodeExists) {
        return { success: false, message: `节点 ${nodeId} 不存在` };
      }

      if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
        return { success: false, message: `节点 ${nodeId} 的位置参数无效` };
      }

      updated.structure = updated.structure.map(node =>
        node.id === nodeId ? { ...node, position } : node
      );
      updatedNodes.push(nodeId);
    }

    this.notifyDataChange(updated);
    return { 
      success: true, 
      message: `${updatedNodes.length} 个节点位置已更新`, 
      data: updated,
      updatedNodes
    };
  }

  /**
   * 检查添加边是否会形成环
   * @param {number} fromId - 起始节点ID
   * @param {number} toId - 目标节点ID
   * @returns {boolean} 是否会形成环
   */
  wouldCreateCycle(fromId, toId) {
    if (!this.data || !this.data.structure) return false;
    
    const visited = new Set();
    const visiting = new Set();

    const dfs = (nodeId) => {
      if (visiting.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visiting.add(nodeId);
      const node = this.data.structure.find(n => n.id === nodeId);
      
      if (node && node.child_ids) {
        for (const childId of node.child_ids) {
          // 模拟添加新边的情况
          if (nodeId === toId && childId === fromId) {
            return true;
          }
          if (dfs(childId)) return true;
        }
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      return false;
    };

    return dfs(fromId);
  }

  /**
   * 获取节点信息
   * @param {number} nodeId - 节点ID
   * @returns {Object} 节点信息或null
   */
  getNode(nodeId) {
    if (!this.data || !this.data.structure) return null;
    return this.data.structure.find(node => node.id === nodeId) || null;
  }

  /**
   * 获取节点的所有子节点
   * @param {number} nodeId - 节点ID
   * @returns {Array} 子节点数组
   */
  getChildren(nodeId) {
    const node = this.getNode(nodeId);
    if (!node || !node.child_ids) return [];
    
    return node.child_ids
      .map(childId => this.getNode(childId))
      .filter(child => child !== null);
  }

  /**
   * 获取节点的所有父节点
   * @param {number} nodeId - 节点ID
   * @returns {Array} 父节点数组
   */
  getParents(nodeId) {
    if (!this.data || !this.data.structure) return [];
    
    return this.data.structure.filter(node => 
      node.child_ids && node.child_ids.includes(nodeId)
    );
  }

  /**
   * 获取根节点（没有父节点的节点）
   * @returns {Array} 根节点数组
   */
  getRootNodes() {
    if (!this.data || !this.data.structure) return [];
    
    const childIds = new Set();
    this.data.structure.forEach(node => {
      if (node.child_ids) {
        node.child_ids.forEach(childId => childIds.add(childId));
      }
    });

    return this.data.structure.filter(node => !childIds.has(node.id));
  }

  /**
   * 获取叶子节点（没有子节点的节点）
   * @returns {Array} 叶子节点数组
   */
  getLeafNodes() {
    if (!this.data || !this.data.structure) return [];
    
    return this.data.structure.filter(node => 
      !node.child_ids || node.child_ids.length === 0
    );
  }

  /**
   * 复制节点（不包括子节点关系）
   * @param {number} nodeId - 要复制的节点ID
   * @param {Object} position - 新节点位置
   * @returns {Object} 操作结果
   */
  duplicateNode(nodeId, position = null) {
    const originalNode = this.getNode(nodeId);
    if (!originalNode) {
      return { success: false, message: `节点 ${nodeId} 不存在` };
    }

    const newPosition = position || {
      x: (originalNode.position?.x || 0) + 50,
      y: (originalNode.position?.y || 0) + 50
    };

    return this.addNode({
      name: `${originalNode.name} - 副本`,
      abstract: originalNode.abstract,
      user: originalNode.user,
      position: newPosition
    });
  }

  /**
   * 获取树的统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    if (!this.data || !this.data.structure) {
      return {
        totalNodes: 0,
        totalEdges: 0,
        rootNodes: 0,
        leafNodes: 0,
        maxDepth: 0
      };
    }

    const rootNodes = this.getRootNodes();
    const leafNodes = this.getLeafNodes();
    
    let totalEdges = 0;
    this.data.structure.forEach(node => {
      if (node.child_ids) {
        totalEdges += node.child_ids.length;
      }
    });

    // 计算最大深度
    let maxDepth = 0;
    const calculateDepth = (nodeId, depth = 0) => {
      maxDepth = Math.max(maxDepth, depth);
      const children = this.getChildren(nodeId);
      children.forEach(child => calculateDepth(child.id, depth + 1));
    };

    rootNodes.forEach(root => calculateDepth(root.id));

    return {
      totalNodes: this.data.structure.length,
      totalEdges,
      rootNodes: rootNodes.length,
      leafNodes: leafNodes.length,
      maxDepth
    };
  }
}

/**
 * 便捷的工厂函数，创建一个新的树结构管理器实例
 * @param {Object} initialData - 初始树数据
 * @param {Function} onDataChange - 数据变化回调函数
 * @returns {TreeStructureManager} 树结构管理器实例
 */
export function createTreeStructureManager(initialData = null, onDataChange = null) {
  const manager = new TreeStructureManager(onDataChange);
  if (initialData) {
    manager.setData(initialData);
  }
  return manager;
}

/**
 * 默认导出一个单例实例（可选）
 */
const defaultManager = new TreeStructureManager();
export default defaultManager;

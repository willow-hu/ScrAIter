/**
 * 树结构自动布局算法
 * 负责计算节点的最优位置，避免重叠，保持层级清晰
 */

import { TREE_EDITOR_CONFIG } from './config.js';

/**
 * 树结构自动布局类
 */
export class TreeLayoutManager {
  constructor() {
    this.levelHeight = TREE_EDITOR_CONFIG.layout.levelHeight;
    this.nodeSpacing = TREE_EDITOR_CONFIG.layout.nodeSpacing;
  }

  /**
   * 执行自动布局
   * @param {Array} nodes - 节点数组
   * @returns {Map} nodeId -> position 的映射
   */
  layoutNodes(nodes) {
    if (!nodes || nodes.length === 0) return new Map();

    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const positions = new Map();
    const usedPositions = new Map(); // 记录每个层级已使用的X位置

    // 找到根节点（没有父节点的节点）
    const hasParent = new Set();
    nodes.forEach(node => {
      (node.child_ids || []).forEach(childId => hasParent.add(childId));
    });
    const roots = nodes.filter(node => !hasParent.has(node.id));

    // 布局每个根节点
    let rootStartX = TREE_EDITOR_CONFIG.layout.rootStartX;
    roots.forEach((root, rootIndex) => {
      const rootWidth = this.calculateSubtreeWidth(root.id, nodeMap);
      this.layoutTree(root.id, 0, rootStartX + rootWidth / 2, rootWidth, nodeMap, positions, usedPositions);
      rootStartX += rootWidth + this.nodeSpacing * TREE_EDITOR_CONFIG.layout.rootSpacingMultiplier; // 根节点之间留更大间距
    });

    return positions;
  }

  /**
   * 计算子树宽度
   * @param {number} nodeId - 节点ID
   * @param {Map} nodeMap - 节点映射
   * @returns {number} 子树宽度
   */
  calculateSubtreeWidth(nodeId, nodeMap) {
    const node = nodeMap.get(nodeId);
    if (!node || !node.child_ids || node.child_ids.length === 0) {
      return TREE_EDITOR_CONFIG.node.width;
    }
    
    let totalWidth = 0;
    node.child_ids.forEach(childId => {
      totalWidth += this.calculateSubtreeWidth(childId, nodeMap);
    });
    
    return Math.max(TREE_EDITOR_CONFIG.node.width, totalWidth + (node.child_ids.length - 1) * this.nodeSpacing);
  }

  /**
   * 递归布局树
   * @param {number} nodeId - 当前节点ID
   * @param {number} level - 当前层级
   * @param {number} centerX - 中心X坐标
   * @param {number} availableWidth - 可用宽度
   * @param {Map} nodeMap - 节点映射
   * @param {Map} positions - 位置映射
   * @param {Map} usedPositions - 已使用位置映射
   */
  layoutTree(nodeId, level = 0, centerX = 0, availableWidth = 0, nodeMap, positions, usedPositions) {
    const node = nodeMap.get(nodeId);
    if (!node || positions.has(nodeId)) return;

    const children = node.child_ids || [];
    
    if (children.length === 0) {
      // 叶子节点，直接放置在centerX位置
      positions.set(nodeId, { x: centerX - TREE_EDITOR_CONFIG.node.width / 2, y: level * this.levelHeight + TREE_EDITOR_CONFIG.layout.initialYOffset });
      return;
    }

    // 计算所有子节点的总宽度需求
    const childWidths = children.map(childId => this.calculateSubtreeWidth(childId, nodeMap));
    const totalChildWidth = childWidths.reduce((sum, width) => sum + width, 0) + 
                           (children.length - 1) * this.nodeSpacing;

    // 检查是否需要向右移动以避免重叠
    const adjustedCenterX = this.adjustPositionToAvoidCollision(
      centerX, level, totalChildWidth, usedPositions
    );

    // 记录当前节点占用的位置
    this.recordNodePosition(adjustedCenterX, level, usedPositions);

    // 放置当前节点
    positions.set(nodeId, { 
      x: adjustedCenterX - TREE_EDITOR_CONFIG.node.width / 2, 
      y: level * this.levelHeight + TREE_EDITOR_CONFIG.layout.initialYOffset 
    });

    // 布局子节点
    this.layoutChildren(children, childWidths, adjustedCenterX, totalChildWidth, level, nodeMap, positions, usedPositions);
  }

  /**
   * 调整位置以避免碰撞
   * @param {number} centerX - 原始中心X坐标
   * @param {number} level - 层级
   * @param {number} totalChildWidth - 子节点总宽度
   * @param {Map} usedPositions - 已使用位置映射
   * @returns {number} 调整后的中心X坐标
   */
  adjustPositionToAvoidCollision(centerX, level, totalChildWidth, usedPositions) {
    let adjustedCenterX = centerX;
    
    // 计算当前节点和子节点占用的范围
    const nodeLeft = adjustedCenterX - TREE_EDITOR_CONFIG.node.width / 2;
    const nodeRight = adjustedCenterX + TREE_EDITOR_CONFIG.node.width / 2;
    
    // 检查与同级其他节点的冲突
    const levelPositions = usedPositions.get(level) || [];
    for (const usedPos of levelPositions) {
      if (nodeRight + this.nodeSpacing > usedPos.left && nodeLeft < usedPos.right + this.nodeSpacing) {
        // 发生冲突，需要向右移动
        adjustedCenterX = usedPos.right + this.nodeSpacing + TREE_EDITOR_CONFIG.node.width / 2;
      }
    }

    // 检查子节点层级的冲突
    const childLevel = level + 1;
    const childLevelPositions = usedPositions.get(childLevel) || [];
    for (const usedPos of childLevelPositions) {
      const newChildrenLeft = adjustedCenterX - totalChildWidth / 2;
      const newChildrenRight = adjustedCenterX + totalChildWidth / 2;
      if (newChildrenRight + this.nodeSpacing > usedPos.left && newChildrenLeft < usedPos.right + this.nodeSpacing) {
        adjustedCenterX = usedPos.right + this.nodeSpacing + totalChildWidth / 2;
      }
    }

    return adjustedCenterX;
  }

  /**
   * 记录节点占用的位置
   * @param {number} centerX - 中心X坐标
   * @param {number} level - 层级
   * @param {Map} usedPositions - 已使用位置映射
   */
  recordNodePosition(centerX, level, usedPositions) {
    const nodeLeft = centerX - TREE_EDITOR_CONFIG.node.width / 2;
    const nodeRight = centerX + TREE_EDITOR_CONFIG.node.width / 2;
    
    if (!usedPositions.has(level)) {
      usedPositions.set(level, []);
    }
    usedPositions.get(level).push({ left: nodeLeft, right: nodeRight });
  }

  /**
   * 布局子节点
   * @param {Array} children - 子节点ID数组
   * @param {Array} childWidths - 子节点宽度数组
   * @param {number} centerX - 父节点中心X坐标
   * @param {number} totalChildWidth - 子节点总宽度
   * @param {number} level - 当前层级
   * @param {Map} nodeMap - 节点映射
   * @param {Map} positions - 位置映射
   * @param {Map} usedPositions - 已使用位置映射
   */
  layoutChildren(children, childWidths, centerX, totalChildWidth, level, nodeMap, positions, usedPositions) {
    let currentX = centerX - totalChildWidth / 2;
    const childLevel = level + 1;
    
    children.forEach((childId, index) => {
      const childWidth = childWidths[index];
      const childCenterX = currentX + childWidth / 2;
      
      this.layoutTree(childId, childLevel, childCenterX, childWidth, nodeMap, positions, usedPositions);
      
      // 记录子节点占用的位置
      if (!usedPositions.has(childLevel)) {
        usedPositions.set(childLevel, []);
      }
      usedPositions.get(childLevel).push({ 
        left: currentX, 
        right: currentX + childWidth 
      });
      
      currentX += childWidth + this.nodeSpacing;
    });
  }
}

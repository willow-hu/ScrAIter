/**
 * 碰撞检测工具
 * 负责检测鼠标位置与节点的碰撞
 */

import { NODE_WIDTH, NODE_HEIGHT } from './treeLayout.js';

export class CollisionDetector {
  /**
   * 检查点是否在节点内
   * @param {number} x - 屏幕X坐标
   * @param {number} y - 屏幕Y坐标
   * @param {Array} nodes - 节点数组
   * @param {Function} getNodeScreenPosition - 获取节点屏幕位置的函数
   * @param {number} scale - 当前缩放比例
   * @returns {Object|null} 碰撞的节点，没有则返回null
   */
  static getNodeAtPosition(x, y, nodes, getNodeScreenPosition, scale) {
    if (!nodes || nodes.length === 0) return null;
    
    // 计算在当前缩放下的节点尺寸
    const scaledWidth = NODE_WIDTH * scale;
    const scaledHeight = NODE_HEIGHT * scale;
    
    for (const node of nodes) {
      const pos = getNodeScreenPosition(node);
      
      if (x >= pos.x && x <= pos.x + scaledWidth && 
          y >= pos.y && y <= pos.y + scaledHeight) {
        return node;
      }
    }
    return null;
  }

  /**
   * 检查矩形区域内的所有节点
   * @param {Object} rect - 矩形区域 {x, y, width, height}
   * @param {Array} nodes - 节点数组
   * @param {Function} getNodeScreenPosition - 获取节点屏幕位置的函数
   * @param {number} scale - 当前缩放比例
   * @returns {Array} 在区域内的节点数组
   */
  static getNodesInRect(rect, nodes, getNodeScreenPosition, scale) {
    if (!nodes || nodes.length === 0) return [];
    
    const scaledWidth = NODE_WIDTH * scale;
    const scaledHeight = NODE_HEIGHT * scale;
    const result = [];
    
    for (const node of nodes) {
      const pos = getNodeScreenPosition(node);
      
      // 检查节点矩形与选择矩形的重叠
      if (this.rectIntersects(
        { x: pos.x, y: pos.y, width: scaledWidth, height: scaledHeight },
        rect
      )) {
        result.push(node);
      }
    }
    
    return result;
  }

  /**
   * 检查两个矩形是否相交
   * @param {Object} rect1 - 矩形1
   * @param {Object} rect2 - 矩形2
   * @returns {boolean} 是否相交
   */
  static rectIntersects(rect1, rect2) {
    return !(rect1.x + rect1.width < rect2.x || 
             rect2.x + rect2.width < rect1.x || 
             rect1.y + rect1.height < rect2.y || 
             rect2.y + rect2.height < rect1.y);
  }

  /**
   * 检查点是否在边上
   * @param {number} x - 屏幕X坐标
   * @param {number} y - 屏幕Y坐标
   * @param {Array} nodes - 节点数组
   * @param {Function} getNodeScreenPosition - 获取节点屏幕位置的函数
   * @param {number} scale - 当前缩放比例
   * @param {number} tolerance - 容错距离（像素）
   * @returns {Object|null} 碰撞的边信息 {parentId, childId}，没有则返回null
   */
  static getEdgeAtPosition(x, y, nodes, getNodeScreenPosition, scale, tolerance = 5) {
    if (!nodes || nodes.length === 0) return null;
    
    for (const node of nodes) {
      const parentPos = getNodeScreenPosition(node);
      const parentCenterX = parentPos.x + (NODE_WIDTH * scale) / 2;
      const parentBottomY = parentPos.y + NODE_HEIGHT * scale;
      
      for (const childId of node.child_ids || []) {
        const childNode = nodes.find(n => n.id === childId);
        if (childNode) {
          const childPos = getNodeScreenPosition(childNode);
          const childCenterX = childPos.x + (NODE_WIDTH * scale) / 2;
          const childTopY = childPos.y;
          
          // 检查点是否在边上（使用点到线段的距离）
          const distance = this.pointToLineDistance(
            x, y,
            parentCenterX, parentBottomY,
            childCenterX, childTopY
          );
          
          if (distance <= tolerance) {
            return { parentId: node.id, childId: childId };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * 计算点到线段的距离
   * @param {number} px - 点X坐标
   * @param {number} py - 点Y坐标
   * @param {number} x1 - 线段起点X坐标
   * @param {number} y1 - 线段起点Y坐标
   * @param {number} x2 - 线段终点X坐标
   * @param {number} y2 - 线段终点Y坐标
   * @returns {number} 距离
   */
  static pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // 线段退化为点
      return Math.sqrt(A * A + B * B);
    }
    
    let param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 检查节点是否重叠
   * @param {Object} node1 - 节点1
   * @param {Object} node2 - 节点2
   * @param {number} margin - 边距
   * @returns {boolean} 是否重叠
   */
  static nodesOverlap(node1, node2, margin = 0) {
    const pos1 = node1.position || { x: 0, y: 0 };
    const pos2 = node2.position || { x: 0, y: 0 };
    
    return this.rectIntersects(
      { x: pos1.x - margin, y: pos1.y - margin, width: NODE_WIDTH + margin * 2, height: NODE_HEIGHT + margin * 2 },
      { x: pos2.x - margin, y: pos2.y - margin, width: NODE_WIDTH + margin * 2, height: NODE_HEIGHT + margin * 2 }
    );
  }
}

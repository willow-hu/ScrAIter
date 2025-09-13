/**
 * 碰撞检测工具
 * 负责检测鼠标位置与节点的碰撞
 */

import { SCRIPT_EDITOR_CONFIG } from './config.js';

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
    const scaledWidth = SCRIPT_EDITOR_CONFIG.node.width * scale;
    const scaledHeight = SCRIPT_EDITOR_CONFIG.node.height * scale;
    
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
    
    const scaledWidth = SCRIPT_EDITOR_CONFIG.node.width * scale;
    const scaledHeight = SCRIPT_EDITOR_CONFIG.node.height * scale;
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
   * 检查节点是否重叠
   * @param {Object} node1 - 节点1
   * @param {Object} node2 - 节点2
   * @param {number} margin - 边距
   * @returns {boolean} 是否重叠
   */
  static nodesOverlap(node1, node2, margin = 0) {
    const pos1 = node1.position || SCRIPT_EDITOR_CONFIG.layout.defaultPosition;
    const pos2 = node2.position || SCRIPT_EDITOR_CONFIG.layout.defaultPosition;
    
    return this.rectIntersects(
      { x: pos1.x - margin, y: pos1.y - margin, width: SCRIPT_EDITOR_CONFIG.node.width + margin * 2, height: SCRIPT_EDITOR_CONFIG.node.height + margin * 2 },
      { x: pos2.x - margin, y: pos2.y - margin, width: SCRIPT_EDITOR_CONFIG.node.width + margin * 2, height: SCRIPT_EDITOR_CONFIG.node.height + margin * 2 }
    );
  }
}

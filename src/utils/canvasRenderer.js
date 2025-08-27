/**
 * Canvas渲染器
 * 负责树结构的绘制和渲染
 */

import { NODE_WIDTH, NODE_HEIGHT } from './treeLayout.js';

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  /**
   * 设置画布尺寸
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  setSize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * 清除画布
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * 应用变换
   * @param {number} scale - 缩放比例
   * @param {Object} translate - 平移偏移
   */
  applyTransform(scale, translate) {
    this.ctx.save();
    this.ctx.scale(scale, scale);
    this.ctx.translate(translate.x / scale, translate.y / scale);
  }

  /**
   * 恢复变换
   */
  restoreTransform() {
    this.ctx.restore();
  }

  /**
   * 渲染所有边
   * @param {Array} nodes - 节点数组
   */
  renderEdges(nodes) {
    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 2;
    
    nodes.forEach(node => {
      const parentPos = node.position || { x: 100, y: 100 };
      (node.child_ids || []).forEach(childId => {
        const childNode = nodes.find(n => n.id === childId);
        if (childNode) {
          const childPos = childNode.position || { x: 100, y: 100 };
          this.renderEdge(parentPos, childPos);
        }
      });
    });
  }

  /**
   * 渲染单条边
   * @param {Object} parentPos - 父节点位置
   * @param {Object} childPos - 子节点位置
   */
  renderEdge(parentPos, childPos) {
    const fromX = parentPos.x + NODE_WIDTH / 2;
    const fromY = parentPos.y + NODE_HEIGHT;
    const toX = childPos.x + NODE_WIDTH / 2;
    const toY = childPos.y;
    
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();
    
    this.renderArrow({ x: fromX, y: fromY }, { x: toX, y: toY });
  }

  /**
   * 渲染箭头
   * @param {Object} from - 起点坐标
   * @param {Object} to - 终点坐标
   */
  renderArrow(from, to) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const arrowLength = 10;
    
    this.ctx.beginPath();
    this.ctx.moveTo(to.x, to.y);
    this.ctx.lineTo(
      to.x - arrowLength * Math.cos(angle - Math.PI / 6),
      to.y - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(to.x, to.y);
    this.ctx.lineTo(
      to.x - arrowLength * Math.cos(angle + Math.PI / 6),
      to.y - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  /**
   * 渲染所有节点
   * @param {Array} nodes - 节点数组
   * @param {Object} selectedNode - 选中的节点
   */
  renderNodes(nodes, selectedNode) {
    nodes.forEach(node => {
      const isSelected = selectedNode && selectedNode.id === node.id;
      this.renderNode(node, isSelected);
    });
  }

  /**
   * 渲染单个节点
   * @param {Object} node - 节点对象
   * @param {boolean} isSelected - 是否选中
   */
  renderNode(node, isSelected = false) {
    const pos = node.position || { x: 100, y: 100 };
    
    // 绘制节点背景
    this.ctx.fillStyle = isSelected ? '#f0f8ff' : 'white';
    this.ctx.strokeStyle = isSelected ? '#007acc' : '#ddd';
    this.ctx.lineWidth = isSelected ? 3 : 2;
    
    this.ctx.fillRect(pos.x, pos.y, NODE_WIDTH, NODE_HEIGHT);
    this.ctx.strokeRect(pos.x, pos.y, NODE_WIDTH, NODE_HEIGHT);
    
    // 绘制节点文本
    this.renderNodeText(node, pos);
  }

  /**
   * 渲染节点文本
   * @param {Object} node - 节点对象
   * @param {Object} pos - 节点位置
   */
  renderNodeText(node, pos) {
    this.ctx.textAlign = 'left';
    
    // 节点ID
    this.ctx.fillStyle = '#666';
    this.ctx.font = '10px Arial';
    this.ctx.fillText(`#${node.id}`, pos.x + 8, pos.y + 15);
    
    // 节点名称
    this.ctx.fillStyle = '#333';
    this.ctx.font = '14px Arial';
    const name = node.name || '未命名';
    const maxWidth = NODE_WIDTH - 16;
    
    if (this.ctx.measureText(name).width > maxWidth) {
      const truncated = name.substring(0, 15) + '...';
      this.ctx.fillText(truncated, pos.x + 8, pos.y + 35);
    } else {
      this.ctx.fillText(name, pos.x + 8, pos.y + 35);
    }
  }

  /**
   * 完整渲染树结构
   * @param {Array} nodes - 节点数组
   * @param {Object} selectedNode - 选中的节点
   * @param {number} scale - 缩放比例
   * @param {Object} translate - 平移偏移
   */
  renderTree(nodes, selectedNode, scale, translate) {
    this.clear();
    
    if (!nodes || nodes.length === 0) return;

    this.applyTransform(scale, translate);
    
    // 先渲染边，再渲染节点，保证节点在边的上层
    this.renderEdges(nodes);
    this.renderNodes(nodes, selectedNode);
    
    this.restoreTransform();
  }
}

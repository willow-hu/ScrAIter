/**
 * Canvas渲染器
 * 负责树结构的绘制和渲染
 */

import { NODE_WIDTH, NODE_HEIGHT } from './treeLayout.js';
import { TREE_EDITOR_CONFIG } from './config.js';

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
    this.ctx.strokeStyle = TREE_EDITOR_CONFIG.rendering.edge.color;
    this.ctx.lineWidth = TREE_EDITOR_CONFIG.rendering.edge.width;
    
    nodes.forEach(node => {
      const parentPos = node.position || TREE_EDITOR_CONFIG.layout.defaultPosition;
      (node.child_ids || []).forEach(childId => {
        const childNode = nodes.find(n => n.id === childId);
        if (childNode) {
          const childPos = childNode.position || TREE_EDITOR_CONFIG.layout.defaultPosition;
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
    const arrowLength = TREE_EDITOR_CONFIG.rendering.edge.arrowLength;
    
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
    const pos = node.position || TREE_EDITOR_CONFIG.layout.defaultPosition;
    const config = TREE_EDITOR_CONFIG.rendering.node;
    
    // 绘制节点背景
    this.ctx.fillStyle = isSelected ? config.backgroundColor.selected : config.backgroundColor.normal;
    this.ctx.strokeStyle = isSelected ? config.border.color.selected : config.border.color.normal;
    this.ctx.lineWidth = isSelected ? config.border.width.selected : config.border.width.normal;
    
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
    const textConfig = TREE_EDITOR_CONFIG.rendering.text;
    this.ctx.textAlign = 'left';
    
    // 节点ID
    this.ctx.fillStyle = textConfig.id.color;
    this.ctx.font = textConfig.id.font;
    this.ctx.fillText(`#${node.id}`, pos.x + textConfig.padding, pos.y + textConfig.id.offsetY);
    
    // 节点名称
    this.ctx.fillStyle = textConfig.name.color;
    this.ctx.font = textConfig.name.font;
    const name = node.name || '未命名';
    const maxWidth = NODE_WIDTH - textConfig.padding * 2;
    
    if (this.ctx.measureText(name).width > maxWidth) {
      const truncated = name.substring(0, textConfig.name.truncateLength) + '...';
      this.ctx.fillText(truncated, pos.x + textConfig.padding, pos.y + textConfig.name.offsetY);
    } else {
      this.ctx.fillText(name, pos.x + textConfig.padding, pos.y + textConfig.name.offsetY);
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

/**
 * Canvas渲染器
 * 负责树结构的绘制和渲染
 */

import { SCRIPT_EDITOR_CONFIG } from './config.js';
import { CSSHelper } from './cssHelper.js';

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = SCRIPT_EDITOR_CONFIG; // 默认配置
  }

  /**
   * 设置渲染配置
   * @param {Object} config - 配置对象
   */
  setConfig(config) {
    this.config = config;
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
   * @param {Object} config - 配置对象（可选，使用实例配置）
   */
  renderEdges(nodes, config = this.config) {
    this.ctx.strokeStyle = config.rendering.edge.color;
    this.ctx.lineWidth = config.rendering.edge.width;
    
    nodes.forEach(node => {
      const parentPos = node.position || config.layout.defaultPosition;
      (node.child_ids || []).forEach(childId => {
        const childNode = nodes.find(n => n.id === childId);
        if (childNode) {
          const childPos = childNode.position || config.layout.defaultPosition;
          this.renderEdge(parentPos, childPos, config);
        }
      });
    });
  }

  /**
   * 渲染单条边
   * @param {Object} parentPos - 父节点位置
   * @param {Object} childPos - 子节点位置
   * @param {Object} config - 配置对象
   */
  renderEdge(parentPos, childPos, config) {
    const fromX = parentPos.x + config.node.width / 2;
    const fromY = parentPos.y + config.node.height;
    const toX = childPos.x + config.node.width / 2;
    const toY = childPos.y;
    
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();
    
    this.renderArrow({ x: fromX, y: fromY }, { x: toX, y: toY }, config);
  }

  /**
   * 渲染箭头
   * @param {Object} from - 起点坐标
   * @param {Object} to - 终点坐标
   * @param {Object} config - 配置对象
   */
  renderArrow(from, to, config) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const arrowLength = config.rendering.edge.arrowLength;
    
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
   * @param {Object} config - 配置对象（可选，使用实例配置）
   */
  renderNodes(nodes, selectedNode, config = this.config) {
    nodes.forEach(node => {
      const isSelected = selectedNode && selectedNode.id === node.id;
      this.renderNode(node, isSelected, config);
    });
  }

  /**
   * 渲染单个节点
   * @param {Object} node - 节点对象
   * @param {boolean} isSelected - 是否选中
   * @param {Object} config - 配置对象
   */
  renderNode(node, isSelected = false, config) {
    const pos = node.position || config.layout.defaultPosition;
    const nodeConfig = config.rendering.node;
    
    // 绘制节点背景
    this.ctx.fillStyle = isSelected ? nodeConfig.backgroundColor.selected : nodeConfig.backgroundColor.normal;
    this.ctx.strokeStyle = isSelected ? nodeConfig.border.color.selected : nodeConfig.border.color.normal;
    this.ctx.lineWidth = isSelected ? nodeConfig.border.width.selected : nodeConfig.border.width.normal;
    
    this.ctx.fillRect(pos.x, pos.y, config.node.width, config.node.height);
    this.ctx.strokeRect(pos.x, pos.y, config.node.width, config.node.height);
    
    // 绘制节点文本
    this.renderNodeText(node, pos, config);
  }

  /**
   * 渲染节点文本
   * @param {Object} node - 节点对象
   * @param {Object} pos - 节点位置
   * @param {Object} config - 配置对象
   */
  renderNodeText(node, pos, config) {
    const textConfig = config.rendering.text;
    const nodeSize = { width: config.node.width, height: config.node.height };
    
    // 渲染节点ID
    const idStyle = textConfig.id;
    CSSHelper.applyTextStyle(this.ctx, idStyle);
    
    const idPos = CSSHelper.calculateTextPosition(pos, nodeSize, idStyle, textConfig.padding);
    this.ctx.fillText(`#${node.id}`, idPos.x, idPos.y);
    
    // 渲染节点名称
    const nameStyle = textConfig.name;
    CSSHelper.applyTextStyle(this.ctx, nameStyle);
    
    const namePos = CSSHelper.calculateTextPosition(pos, nodeSize, nameStyle, textConfig.padding);
    const name = node.name || '未命名';
    const maxWidth = config.node.width - textConfig.padding * 2;
    
    // 处理文本溢出
    const displayText = CSSHelper.truncateText(
      this.ctx, 
      name, 
      maxWidth, 
      nameStyle.truncateLength
    );
    
    this.ctx.fillText(displayText, namePos.x, namePos.y);
  }

  /**
   * 完整渲染树结构
   * @param {Array} nodes - 节点数组
   * @param {Object} selectedNode - 选中的节点
   * @param {number} scale - 缩放比例
   * @param {Object} translate - 平移偏移
   * @param {Object} config - 配置对象（可选，使用实例配置）
   */
  renderTree(nodes, selectedNode, scale, translate, config = this.config) {
    this.clear();
    
    if (!nodes || nodes.length === 0) return;

    this.applyTransform(scale, translate);
    
    // 先渲染边，再渲染节点，保证节点在边的上层
    this.renderEdges(nodes, config);
    this.renderNodes(nodes, selectedNode, config);
    
    this.restoreTransform();
  }
}

/**
 * 事件处理器
 * 负责处理鼠标交互事件和状态管理
 */

import { SCRIPT_EDITOR_CONFIG } from './config.js';

export class EventHandler {
  constructor() {
    // 拖拽状态
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragOffset = { x: 0, y: 0 };
    this.draggedNode = null;
    
    // 鼠标按下状态
    this.isMouseDown = false;
    
    // 上下文菜单状态
    this.contextMenu = null;
    
    // 添加边状态
    this.addingEdge = null;
    
    // 删除边状态
    this.deletingEdge = null;
    
    // 悬停状态
    this.hoveredNode = null;
    this.hoverTimeout = null;
    this.hoverDelay = SCRIPT_EDITOR_CONFIG.interaction.hover.delay; // 从配置文件获取延迟时间
    
    // 回调函数
    this.callbacks = {};
  }

  /**
   * 注册回调函数
   * @param {string} eventType - 事件类型
   * @param {Function} callback - 回调函数
   */
  on(eventType, callback) {
    this.callbacks[eventType] = callback;
  }

  /**
   * 触发回调
   * @param {string} eventType - 事件类型
   * @param {*} data - 事件数据
   */
  emit(eventType, data) {
    if (this.callbacks[eventType]) {
      this.callbacks[eventType](data);
    }
  }

  /**
   * 处理鼠标按下事件
   * @param {MouseEvent} e - 鼠标事件
   * @param {Function} getNodeAtPosition - 获取节点位置的函数
   * @param {Function} getNodeScreenPosition - 获取节点屏幕位置的函数
   */
  handleMouseDown(e, getNodeAtPosition, getNodeScreenPosition) {
    // 设置鼠标按下状态
    this.isMouseDown = true;
    
    // 清除悬停提示框
    this.clearHover();
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const node = getNodeAtPosition(x, y);
    
    if (node) {
      if (this.addingEdge) {
        // 完成添加边的操作
        if (this.addingEdge.id !== node.id) {
          this.emit('addEdge', { parentId: this.addingEdge.id, childId: node.id });
        }
        this.addingEdge = null;
        return;
      }
      
      if (this.deletingEdge) {
        // 完成删除边的操作
        if (this.deletingEdge.id !== node.id) {
          this.emit('deleteEdge', { nodeId1: this.deletingEdge.id, nodeId2: node.id });
        }
        this.deletingEdge = null;
        return;
      }
      
      this.emit('nodeSelect', node);
      this.draggedNode = node;
      const nodePos = getNodeScreenPosition(node);
      this.dragOffset = {
        x: x - nodePos.x,
        y: y - nodePos.y
      };
    } else {
      if (this.addingEdge) {
        this.addingEdge = null;
        return;
      }
      
      if (this.deletingEdge) {
        this.deletingEdge = null;
        return;
      }
      
      this.emit('nodeSelect', null);
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
    }
    
    this.contextMenu = null;
    this.emit('contextMenuClose');
  }

  /**
   * 处理鼠标移动事件
   * @param {MouseEvent} e - 鼠标事件
   * @param {Function} getCanvasPositionFromRelative - 坐标转换函数
   * @param {Function} getNodeAtPosition - 获取节点位置的函数
   */
  handleMouseMove(e, getCanvasPositionFromRelative, getNodeAtPosition) {
    if (this.draggedNode) {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newPos = getCanvasPositionFromRelative(x - this.dragOffset.x, y - this.dragOffset.y);
      this.emit('updateNodePosition', { nodeId: this.draggedNode.id, position: newPos });
    } else if (this.isDragging) {
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      this.emit('canvasDrag', { deltaX: dx, deltaY: dy });
      this.dragStart = { x: e.clientX, y: e.clientY };
    } else {
      // 处理悬停逻辑
      this.handleHover(e, getNodeAtPosition);
    }
  }

  /**
   * 处理鼠标抬起事件
   */
  handleMouseUp() {
    // 重置鼠标按下状态
    this.isMouseDown = false;
    
    this.isDragging = false;
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };
  }

  /**
   * 处理鼠标离开画布事件
   */
  handleMouseLeave() {
    this.clearHover();
  }

  /**
   * 处理滚轮事件
   * @param {WheelEvent} e - 滚轮事件
   */
  handleWheel(e) {
    e.preventDefault();
    
    const rect = e.target.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    this.emit('canvasZoom', {
      mouseX,
      mouseY,
      delta: e.deltaY
    });
  }

  /**
   * 处理右键菜单事件
   * @param {MouseEvent} e - 鼠标事件
   * @param {Function} getNodeAtPosition - 获取节点位置的函数
   * @param {Function} getCanvasPositionFromRelative - 坐标转换函数
   */
  handleContextMenu(e, getNodeAtPosition, getCanvasPositionFromRelative) {
    e.preventDefault();
    
    // 清除悬停提示框
    this.clearHover();
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const node = getNodeAtPosition(x, y);
    const canvasPos = getCanvasPositionFromRelative(x, y);
    
    this.contextMenu = {
      x: e.clientX,
      y: e.clientY,
      node: node,
      canvasPosition: canvasPos
    };

    this.emit('contextMenuOpen', this.contextMenu);
  }

  /**
   * 处理双击事件
   * @param {MouseEvent} e - 鼠标事件
   * @param {Function} getNodeAtPosition - 获取节点位置的函数
   */
  handleDoubleClick(e, getNodeAtPosition) {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const node = getNodeAtPosition(x, y);
    if (node) {
      this.emit('nodeEdit', node);
    }
  }

  /**
   * 关闭上下文菜单
   */
  closeContextMenu() {
    this.contextMenu = null;
    this.emit('contextMenuClose');
  }

  /**
   * 处理鼠标悬停逻辑
   * @param {MouseEvent} e - 鼠标事件
   * @param {Function} getNodeAtPosition - 获取节点位置的函数
   */
  handleHover(e, getNodeAtPosition) {
    // 如果鼠标正在被按下（拖拽状态），不显示悬停提示框
    if (this.isMouseDown) {
      this.clearHover();
      return;
    }
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const node = getNodeAtPosition(x, y);
    
    // 如果悬停节点发生变化
    if (this.hoveredNode !== node) {
      // 清除之前的悬停定时器
      if (this.hoverTimeout) {
        clearTimeout(this.hoverTimeout);
        this.hoverTimeout = null;
      }
      
      // 隐藏之前的提示框
      if (this.hoveredNode) {
        this.emit('nodeHoverEnd', { node: this.hoveredNode });
      }
      
      // 更新悬停节点
      this.hoveredNode = node;
      
      // 如果悬停在节点上，设置延迟显示提示框
      if (node) {
        this.hoverTimeout = setTimeout(() => {
          // 再次检查鼠标是否仍然未按下
          if (!this.isMouseDown) {
            this.emit('nodeHoverStart', { 
              node: node, 
              position: { 
                x: e.clientX, 
                y: e.clientY 
              } 
            });
          }
        }, this.hoverDelay);
      }
    }
  }

  /**
   * 清除悬停状态
   */
  clearHover() {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
    
    if (this.hoveredNode) {
      this.emit('nodeHoverEnd', { node: this.hoveredNode });
      this.hoveredNode = null;
    }
  }

  /**
   * 开始添加边
   * @param {Object} node - 起始节点
   */
  startAddingEdge(node) {
    this.addingEdge = node;
    this.emit('addingEdgeStart', node);
  }

  /**
   * 取消添加边
   */
  cancelAddingEdge() {
    this.addingEdge = null;
    this.emit('addingEdgeCancel');
  }

  /**
   * 开始删除边
   * @param {Object} node - 起始节点
   */
  startDeletingEdge(node) {
    this.deletingEdge = node;
    this.emit('deletingEdgeStart', node);
  }

  /**
   * 取消删除边
   */
  cancelDeletingEdge() {
    this.deletingEdge = null;
    this.emit('deletingEdgeCancel');
  }

  /**
   * 获取当前状态
   */
  getState() {
    return {
      isDragging: this.isDragging,
      draggedNode: this.draggedNode,
      contextMenu: this.contextMenu,
      addingEdge: this.addingEdge,
      deletingEdge: this.deletingEdge
    };
  }

  /**
   * 重置状态
   */
  reset() {
    this.isDragging = false;
    this.draggedNode = null;
    this.contextMenu = null;
    this.addingEdge = null;
    this.deletingEdge = null;
    this.dragStart = { x: 0, y: 0 };
    this.dragOffset = { x: 0, y: 0 };
  }
}

/**
 * 事件处理器
 * 负责处理鼠标交互事件和状态管理
 */

export class EventHandler {
  constructor() {
    // 拖拽状态
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.dragOffset = { x: 0, y: 0 };
    this.draggedNode = null;
    
    // 上下文菜单状态
    this.contextMenu = null;
    
    // 添加边状态
    this.addingEdge = null;
    
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
   */
  handleMouseMove(e, getCanvasPositionFromRelative) {
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
    }
  }

  /**
   * 处理鼠标抬起事件
   */
  handleMouseUp() {
    this.isDragging = false;
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };
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
   * 获取当前状态
   */
  getState() {
    return {
      isDragging: this.isDragging,
      draggedNode: this.draggedNode,
      contextMenu: this.contextMenu,
      addingEdge: this.addingEdge
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
    this.dragStart = { x: 0, y: 0 };
    this.dragOffset = { x: 0, y: 0 };
  }
}

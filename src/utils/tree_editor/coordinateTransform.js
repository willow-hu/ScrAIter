/**
 * 坐标转换工具类
 * 负责画布坐标与屏幕坐标之间的转换
 */

export class CoordinateTransformer {
  constructor() {
    this.scale = 1;
    this.translate = { x: 0, y: 0 };
  }

  /**
   * 设置变换参数
   * @param {number} scale - 缩放比例
   * @param {Object} translate - 平移偏移 {x, y}
   */
  setTransform(scale, translate) {
    this.scale = scale;
    this.translate = translate;
  }

  /**
   * 获取节点在屏幕上的位置
   * @param {Object} node - 节点对象
   * @returns {Object} 屏幕坐标 {x, y}
   */
  getNodeScreenPosition(node) {
    const pos = node.position || { x: 100, y: 100 };
    return {
      x: pos.x * this.scale + this.translate.x,
      y: pos.y * this.scale + this.translate.y
    };
  }

  /**
   * 从鼠标客户端坐标转换到画布坐标
   * @param {number} clientX - 鼠标客户端X坐标
   * @param {number} clientY - 鼠标客户端Y坐标
   * @param {DOMRect} canvasRect - 画布边界矩形
   * @returns {Object} 画布坐标 {x, y}
   */
  getCanvasPosition(clientX, clientY, canvasRect) {
    return {
      x: (clientX - canvasRect.left - this.translate.x) / this.scale,
      y: (clientY - canvasRect.top - this.translate.y) / this.scale
    };
  }

  /**
   * 从canvas相对坐标转换到画布坐标
   * @param {number} relativeX - canvas相对X坐标
   * @param {number} relativeY - canvas相对Y坐标
   * @returns {Object} 画布坐标 {x, y}
   */
  getCanvasPositionFromRelative(relativeX, relativeY) {
    return {
      x: (relativeX - this.translate.x) / this.scale,
      y: (relativeY - this.translate.y) / this.scale
    };
  }

  /**
   * 计算缩放变换
   * @param {number} mouseX - 鼠标X坐标
   * @param {number} mouseY - 鼠标Y坐标
   * @param {number} delta - 缩放增量
   * @param {number} currentScale - 当前缩放比例
   * @param {Object} currentTranslate - 当前平移偏移
   * @returns {Object} 新的变换参数 {scale, translate}
   */
  calculateZoomTransform(mouseX, mouseY, delta, currentScale, currentTranslate) {
    const scaleFactor = delta > 0 ? 0.8 : 1.2;
    const newScale = Math.max(0.1, Math.min(3, currentScale * scaleFactor));
    
    // 计算以鼠标位置为锚点的平移偏移
    const scaleRatio = newScale / currentScale;
    const newTranslateX = mouseX - (mouseX - currentTranslate.x) * scaleRatio;
    const newTranslateY = mouseY - (mouseY - currentTranslate.y) * scaleRatio;
    
    return {
      scale: newScale,
      translate: { x: newTranslateX, y: newTranslateY }
    };
  }

  /**
   * 计算拖拽变换
   * @param {number} deltaX - X方向拖拽距离
   * @param {number} deltaY - Y方向拖拽距离
   * @param {Object} currentTranslate - 当前平移偏移
   * @returns {Object} 新的平移偏移 {x, y}
   */
  calculateDragTransform(deltaX, deltaY, currentTranslate) {
    return {
      x: currentTranslate.x + deltaX,
      y: currentTranslate.y + deltaY
    };
  }
}

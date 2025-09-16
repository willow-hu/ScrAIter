/**
 * 撤销/重做管理工具
 * 类似MS Word的撤销/重做机制，记录每一步修改
 */

/**
 * 撤销/重做管理器类
 */
export class UndoRedoManager {
  constructor() {
    this.history = []; // 历史记录数组
    this.currentIndex = -1; // 当前位置索引
    this.maxHistorySize = 50; // 最大历史记录数量
  }

  /**
   * 初始化管理器
   * @param {Object} initialData - 初始数据
   */
  initialize(initialData) {
    this.history = [this.deepClone(initialData)];
    this.currentIndex = 0;
  }

  /**
   * 深拷贝对象
   * @param {Object} obj - 要拷贝的对象
   * @returns {Object} 深拷贝后的对象
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * 比较两个数据对象是否相同（忽略节点位置）
   * @param {Object} data1 - 第一个数据对象
   * @param {Object} data2 - 第二个数据对象
   * @returns {boolean} 是否相同
   */
  isDataEqual(data1, data2) {
    if (!data1 || !data2) return false;
    
    try {
      const cleanData1 = this.removeNonEssentialFields(data1);
      const cleanData2 = this.removeNonEssentialFields(data2);
      
      const str1 = JSON.stringify(cleanData1);
      const str2 = JSON.stringify(cleanData2);
      return str1 === str2;
    } catch (error) {
      console.error('比较数据时出错:', error);
      return false;
    }
  }

  /**
   * 移除数据中的非实质性字段（如节点位置等）
   * @param {Object} data - 原始数据
   * @returns {Object} 清理后的数据
   */
  removeNonEssentialFields(data) {
    const cleaned = this.deepClone(data);
    
    if (cleaned.structure && Array.isArray(cleaned.structure)) {
      cleaned.structure = cleaned.structure.map(node => {
        const cleanedNode = { ...node };
        delete cleanedNode.position; // 移除position字段
        return cleanedNode;
      });
    }
    
    return cleaned;
  }

  /**
   * 添加新的历史记录
   * @param {Object} data - 新的数据状态
   * @returns {boolean} 是否成功添加（如果数据无变化则返回false）
   */
  pushState(data) {
    if (!data) return false;
    
    // 检查是否与当前状态相同（忽略位置变化）
    const currentData = this.getCurrentState();
    if (currentData && this.isDataEqual(data, currentData)) {
      return false; // 没有实质性变化，不添加历史记录
    }
    
    // 如果当前不在最新位置，删除后面的历史记录
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }
    
    // 添加新状态
    this.history.push(this.deepClone(data));
    this.currentIndex = this.history.length - 1;
    
    // 限制历史记录数量
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }
    
    return true;
  }

  /**
   * 撤销操作
   * @returns {Object} 撤销结果
   */
  undo() {
    if (!this.canUndo()) {
      return { success: false, message: '无法撤销' };
    }
    
    this.currentIndex--;
    const data = this.deepClone(this.history[this.currentIndex]);
    
    return {
      success: true,
      data
    };
  }

  /**
   * 重做操作
   * @returns {Object} 重做结果
   */
  redo() {
    if (!this.canRedo()) {
      return { success: false, message: '无法重做' };
    }
    
    this.currentIndex++;
    const data = this.deepClone(this.history[this.currentIndex]);
    
    return {
      success: true,
      data
    };
  }

  /**
   * 获取当前状态
   * @returns {Object|null} 当前状态数据
   */
  getCurrentState() {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.deepClone(this.history[this.currentIndex]);
    }
    return null;
  }

  /**
   * 检查是否可以撤销
   * @returns {boolean} 是否可以撤销
   */
  canUndo() {
    return this.currentIndex > 0;
  }

  /**
   * 检查是否可以重做
   * @returns {boolean} 是否可以重做
   */
  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * 获取历史记录信息
   * @returns {Object} 历史记录状态
   */
  getHistoryInfo() {
    return {
      totalStates: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }

  /**
   * 清空历史记录
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
  }
}

/**
 * 便捷的工厂函数，创建一个新的撤销/重做管理器实例
 * @param {Object} initialData - 初始数据
 * @returns {UndoRedoManager} 撤销/重做管理器实例
 */
export function createUndoRedoManager(initialData) {
  const manager = new UndoRedoManager();
  if (initialData) {
    manager.initialize(initialData);
  }
  return manager;
}

/**
 * 默认导出一个单例实例
 */
const defaultManager = new UndoRedoManager();
export default defaultManager;
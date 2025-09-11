/**
 * Checkpoint 管理工具
 * 用于管理树结构的版本控制、撤销/重做功能
 */

/**
 * 本地存储的键名
 */
const STORAGE_KEYS = {
  CACHE: 'treeData_cache',
  CHECKPOINTS: 'checkpoints',
  SAVED_DATA: 'treeData'
};

/**
 * Checkpoint 管理器类
 */
export class CheckpointManager {
  constructor() {
    this.checkpoints = [];
    this.currentIndex = -1;
    this.initialData = null;
    this.hasUnsavedChanges = false; // 标记是否有未保存的修改
    this.currentWorkingData = null; // 当前工作数据
  }

  /**
   * 初始化管理器
   * @param {Object} initialData - 初始数据
   */
  initialize(initialData) {
    this.initialData = this.deepClone(initialData);
    this.checkpoints = [];
    this.currentIndex = -1;
    
    // 尝试从本地存储恢复 checkpoints
    this.loadCheckpointsFromStorage();
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
   * 比较两个数据对象是否相同
   * 仅比较实质性内容，忽略节点位置等不影响JSON保存内容的变化
   * @param {Object} data1 - 第一个数据对象
   * @param {Object} data2 - 第二个数据对象
   * @returns {boolean} 是否相同
   */
  isDataEqual(data1, data2) {
    if (!data1 || !data2) return false;
    
    try {
      // 创建数据副本，移除不影响实质内容的字段
      const cleanData1 = this.removeNonEssentialFields(data1);
      const cleanData2 = this.removeNonEssentialFields(data2);
      
      // 使用 JSON 字符串比较来检查深度相等性
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
    
    // 如果有structure数组，移除每个节点的position字段
    if (cleaned.structure && Array.isArray(cleaned.structure)) {
      cleaned.structure = cleaned.structure.map(node => {
        const cleanedNode = { ...node };
        // 移除position字段，因为这只是UI展示相关，不影响实际内容
        delete cleanedNode.position;
        return cleanedNode;
      });
    }
    
    return cleaned;
  }

  /**
   * 更新当前工作数据并检查是否有未保存的修改
   * @param {Object} data - 当前工作数据
   */
  updateWorkingData(data) {
    this.currentWorkingData = this.deepClone(data);
    
    // 检查是否有未保存的修改
    const currentCheckpointData = this.getCurrentCheckpointData();
    this.hasUnsavedChanges = !this.isDataEqual(data, currentCheckpointData);
  }

  /**
   * 获取当前checkpoint的数据
   * @returns {Object|null} 当前checkpoint的数据
   */
  getCurrentCheckpointData() {
    if (this.currentIndex >= 0 && this.currentIndex < this.checkpoints.length) {
      return this.checkpoints[this.currentIndex];
    } else if (this.currentIndex === -1 && this.initialData) {
      return this.initialData;
    }
    return null;
  }

  /**
   * 创建新的 checkpoint
   * @param {Object} data - 当前数据
   * @returns {Object} 操作结果
   */
  createCheckpoint(data) {
    if (!data) {
      return { success: false, message: '数据不能为空' };
    }

    // 检查当前数据是否与最新的 checkpoint 相同
    if (this.currentIndex >= 0 && this.currentIndex < this.checkpoints.length) {
      const lastCheckpoint = this.checkpoints[this.currentIndex];
      if (this.isDataEqual(data, lastCheckpoint)) {
        return { 
          success: false, 
          message: '已是最新！',
          checkpointIndex: this.currentIndex,
          totalCheckpoints: this.checkpoints.length
        };
      }
    }

    // 如果有初始数据且当前没有 checkpoint，检查是否与初始数据相同
    if (this.checkpoints.length === 0 && this.initialData) {
      if (this.isDataEqual(data, this.initialData)) {
        return { 
          success: false, 
          message: '已是最新！',
          checkpointIndex: this.currentIndex,
          totalCheckpoints: this.checkpoints.length
        };
      }
    }

    // 创建当前数据的深拷贝
    const newCheckpoint = this.deepClone(data);
    
    // 如果当前不在最新的checkpoint，需要移除后面的checkpoint
    if (this.currentIndex >= 0 && this.currentIndex < this.checkpoints.length - 1) {
      this.checkpoints = this.checkpoints.slice(0, this.currentIndex + 1);
    }
    
    // 添加新的 checkpoint
    this.checkpoints.push(newCheckpoint);
    this.currentIndex = this.checkpoints.length - 1;
    
    // 清除未保存修改标记
    this.hasUnsavedChanges = false;
    this.currentWorkingData = this.deepClone(newCheckpoint);
    
    // 保存到本地存储
    this.saveCheckpointsToStorage();
    
    return { 
      success: true, 
      message: '保存成功！',
      checkpointIndex: this.currentIndex,
      totalCheckpoints: this.checkpoints.length
    };
  }

  /**
   * 撤销到前一个 checkpoint
   * 如果有未保存的修改，先恢复到当前checkpoint
   * @returns {Object} 操作结果，包含数据或错误信息
   */
  undo() {
    // 如果有未保存的修改，先恢复到当前checkpoint
    if (this.hasUnsavedChanges) {
      const currentCheckpointData = this.getCurrentCheckpointData();
      if (currentCheckpointData) {
        this.hasUnsavedChanges = false;
        this.currentWorkingData = this.deepClone(currentCheckpointData);
        return {
          success: true,
          data: this.deepClone(currentCheckpointData),
          message: '已恢复到最新保存点',
          checkpointIndex: this.currentIndex,
          wasUnsavedRevert: true
        };
      }
    }

    // 正常的撤销逻辑
    if (this.currentIndex > 0) {
      // 撤销到前一个 checkpoint
      this.currentIndex--;
      const data = this.deepClone(this.checkpoints[this.currentIndex]);
      this.hasUnsavedChanges = false;
      this.currentWorkingData = this.deepClone(data);
      return {
        success: true,
        data,
        // message: '已撤销到前一个保存点',
        checkpointIndex: this.currentIndex
      };
    } else if (this.currentIndex === 0) {
      // 如果是第一个 checkpoint，回到初始状态
      this.currentIndex = -1;
      const data = this.deepClone(this.initialData);
      this.hasUnsavedChanges = false;
      this.currentWorkingData = this.deepClone(data);
      return {
        success: true,
        data,
        // message: '已撤销到初始状态',
        checkpointIndex: this.currentIndex
      };
    } else {
      return {
        success: false,
        // message: '无法撤销，已经是最初状态'
      };
    }
  }

  /**
   * 重做到下一个 checkpoint
   * @returns {Object} 操作结果，包含数据或错误信息
   */
  redo() {
    if (this.currentIndex < this.checkpoints.length - 1) {
      // 重做到下一个 checkpoint
      this.currentIndex++;
      const data = this.deepClone(this.checkpoints[this.currentIndex]);
      this.hasUnsavedChanges = false;
      this.currentWorkingData = this.deepClone(data);
      return {
        success: true,
        data,
        // message: '已恢复到下一个保存点',
        checkpointIndex: this.currentIndex
      };
    } else {
      return {
        success: false,
        // message: '无法重做，已经是最新状态'
      };
    }
  }

  /**
   * 重置到初始状态
   * @returns {Object} 操作结果
   */
  reset() {
    if (!this.initialData) {
      return {
        success: false,
        message: '初始数据不存在'
      };
    }

    this.checkpoints = [];
    this.currentIndex = -1;
    this.hasUnsavedChanges = false;
    this.currentWorkingData = this.deepClone(this.initialData);
    
    // 清除所有本地存储
    this.clearStorage();
    
    return {
      success: true,
      data: this.deepClone(this.initialData),
      message: '已重置到初始状态'
    };
  }

  /**
   * 检查是否可以撤销
   * @returns {boolean} 是否可以撤销
   */
  canUndo() {
    // 如果有未保存的修改，总是可以撤销（恢复到当前checkpoint）
    if (this.hasUnsavedChanges) {
      return true;
    }
    // 否则检查是否有之前的checkpoint可以撤销到
    return this.currentIndex >= 0;
  }

  /**
   * 检查是否可以重做
   * @returns {boolean} 是否可以重做
   */
  canRedo() {
    return this.currentIndex < this.checkpoints.length - 1;
  }

  /**
   * 获取当前状态信息
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      totalCheckpoints: this.checkpoints.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      hasInitialData: !!this.initialData,
      hasUnsavedChanges: this.hasUnsavedChanges
    };
  }

  /**
   * 保存 checkpoints 到本地存储
   */
  saveCheckpointsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.CHECKPOINTS, JSON.stringify(this.checkpoints));
    } catch (error) {
      console.error('保存 checkpoints 到本地存储失败:', error);
    }
  }

  /**
   * 从本地存储加载 checkpoints
   */
  loadCheckpointsFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHECKPOINTS);
      if (stored) {
        this.checkpoints = JSON.parse(stored);
        this.currentIndex = this.checkpoints.length - 1;
      }
    } catch (error) {
      console.error('从本地存储加载 checkpoints 失败:', error);
      this.checkpoints = [];
      this.currentIndex = -1;
    }
  }

  /**
   * 清除所有本地存储
   */
  clearStorage() {
    try {
      localStorage.removeItem(STORAGE_KEYS.CACHE);
      localStorage.removeItem(STORAGE_KEYS.CHECKPOINTS);
      localStorage.removeItem(STORAGE_KEYS.SAVED_DATA);
    } catch (error) {
      console.error('清除本地存储失败:', error);
    }
  }

  /**
   * 获取所有 checkpoint 的摘要信息
   * @returns {Array} checkpoint 摘要列表
   */
  getCheckpointSummaries() {
    return this.checkpoints.map((checkpoint, index) => ({
      index,
      timestamp: checkpoint.timestamp || new Date().toISOString(),
      nodeCount: checkpoint.structure ? checkpoint.structure.length : 0,
      isCurrent: index === this.currentIndex
    }));
  }
}

/**
 * 数据缓存管理器
 */
export class DataCacheManager {
  /**
   * 保存数据到缓存
   * @param {Object} data - 要缓存的数据
   */
  static saveToCache(data) {
    try {
      localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(data));
    } catch (error) {
      console.error('保存到缓存失败:', error);
    }
  }

  /**
   * 从缓存加载数据
   * @returns {Object|null} 缓存的数据或 null
   */
  static loadFromCache() {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.CACHE);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('从缓存加载数据失败:', error);
      return null;
    }
  }

  /**
   * 检查是否有缓存数据
   * @returns {boolean} 是否有缓存
   */
  static hasCache() {
    return !!localStorage.getItem(STORAGE_KEYS.CACHE);
  }

  /**
   * 清除缓存
   */
  static clearCache() {
    try {
      localStorage.removeItem(STORAGE_KEYS.CACHE);
    } catch (error) {
      console.error('清除缓存失败:', error);
    }
  }

  /**
   * 获取缓存信息
   * @returns {Object} 缓存信息
   */
  static getCacheInfo() {
    const cached = this.loadFromCache();
    if (!cached) {
      return { hasCache: false };
    }

    return {
      hasCache: true,
      nodeCount: cached.structure ? cached.structure.length : 0,
      lastModified: cached.lastModified || '未知'
    };
  }
}

/**
 * 便捷的工厂函数，创建一个新的 checkpoint 管理器实例
 * @param {Object} initialData - 初始数据
 * @returns {CheckpointManager} checkpoint 管理器实例
 */
export function createCheckpointManager(initialData) {
  const manager = new CheckpointManager();
  if (initialData) {
    manager.initialize(initialData);
  }
  return manager;
}

/**
 * 默认导出一个单例实例（可选）
 */
const defaultManager = new CheckpointManager();
export default defaultManager;

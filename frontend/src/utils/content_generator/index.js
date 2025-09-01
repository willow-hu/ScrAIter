/**
 * Content Generator 工具类索引文件
 * 统一导出内容生成相关的所有工具函数
 * 
 * @author AI Script Co-creator Team
 * @version 1.0.0
 */

// 导出树遍历相关工具
export * from './treeTraversal.js';

// 后续可以在这里添加其他内容生成相关的工具模块
// export * from './contentValidator.js';
// export * from './nodeProcessor.js';
// export * from './dataFormatter.js';

// 默认导出（包含所有工具的对象）
import treeTraversalUtils from './treeTraversal.js';

export default {
  ...treeTraversalUtils,
  // 后续添加其他工具模块时可以在这里扩展
};

/**
 * Script Editor 工具类索引文件
 * 统一导出脚本编辑器相关的所有工具类，方便使用
 */

export { TreeLayoutManager } from './treeLayout.js';
export { CoordinateTransformer } from './coordinateTransform.js';
export { CanvasRenderer } from './canvasRenderer.js';
export { EventHandler } from './eventHandler.js';
export { CollisionDetector } from './collisionDetector.js';
export { CSSHelper } from './cssHelper.js';
export { SCRIPT_EDITOR_CONFIG } from './config.js';
export { UndoRedoManager, createUndoRedoManager } from './undoRedoManager.js';

// 导出树遍历相关工具
export * from './treeTraversal.js';

// 默认导出（包含所有工具的对象）
import treeTraversalUtils from './treeTraversal.js';

export default {
  ...treeTraversalUtils,
};

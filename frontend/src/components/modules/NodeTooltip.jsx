import React from 'react';

/**
 * 节点悬停提示框组件
 * 显示节点的详细信息
 */
const NodeTooltip = ({ visible, node, position }) => {
  if (!visible || !node) {
    return null;
  }

  const { x, y } = position;

  return (
    <div 
      className="node-tooltip"
      style={{
        left: x,
        top: y,
      }}
    >
      <div className="tooltip-content">
        <div className="tooltip-header">
          <span className="tooltip-id">节点 #{node.id}</span>
          <h4 className="tooltip-title">{node.name || '未命名节点'}</h4>
        </div>
        
        {node.abstract && (
          <div className="tooltip-section">
            <label className="tooltip-label">摘要:</label>
            <p className="tooltip-text">{node.abstract}</p>
          </div>
        )}
        
        {node.user && (
          <div className="tooltip-section">
            <label className="tooltip-label">用户选项:</label>
            <p className="tooltip-text">{node.user}</p>
          </div>
        )}
        
        {node.child_ids && node.child_ids.length > 0 && (
          <div className="tooltip-section">
            <label className="tooltip-label">子节点:</label>
            <p className="tooltip-text">
              {node.child_ids.length} 个子节点 ({node.child_ids.join(', ')})
            </p>
          </div>
        )}
        
        {(!node.child_ids || node.child_ids.length === 0) && (
          <div className="tooltip-section">
            <label className="tooltip-label">类型:</label>
            <p className="tooltip-text">叶子节点</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeTooltip;
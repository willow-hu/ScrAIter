import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { 
  TreeLayoutManager, 
  CoordinateTransformer, 
  CanvasRenderer, 
  EventHandler, 
  CollisionDetector,
  SCRIPT_EDITOR_CONFIG
} from '../../utils/script_editor/index.js';

const TreeCanvas = forwardRef(({ 
  readOnly = false,
  treeData, 
  selectedNode, 
  onNodeSelect, 
  onNodeEdit, 
  onAddNode,
  onAddChildNode, 
  onDeleteNode, 
  onAddEdge, 
  onDeleteEdge,
  onUpdateNodePosition,
  onNodeHoverStart,
  onNodeHoverEnd,
  config = SCRIPT_EDITOR_CONFIG  // 接受配置参数，默认使用全局配置
}, ref) => {
  
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(0.5);
  const [translate, setTranslate] = useState({ x: 0, y: 50 });
  const [contextMenu, setContextMenu] = useState(null);

  // 工具类实例
  const layoutManager = useRef(new TreeLayoutManager()).current;
  const coordinateTransformer = useRef(new CoordinateTransformer()).current;
  const renderer = useRef(null);
  const eventHandler = useRef(new EventHandler()).current;

  // 初始化渲染器并设置配置
  useEffect(() => {
    if (canvasRef.current && !renderer.current) {
      renderer.current = new CanvasRenderer(canvasRef.current);
      renderer.current.setConfig(config); // 设置配置
    }
  }, []);

  // 当配置变化时更新渲染器配置
  useEffect(() => {
    if (renderer.current) {
      renderer.current.setConfig(config);
    }
  }, [config]);

  // 更新坐标转换器
  useEffect(() => {
    coordinateTransformer.setTransform(scale, translate);
  }, [scale, translate]);

  // 初始化节点位置
  useEffect(() => {
    if (treeData && treeData.structure) {
      const hasPositions = treeData.structure.some(node => node.position);
      if (!hasPositions) {
        layoutNodes();
      }
    }
  }, [treeData]);

  // 设置事件处理回调
  useEffect(() => {
    eventHandler.readOnly = readOnly;
    eventHandler.on('nodeSelect', node => {
      onNodeSelect(node);
      if (readOnly && node) onNodeEdit(node);
    });
    eventHandler.on('nodeEdit', onNodeEdit);
    eventHandler.on('addEdge', ({ parentId, childId }) => onAddEdge(parentId, childId));
    eventHandler.on('deleteEdge', ({ nodeId1, nodeId2 }) => {
      onDeleteEdge(nodeId1, nodeId2);
    });
    eventHandler.on('updateNodePosition', ({ nodeId, position }) => onUpdateNodePosition(nodeId, position));
    eventHandler.on('contextMenuClose', () => setContextMenu(null));
    eventHandler.on('contextMenuOpen', setContextMenu);
    eventHandler.on('canvasDrag', ({ deltaX, deltaY }) => {
      setTranslate(prev => coordinateTransformer.calculateDragTransform(deltaX, deltaY, prev));
    });
    eventHandler.on('canvasZoom', ({ mouseX, mouseY, delta }) => {
      const newTransform = coordinateTransformer.calculateZoomTransform(mouseX, mouseY, delta, scale, translate);
      setScale(newTransform.scale);
      setTranslate(newTransform.translate);
    });
    
    // 悬停事件处理
    if (onNodeHoverStart) {
      eventHandler.on('nodeHoverStart', onNodeHoverStart);
    }
    if (onNodeHoverEnd) {
      eventHandler.on('nodeHoverEnd', onNodeHoverEnd);
    }
  }, [readOnly, onNodeSelect, onNodeEdit, onAddEdge, onDeleteEdge, onUpdateNodePosition, onNodeHoverStart, onNodeHoverEnd, scale, translate]);

  // 自动布局
  const layoutNodes = () => {
    if (!treeData || !treeData.structure) return;

    const positions = layoutManager.layoutNodes(treeData.structure);
    
    positions.forEach((position, nodeId) => {
      onUpdateNodePosition(nodeId, position);
    });
  };

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    layoutNodes
  }), [layoutNodes]);

  // 工具函数
  const getNodeAtPosition = (x, y) => {
    return CollisionDetector.getNodeAtPosition(
      x, y, 
      treeData?.structure || [], 
      coordinateTransformer.getNodeScreenPosition.bind(coordinateTransformer), 
      scale
    );
  };

  // 事件处理函数
  const handleMouseDown = (e) => {
    eventHandler.handleMouseDown(
      e, 
      getNodeAtPosition, 
      coordinateTransformer.getNodeScreenPosition.bind(coordinateTransformer)
    );
  };

  const handleMouseMove = (e) => {
    eventHandler.handleMouseMove(
      e, 
      coordinateTransformer.getCanvasPositionFromRelative.bind(coordinateTransformer),
      getNodeAtPosition
    );
  };

  const handleMouseUp = () => {
    eventHandler.handleMouseUp();
  };

  const handleMouseLeave = () => {
    eventHandler.handleMouseLeave();
  };

  const handleWheel = (e) => {
    eventHandler.handleWheel(e);
  };

  const handleContextMenu = (e) => {
    eventHandler.handleContextMenu(
      e, 
      getNodeAtPosition, 
      coordinateTransformer.getCanvasPositionFromRelative.bind(coordinateTransformer)
    );
  };

  const handleDoubleClick = (e) => {
    eventHandler.handleDoubleClick(e, getNodeAtPosition);
  };

  // 渲染画布
  useEffect(() => {
    if (!renderer.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 设置画布尺寸
    const rect = canvas.parentElement.getBoundingClientRect();
    renderer.current.setSize(rect.width, rect.height);
    
    // 渲染树结构
    renderer.current.renderTree(
      treeData?.structure || [], 
      selectedNode, 
      scale, 
      translate,
      config
    );
  }, [treeData, selectedNode, scale, translate]);

  return (
    <div className="canvas-area">
      <canvas
        ref={canvasRef}
        style={{ 
          display: 'block', 
          cursor: 'default',
          width: '100%',
          height: '100%'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
      />
      
      {contextMenu && (
        <div 
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => eventHandler.closeContextMenu()}
        >
          {contextMenu.node ? (
            <>
              <div className="context-menu-item" aria-disabled={readOnly} style={readOnly ? { opacity: 0.4, cursor: 'not-allowed' } : undefined} onClick={() => {
                if (readOnly) return;
                const nodeOptions = {
                  position: { 
                    x: contextMenu.node.position.x, 
                    y: contextMenu.node.position.y + 150 
                  }
                };
                onAddChildNode(contextMenu.node.id, nodeOptions);
                eventHandler.closeContextMenu();
              }}>
                添加子节点
              </div>
              <div className="context-menu-item" aria-disabled={readOnly} style={readOnly ? { opacity: 0.4, cursor: 'not-allowed' } : undefined} onClick={() => {
                if (readOnly) return;
                eventHandler.startAddingEdge(contextMenu.node);
                eventHandler.closeContextMenu();
              }}>
                添加边
              </div>
              <div className="context-menu-item" aria-disabled={readOnly} style={readOnly ? { opacity: 0.4, cursor: 'not-allowed' } : undefined} onClick={() => {
                if (readOnly) return;
                eventHandler.startDeletingEdge(contextMenu.node);
                eventHandler.closeContextMenu();
              }}>
                删除边
              </div>
              <div className="context-menu-item" aria-disabled={readOnly} style={readOnly ? { opacity: 0.4, cursor: 'not-allowed' } : undefined} onClick={() => {
                if (readOnly) return;
                onDeleteNode(contextMenu.node.id);
                eventHandler.closeContextMenu();
              }}>
                删除节点
              </div>
            </>
          ) : (
            <>
              <div className="context-menu-item" aria-disabled={readOnly} style={readOnly ? { opacity: 0.4, cursor: 'not-allowed' } : undefined} onClick={() => {
                if (readOnly) return;
                onAddNode(contextMenu.canvasPosition);
                eventHandler.closeContextMenu();
              }}>
                添加节点
              </div>
              <div className="context-menu-item" aria-disabled={readOnly} style={readOnly ? { opacity: 0.4, cursor: 'not-allowed' } : undefined} onClick={() => {
                if (readOnly) return;
                layoutNodes();
                eventHandler.closeContextMenu();
              }}>
                一键布局
              </div>
            </>
          )}
        </div>
      )}
      
      {eventHandler.getState().addingEdge && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: '#007acc',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          点击目标节点完成连接，右键取消
        </div>
      )}
      
      {eventHandler.getState().deletingEdge && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: '#dc3545',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          点击目标节点删除连接，右键取消
        </div>
      )}
    </div>
  );
});

export default TreeCanvas;

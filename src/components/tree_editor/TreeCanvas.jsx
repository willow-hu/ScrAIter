import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TreeLayoutManager } from '../../utils/treeLayout.js';
import { CoordinateTransformer } from '../../utils/coordinateTransform.js';
import { CanvasRenderer } from '../../utils/canvasRenderer.js';
import { EventHandler } from '../../utils/eventHandler.js';
import { CollisionDetector } from '../../utils/collisionDetector.js';

function TreeCanvas({ 
  treeData, 
  selectedNode, 
  onNodeSelect, 
  onNodeEdit, 
  onAddNode, 
  onDeleteNode, 
  onAddEdge, 
  onUpdateNodePosition 
}) {
  
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(0.5);
  const [translate, setTranslate] = useState({ x: 0, y: 50 });
  const [contextMenu, setContextMenu] = useState(null);

  // 工具类实例
  const layoutManager = useRef(new TreeLayoutManager()).current;
  const coordinateTransformer = useRef(new CoordinateTransformer()).current;
  const renderer = useRef(null);
  const eventHandler = useRef(new EventHandler()).current;

  // 初始化渲染器
  useEffect(() => {
    if (canvasRef.current && !renderer.current) {
      renderer.current = new CanvasRenderer(canvasRef.current);
    }
  }, []);

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
    eventHandler.on('nodeSelect', onNodeSelect);
    eventHandler.on('nodeEdit', onNodeEdit);
    eventHandler.on('addEdge', ({ parentId, childId }) => onAddEdge(parentId, childId));
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
  }, [onNodeSelect, onNodeEdit, onAddEdge, onUpdateNodePosition, scale, translate]);

  // 自动布局
  const layoutNodes = () => {
    if (!treeData || !treeData.structure) return;

    const positions = layoutManager.layoutNodes(treeData.structure);
    
    positions.forEach((position, nodeId) => {
      onUpdateNodePosition(nodeId, position);
    });
  };

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
      coordinateTransformer.getCanvasPositionFromRelative.bind(coordinateTransformer)
    );
  };

  const handleMouseUp = () => {
    eventHandler.handleMouseUp();
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
      translate
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
              <div className="context-menu-item" onClick={() => {
                const maxId = Math.max(...treeData.structure.map(n => n.id), 0);
                const newNode = {
                  id: maxId + 1,
                  name: "新建节点",
                  abstract: "",
                  user: "",
                  child_ids: [],
                  position: { 
                    x: contextMenu.node.position.x, 
                    y: contextMenu.node.position.y + 150 
                  }
                };
                onAddNode(newNode.position);
                onAddEdge(contextMenu.node.id, newNode.id);
                eventHandler.closeContextMenu();
              }}>
                添加子节点
              </div>
              <div className="context-menu-item" onClick={() => {
                eventHandler.startAddingEdge(contextMenu.node);
                eventHandler.closeContextMenu();
              }}>
                添加边
              </div>
              <div className="context-menu-item" onClick={() => {
                onDeleteNode(contextMenu.node.id);
                eventHandler.closeContextMenu();
              }}>
                删除节点
              </div>
            </>
          ) : (
            <>
              <div className="context-menu-item" onClick={() => {
                onAddNode(contextMenu.canvasPosition);
                eventHandler.closeContextMenu();
              }}>
                添加节点
              </div>
              <div className="context-menu-item" onClick={() => {
                layoutNodes();
                eventHandler.closeContextMenu();
              }}>
                刷新
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
    </div>
  );
}

export default TreeCanvas;

import React, { useRef, useEffect, useState, useCallback } from 'react';

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
  // 节点尺寸常量 - 统一所有地方使用相同的值
  const NODE_WIDTH = 160;
  const NODE_HEIGHT = 60;
  
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(0.5); // 调整缩放
  const [translate, setTranslate] = useState({ x: 0, y: 50 }); // 调整初始位置
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [addingEdge, setAddingEdge] = useState(null);

  // 初始化节点位置
  useEffect(() => {
    if (treeData && treeData.structure) {
      const hasPositions = treeData.structure.some(node => node.position);
      if (!hasPositions) {
        layoutNodes();
      }
    }
  }, [treeData]);

  // 改进的自动布局算法
  const layoutNodes = () => {
    if (!treeData || !treeData.structure) return;

    const nodes = treeData.structure;
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    
    // 找到根节点（没有父节点的节点）
    const hasParent = new Set();
    nodes.forEach(node => {
      (node.child_ids || []).forEach(childId => hasParent.add(childId));
    });
    const roots = nodes.filter(node => !hasParent.has(node.id));

    const positions = new Map();
    const levelHeight = 150;
    const nodeWidth = NODE_WIDTH; // 使用统一的节点宽度
    const nodeSpacing = 20; // 节点间最小间距
    const usedPositions = new Map(); // 记录每个层级已使用的X位置

    // 计算子树宽度
    const calculateSubtreeWidth = (nodeId) => {
      const node = nodeMap.get(nodeId);
      if (!node || !node.child_ids || node.child_ids.length === 0) {
        return nodeWidth;
      }
      
      let totalWidth = 0;
      node.child_ids.forEach(childId => {
        totalWidth += calculateSubtreeWidth(childId);
      });
      
      return Math.max(nodeWidth, totalWidth + (node.child_ids.length - 1) * nodeSpacing);
    };

    // 递归布局树
    const layoutTree = (nodeId, level = 0, centerX = 0, availableWidth = 0) => {
      const node = nodeMap.get(nodeId);
      if (!node || positions.has(nodeId)) return;

      const children = node.child_ids || [];
      
      if (children.length === 0) {
        // 叶子节点，直接放置在centerX位置
        positions.set(nodeId, { x: centerX - nodeWidth / 2, y: level * levelHeight + 100 });
        return;
      }

      // 计算所有子节点的总宽度需求
      const childWidths = children.map(childId => calculateSubtreeWidth(childId));
      const totalChildWidth = childWidths.reduce((sum, width) => sum + width, 0) + 
                             (children.length - 1) * nodeSpacing;

      // 检查是否需要向右移动以避免重叠
      const levelPositions = usedPositions.get(level) || [];
      let adjustedCenterX = centerX;
      
      // 计算当前节点和子节点占用的范围
      const nodeLeft = adjustedCenterX - nodeWidth / 2;
      const nodeRight = adjustedCenterX + nodeWidth / 2;
      const childrenLeft = adjustedCenterX - totalChildWidth / 2;
      const childrenRight = adjustedCenterX + totalChildWidth / 2;
      
      // 检查与同级其他节点的冲突
      for (const usedPos of levelPositions) {
        if (nodeRight + nodeSpacing > usedPos.left && nodeLeft < usedPos.right + nodeSpacing) {
          // 发生冲突，需要向右移动
          adjustedCenterX = usedPos.right + nodeSpacing + nodeWidth / 2;
        }
      }

      // 检查子节点层级的冲突
      const childLevel = level + 1;
      const childLevelPositions = usedPositions.get(childLevel) || [];
      for (const usedPos of childLevelPositions) {
        const newChildrenLeft = adjustedCenterX - totalChildWidth / 2;
        const newChildrenRight = adjustedCenterX + totalChildWidth / 2;
        if (newChildrenRight + nodeSpacing > usedPos.left && newChildrenLeft < usedPos.right + nodeSpacing) {
          adjustedCenterX = usedPos.right + nodeSpacing + totalChildWidth / 2;
        }
      }

      // 记录当前节点占用的位置
      const finalNodeLeft = adjustedCenterX - nodeWidth / 2;
      const finalNodeRight = adjustedCenterX + nodeWidth / 2;
      if (!usedPositions.has(level)) {
        usedPositions.set(level, []);
      }
      usedPositions.get(level).push({ left: finalNodeLeft, right: finalNodeRight });

      // 放置当前节点
      positions.set(nodeId, { 
        x: finalNodeLeft, 
        y: level * levelHeight + 100 
      });

      // 布局子节点
      let currentX = adjustedCenterX - totalChildWidth / 2;
      children.forEach((childId, index) => {
        const childWidth = childWidths[index];
        const childCenterX = currentX + childWidth / 2;
        
        layoutTree(childId, level + 1, childCenterX, childWidth);
        
        // 记录子节点占用的位置
        if (!usedPositions.has(level + 1)) {
          usedPositions.set(level + 1, []);
        }
        usedPositions.get(level + 1).push({ 
          left: currentX, 
          right: currentX + childWidth 
        });
        
        currentX += childWidth + nodeSpacing;
      });
    };

    // 布局每个根节点
    let rootStartX = 200;
    roots.forEach((root, rootIndex) => {
      const rootWidth = calculateSubtreeWidth(root.id);
      layoutTree(root.id, 0, rootStartX + rootWidth / 2, rootWidth);
      rootStartX += rootWidth + nodeSpacing * 3; // 根节点之间留更大间距
    });

    // 更新节点位置
    nodes.forEach(node => {
      const pos = positions.get(node.id) || { x: 100, y: 100 };
      onUpdateNodePosition(node.id, pos);
    });
  };

  // 获取节点在画布上的位置
  const getNodeScreenPosition = (node) => {
    const pos = node.position || { x: 100, y: 100 };
    return {
      x: pos.x * scale + translate.x,
      y: pos.y * scale + translate.y
    };
  };

  // 获取鼠标在画布上的真实位置（从屏幕坐标转换）
  const getCanvasPosition = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - translate.x) / scale,
      y: (clientY - rect.top - translate.y) / scale
    };
  };

  // 获取canvas相对坐标在画布上的真实位置（从canvas坐标转换）
  const getCanvasPositionFromRelative = (relativeX, relativeY) => {
    return {
      x: (relativeX - translate.x) / scale,
      y: (relativeY - translate.y) / scale
    };
  };

  // 检查点是否在节点内
  const getNodeAtPosition = (x, y) => {
    if (!treeData || !treeData.structure) return null;
    
    for (const node of treeData.structure) {
      const pos = getNodeScreenPosition(node);
      // 计算在当前缩放下的节点尺寸
      const scaledWidth = NODE_WIDTH * scale;
      const scaledHeight = NODE_HEIGHT * scale;
      
      if (x >= pos.x && x <= pos.x + scaledWidth && 
          y >= pos.y && y <= pos.y + scaledHeight) {
        return node;
      }
    }
    return null;
  };

  // 鼠标事件处理
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const node = getNodeAtPosition(x, y);
    
    if (node) {
      if (addingEdge) {
        // 完成添加边的操作
        if (addingEdge.id !== node.id) {
          onAddEdge(addingEdge.id, node.id);
        }
        setAddingEdge(null);
        return;
      }
      
      onNodeSelect(node);
      setDraggedNode(node);
      const nodePos = getNodeScreenPosition(node);
      setDragOffset({
        x: x - nodePos.x,
        y: y - nodePos.y
      });
    } else {
      if (addingEdge) {
        setAddingEdge(null);
        return;
      }
      
      onNodeSelect(null);
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
    
    setContextMenu(null);
  };

  const handleMouseMove = (e) => {
    if (draggedNode) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newPos = getCanvasPositionFromRelative(x - dragOffset.x, y - dragOffset.y);
      onUpdateNodePosition(draggedNode.id, newPos);
    } else if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setTranslate(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? 0.8 : 1.2;
    const newScale = Math.max(0.1, Math.min(3, scale * delta));
    
    // 计算以鼠标位置为锚点的平移偏移
    const scaleRatio = newScale / scale;
    const newTranslateX = mouseX - (mouseX - translate.x) * scaleRatio;
    const newTranslateY = mouseY - (mouseY - translate.y) * scaleRatio;
    
    setScale(newScale);
    setTranslate({ x: newTranslateX, y: newTranslateY });
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const node = getNodeAtPosition(x, y);
    const canvasPos = getCanvasPositionFromRelative(x, y);
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node: node,
      canvasPosition: canvasPos
    });
  };

  const handleDoubleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const node = getNodeAtPosition(x, y);
    if (node) {
      onNodeEdit(node);
    }
  };

  // 渲染箭头
  const renderArrow = (ctx, from, to) => {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const arrowLength = 10;
    
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - arrowLength * Math.cos(angle - Math.PI / 6),
      to.y - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - arrowLength * Math.cos(angle + Math.PI / 6),
      to.y - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  // 渲染画布
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // 设置画布尺寸
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!treeData || !treeData.structure) return;

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(translate.x / scale, translate.y / scale);

    // 渲染边
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    treeData.structure.forEach(node => {
      const parentPos = node.position || { x: 100, y: 100 };
      (node.child_ids || []).forEach(childId => {
        const childNode = treeData.structure.find(n => n.id === childId);
        if (childNode) {
          const childPos = childNode.position || { x: 100, y: 100 };
          
          const fromX = parentPos.x + NODE_WIDTH / 2;
          const fromY = parentPos.y + NODE_HEIGHT;
          const toX = childPos.x + NODE_WIDTH / 2;
          const toY = childPos.y;
          
          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX, toY);
          ctx.stroke();
          
          renderArrow(ctx, { x: fromX, y: fromY }, { x: toX, y: toY });
        }
      });
    });

    // 渲染节点
    treeData.structure.forEach(node => {
      const pos = node.position || { x: 100, y: 100 };
      const isSelected = selectedNode && selectedNode.id === node.id;
      
      // 绘制节点背景
      ctx.fillStyle = isSelected ? '#f0f8ff' : 'white';
      ctx.strokeStyle = isSelected ? '#007acc' : '#ddd';
      ctx.lineWidth = isSelected ? 3 : 2;
      
      ctx.fillRect(pos.x, pos.y, NODE_WIDTH, NODE_HEIGHT);
      ctx.strokeRect(pos.x, pos.y, NODE_WIDTH, NODE_HEIGHT);
      
      // 绘制节点文本
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      
      // 节点ID
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.fillText(`#${node.id}`, pos.x + 8, pos.y + 15);
      
      // 节点名称
      ctx.fillStyle = '#333';
      ctx.font = '14px Arial';
      const name = node.name || '未命名';
      const maxWidth = NODE_WIDTH - 16;
      
      if (ctx.measureText(name).width > maxWidth) {
        const truncated = name.substring(0, 15) + '...';
        ctx.fillText(truncated, pos.x + 8, pos.y + 35);
      } else {
        ctx.fillText(name, pos.x + 8, pos.y + 35);
      }
    });

    ctx.restore();
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
          onMouseLeave={() => setContextMenu(null)}
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
                setContextMenu(null);
              }}>
                添加子节点
              </div>
              <div className="context-menu-item" onClick={() => {
                setAddingEdge(contextMenu.node);
                setContextMenu(null);
              }}>
                添加边
              </div>
              <div className="context-menu-item" onClick={() => {
                onDeleteNode(contextMenu.node.id);
                setContextMenu(null);
              }}>
                删除节点
              </div>
            </>
          ) : (
            <>
              <div className="context-menu-item" onClick={() => {
                onAddNode(contextMenu.canvasPosition);
                setContextMenu(null);
              }}>
                添加节点
              </div>
              <div className="context-menu-item" onClick={() => {
                layoutNodes();
                setContextMenu(null);
              }}>
                刷新
              </div>
            </>
          )}
        </div>
      )}
      
      {addingEdge && (
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

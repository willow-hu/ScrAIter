import React, { useState, useEffect, useCallback } from 'react';
import TreeCanvas from './TreeCanvas';
import Sidebar from './Sidebar';

function TreeEditor() {
  const [treeData, setTreeData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);

  // 加载初始数据
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await fetch('/flat_anchor_tree.json');
        const data = await response.json();
        setTreeData(data);
      } catch (error) {
        console.error('Failed to load tree data:', error);
        // 如果加载失败，使用默认数据
        setTreeData({
          global_context: {
            narrator_role: "讲述者",
            site_name: "景点名称",
            character_setting: "角色设定",
            achievement: "成就"
          },
          structure: [
            {
              id: 1,
              name: "根节点",
              abstract: "这是根节点的摘要",
              user: "用户选项",
              child_ids: []
            }
          ]
        });
      }
    };

    loadInitialData();
  }, []);

  // 处理鼠标调整侧边栏宽度
  const handleMouseDown = useCallback((e) => {
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.max(300, Math.min(600, newWidth)));
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // 添加事件监听器
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // 保存修改
  const handleSave = () => {
    localStorage.setItem('treeData', JSON.stringify(treeData));
    alert('修改已保存！');
  };

  // 导出JSON
  const handleExport = () => {
    if (!isValidTree()) {
      alert('当前图结构不是有效的树结构，无法导出！请检查是否存在环或未连通的节点。');
      return;
    }

    const dataStr = JSON.stringify(treeData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tree_structure.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  // 检查是否为有效的树结构
  const isValidTree = () => {
    if (!treeData || !treeData.structure) return false;
    
    const nodes = treeData.structure;
    const nodeIds = new Set(nodes.map(n => n.id));
    
    // 检查所有child_ids是否都存在
    for (const node of nodes) {
      for (const childId of node.child_ids || []) {
        if (!nodeIds.has(childId)) return false;
      }
    }
    
    // 检查是否有环
    const visited = new Set();
    const visiting = new Set();
    
    const hasCircle = (nodeId) => {
      if (visiting.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      
      visiting.add(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        for (const childId of node.child_ids || []) {
          if (hasCircle(childId)) return true;
        }
      }
      visiting.delete(nodeId);
      visited.add(nodeId);
      return false;
    };
    
    for (const node of nodes) {
      if (hasCircle(node.id)) return false;
    }
    
    return true;
  };

  // 更新全局上下文
  const updateGlobalContext = (newContext) => {
    setTreeData(prev => ({
      ...prev,
      global_context: { ...prev.global_context, ...newContext }
    }));
  };

  // 更新节点
  const updateNode = (nodeId, updates) => {
    setTreeData(prev => ({
      ...prev,
      structure: prev.structure.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }));
  };

  // 添加节点
  const addNode = (position) => {
    const maxId = Math.max(...treeData.structure.map(n => n.id), 0);
    const newNode = {
      id: maxId + 1,
      name: "新建节点",
      abstract: "",
      user: "",
      child_ids: [],
      position: position
    };
    
    setTreeData(prev => ({
      ...prev,
      structure: [...prev.structure, newNode]
    }));
  };

  // 删除节点
  const deleteNode = (nodeId) => {
    setTreeData(prev => ({
      ...prev,
      structure: prev.structure
        .filter(node => node.id !== nodeId)
        .map(node => ({
          ...node,
          child_ids: node.child_ids.filter(id => id !== nodeId)
        }))
    }));
    
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(null);
      setIsEditing(false);
    }
  };

  // 添加边
  const addEdge = (parentId, childId) => {
    setTreeData(prev => ({
      ...prev,
      structure: prev.structure.map(node =>
        node.id === parentId
          ? { ...node, child_ids: [...(node.child_ids || []), childId] }
          : node
      )
    }));
  };

  // 删除边
  const deleteEdge = (parentId, childId) => {
    setTreeData(prev => ({
      ...prev,
      structure: prev.structure.map(node =>
        node.id === parentId
          ? { ...node, child_ids: (node.child_ids || []).filter(id => id !== childId) }
          : node
      )
    }));
  };

  // 更新节点位置
  const updateNodePosition = (nodeId, position) => {
    setTreeData(prev => ({
      ...prev,
      structure: prev.structure.map(node =>
        node.id === nodeId ? { ...node, position } : node
      )
    }));
  };

  if (!treeData) {
    return <div>加载中...</div>;
  }

  return (
    <>
      <TreeCanvas
        treeData={treeData}
        selectedNode={selectedNode}
        onNodeSelect={setSelectedNode}
        onNodeEdit={(node) => {
          setSelectedNode(node);
          setIsEditing(true);
        }}
        onAddNode={addNode}
        onDeleteNode={deleteNode}
        onAddEdge={addEdge}
        onDeleteEdge={deleteEdge}
        onUpdateNodePosition={updateNodePosition}
      />
      
      <div 
        className="resizer" 
        onMouseDown={handleMouseDown}
        style={{ cursor: isResizing ? 'col-resize' : 'col-resize' }}
      />
      
      <Sidebar
        width={sidebarWidth}
        treeData={treeData}
        selectedNode={selectedNode}
        isEditing={isEditing}
        onSave={handleSave}
        onExport={handleExport}
        onUpdateGlobalContext={updateGlobalContext}
        onUpdateNode={updateNode}
        onStartEdit={(node) => {
          setSelectedNode(node);
          setIsEditing(true);
        }}
        onCloseEdit={() => {
          setIsEditing(false);
          setSelectedNode(null);
        }}
      />
    </>
  );
}

export default TreeEditor;

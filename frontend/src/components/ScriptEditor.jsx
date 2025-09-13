import React, { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import TreeCanvas from './modules/TreeCanvas';
import Sidebar from './modules/Sidebar';
import NodeEditModal from './modules/NodeEditModal';
import { isValidTree } from '../utils/script_editor/treeValidator';
import { createCheckpointManager, DataCacheManager } from '../utils/script_editor/checkpointManager';
import { createTreeStructureManager } from '../utils/script_editor/treeStructureManager';
import { TreeLayoutManager } from '../utils/script_editor/index.js';

function ScriptEditor() {
  const [treeData, setTreeData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const [nodeEditModalVisible, setNodeEditModalVisible] = useState(false);
  
  // TreeCanvas ref
  const treeCanvasRef = useRef(null);
  
  // checkpoint 管理器
  const [checkpointManager] = useState(() => createCheckpointManager());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // 布局管理器
  const [layoutManager] = useState(() => new TreeLayoutManager());

  // 为树数据添加自动布局位置
  const addAutoLayoutPositions = (data) => {
    if (!data || !data.structure) return data;
    
    // 创建数据副本
    const dataWithPositions = JSON.parse(JSON.stringify(data));
    
    // 计算自动布局位置
    const positions = layoutManager.layoutNodes(dataWithPositions.structure);
    
    // 为每个节点添加位置信息
    dataWithPositions.structure = dataWithPositions.structure.map(node => ({
      ...node,
      position: positions.get(node.id) || { x: 400, y: 100 }
    }));
    
    return dataWithPositions;
  };

  // 树结构管理器
  const [treeManager] = useState(() => createTreeStructureManager(null, (newData) => {
    setTreeData(newData);
    DataCacheManager.saveToCache(newData);
    // 更新checkpointManager的工作数据，用于检测未保存的修改
    checkpointManager.updateWorkingData(newData);
  }));

  // 更新撤销/重做按钮状态
  const updateUndoRedoState = () => {
    const status = checkpointManager.getStatus();
    setCanUndo(status.canUndo);
    setCanRedo(status.canRedo);
  };

  // 加载初始数据
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 尝试从项目API加载twin_pagoda项目
        const response = await fetch('http://localhost:8000/api/v1/projects/twin_pagoda/tree');
        
        if (response.ok) {
          const data = await response.json();
          
          // 为数据添加自动布局位置（如果没有位置信息的话）
          const hasPositions = data.structure && data.structure.some(node => node.position);
          const dataWithPositions = hasPositions ? data : addAutoLayoutPositions(data);
          
          // 初始化管理器
          checkpointManager.initialize(dataWithPositions);
          treeManager.setData(dataWithPositions);
          
          // 检查是否有缓存的数据
          if (DataCacheManager.hasCache()) {
            // 如果有缓存数据则恢复
            const cachedData = DataCacheManager.loadFromCache();
            setTreeData(cachedData);
            treeManager.setData(cachedData);
            checkpointManager.updateWorkingData(cachedData);
          } else {
            setTreeData(dataWithPositions);
            checkpointManager.updateWorkingData(dataWithPositions);
          }
          updateUndoRedoState();
        } else {
          // 如果项目API失败，尝试加载public文件夹中的fallback文件
          console.log('项目文件不存在，尝试加载fallback文件...');
          const fallbackResponse = await fetch('/flat_anchor_tree.json');
          
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            
            // 为数据添加自动布局位置（如果没有位置信息的话）
            const hasPositions = data.structure && data.structure.some(node => node.position);
            const dataWithPositions = hasPositions ? data : addAutoLayoutPositions(data);
            
            // 初始化管理器
            checkpointManager.initialize(dataWithPositions);
            treeManager.setData(dataWithPositions);
            
            // 检查是否有缓存的数据
            if (DataCacheManager.hasCache()) {
              // 如果有缓存数据则恢复
              const cachedData = DataCacheManager.loadFromCache();
              setTreeData(cachedData);
              treeManager.setData(cachedData);
              checkpointManager.updateWorkingData(cachedData);
            } else {
              setTreeData(dataWithPositions);
              checkpointManager.updateWorkingData(dataWithPositions);
            }
            updateUndoRedoState();
          } else {
            throw new Error('无法加载树数据');
          }
        }
      } catch (error) {
        console.error('Failed to load tree data:', error);
        // 如果加载失败，使用默认数据
        const defaultData = {
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
        };
        
        // 为默认数据添加自动布局位置
        const defaultDataWithPositions = addAutoLayoutPositions(defaultData);
        
        setTreeData(defaultDataWithPositions);
        checkpointManager.initialize(defaultDataWithPositions);
        treeManager.setData(defaultDataWithPositions);
        checkpointManager.updateWorkingData(defaultDataWithPositions);
        updateUndoRedoState();
      }
    };

    loadInitialData();
  }, [checkpointManager, treeManager]);

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

  // 保存修改 - 创建新的checkpoint并保存到服务器
  const handleSave = async () => {
    if (!treeData) return;
    
    const result = checkpointManager.createCheckpoint(treeData);
    if (result.success) {
      updateUndoRedoState();
      
      // 保存到服务器（项目API）
      try {
        const response = await fetch('http://localhost:8000/api/v1/projects/twin_pagoda/tree', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(treeData)
        });
        
        if (response.ok) {
          message.success(`${result.message}`);
        } else {
          // 如果服务器保存失败，仍然显示本地保存成功，但添加警告
          message.warning(`${result.message}`);
        }
      } catch (error) {
        console.error('保存到服务器失败:', error);
        message.warning(`${result.message}`);
      }
      
      // 保存到localStorage（本地备份）
      localStorage.setItem('treeData', JSON.stringify(treeData));
      
    } else {
      // 如果是"已是最新！"的情况，显示信息提示而不是错误提示
      if (result.message === '已是最新！') {
        message.info(result.message);
      } else {
        message.error(result.message);
      }
    }
  };

  // 撤销到前一个checkpoint
  const handleUndo = () => {
    const result = checkpointManager.undo();
    if (result.success) {
      setTreeData(result.data);
      treeManager.setData(result.data);
      updateUndoRedoState();
      setSelectedNode(null);
      
      // 如果是恢复未保存修改，显示相应消息
      if (result.wasUnsavedRevert && result.message) {
        message.info(result.message);
      }
    } else {
      message.warning(result.message);
    }
  };

  // 回做到下一个checkpoint
  const handleRedo = () => {
    const result = checkpointManager.redo();
    if (result.success) {
      setTreeData(result.data);
      treeManager.setData(result.data);
      updateUndoRedoState();
      setSelectedNode(null);
      // message.success(result.message);
    } else {
      message.warning(result.message);
    }
  };

  // 重置到初始状态
  const handleReset = () => {
    const result = checkpointManager.reset();
    if (result.success) {
      setTreeData(result.data);
      treeManager.setData(result.data);
      updateUndoRedoState();
      setSelectedNode(null);
      
      message.success(result.message);
    } else {
      message.error(result.message);
    }
  };

  // 导出JSON
  const handleExport = () => {
    if (!isValidTree(treeData)) {
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

  // 更新全局上下文
  const updateGlobalContext = (newContext) => {
    const result = treeManager.updateGlobalContext(newContext);
    if (!result.success) {
      message.error(result.message);
    } else {
      updateUndoRedoState();
    }
  };

  // 更新节点
  const updateNode = (nodeId, updates) => {
    const result = treeManager.updateNode(nodeId, updates);
    if (!result.success) {
      message.error(result.message);
    } else {
      // 如果当前选中的节点被更新，同步更新选中节点数据
      if (selectedNode && selectedNode.id === nodeId) {
        const updatedNode = treeManager.getNode(nodeId);
        setSelectedNode(updatedNode);
      }
      updateUndoRedoState();
    }
  };

  // 添加节点
  const addNode = (position) => {
    const result = treeManager.addNode({ position });
    if (result.success) {
      message.success(`${result.message}`);
    } else {
      message.error(result.message);
    }
    updateUndoRedoState();
  };

  // 删除节点
  const deleteNode = (nodeId) => {
    const result = treeManager.deleteNode(nodeId);
    if (result.success) {
      // 如果删除的是当前选中的节点，清除选择
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode(null);
      }
      message.success(result.message);
    } else {
      message.error(result.message);
    }
    updateUndoRedoState();
  };

  // 添加边
  const addEdge = (parentId, childId) => {
    const result = treeManager.addEdge(parentId, childId);
    if (result.success) {
      message.success(result.message);
    } else {
      message.error(result.message);
    }
    updateUndoRedoState();
  };

  // 删除边
  const deleteEdge = (nodeId1, nodeId2) => {
    const result = treeManager.deleteEdge(nodeId1, nodeId2);
    if (result.success) {
      message.success(result.message);
    } else {
      message.error(result.message);
    }
    updateUndoRedoState();
  };

  // 更新节点位置
  const updateNodePosition = (nodeId, position) => {
    const result = treeManager.updateNodePosition(nodeId, position);
    if (!result.success) {
      message.error(result.message);
    }
    // 注意：节点位置变化不触发updateUndoRedoState，因为位置不影响保存状态
  };

  // 处理节点双击编辑
  const handleNodeEdit = (node) => {
    setSelectedNode(node);
    setNodeEditModalVisible(true);
  };

  // 关闭节点编辑模态框
  const handleCloseNodeEdit = () => {
    setNodeEditModalVisible(false);
  };

  if (!treeData) {
    return <div>加载中...</div>;
  }

  return (
    <>
      <TreeCanvas
        ref={treeCanvasRef}
        treeData={treeData}
        selectedNode={selectedNode}
        onNodeSelect={setSelectedNode}
        onNodeEdit={handleNodeEdit}
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
        onSave={handleSave}
        onExport={handleExport}
        onUpdateGlobalContext={updateGlobalContext}
        onUpdateNode={updateNode}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onReset={handleReset}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* 节点编辑模态框 */}
      <NodeEditModal
        visible={nodeEditModalVisible}
        node={selectedNode}
        treeData={treeData}
        onClose={handleCloseNodeEdit}
        onSave={updateNode}
      />
    </>
  );
}

export default ScriptEditor;

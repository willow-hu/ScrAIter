import React, { useState, useEffect, useCallback, useRef } from 'react';
import { message, Button, Drawer, FloatButton } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import TreeCanvas from '../modules/TreeCanvas';
import Sidebar from '../modules/Sidebar';
import NodeEditModal from '../modules/NodeEditModal';
import { isValidTree } from '../../utils/script_editor/treeValidator';
import { createCheckpointManager, DataCacheManager } from '../../utils/script_editor/checkpointManager';
import { createTreeStructureManager } from '../../utils/script_editor/treeStructureManager';
import { TreeLayoutManager } from '../../utils/script_editor/index.js';

function ScriptEditor() {
  console.log('ScriptEditor 组件已渲染');
  const [treeData, setTreeData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeEditModalVisible, setNodeEditModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(400);
  
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
    
    const dataWithPositions = JSON.parse(JSON.stringify(data));
    const positions = layoutManager.layoutNodes(dataWithPositions.structure);
    
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
    console.log('useEffect: 开始加载数据');
    const loadInitialData = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/projects/twin_pagoda/tree');
        
        if (response.ok) {
          const data = await response.json();
          const hasPositions = data.structure && data.structure.some(node => node.position);
          const dataWithPositions = hasPositions ? data : addAutoLayoutPositions(data);
          
          checkpointManager.initialize(dataWithPositions);
          treeManager.setData(dataWithPositions);
          
          if (DataCacheManager.hasCache()) {
            const cachedData = DataCacheManager.loadFromCache();
            setTreeData(cachedData);
            treeManager.setData(cachedData);
            checkpointManager.updateWorkingData(cachedData);
          } else {
            setTreeData(dataWithPositions);
            checkpointManager.updateWorkingData(dataWithPositions);
          }
          updateUndoRedoState();
          console.log('API数据加载成功:', dataWithPositions);
        } else {
          console.log('项目文件不存在，尝试加载fallback文件...');
          const fallbackResponse = await fetch('/flat_anchor_tree.json');
          
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            const hasPositions = data.structure && data.structure.some(node => node.position);
            const dataWithPositions = hasPositions ? data : addAutoLayoutPositions(data);
            
            checkpointManager.initialize(dataWithPositions);
            treeManager.setData(dataWithPositions);
            
            if (DataCacheManager.hasCache()) {
              const cachedData = DataCacheManager.loadFromCache();
              setTreeData(cachedData);
              treeManager.setData(cachedData);
              checkpointManager.updateWorkingData(cachedData);
            } else {
              setTreeData(dataWithPositions);
              checkpointManager.updateWorkingData(dataWithPositions);
            }
            updateUndoRedoState();
            console.log('Fallback数据加载成功:', dataWithPositions);
          } else {
            throw new Error('无法加载树数据');
          }
        }
      } catch (error) {
        console.error('Failed to load tree data:', error);
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
        
        const defaultDataWithPositions = addAutoLayoutPositions(defaultData);
        setTreeData(defaultDataWithPositions);
        checkpointManager.initialize(defaultDataWithPositions);
        treeManager.setData(defaultDataWithPositions);
        checkpointManager.updateWorkingData(defaultDataWithPositions);
        updateUndoRedoState();
      }
    };

    loadInitialData().catch(err => {
      console.error('loadInitialData failed:', err);
    });
  }, [checkpointManager, treeManager]);

  // 保存修改
  const handleSave = async () => {
    if (!treeData) return;
    
    const result = checkpointManager.createCheckpoint(treeData);
    if (result.success) {
      updateUndoRedoState();
      
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
          message.warning(`${result.message}`);
        }
      } catch (error) {
        console.error('保存到服务器失败:', error);
        message.warning(`${result.message}`);
      }
      
      localStorage.setItem('treeData', JSON.stringify(treeData));
      
    } else {
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
    if (!result.success) {
      message.error(result.message);
    }
    updateUndoRedoState();
  };

  // 删除节点
  const deleteNode = (nodeId) => {
    const result = treeManager.deleteNode(nodeId);
    if (result.success) {
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode(null);
      }
    } else {
      message.error(result.message);
    }
    updateUndoRedoState();
  };

  // 添加边
  const addEdge = (parentId, childId) => {
    const result = treeManager.addEdge(parentId, childId);
    if (!result.success) {
      message.error(result.message);
    }
    updateUndoRedoState();
  };

  // 删除边
  const deleteEdge = (nodeId1, nodeId2) => {
    const result = treeManager.deleteEdge(nodeId1, nodeId2);
    if (!result.success) {
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
    return <div style={{ 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>加载中...</div>;
  }

  return (
    <div className="script-editor">
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
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* 浮动按钮 */}
      <FloatButton
        icon={<SettingOutlined />}
        type="primary"
        style={{
          right: 24,
          bottom: 24,
        }}
        onClick={() => setDrawerVisible(true)}
      />

      {/* 抽屉 */}
      <Drawer
        title="脚本编辑工具"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={drawerWidth}
        styles={{
          body: { padding: 0 }
        }}
      >
        <Sidebar
          width={drawerWidth}
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
          inDrawer={true}
        />
      </Drawer>

      {/* 节点编辑模态框 */}
      <NodeEditModal
        visible={nodeEditModalVisible}
        node={selectedNode}
        treeData={treeData}
        onClose={handleCloseNodeEdit}
        onSave={updateNode}
      />
    </div>
  );
}

export default ScriptEditor;
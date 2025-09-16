import React, { useState, useEffect, useCallback, useRef } from 'react';
import { message, Button, Drawer } from 'antd';
import { SettingOutlined, SaveOutlined, UndoOutlined, RedoOutlined } from '@ant-design/icons';
import TreeCanvas from '../modules/TreeCanvas';
import Sidebar from '../modules/Sidebar';
import NodeEditModal from '../modules/NodeEditModal';
import { isValidTree } from '../../utils/script_editor/treeValidator';
import { createUndoRedoManager } from '../../utils/script_editor/undoRedoManager';
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
  
  // 撤销/重做管理器
  const [undoRedoManager] = useState(() => createUndoRedoManager());
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
    // 自动记录到历史（会自动忽略只有位置变化的情况）
    undoRedoManager.pushState(newData);
    updateUndoRedoState();
  }));

  // 更新撤销/重做按钮状态
  const updateUndoRedoState = () => {
    setCanUndo(undoRedoManager.canUndo());
    setCanRedo(undoRedoManager.canRedo());
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
          
          undoRedoManager.initialize(dataWithPositions);
          treeManager.setData(dataWithPositions);
          setTreeData(dataWithPositions);
          updateUndoRedoState();
          console.log('API数据加载成功:', dataWithPositions);
        } else {
          console.log('项目文件不存在，尝试加载fallback文件...');
          const fallbackResponse = await fetch('/flat_anchor_tree.json');
          
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            const hasPositions = data.structure && data.structure.some(node => node.position);
            const dataWithPositions = hasPositions ? data : addAutoLayoutPositions(data);
            
            undoRedoManager.initialize(dataWithPositions);
            treeManager.setData(dataWithPositions);
            setTreeData(dataWithPositions);
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
        undoRedoManager.initialize(defaultDataWithPositions);
        treeManager.setData(defaultDataWithPositions);
        updateUndoRedoState();
      }
    };

    loadInitialData().catch(err => {
      console.error('loadInitialData failed:', err);
    });
  }, [undoRedoManager, treeManager]);

  // 保存修改
  const handleSave = async () => {
    if (!treeData) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/projects/twin_pagoda/tree', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(treeData)
      });
      
      if (response.ok) {
        message.success('保存成功');
      } else {
        message.error('保存到服务器失败');
      }
    } catch (error) {
      console.error('保存到服务器失败:', error);
      message.error('保存失败');
    }
  };

  // 撤销操作
  const handleUndo = () => {
    const result = undoRedoManager.undo();
    if (result.success) {
      setTreeData(result.data);
      treeManager.setData(result.data);
      updateUndoRedoState();
      setSelectedNode(null);
    } else {
      message.warning('无法撤销');
    }
  };

  // 重做操作
  const handleRedo = () => {
    const result = undoRedoManager.redo();
    if (result.success) {
      setTreeData(result.data);
      treeManager.setData(result.data);
      updateUndoRedoState();
      setSelectedNode(null);
    } else {
      message.warning('无法重做');
    }
  };

  // 重置到初始状态
  const handleReset = () => {
    if (undoRedoManager.history && undoRedoManager.history.length > 0) {
      // 重置为初始数据
      const firstState = undoRedoManager.history[0];
      undoRedoManager.clear();
      undoRedoManager.initialize(firstState);
      setTreeData(firstState);
      treeManager.setData(firstState);
      updateUndoRedoState();
      setSelectedNode(null);
      message.success('已重置到初始状态');
    } else {
      message.error('无法重置');
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
    }
  };

  // 添加节点
  const addNode = (position) => {
    const result = treeManager.addNode({ position });
    if (!result.success) {
      message.error(result.message);
    }
  };

  // 添加子节点（原子操作）
  const addChildNode = (parentId, nodeOptions) => {
    const result = treeManager.addChildNode(parentId, nodeOptions);
    if (!result.success) {
      message.error(result.message);
    }
    return result;
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
  };

  // 添加边
  const addEdge = (parentId, childId) => {
    const result = treeManager.addEdge(parentId, childId);
    if (!result.success) {
      message.error(result.message);
    }
  };

  // 删除边
  const deleteEdge = (nodeId1, nodeId2) => {
    const result = treeManager.deleteEdge(nodeId1, nodeId2);
    if (!result.success) {
      message.error(result.message);
    }
  };

  // 更新节点位置（不记录到历史）
  const updateNodePosition = (nodeId, position) => {
    const result = treeManager.updateNodePosition(nodeId, position);
    if (!result.success) {
      message.error(result.message);
    }
    // 注意：位置变化不记录到历史记录中
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
        onAddChildNode={addChildNode}
        onDeleteNode={deleteNode}
        onAddEdge={addEdge}
        onDeleteEdge={deleteEdge}
        onUpdateNodePosition={updateNodePosition}
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* 右上角四个浮动按钮 - 水平排列 */}
      <div style={{
        position: 'fixed',
        top: 24,
        right: 24,
        display: 'flex',
        gap: '12px',
        zIndex: 1000
      }}>
        <Button
          shape="circle"
          icon={<UndoOutlined />}
          title="撤销"
          onClick={handleUndo}
          disabled={!canUndo}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        />
        
        <Button
          shape="circle"
          icon={<RedoOutlined />}
          title="重做"
          onClick={handleRedo}
          disabled={!canRedo}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        />
        
        <Button
          shape="circle"
          icon={<SaveOutlined />}
          title="保存修改"
          onClick={handleSave}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        />

        <Button
          shape="circle"
          type="primary"
          icon={<SettingOutlined />}
          title="设置"
          onClick={() => setDrawerVisible(true)}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        />
      </div>

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
          onExport={handleExport}
          onUpdateGlobalContext={updateGlobalContext}
          onUpdateNode={updateNode}
          onReset={handleReset}
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
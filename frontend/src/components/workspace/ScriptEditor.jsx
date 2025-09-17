import React, { useState, useEffect, useCallback, useRef } from 'react';
import { message, Button, Modal } from 'antd';

import * as Icons from '../../utils/icons';
import TreeCanvas from '../modules/TreeCanvas';
import NodeEditModal from '../modules/NodeEditModal';
import NodeTooltip from '../modules/NodeTooltip';
import ProjectInfoModal from '../modules/ProjectInfoModal';
import { isValidTree } from '../../utils/script_editor/treeValidator';
import { createUndoRedoManager } from '../../utils/script_editor/undoRedoManager';
import { createTreeStructureManager } from '../../utils/script_editor/treeStructureManager';
import { TreeLayoutManager } from '../../utils/script_editor/index.js';

function ScriptEditor() {
  console.log('ScriptEditor 组件已渲染');
  const [treeData, setTreeData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeEditModalVisible, setNodeEditModalVisible] = useState(false);
  
  // 新增的浮动按钮相关状态
  const [projectInfoModalVisible, setProjectInfoModalVisible] = useState(false);
  const [usageModalVisible, setUsageModalVisible] = useState(false);
  
  // 悬停提示框状态
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipNode, setTooltipNode] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
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

  // 新增：处理导出脚本（带验证）
  const handleExportWithValidation = () => {
    if (isValidTree(treeData)) {
      // 如果是有效树结构，直接导出
      handleExport();
    } else {
      // 如果不是有效树结构，显示警告对话框
      Modal.warning({
        title: '无法导出',
        icon: <Icons.ExclamationCircleOutlined />,
        content: (
          <div>
            <p>当前图结构不是有效的有向树结构，无法导出。</p>
            <p>请检查以下问题：</p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li>是否有且仅有一个根节点（没有父节点的节点）</li>
              <li>除根节点外，每个节点是否都有且仅有一个父节点</li>
              <li>是否存在环形引用</li>
              <li>是否所有节点都连通</li>
            </ul>
          </div>
        ),
        okText: '知道了',
        width: 480,
      });
    }
  };

  // 新增：处理重置脚本（带确认）
  const handleResetWithConfirm = () => {
    Modal.confirm({
      title: '重置脚本',
      icon: <Icons.ExclamationCircleOutlined />,
      content: '确定要重置脚本吗？这将放弃所有未保存的更改，回到初始状态。',
      okText: '确定重置',
      cancelText: '取消',
      okType: 'danger',
      onOk() {
        handleReset();
      },
    });
  };

  // 新增：打开项目信息编辑
  const handleOpenProjectInfo = () => {
    setProjectInfoModalVisible(true);
  };

  // 新增：保存项目信息
  const handleSaveProjectInfo = (projectInfoData) => {
    updateGlobalContext(projectInfoData);
    setProjectInfoModalVisible(false);
    message.success('项目信息已更新');
  };

  // 新增：取消项目信息编辑
  const handleCancelProjectInfo = () => {
    setProjectInfoModalVisible(false);
  };

  // 新增：生成大纲（GraphRAG）
  const handleGenerateOutline = async () => {
    try {
      message.info('正在生成大纲，请稍候...');
      // TODO: 实现GraphRAG大纲生成API调用
      // const response = await fetch('http://localhost:8000/api/v1/generate/structure', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     knowledge_base: treeData?.global_context?.knowledge_base,
      //     requirements: treeData?.global_context?.other_requirements
      //   })
      // });
      // const result = await response.json();
      
      message.warning('GraphRAG大纲生成功能暂未实现，请等待后端开发完成');
    } catch (error) {
      console.error('生成大纲失败:', error);
      message.error('生成大纲失败');
    }
  };

  // 新增：显示使用说明
  const handleShowUsage = () => {
    setUsageModalVisible(true);
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
        onNodeHoverStart={({ node, position }) => {
          setTooltipNode(node);
          setTooltipPosition(position);
          setTooltipVisible(true);
        }}
        onNodeHoverEnd={() => {
          setTooltipVisible(false);
          setTooltipNode(null);
        }}
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* 节点悬停提示框 */}
      <NodeTooltip
        visible={tooltipVisible}
        node={tooltipNode}
        position={tooltipPosition}
      />
      
      {/* 右上角六个浮动按钮 - 水平排列 */}
      <div className="floating-buttons-container">
        <Button
          shape="circle"
          icon={<Icons.FileTextOutlined />}
          title="项目信息"
          onClick={handleOpenProjectInfo}
          className="floating-button"
        />
        
        <Button
          shape="circle"
          icon={<Icons.NodeIndexOutlined />}
          title="生成大纲（GraphRAG）"
          onClick={handleGenerateOutline}
          className="floating-button"
        />
        
        <Button
          shape="circle"
          icon={<Icons.SaveOutlined />}
          title="保存修改"
          onClick={handleSave}
          className="floating-button"
        />

        <Button
          shape="circle"
          icon={<Icons.DownloadOutlined />}
          title="导出脚本"
          onClick={handleExportWithValidation}
          className="floating-button"
        />

        <Button
          shape="circle"
          icon={<Icons.ReloadOutlined />}
          title="重置为GraphRAG生成的结构"
          onClick={handleResetWithConfirm}
          className="floating-button"
        />

        <Button
          shape="circle"
          icon={<Icons.QuestionCircleOutlined />}
          title="使用说明"
          onClick={handleShowUsage}
          className="floating-button"
        />
      </div>

      {/* 节点编辑模态框 */}
      <NodeEditModal
        visible={nodeEditModalVisible}
        node={selectedNode}
        treeData={treeData}
        onClose={handleCloseNodeEdit}
        onSave={updateNode}
      />

      {/* 项目信息编辑模态框 */}
      <ProjectInfoModal
        visible={projectInfoModalVisible}
        projectInfo={treeData?.global_context}
        onSave={handleSaveProjectInfo}
        onCancel={handleCancelProjectInfo}
      />

      {/* 使用说明模态框 */}
      <Modal
        title="使用说明"
        open={usageModalVisible}
        onCancel={() => setUsageModalVisible(false)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setUsageModalVisible(false)}>
            知道了
          </Button>
        ]}
        width={600}
      >
        <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
          <ol>
            <li>在项目信息中设置景点信息和选择知识库</li>
            <li>使用GraphRAG生成初始大纲结构</li>
            <li>拖动树节点以移动位置</li>
            <li>单击节点以选中，查看节点信息</li>
            <li>双击节点以修改节点详细信息</li>
            <li>右键节点以获取更多操作选项</li>
            <li>空白区域右击可添加新节点</li>
            <li>可随时保存修改或导出完整脚本</li>
            <li>重置按钮可恢复到GraphRAG生成的原始结构</li>
          </ol>
        </div>
      </Modal>
    </div>
  );
}

export default ScriptEditor;
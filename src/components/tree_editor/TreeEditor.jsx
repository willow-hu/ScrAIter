import React, { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import TreeCanvas from './TreeCanvas';
import Sidebar from './Sidebar';
import { isValidTree } from '../../utils/tree_editor/treeValidator';
import { createCheckpointManager, DataCacheManager } from '../../utils/tree_editor/checkpointManager';
import { createTreeStructureManager } from '../../utils/tree_editor/treeStructureManager';

function TreeEditor() {
  const [treeData, setTreeData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  
  // checkpoint 管理器
  const [checkpointManager] = useState(() => createCheckpointManager());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // 树结构管理器
  const [treeManager] = useState(() => createTreeStructureManager(null, (newData) => {
    setTreeData(newData);
    DataCacheManager.saveToCache(newData);
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
        const response = await fetch('/flat_anchor_tree.json');
        const data = await response.json();
        
        // 初始化管理器
        checkpointManager.initialize(data);
        treeManager.setData(data);
        updateUndoRedoState();
        
        // setTreeData(data);
        // 检查是否有缓存的数据
        if (DataCacheManager.hasCache()) {
          // 如果有缓存数据，询问用户是否恢复
          const useCache = window.confirm('检测到未保存的修改，是否恢复？点击"确定"恢复修改，点击"取消"从原始文件开始。');
          if (useCache) {
            const cachedData = DataCacheManager.loadFromCache();
            setTreeData(cachedData);
            treeManager.setData(cachedData);
          } else {
            setTreeData(data);
            handleReset();
          }
        } else {
          setTreeData(data);
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
        setTreeData(defaultData);
        checkpointManager.initialize(defaultData);
        treeManager.setData(defaultData);
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

  // 保存修改 - 创建新的checkpoint
  const handleSave = () => {
    if (!treeData) return;
    
    const result = checkpointManager.createCheckpoint(treeData);
    if (result.success) {
      updateUndoRedoState();
      
      // 保存到localStorage（可选）
      localStorage.setItem('treeData', JSON.stringify(treeData));
      
      message.success(`${result.message}`);
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
      setIsEditing(false);
      // message.success(result.message);
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
      setIsEditing(false);
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
      setIsEditing(false);
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
    }
  };

  // 更新节点
  const updateNode = (nodeId, updates) => {
    const result = treeManager.updateNode(nodeId, updates);
    if (!result.success) {
      message.error(result.message);
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
  };

  // 删除节点
  const deleteNode = (nodeId) => {
    const result = treeManager.deleteNode(nodeId);
    if (result.success) {
      // 如果删除的是当前选中的节点，清除选择
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode(null);
        setIsEditing(false);
      }
      message.success(result.message);
    } else {
      message.error(result.message);
    }
  };

  // 添加边
  const addEdge = (parentId, childId) => {
    const result = treeManager.addEdge(parentId, childId);
    if (result.success) {
      message.success(result.message);
    } else {
      message.error(result.message);
    }
  };

  // 删除边
  const deleteEdge = (parentId, childId) => {
    const result = treeManager.deleteEdge(parentId, childId);
    if (result.success) {
      message.success(result.message);
    } else {
      message.error(result.message);
    }
  };

  // 更新节点位置
  const updateNodePosition = (nodeId, position) => {
    const result = treeManager.updateNodePosition(nodeId, position);
    if (!result.success) {
      message.error(result.message);
    }
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
        onUndo={handleUndo}
        onRedo={handleRedo}
        onReset={handleReset}
        canUndo={canUndo}
        canRedo={canRedo}
      />
    </>
  );
}

export default TreeEditor;

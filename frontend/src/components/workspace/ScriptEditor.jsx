import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message, Button, Modal, Select, Spin } from 'antd';

import * as Icons from '../../utils/icons';
import TreeCanvas from '../modules/TreeCanvas';
import NodeEditModal from '../modules/NodeEditModal';
import NodeTooltip from '../modules/NodeTooltip';
import NPCManageModal from '../modules/NPCManageModal';
import UsageModal from '../modules/UsageModal';
import ExportModal from '../modules/ExportModal';
import { isValidTree } from '../../utils/script_editor/treeValidator';
import { createTreeStructureManager } from '../../utils/script_editor/treeStructureManager';
import { TreeLayoutManager } from '../../utils/script_editor/index.js';
import '../../styles/script-editor.css';

function ScriptEditor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [treeData, setTreeData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeEditModalVisible, setNodeEditModalVisible] = useState(false);
  
  // 项目相关状态
  const [projectInfo, setProjectInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [knowledgeBaseTheme, setKnowledgeBaseTheme] = useState(null);
  
  // 新增的浮动按钮相关状态
  const [npcManageModalVisible, setNpcManageModalVisible] = useState(false);
  const [usageModalVisible, setUsageModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  
  // 悬停提示框状态
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipNode, setTooltipNode] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // TreeCanvas ref
  const treeCanvasRef = useRef(null);
  
  // 布局管理器
  const [layoutManager] = useState(() => new TreeLayoutManager());

  // 加载项目数据
  const loadProjectData = async () => {
    if (!projectId) {
      message.error('项目ID不存在');
      navigate('/projects');
      return;
    }

    setLoading(true);
    try {
      // 加载项目脚本数据
      const scriptResponse = await fetch(`http://localhost:8000/api/v1/projects/${projectId}/script`);
      if (!scriptResponse.ok) {
        throw new Error('获取项目数据失败');
      }
      const scriptData = await scriptResponse.json();
      
      // 加载项目基本信息
      const infoResponse = await fetch(`http://localhost:8000/api/v1/projects/${projectId}`);
      if (infoResponse.ok) {
        const info = await infoResponse.json();
        setProjectInfo(info);
        
        // 如果有知识库ID，获取知识库主题
        if (info.knowledgeBaseId) {
          try {
            const kbResponse = await fetch('http://localhost:8000/api/v1/knowledge-bases');
            if (kbResponse.ok) {
              const kbData = await kbResponse.json();
              const kb = kbData.knowledge_bases?.find(kb => kb.name === info.knowledgeBaseId);
              if (kb?.theme) {
                setKnowledgeBaseTheme(kb.theme);
              }
            }
          } catch (error) {
            console.error('获取知识库信息失败:', error);
          }
        }
      }
      
      // 处理脚本数据
      const hasPositions = scriptData.structure && scriptData.structure.some(node => node.position);
      const dataWithPositions = hasPositions ? scriptData : addAutoLayoutPositions(scriptData);
      
      treeManager.setData(dataWithPositions);
      setTreeData(dataWithPositions);
      
    } catch (error) {
      console.error('加载项目数据失败:', error);
      message.error('加载项目数据失败');
      // 出错时创建空白数据
      const emptyData = {
        global_context: {
          character_list: [],
          site_name: "",
          other_requirements: ""
        },
        structure: []
      };
      
      const emptyDataWithPositions = addAutoLayoutPositions(emptyData);
      setTreeData(emptyDataWithPositions);
      treeManager.setData(emptyDataWithPositions);
    } finally {
      setLoading(false);
    }
  };

  // 获取当前项目ID
  const getCurrentProjectId = () => {
    return projectId;
  };

  // 验证数据完整性
  const validateDataIntegrity = (data) => {
    if (!data) {
      return { valid: false, message: '数据为空' };
    }
    
    if (!data.global_context) {
      return { valid: false, message: '缺少项目信息(global_context)' };
    }
    
    if (!data.structure) {
      return { valid: false, message: '缺少剧本结构(structure)' };
    }
    
    if (!Array.isArray(data.structure)) {
      return { valid: false, message: '剧本结构必须是数组格式' };
    }
    
    return { valid: true, message: '数据完整' };
  };

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
  }));

  // 加载项目数据
  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  // 保存修改
  const handleSave = async () => {
    if (!treeData) {
      message.error('没有数据可以保存');
      return;
    }
    
    // 验证数据完整性
    const validation = validateDataIntegrity(treeData);
    if (!validation.valid) {
      message.error(`数据验证失败: ${validation.message}`);
      return;
    }
    
    try {
      const currentProjectId = getCurrentProjectId();
      
      if (!currentProjectId) {
        message.error('项目ID不存在');
        return;
      }
      
      // 构建完整的保存数据
      const saveData = {
        global_context: {
          character_list: treeData.global_context.character_list || [],
          site_name: treeData.global_context.site_name || "",
          other_requirements: treeData.global_context.other_requirements || ""
        },
        structure: treeData.structure || []
      };
      
      // 保存为script数据
      const response = await fetch(`http://localhost:8000/api/v1/projects/${currentProjectId}/script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData)
      });
      
      if (response.ok) {
        message.success('保存成功！');
      } else {
        const errorData = await response.json();
        message.error(`保存失败: ${errorData.detail || '未知错误'}`);
      }
    } catch (error) {
      console.error('保存到服务器失败:', error);
      message.error('保存失败: 网络错误或服务器不可用');
    }
  };

  // 导出JSON
  const handleExport = () => {
    if (!isValidTree(treeData)) {
      message.error('当前图结构不是有效的树结构，无法导出！请检查是否存在环或未连通的节点。');
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
      // 如果是有效树结构，显示导出选项对话框
      setExportModalVisible(true);
    } else {
      // 如果不是有效树结构，显示警告对话框
      Modal.warning({
        title: '无法导出',
        icon: <Icons.ExclamationCircleOutlined />,
        content: (
          <div>
            <p>当前图结构不是有效的有向树结构，无法导出。</p>
            <p>请检查以下问题：</p>
            <ul className="script-editor-modal-list">
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

  // 处理导出（根据格式选择）
  const handleExportByFormat = async (format) => {
    const currentProjectId = getCurrentProjectId();
    if (!currentProjectId) {
      message.error('项目ID不存在');
      return;
    }

    if (format === 'json_only') {
      // 仅导出JSON（原有逻辑）
      handleExport();
    } else if (format === 'full_package') {
      // 导出完整包
      try {
        message.info('正在创建导出包，请稍候...');
        
        const response = await fetch(`http://localhost:8000/api/v1/projects/${currentProjectId}/export`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            format: 'full_package',
            include_images: true
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || '导出失败');
        }

        const result = await response.json();
        
        if (result.success && result.download_url) {
          // 创建下载链接
          const link = document.createElement('a');
          link.href = `http://localhost:8000/api/v1/projects/${currentProjectId}/download?file_path=${encodeURIComponent(result.download_url)}`;
          link.download = '';
          link.click();
          
          message.success(result.message);
        } else {
          throw new Error(result.message || '导出失败');
        }
      } catch (error) {
        console.error('导出失败:', error);
        message.error(error.message || '导出失败');
      }
    }
  };

  // 新增：重置到默认状态
  const handleReset = () => {
    const currentProjectId = getCurrentProjectId();
    
    if (!currentProjectId) {
      message.error('项目ID不存在');
      return;
    }
    
    const defaultData = {
      global_context: {
        character_list: [
          {
            name: "讲述者",
            description: "默认角色设定",
            tone: "友好、知识渊博",
            avatar: ""
          }
        ],
        site_name: "景点名称",
        other_requirements: ""
      },
      structure: [
        {
          id: 'root',
          type: 'root',
          name: '根节点',
          abstract: '这是根节点的摘要',
          user: '用户选项',
          content: '',
          position: { x: 400, y: 50 },
          child_ids: []
        }
      ]
    };
    
    const defaultDataWithPositions = addAutoLayoutPositions(defaultData);
    setTreeData(defaultDataWithPositions);
    treeManager.setData(defaultDataWithPositions);
    setSelectedNode(null);
    message.success('已重置到初始状态');
  };

  // 新增：打开项目信息编辑
  const handleOpenProjectInfo = () => {
    setNpcManageModalVisible(true);
  };

  // 新增：保存项目信息
  const handleSaveProjectInfo = async (projectInfoData) => {
    try {
      // 更新本地数据
      updateGlobalContext(projectInfoData);
      setNpcManageModalVisible(false);
      message.success('项目信息已更新');
      
      // 自动保存到服务器
      const currentProjectId = getCurrentProjectId();
      if (currentProjectId) {
        // 构建保存数据
        const saveData = {
          global_context: {
            character_list: projectInfoData.character_list || [],
            site_name: projectInfoData.site_name || "",
            other_requirements: projectInfoData.other_requirements || ""
          },
          structure: treeData?.structure || []
        };
        
        const response = await fetch(`http://localhost:8000/api/v1/projects/${currentProjectId}/script`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(saveData)
        });
        
        if (response.ok) {
          message.success('项目信息已更新并保存');
        } else {
          message.warning('项目信息已更新，但自动保存失败，请手动点击保存按钮');
        }
      }
      
    } catch (error) {
      console.error('保存项目信息失败:', error);
      message.success('项目信息已更新');
      message.warning('自动保存失败，请手动点击保存按钮');
    }
  };

  // 新增：取消项目信息编辑
  const handleCancelProjectInfo = () => {
    setNpcManageModalVisible(false);
  };

  // 新增：生成大纲（GraphRAG）
  const handleGenerateOutline = async () => {
    // 检查项目信息
    if (!projectInfo || !projectInfo.knowledgeBaseId) {
      message.error('项目未关联知识库，无法生成大纲');
      return;
    }

    const kbName = knowledgeBaseTheme || projectInfo.knowledgeBaseId;

    // 显示确认对话框
    Modal.confirm({
      title: '生成大纲',
      icon: <Icons.ExclamationCircleOutlined />,
      content: `此操作将基于知识库「${kbName}」的知识图谱生成新的大纲，会覆盖现有的内容。确定要继续吗？`,
      okText: '确定生成',
      cancelText: '取消',
      okType: 'primary',
      onOk: async () => {
        try {
          message.loading({ content: `正在为「${kbName}」生成大纲，请稍候...`, key: 'outline-gen', duration: 0 });
          
          // 调用后端API生成大纲
          const response = await fetch('http://localhost:8000/api/v1/generate/outline', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              project_id: projectId,
              kb_name: projectInfo.knowledgeBaseId
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || '生成大纲失败');
          }
          
          const result = await response.json();
          
          if (!result.success) {
            throw new Error(result.message || '生成大纲失败');
          }
          
          message.success({ content: result.message, key: 'outline-gen' });
          
          // 更新当前树结构为生成的结构
          if (result.structure && result.structure.length > 0) {
            const newTreeData = {
              global_context: result.global_context || {
                character_list: [],
                site_name: "",
                other_requirements: ""
              },
              structure: result.structure
            };
            
            const newDataWithPositions = addAutoLayoutPositions(newTreeData);
            setTreeData(newDataWithPositions);
            treeManager.setData(newDataWithPositions);
            setSelectedNode(null);
            message.info('已加载生成的大纲结构');
          }
          
        } catch (error) {
          console.error('生成大纲失败:', error);
          message.error({ content: error.message || '生成大纲失败', key: 'outline-gen' });
        }
      }
    });
  };

  // 新增：显示使用说明
  const handleShowUsage = () => {
    setUsageModalVisible(true);
  };

  // 更新节点
  const updateNode = async (nodeId, updates) => {
    const result = treeManager.updateNode(nodeId, updates);
    if (!result.success) {
      message.error(result.message);
    } else {
      if (selectedNode && selectedNode.id === nodeId) {
        const updatedNode = treeManager.getNode(nodeId);
        setSelectedNode(updatedNode);
      }
      
      // 自动保存到服务器
      try {
        const kbName = getCurrentKnowledgeBaseName();
        if (kbName && treeData) {
          const saveData = {
            global_context: {
              character_list: treeData.global_context.character_list || [],
              site_name: treeData.global_context.site_name || "",
              other_requirements: treeData.global_context.other_requirements || ""
            },
            structure: treeData.structure || []
          };
          
          const response = await fetch(`http://localhost:8000/api/v1/projects/${kbName}/script`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(saveData)
          });
          
          if (!response.ok) {
            console.error('自动保存失败');
          }
        }
      } catch (error) {
        console.error('自动保存出错:', error);
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

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="script-editor script-editor-loading">
        <Spin size="large" tip="加载数据中..." />
      </div>
    );
  }

  return (
    <div className="script-editor">
      {/* 左上角项目信息显示 */}
      <div className="script-editor-project-info">
        <Button
          type="text"
          size="small"
          icon={<Icons.ArrowLeftOutlined />}
          onClick={() => navigate('/projects')}
          className="script-editor-back-button"
        />
        <span className="script-editor-project-label">
          项目:
        </span>
        <span className="script-editor-project-name">
          {projectInfo?.name || '未命名项目'}
        </span>
        {knowledgeBaseTheme && (
          <>
            <span className="script-editor-divider">|</span>
            <span className="script-editor-kb-info">
              知识库: {knowledgeBaseTheme}
            </span>
          </>
        )}
      </div>

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
      
      {/* 右上角浮动按钮 - 水平排列 */}
      <div className="floating-buttons-container">
        <Button
          shape="circle"
          icon={<Icons.QuestionCircleOutlined />}
          title="使用说明"
          onClick={handleShowUsage}
          className="floating-button"
        />

        <Button
          shape="circle"
          icon={<Icons.NodeIndexOutlined />}
          title="生成大纲"
          onClick={handleGenerateOutline}
          className="floating-button"
        />

        <Button
          shape="circle"
          icon={<Icons.FileTextOutlined />}
          title="项目信息"
          onClick={handleOpenProjectInfo}
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
          title="导出素材"
          onClick={handleExportWithValidation}
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

      {/* NPC角色管理模态框 */}
      <NPCManageModal
        visible={npcManageModalVisible}
        projectInfo={treeData?.global_context}
        projectId={projectId}
        onSave={handleSaveProjectInfo}
        onCancel={handleCancelProjectInfo}
      />

      {/* 使用说明模态框 */}
      <UsageModal
        visible={usageModalVisible}
        onClose={() => setUsageModalVisible(false)}
      />

      {/* 导出选项模态框 */}
      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onExport={handleExportByFormat}
      />
    </div>
  );
}

export default ScriptEditor;
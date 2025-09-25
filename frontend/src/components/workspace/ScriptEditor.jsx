import React, { useState, useEffect, useRef } from 'react';
import { message, Button, Modal, Select } from 'antd';

import * as Icons from '../../utils/icons';
import '../../styles/export-modal.css';
import TreeCanvas from '../modules/TreeCanvas';
import NodeEditModal from '../modules/NodeEditModal';
import NodeTooltip from '../modules/NodeTooltip';
import ProjectInfoModal from '../modules/ProjectInfoModal';
import { isValidTree } from '../../utils/script_editor/treeValidator';
import { createTreeStructureManager } from '../../utils/script_editor/treeStructureManager';
import { TreeLayoutManager } from '../../utils/script_editor/index.js';

function ScriptEditor() {
  const [treeData, setTreeData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeEditModalVisible, setNodeEditModalVisible] = useState(false);
  
  // 知识库相关状态
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState(null);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [loadingKnowledgeBases, setLoadingKnowledgeBases] = useState(false);
  
  // 新增的浮动按钮相关状态
  const [projectInfoModalVisible, setProjectInfoModalVisible] = useState(false);
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

  // 加载知识库列表
  const loadKnowledgeBases = async () => {
    setLoadingKnowledgeBases(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/knowledge-base/list');
      if (!response.ok) {
        throw new Error('获取知识库列表失败');
      }
      const result = await response.json();
      
      // 转换为数组格式
      const kbArray = Object.keys(result.knowledge_bases || {}).map(name => ({
        name,
        ...result.knowledge_bases[name]
      }));
      
      setKnowledgeBases(kbArray);
      
      // 如果还没有选择知识库且有可用的知识库，选择第一个
      if (!selectedKnowledgeBase && kbArray.length > 0) {
        setSelectedKnowledgeBase(kbArray[0].name);
      }
    } catch (error) {
      console.error('加载知识库列表失败:', error);
      message.error('加载知识库列表失败');
      setKnowledgeBases([]);
    } finally {
      setLoadingKnowledgeBases(false);
    }
  };

  // 获取当前知识库名称的辅助函数
  const getCurrentKnowledgeBaseName = () => {
    return selectedKnowledgeBase;
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

  // 加载知识库列表
  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  // 当选择的知识库变化时，加载对应的数据
  useEffect(() => {
    const loadKnowledgeBaseData = async () => {
      if (!selectedKnowledgeBase) {
        // 如果没有选择知识库，创建空白结构
        const emptyData = {
          global_context: {
            narrator_role: "",
            site_name: "",
            character_setting: ""
          },
          structure: []
        };
        
        const emptyDataWithPositions = addAutoLayoutPositions(emptyData);
        setTreeData(emptyDataWithPositions);
        treeManager.setData(emptyDataWithPositions);
        return;
      }
      
      try {
        // 尝试加载对应知识库的script数据
        const scriptResponse = await fetch(`http://localhost:8000/api/v1/projects/${selectedKnowledgeBase}/script`);
        
        if (scriptResponse.ok) {
          const scriptData = await scriptResponse.json();
          
          // 移除knowledge_base_name字段（如果存在）
          if (scriptData.global_context && 'knowledge_base_name' in scriptData.global_context) {
            delete scriptData.global_context.knowledge_base_name;
          }
          
          const hasPositions = scriptData.structure && scriptData.structure.some(node => node.position);
          const dataWithPositions = hasPositions ? scriptData : addAutoLayoutPositions(scriptData);
          
          treeManager.setData(dataWithPositions);
          setTreeData(dataWithPositions);
          return;
        }
        
        // 如果script数据不存在，创建空白数据并保存
        const emptyData = {
          global_context: {
            narrator_role: "",
            site_name: "",
            character_setting: ""
          },
          structure: []
        };
        
        // 自动创建script.json文件
        const createResponse = await fetch(`http://localhost:8000/api/v1/projects/${selectedKnowledgeBase}/script`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emptyData)
        });
        
        if (createResponse.ok) {
          console.log(`已为知识库 "${selectedKnowledgeBase}" 创建空白script.json文件`);
        }
        
        const emptyDataWithPositions = addAutoLayoutPositions(emptyData);
        setTreeData(emptyDataWithPositions);
        treeManager.setData(emptyDataWithPositions);
        
      } catch (error) {
        console.error('Failed to load knowledge base data:', error);
        // 出错时也创建空白数据
        const emptyData = {
          global_context: {
            narrator_role: "",
            site_name: "",
            character_setting: ""
          },
          structure: []
        };
        
        const emptyDataWithPositions = addAutoLayoutPositions(emptyData);
        setTreeData(emptyDataWithPositions);
        treeManager.setData(emptyDataWithPositions);
      }
    };

    loadKnowledgeBaseData().catch(err => {
      console.error('loadKnowledgeBaseData failed:', err);
    });
  }, [selectedKnowledgeBase, treeManager]);

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
      // 获取当前的知识库名称
      const kbName = getCurrentKnowledgeBaseName();
      
      if (!kbName) {
        message.error('请先选择知识库');
        return;
      }
      
      // 构建完整的保存数据，确保包含global_context和structure，不包含knowledge_base_name
      const saveData = {
        global_context: {
          narrator_role: treeData.global_context.narrator_role || "",
          site_name: treeData.global_context.site_name || "",
          character_setting: treeData.global_context.character_setting || "",
          other_requirements: treeData.global_context.other_requirements || ""
        },
        structure: treeData.structure || []
      };
      
      // 保存为script数据
      const response = await fetch(`http://localhost:8000/api/v1/projects/${kbName}/script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData)
      });
      
      if (response.ok) {
        message.success(`保存成功！`);
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

  // 处理导出（根据格式选择）
  const handleExportByFormat = async (format) => {
    const kbName = getCurrentKnowledgeBaseName();
    if (!kbName) {
      message.error('请先选择知识库');
      return;
    }

    if (format === 'json_only') {
      // 仅导出JSON（原有逻辑）
      handleExport();
    } else if (format === 'full_package') {
      // 导出完整包
      try {
        message.info('正在创建导出包，请稍候...');
        
        const response = await fetch(`http://localhost:8000/api/v1/projects/${kbName}/export`, {
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
          link.href = `http://localhost:8000/api/v1/projects/${kbName}/download?file_path=${encodeURIComponent(result.download_url)}`;
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
    const currentKbName = getCurrentKnowledgeBaseName();
    
    if (!currentKbName) {
      message.error('请先选择知识库');
      return;
    }
    
    const defaultData = {
      global_context: {
        narrator_role: "讲述者",
        site_name: "景点名称",
        character_setting: "角色设定"
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
  const handleSaveProjectInfo = async (projectInfoData) => {
    try {
      // 更新本地数据
      updateGlobalContext(projectInfoData);
      setProjectInfoModalVisible(false);
      message.success('项目信息已更新');
      
      // 自动保存到服务器
      const kbName = getCurrentKnowledgeBaseName();
      if (kbName && kbName.trim()) {
        // 构建保存数据，不包含knowledge_base_name
        const saveData = {
          global_context: {
            narrator_role: projectInfoData.narrator_role || "",
            site_name: projectInfoData.site_name || "",
            character_setting: projectInfoData.character_setting || "",
            other_requirements: projectInfoData.other_requirements || ""
          },
          structure: treeData?.structure || []
        };
        
        const response = await fetch(`http://localhost:8000/api/v1/projects/${kbName}/script`, {
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
    setProjectInfoModalVisible(false);
  };

  // 新增：生成大纲（GraphRAG）
  const handleGenerateOutline = async () => {
    // 检查知识库选择
    const knowledgeBaseName = getCurrentKnowledgeBaseName();
    if (!knowledgeBaseName || !knowledgeBaseName.trim()) {
      message.error('请先选择知识库');
      return;
    }
    
    // 检查项目信息
    const globalContext = treeData?.global_context;
    if (!globalContext) {
      message.error('请先设置项目信息');
      setProjectInfoModalVisible(true); // 自动打开项目信息编辑
      return;
    }

    // 显示确认对话框
    Modal.confirm({
      title: '操作确认',
      icon: <Icons.ExclamationCircleOutlined />,
      content: '此操作将覆盖现有的内容，确定要重新生成吗？',
      okText: '确定生成',
      cancelText: '取消',
      okType: 'primary',
      onOk: async () => {
        try {
          message.info('正在生成大纲，请稍候...');
          
          // 调用后端API生成大纲
          const response = await fetch('http://localhost:8000/api/v1/generate/structure', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              kb_name: knowledgeBaseName.trim(),
              global_context: globalContext
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || '生成大纲失败');
          }
          
          const result = await response.json();
          message.success('大纲生成成功！');
          
          // 可选：更新当前树结构为生成的结构
          if (result.structure && result.structure.length > 0) {
            const newTreeData = {
              global_context: result.global_context || globalContext,
              structure: result.structure
            };
            
            // 移除knowledge_base_name字段（如果存在）
            if (newTreeData.global_context && 'knowledge_base_name' in newTreeData.global_context) {
              delete newTreeData.global_context.knowledge_base_name;
            }
            
            const newDataWithPositions = addAutoLayoutPositions(newTreeData);
            setTreeData(newDataWithPositions);
            treeManager.setData(newDataWithPositions);
            setSelectedNode(null);
            message.info('已加载生成的大纲结构');
          }
          
        } catch (error) {
          console.error('生成大纲失败:', error);
          message.error(error.message || '生成大纲失败');
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
              narrator_role: treeData.global_context.narrator_role || "",
              site_name: treeData.global_context.site_name || "",
              character_setting: treeData.global_context.character_setting || "",
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
      {/* 左上角知识库选择器 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '6px 10px',
        borderRadius: '6px',
        border: '1px solid #d9d9d9',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
          知识库:
        </span>
        <Select
          style={{ width: 150 }}
          placeholder="选择知识库"
          value={selectedKnowledgeBase}
          onChange={setSelectedKnowledgeBase}
          loading={loadingKnowledgeBases}
          allowClear={false}
          size="small"
        >
          {knowledgeBases.map(kb => (
            <Select.Option key={kb.name} value={kb.name}>
              {kb.name}
            </Select.Option>
          ))}
        </Select>
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
          icon={<Icons.FileTextOutlined />}
          title="项目信息"
          onClick={handleOpenProjectInfo}
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
            <li><strong>选择知识库</strong>：使用左上角的知识库选择下拉框选择要使用的知识库</li>
            <li><strong>设置项目信息</strong>：点击项目信息按钮，设置景点信息和角色设定</li>
            <li><strong>生成大纲</strong>：使用GraphRAG生成初始大纲结构</li>
            <li><strong>编辑节点</strong>：
              <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                <li>拖动树节点以移动位置</li>
                <li>单击节点以选中，查看节点信息</li>
                <li>双击节点以修改节点详细信息</li>
                <li>右键节点以获取更多操作选项</li>
              </ul>
            </li>
            <li><strong>添加节点</strong>：空白区域右击可添加新节点</li>
            <li><strong>数据同步</strong>：
              <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                <li>项目信息会自动同步到JSON的global_context</li>
                <li>剧本结构会自动同步到JSON的structure</li>
                <li>点击保存按钮将数据保存到对应知识库的script.json</li>
              </ul>
            </li>
            <li><strong>导出功能</strong>：可随时导出完整脚本文件</li>
            <li><strong>重置功能</strong>：重置按钮可恢复到GraphRAG生成的原始结构</li>
          </ol>
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', fontSize: '13px' }}>
            <strong>💡 提示：</strong>使用左上角的知识库选择器切换不同的项目，系统会自动加载对应的数据。
          </div>
        </div>
      </Modal>

      {/* 导出选项模态框 */}
      <Modal
        title="选择导出格式"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={null}
        width={500}
      >
        <div className="export-modal-content">
          <div className="export-options">
            <Button
              onClick={() => {
                setExportModalVisible(false);
                handleExportByFormat('json_only');
              }}
              className="export-option-button"
            >
              <div>
                <div className="export-option-title">仅导出JSON脚本</div>
              </div>
            </Button>
            
            <Button
              onClick={() => {
                setExportModalVisible(false);
                handleExportByFormat('full_package');
              }}
              className="export-option-button"
            >
              <div>
                <div className="export-option-title">导出完整资源包</div>
              </div>
            </Button>
          </div>
          
          <div className="export-tip">
            💡 选择"导出完整包"以获得包含所有资源的完整项目文件。
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ScriptEditor;
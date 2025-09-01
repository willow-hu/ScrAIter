import React, { useState, useEffect } from 'react';
import { Layout, Card, Button, Input, Typography, Space, Spin, message, Modal, Drawer, Row, Col } from 'antd';
import { SaveOutlined, ThunderboltOutlined, LeftOutlined, RightOutlined, DownloadOutlined, DatabaseOutlined } from '@ant-design/icons';
import KnowledgeBaseManager from './KnowledgeBaseManager';
import ReferencePanel from './ReferencePanel';
import { flattenTreeDFS } from '../../utils/content_generator/treeTraversal';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

function ContentGenerator() {
  // 状态管理
  const [treeData, setTreeData] = useState(null);
  const [flatNodes, setFlatNodes] = useState([]);
  const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
  const [currentNode, setCurrentNode] = useState(null);
  const [nodeForm, setNodeForm] = useState({
    name: '',
    abstract: '',
    user: '',
    content: ''
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [kbDrawerVisible, setKbDrawerVisible] = useState(false);
  const [ragSources, setRagSources] = useState([]);
  const [lastGenerationId, setLastGenerationId] = useState(null);

  // 初始化：加载树数据
  useEffect(() => {
    loadTreeData();
  }, []);

  // 当前节点变化时更新表单
  useEffect(() => {
    if (currentNode) {
      setNodeForm({
        name: currentNode.name || '',
        abstract: currentNode.abstract || '',
        user: currentNode.user || '',
        content: currentNode.content || ''
      });
      
      // 清空之前的参考资料，等待新的生成
      setRagSources([]);
      setLastGenerationId(null);
    }
  }, [currentNode]);

  // 加载树数据
  const loadTreeData = async () => {
    setLoading(true);
    try {
      // 从 public 目录加载示例数据
      const response = await fetch('/flat_anchor_tree.json');
      if (!response.ok) {
        throw new Error('加载数据失败');
      }
      const data = await response.json();
      setTreeData(data);
      
      // 将树结构转换为平铺的节点数组（DFS顺序）
      const nodes = flattenTreeDFS(data.structure);
      setFlatNodes(nodes);
      
      if (nodes.length > 0) {
        setCurrentNode(nodes[0]);
        setCurrentNodeIndex(0);
      }
      
    //   message.success('数据加载成功');
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存当前节点
  const saveCurrentNode = () => {
    if (!currentNode || !treeData) return;
    
    // 更新当前节点的数据
    const updatedNode = { ...currentNode, ...nodeForm };
    
    // 更新flatNodes
    const newFlatNodes = [...flatNodes];
    newFlatNodes[currentNodeIndex] = updatedNode;
    setFlatNodes(newFlatNodes);
    
    // 更新treeData中对应的节点
    const newTreeData = { ...treeData };
    const nodeIndex = newTreeData.structure.findIndex(n => n.id === currentNode.id);
    if (nodeIndex !== -1) {
      newTreeData.structure[nodeIndex] = updatedNode;
    }
    setTreeData(newTreeData);
    
    setCurrentNode(updatedNode);
    message.success('节点保存成功');
  };

  // 生成内容
  const generateContent = async () => {
    if (!currentNode || !treeData) return;
    
    setGenerating(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/generate/node-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          node_info: {
            name: nodeForm.name,
            abstract: nodeForm.abstract,
            user: nodeForm.user,
            id: currentNode.id
          },
          global_context: treeData.global_context
        })
      });
      
      if (!response.ok) {
        throw new Error('生成内容失败');
      }
      
      const result = await response.json();
      
      // 更新内容
      setNodeForm(prev => ({
        ...prev,
        content: result.content
      }));
      
      // 保存生成ID并自动加载参考资料
      setLastGenerationId(result.generation_id);
      await loadReferences(result.generation_id);
      
      message.success('内容生成成功');
    } catch (error) {
      console.error('生成内容失败:', error);
      message.error('生成内容失败');
    } finally {
      setGenerating(false);
    }
  };

  // 加载参考资料
  const loadReferences = async (generationId) => {
    if (!generationId) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/rag/sources/${generationId}`);
      if (!response.ok) {
        throw new Error('获取参考资料失败');
      }
      
      const result = await response.json();
      setRagSources(result.sources || []);
    } catch (error) {
      console.error('获取参考资料失败:', error);
      message.error('获取参考资料失败');
    }
  };

  // 上一个节点
  const goToPrevious = () => {
    if (currentNodeIndex > 0) {
      const newIndex = currentNodeIndex - 1;
      setCurrentNodeIndex(newIndex);
      setCurrentNode(flatNodes[newIndex]);
    }
  };

  // 下一个节点
  const goToNext = () => {
    if (currentNodeIndex < flatNodes.length - 1) {
      const newIndex = currentNodeIndex + 1;
      setCurrentNodeIndex(newIndex);
      setCurrentNode(flatNodes[newIndex]);
    }
  };

  // 完成并导出
  const exportScript = () => {
    if (!treeData) return;
    
    Modal.confirm({
      title: '导出脚本',
      content: '确定要导出完整脚本吗？',
      onOk: () => {
        // 构建导出数据
        const exportData = {
          global_context: treeData.global_context,
          nodes: flatNodes.map(node => ({
            id: node.id,
            name: node.name,
            user: node.user,
            content: node.content || ''
          })),
          export_time: new Date().toISOString()
        };
        
        // 下载文件
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `script_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        message.success('脚本导出成功');
      }
    });
  };

  const isLastNode = currentNodeIndex === flatNodes.length - 1;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout className="content-generator" style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px' }}>
        {/* 主要内容区域 */}
        {currentNode && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 上方：节点编辑和参考资料 */}
            <Row gutter={16}>
              {/* 左侧：节点编辑卡片 */}
              <Col span={14}>
                <Card 
                  className="node-info-card"
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>节点 #{currentNode.id}: {currentNode.name || '未命名'}</span>
                      <Text type="secondary">
                        {currentNodeIndex + 1} / {flatNodes.length}
                      </Text>
                    </div>
                  }
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="large">
                    {/* 节点信息编辑 */}
                    <div>
                      <Text strong>关键词</Text>
                      <Input
                        value={nodeForm.name}
                        onChange={(e) => setNodeForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="输入节点关键词"
                        style={{ marginTop: '8px' }}
                      />
                    </div>

                    <div>
                      <Text strong>用户选项</Text>
                      <TextArea
                        value={nodeForm.user}
                        onChange={(e) => setNodeForm(prev => ({ ...prev, user: e.target.value }))}
                        placeholder="输入用户选项/问题"
                        rows={2}
                        style={{ marginTop: '8px' }}
                      />
                    </div>

                    <div>
                      <Text strong>摘要</Text>
                      <TextArea
                        value={nodeForm.abstract}
                        onChange={(e) => setNodeForm(prev => ({ ...prev, abstract: e.target.value }))}
                        placeholder="输入节点摘要"
                        rows={3}
                        style={{ marginTop: '8px' }}
                      />
                    </div>

                    <div>
                      <Text strong>内容</Text>
                      <TextArea
                        value={nodeForm.content}
                        onChange={(e) => setNodeForm(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="生成的内容将显示在这里，您也可以手动编辑"
                        rows={6}
                        style={{ marginTop: '8px' }}
                      />
                    </div>

                    {/* 操作按钮 */}
                    <div className="action-buttons">
                      <Space size="middle">
                        <Button 
                          type="primary" 
                          icon={<SaveOutlined />}
                          onClick={saveCurrentNode}
                        >
                          保存
                        </Button>
                        
                        <Button 
                          type="primary"
                          className="generate-btn"
                          icon={<ThunderboltOutlined />}
                          onClick={generateContent}
                          loading={generating}
                        >
                          生成内容
                        </Button>

                        <Button 
                          icon={<DatabaseOutlined />}
                          onClick={() => setKbDrawerVisible(true)}
                        >
                          修改知识库
                        </Button>
                        
                        <Button 
                          icon={<LeftOutlined />}
                          onClick={goToPrevious}
                          disabled={currentNodeIndex === 0}
                        >
                          上一个
                        </Button>
                        
                        {!isLastNode ? (
                          <Button 
                            icon={<RightOutlined />}
                            onClick={goToNext}
                          >
                            下一个
                          </Button>
                        ) : (
                          <Button 
                            type="primary"
                            className="export-btn"
                            icon={<DownloadOutlined />}
                            onClick={exportScript}
                          >
                            完成并导出
                          </Button>
                        )}
                      </Space>
                    </div>
                  </Space>
                </Card>
              </Col>

              {/* 右侧：参考资料面板 */}
              <Col span={10}>
                <ReferencePanel sources={ragSources} loading={generating} />
              </Col>
            </Row>

            {/* 下方：项目信息和使用说明 */}
            <Row gutter={16} className="bottom-info-cards">
              <Col span={12}>
                <Card title="项目信息" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>景点名称：</Text>
                      <Text>{treeData?.global_context?.site_name || '未设置'}</Text>
                    </div>
                    <div>
                      <Text strong>讲述者角色：</Text>
                      <Text>{treeData?.global_context?.narrator_role || '未设置'}</Text>
                    </div>
                    <div>
                      <Text strong>角色设定：</Text>
                      <Paragraph 
                        style={{ fontSize: '12px', color: '#666', margin: 0 }}
                        ellipsis={{ rows: 3, expandable: true }}
                      >
                        {treeData?.global_context?.character_setting || '未设置'}
                      </Paragraph>
                    </div>
                    <div>
                      <Text strong>成就：</Text>
                      <Text>{treeData?.global_context?.achievement || '未设置'}</Text>
                    </div>
                  </Space>
                </Card>
              </Col>

              <Col span={12}>
                <Card title="使用说明" size="small">
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    1. 可以编辑节点的关键词、问题和摘要<br/>
                    2. 点击"生成内容"调用RAG生成内容（二次点击会覆盖先前内容）<br/>
                    3. 可以手动编辑生成的内容<br/>
                    4. 点击"保存"保存当前节点<br/>
                    5. 使用"上一个"/"下一个"切换节点<br/>
                    6. 最后一个节点完成后，点击"完成并导出"以导出脚本文件<br/>
                    7. 参考资料会在生成内容后自动显示，可切换查看不同片段
                  </Text>
                </Card>
              </Col>
            </Row>
          </Space>
        )}
      </Content>

      {/* 知识库管理抽屉 */}
      <Drawer
        title="知识库管理"
        placement="left"
        size="large"
        onClose={() => setKbDrawerVisible(false)}
        open={kbDrawerVisible}
      >
        <KnowledgeBaseManager onClose={() => setKbDrawerVisible(false)} />
      </Drawer>
    </Layout>
  );
}

export default ContentGenerator;

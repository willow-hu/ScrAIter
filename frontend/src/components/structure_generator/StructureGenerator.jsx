import React, { useState, useEffect } from 'react';
import { Layout, Card, Button, Input, Typography, Space, Spin, message, Select, Form, Modal, List } from 'antd';
import { ThunderboltOutlined, FileTextOutlined, SaveOutlined, EyeOutlined } from '@ant-design/icons';
import appConfig from '../../config/appConfig';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

function StructureGenerator() {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [projects, setProjects] = useState([]);
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [generatedStructure, setGeneratedStructure] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [form] = Form.useForm();

  // 初始化加载数据
  useEffect(() => {
    loadProjects();
    loadKnowledgeBases();
  }, []);

  // 加载项目列表
  const loadProjects = async () => {
    try {
      const response = await fetch(`${appConfig.api_base_url}/projects`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('加载项目列表失败:', error);
    }
  };

  // 加载知识库列表
  const loadKnowledgeBases = async () => {
    try {
      const response = await fetch(`${appConfig.api_base_url}/knowledge-base/list`);
      if (response.ok) {
        const data = await response.json();
        setKnowledgeBases(data.knowledge_bases || []);
      }
    } catch (error) {
      console.error('加载知识库列表失败:', error);
    }
  };

  // 生成结构
  const handleGenerateStructure = async (values) => {
    setGenerating(true);
    try {
      const { projectName, knowledgeBase } = values;
      
      // 首先检查项目是否已存在
      const existingProject = projects.find(p => p.name === projectName);
      if (!existingProject) {
        // 创建新项目
        const createResponse = await fetch(`${appConfig.api_base_url}/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: projectName })
        });
        
        if (!createResponse.ok) {
          throw new Error('创建项目失败');
        }
      }

      // 调用结构生成API
      const response = await fetch(`${appConfig.api_base_url}/generate/structure?project_name=${projectName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('生成结构失败');
      }

      const result = await response.json();
      setGeneratedStructure(result);
      
      message.success('剧本结构生成成功！');
      
      // 刷新项目列表
      loadProjects();
      
    } catch (error) {
      console.error('生成结构失败:', error);
      message.error(`生成结构失败: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // 保存结构到项目
  const handleSaveStructure = async () => {
    if (!generatedStructure) return;
    
    const projectName = form.getFieldValue('projectName');
    if (!projectName) {
      message.error('请先指定项目名称');
      return;
    }

    setLoading(true);
    try {
      // 构建保存数据
      const saveData = {
        global_context: generatedStructure.global_context,
        structure: generatedStructure.structure
      };

      const response = await fetch(`${appConfig.api_base_url}/projects/${projectName}/tree`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData)
      });

      if (!response.ok) {
        throw new Error('保存失败');
      }

      message.success(`结构已保存到项目 "${projectName}"`);
      
      // 刷新项目列表
      loadProjects();
      
    } catch (error) {
      console.error('保存失败:', error);
      message.error(`保存失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 预览结构
  const handlePreviewStructure = () => {
    setPreviewVisible(true);
  };

  // 渲染树结构预览
  const renderStructurePreview = (structure) => {
    if (!structure) return null;

    const renderNode = (node, level = 0) => {
      const indent = level * 20;
      return (
        <div key={node.id || node.name} style={{ marginLeft: indent, marginBottom: 8 }}>
          <div style={{ 
            padding: '8px 12px', 
            border: '1px solid #d9d9d9', 
            borderRadius: '4px',
            backgroundColor: level === 0 ? '#f0f0f0' : 'white'
          }}>
            <Text strong>{node.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {node.abstract}
            </Text>
            <br />
            <Text style={{ fontSize: '12px', color: '#1890ff' }}>
              用户问题: {node.user}
            </Text>
          </div>
          {node.child_nodes && node.child_nodes.map(child => renderNode(child, level + 1))}
          {node.children && node.children.map(child => renderNode(child, level + 1))}
        </div>
      );
    };

    if (Array.isArray(structure)) {
      return structure.map(node => renderNode(node));
    } else {
      return renderNode(structure);
    }
  };

  return (
    <Layout className="structure-generator">
      <Content className="structure-content">
        <div className="structure-container">         
          {/* 生成配置区域 */}
          <Card title="生成配置" style={{ marginBottom: 24 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleGenerateStructure}
              initialValues={{
                projectName: appConfig.default_project,
                knowledgeBase: appConfig.default_project
              }}
            >
              <Form.Item
                label="项目名称"
                name="projectName"
                rules={[{ required: true, message: '请输入项目名称' }]}
              >
                <Input 
                  placeholder="输入新项目名称或选择已有项目"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label="知识库"
                name="knowledgeBase"
                rules={[{ required: true, message: '请选择知识库' }]}
              >
                <Select placeholder="选择要使用的知识库">
                  {knowledgeBases.map(kb => (
                    <Option key={kb.name} value={kb.name}>
                      {kb.name} ({kb.document_count} 文档)
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    icon={<ThunderboltOutlined />}
                    loading={generating}
                    size="large"
                  >
                    生成剧本结构
                  </Button>
                  
                  {generatedStructure && (
                    <>
                      {/* <Button 
                        icon={<EyeOutlined />}
                        onClick={handlePreviewStructure}
                      >
                        预览结构
                      </Button> */}
                      
                      <Button 
                        type="default"
                        icon={<SaveOutlined />}
                        onClick={handleSaveStructure}
                        loading={loading}
                      >
                        保存到项目
                      </Button>
                    </>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>

          {/* 使用说明 */}
          <Card title="使用说明" size="small">
            <Paragraph>
              <Text>
                1. 输入项目名称（如果项目不存在将自动创建）<br />
                2. 选择要使用的知识库<br />
                3. 点击"生成剧本结构"开始生成<br />
                4. 生成完成后可以预览结构<br />
                5. 确认无误后保存到项目中<br />
                6. 保存后可以在"结构编辑"标签页中进一步编辑
              </Text>
            </Paragraph>
          </Card>
        </div>
      </Content>

      {/* 结构预览模态框 */}
      {/* <Modal
        title="剧本结构预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {generatedStructure && (
            <div>
              <Title level={4}>全局上下文</Title>
              <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                <Text><strong>讲述者角色:</strong> {generatedStructure.global_context?.narrator_role}</Text><br />
                <Text><strong>景点名称:</strong> {generatedStructure.global_context?.site_name}</Text><br />
                <Text><strong>角色设定:</strong> {generatedStructure.global_context?.character_setting}</Text><br />
                <Text><strong>成就:</strong> {generatedStructure.global_context?.achievement}</Text>
              </div>
              
              <Title level={4}>结构树</Title>
              {renderStructurePreview(generatedStructure.structure)}
            </div>
          )}
        </div>
      </Modal> */}
    </Layout>
  );
}

export default StructureGenerator;

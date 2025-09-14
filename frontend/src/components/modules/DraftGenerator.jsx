import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Button, 
  Select, 
  Input, 
  Space, 
  Typography, 
  Alert, 
  Spin, 
  message,
  Row,
  Col,
  Divider
} from 'antd';
import { 
  PlayCircleOutlined, 
  EditOutlined,
  CheckOutlined,
  ReloadOutlined 
} from '@ant-design/icons';
import TreeCanvas from './TreeCanvas';
import { TreeLayoutManager } from '../../utils/script_editor/index.js';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// 预设的prompt模板
const DEFAULT_PROMPT = `<Placeholder>`;

function DraftGenerator({ onDraftConfirmed, onBack }) {
  // 状态管理
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [selectedKB, setSelectedKB] = useState(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [fullPrompt, setFullPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 画布相关
  const treeCanvasRef = useRef(null);
  const [layoutManager] = useState(() => new TreeLayoutManager());

  // 初始化
  useEffect(() => {
    loadKnowledgeBases();
    updateFullPrompt();
  }, []);

  // 更新完整prompt
  useEffect(() => {
    updateFullPrompt();
  }, [userPrompt]);

  // 加载知识库列表
  const loadKnowledgeBases = async () => {
    setLoading(true);
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
    } catch (error) {
      console.error('加载知识库列表失败:', error);
      message.error('加载知识库列表失败');
      setKnowledgeBases([]);
    } finally {
      setLoading(false);
    }
  };

  // 更新完整的prompt
  const updateFullPrompt = () => {
    const prompt = DEFAULT_PROMPT.replace('{user_input}', userPrompt || '无特殊要求');
    setFullPrompt(prompt);
  };

  // 生成初稿
  const generateDraft = async () => {
    if (!selectedKB) {
      message.error('请先选择一个知识库');
      return;
    }

    setGenerating(true);
    try {
      // TODO: 实际的GraphRAG调用
      // const response = await fetch('http://localhost:8000/api/v1/generate-draft', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     knowledge_base: selectedKB.name,
      //     prompt: fullPrompt,
      //   }),
      // });

      // 临时模拟生成过程
      await simulateGeneration();
      
    } catch (error) {
      console.error('生成初稿失败:', error);
      message.error('生成初稿失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  // 模拟生成过程（占位符）
  const simulateGeneration = async () => {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 生成模拟的树结构数据
    const mockDraft = {
      project_name: `${selectedKB.name}_draft`,
      structure: [
        {
          id: '1',
          title: '开场介绍',
          description: '欢迎观众，介绍博物馆背景',
          type: 'chapter',
          parent_id: null,
          children: ['1.1', '1.2'],
          position: { x: 100, y: 100 }
        },
        {
          id: '1.1',
          title: '博物馆历史',
          description: '简述博物馆的建立历史和重要意义',
          type: 'section',
          parent_id: '1',
          children: [],
          position: { x: 100, y: 200 }
        },
        {
          id: '1.2',
          title: '参观须知',
          description: '介绍参观路线和注意事项',
          type: 'section',
          parent_id: '1',
          children: [],
          position: { x: 300, y: 200 }
        },
        {
          id: '2',
          title: '主要展品介绍',
          description: '详细介绍核心展品和文物',
          type: 'chapter',
          parent_id: null,
          children: ['2.1', '2.2'],
          position: { x: 500, y: 100 }
        },
        {
          id: '2.1',
          title: '古代文物',
          description: '介绍馆藏古代文物的历史价值',
          type: 'section',
          parent_id: '2',
          children: [],
          position: { x: 500, y: 200 }
        },
        {
          id: '2.2',
          title: '现代艺术',
          description: '展示现代艺术作品的创作理念',
          type: 'section',
          parent_id: '2',
          children: [],
          position: { x: 700, y: 200 }
        }
      ]
    };

    setGeneratedDraft(mockDraft);
    message.success('初稿生成完成！');
  };

  // 重新生成
  const regenerateDraft = () => {
    setGeneratedDraft(null);
    generateDraft();
  };

  // 确认初稿，进入编辑模式
  const confirmDraft = () => {
    if (!generatedDraft) {
      message.error('请先生成初稿');
      return;
    }
    
    // 调用父组件的回调，传递生成的初稿数据
    onDraftConfirmed(generatedDraft);
  };

  return (
    <div className="draft-generator">
      <Row style={{ height: '100vh' }}>
        {/* 左侧：树结构预览 */}
        <Col span={16} style={{ height: '100%', position: 'relative', borderRight: '1px solid #f0f0f0' }}>
          <div style={{ height: '100%', position: 'relative' }}>
            {generatedDraft ? (
              <TreeCanvas
                ref={treeCanvasRef}
                treeData={generatedDraft}
                selectedNode={null}
                onNodeClick={() => {}}
                readOnly={true}
                showMiniMap={false}
              />
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                flexDirection: 'column',
                color: '#999'
              }}>
                {generating ? (
                  <>
                    <Spin size="large" />
                    <Text style={{ marginTop: 16, color: '#666' }}>正在生成剧本初稿...</Text>
                  </>
                ) : (
                  <>
                    <EditOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                    <Text>请在右侧设置参数并生成初稿</Text>
                  </>
                )}
              </div>
            )}
          </div>
        </Col>

        {/* 右侧：控制面板 */}
        <Col span={8} style={{ height: '100%', padding: '20px', overflowY: 'auto' }}>
          <Title level={4}>生成剧本大纲初稿</Title>

          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 知识库选择 */}
            <Card title="选择知识库" size="small">
              <Select
                placeholder="选择一个知识库"
                style={{ width: '100%' }}
                value={selectedKB?.name}
                onChange={(value) => {
                  const kb = knowledgeBases.find(kb => kb.name === value);
                  setSelectedKB(kb);
                }}
                loading={loading}
              >
                {knowledgeBases.map(kb => (
                  <Option key={kb.name} value={kb.name}>
                    <div>
                      <div>{kb.name}</div>
                    </div>
                  </Option>
                ))}
              </Select>
            </Card>

            {/* Prompt编辑 */}
            <Card title="添加要求" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  {/* <Text strong>用户需求：</Text> */}
                  <TextArea
                    placeholder="描述你对剧本的特殊要求，例如：重点突出某个主题、面向特定观众群体等。这些要求将被添加到提示词中。"
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    rows={3}
                  />
                </div>
              </Space>
            </Card>

            {/* 生成控制 */}
            <Card title="生成控制" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  icon={<PlayCircleOutlined />}
                  onClick={generateDraft}
                  disabled={!selectedKB || generating}
                  loading={generating}
                  size="large"
                  style={{ width: '100%' }}
                >
                  {generatedDraft ? '不满意？再试一次！' : '生成初稿'}
                </Button>

                <Button 
                  type="primary" 
                  icon={<CheckOutlined />}
                  size="large"
                  onClick={confirmDraft}
                  style={{ width: '100%' }}
                  disabled={generating}
                >
                  确认初稿，开始编辑
                </Button>

                {!selectedKB && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    请先选择知识库
                  </Text>
                )}
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
}

export default DraftGenerator;

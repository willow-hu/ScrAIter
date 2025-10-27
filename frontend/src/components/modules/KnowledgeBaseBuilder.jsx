import React, { useState, useMemo, useEffect } from 'react';
import { Button, Select, Space, Progress, Alert, Input, Form, Divider, message, Modal } from 'antd';
import { PlayCircleOutlined, StopOutlined } from '../../utils/icons';
import { KNOWLEDGE_BASE_CONFIG, getFlattenedConfig } from '../../config/knowledgeBaseConfig';
import {
  calculateSelectedStats,
  canBuildKnowledgeBase,
  fetchKnowledgeBases,
  isKnowledgeBaseNameExists,
  startKnowledgeBaseBuild,
  fetchBuildProgress,
  getBuildStatusColor
} from '../../utils/archive_manager';

const { Option } = Select;

function KnowledgeBaseBuilder({ categories, files, onRefresh, isRebuild = false, existingKnowledgeBase = null }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [kbTheme, setKbTheme] = useState(''); // 知识库主题（允许中文）
  const [kbName, setKbName] = useState(''); // 系统生成的目录名
  const [building, setBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStatus, setBuildStatus] = useState('idle'); // idle, building, completed, error
  const [buildMessage, setBuildMessage] = useState('');
  const [existingKBs, setExistingKBs] = useState([]);
  const [form] = Form.useForm();

  // 如果是重建模式，初始化现有知识库的数据
  useEffect(() => {
    if (isRebuild && existingKnowledgeBase) {
      setSelectedCategories(existingKnowledgeBase.categories || []);
      setKbName(existingKnowledgeBase.name || '');
      setKbTheme(existingKnowledgeBase.theme || existingKnowledgeBase.name || '');
      form.setFieldsValue({
        categories: existingKnowledgeBase.categories || [],
        kbTheme: existingKnowledgeBase.theme || existingKnowledgeBase.name || ''
      });
    }
  }, [isRebuild, existingKnowledgeBase, form]);

  // 构建参数配置
  const buildConfig = getFlattenedConfig(KNOWLEDGE_BASE_CONFIG);

  // 加载知识库列表
  const loadKnowledgeBases = async () => {
    try {
      const kbList = await fetchKnowledgeBases();
      setExistingKBs(kbList);
    } catch (error) {
      console.error('获取知识库列表失败:', error);
      setExistingKBs([]);
    }
  };

  // 组件挂载时加载知识库列表
  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  // 计算选中类目的文件统计
  const selectedStats = useMemo(() => {
    return calculateSelectedStats(selectedCategories, files);
  }, [selectedCategories, files]);

  // 检查是否可以构建知识库
  const canBuild = useMemo(() => {
    return canBuildKnowledgeBase(selectedCategories, selectedStats);
  }, [selectedCategories, selectedStats]);

  // 生成唯一的目录名（基于主题和时间戳）
  const generateUniqueName = (theme) => {
    // 将主题转为拼音或英文标识，这里简化为使用时间戳和随机数
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `kb_${timestamp}_${random}`;
  };

  // 检查主题是否已存在
  const isThemeExists = (theme) => {
    return existingKBs.some(kb => kb.theme === theme);
  };

  // 开始构建知识库
  const handleBuild = async () => {
    try {
      // 验证表单
      const values = await form.validateFields();
      
      // 确保使用最新的selectedCategories状态
      const categoriesToUse = isRebuild ? selectedCategories : values.categories;
      const themeToUse = isRebuild ? kbTheme : values.kbTheme;
      
      if (!categoriesToUse || categoriesToUse.length === 0) {
        message.error('请选择至少一个类目');
        return;
      }
      
      if (!canBuild) {
        message.error('请确保所选类目中的所有文件都已标记标签');
        return;
      }

      // 加载已有知识库列表来检查主题冲突（仅新建模式需要）
      if (!isRebuild) {
        await loadKnowledgeBases();
        
        // 检查主题是否已存在
        if (isThemeExists(themeToUse)) {
          message.error(`知识库主题 "${themeToUse}" 已存在，请使用其他主题`);
          return;
        }
        
        // 生成唯一的目录名
        const generatedName = generateUniqueName(themeToUse);
        setKbName(generatedName);
        
        // 直接开始构建
        await startBuild(generatedName, themeToUse);
      } else {
        // 重建模式使用现有的name和theme
        await startBuild(kbName, themeToUse);
      }
    } catch (error) {
      // 表单验证失败
      console.error('构建知识库失败:', error);
    }
  };

  // 执行构建
  const startBuild = async (kbName, kbTheme) => {
    setBuilding(true);
    setBuildStatus('building');
    setBuildProgress(0);
    setBuildMessage('正在初始化...');

    try {
      // 构建配置中包含主题
      const configWithTheme = {
        ...buildConfig,
        theme: kbTheme
      };
      
      const result = await startKnowledgeBaseBuild(kbName, selectedCategories, configWithTheme);
      
      // 开始轮询构建进度
      pollBuildProgress(result.task_id);
    } catch (error) {
      console.error('构建知识库失败:', error);
      message.error(`构建失败: ${error.message}`);
      setBuildStatus('error');
      setBuildMessage(`构建失败: ${error.message}`);
      setBuilding(false);
    }
  };

  // 轮询构建进度
  const pollBuildProgress = async (taskId) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await fetchBuildProgress(taskId);
        setBuildProgress(status.progress);
        setBuildMessage(status.current_file || '处理中...');
        
        if (status.status === 'completed') {
          clearInterval(pollInterval);
          setBuildStatus('completed');
          setBuildMessage('知识库构建完成！');
          setBuilding(false);
          message.success('知识库构建完成');
          onRefresh();
          // 刷新知识库列表
          loadKnowledgeBases();
        } else if (status.status === 'error') {
          clearInterval(pollInterval);
          setBuildStatus('error');
          setBuildMessage(status.error_message || '构建过程中发生错误');
          setBuilding(false);
          message.error('知识库构建失败');
        }
      } catch (error) {
        console.error('获取构建进度失败:', error);
        clearInterval(pollInterval);
        setBuildStatus('error');
        setBuildMessage('网络错误');
        setBuilding(false);
      }
    }, 2000); // 每2秒检查一次
  };

  // 停止构建
  const handleStopBuild = () => {
    Modal.confirm({
      title: '确认停止',
      content: '确定要停止当前的知识库构建吗？已构建的进度将丢失。',
      okText: '停止',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        setBuilding(false);
        setBuildStatus('idle');
        setBuildProgress(0);
        setBuildMessage('');
        message.info('已停止构建');
      }
    });
  };

  // 获取状态颜色
  const getStatusColor = () => {
    return getBuildStatusColor(buildStatus);
  };

  return (
    <div className="kb-builder">
      <Form form={form} layout="vertical">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 类目选择 */}
          <Form.Item 
            label="选择类目" 
            name="categories"
            rules={[{ required: true, message: '请选择至少一个类目' }]}
          >
            <Select
              mode="multiple"
              value={selectedCategories}
              onChange={(value) => {
                setSelectedCategories(value);
                // 同步更新表单字段
                form.setFieldValue('categories', value);
              }}
              placeholder="选择一个或多个类目"
              style={{ width: '100%' }}
              maxTagCount={3}
            >
              {categories.map(category => {
                const categoryFiles = files.filter(f => f.category === category);
                const untaggedCount = categoryFiles.filter(f => !f.source_tag).length;
                
                return (
                  <Option key={category} value={category}>
                    {category}
                    {untaggedCount > 0 && <span style={{ color: 'red' }}> - {untaggedCount}个未标记</span>}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>

          {/* 知识库主题 */}
          {!isRebuild && (
            <Form.Item 
              label="知识库主题" 
              name="kbTheme"
              rules={[
                { required: true, message: '请输入知识库主题' },
                { pattern: /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/, message: '主题只能包含中文、字母、数字和下划线，不能包含空格和其他特殊符号' },
                { max: 50, message: '主题长度不能超过50个字符' }
              ]}
            >
              <Input 
                placeholder="例：苏州双塔" 
                value={kbTheme}
                onChange={(e) => {
                  setKbTheme(e.target.value);
                  // 同步更新表单字段
                  form.setFieldValue('kbTheme', e.target.value);
                }}
              />
            </Form.Item>
          )}

          {/* 重建模式显示知识库主题 */}
          {isRebuild && (
            <Alert
              message={`重建知识库：${kbTheme}`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* 选中文件统计 */}
          {selectedCategories.length > 0 && (
            <Alert
              message={
                <div>
                  <p><strong>将构建以下内容：</strong></p>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    {selectedCategories.map(cat => (
                      <li key={cat}>{cat} ({files.filter(f => f.category === cat).length} 个文件)</li>
                    ))}
                  </ul>
                  <p style={{ margin: '8px 0' }}>
                    总计: {selectedStats.total} 个文件 | 
                    已标记: {selectedStats.withTags} | 
                    未标记: <span style={{ color: selectedStats.withoutTags > 0 ? 'red' : 'inherit' }}>
                      {selectedStats.withoutTags}
                    </span>
                  </p>
                </div>
              }
              type={selectedStats.withoutTags > 0 ? 'warning' : 'info'}
              showIcon
            />
          )}

          {/* 构建配置信息 */}
          {/* {selectedCategories.length > 0 && canBuild && (
            <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px', fontSize: '12px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>构建配置：</div>
              <div>分块大小: {buildConfig.chunk_size} | 重叠: {buildConfig.chunk_overlap}</div>
              <div>嵌入模型: {buildConfig.embedding_model} | 索引类型: {buildConfig.index_type}</div>
              <div>相似度算法: {buildConfig.similarity_metric} | 批次大小: {buildConfig.batch_size}</div>
            </div>
          )} */}

          {/* 构建控制 */}
          <div>
            {!building ? (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleBuild}
                disabled={!canBuild}
                size="large"
                style={{ width: '100%' }}
              >
                {isRebuild ? '重建知识库' : '构建知识库'}
              </Button>
            ) : (
              <Button
                danger
                icon={<StopOutlined />}
                onClick={handleStopBuild}
                size="large"
                style={{ width: '100%' }}
              >
                停止构建
              </Button>
            )}

            {!canBuild && selectedCategories.length > 0 && selectedStats.withoutTags > 0 && (
              <div style={{ marginTop: 8, fontSize: '12px', color: '#ff4d4f' }}>
                请先为所有文件标记标签后再构建知识库
              </div>
            )}
          </div>

          {/* 构建进度 */}
          {building && (
            <div>
              <Progress 
                percent={Math.round(buildProgress)} 
                status={buildStatus === 'error' ? 'exception' : 'active'}
              />
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                {buildMessage}
              </div>
            </div>
          )}

          {/* 构建状态 */}
          {buildStatus !== 'idle' && !building && (
            <Alert
              message={buildMessage}
              type={buildStatus === 'completed' ? 'success' : 'error'}
              showIcon
            />
          )}
        </Space>
      </Form>
    </div>
  );
}

export default KnowledgeBaseBuilder;

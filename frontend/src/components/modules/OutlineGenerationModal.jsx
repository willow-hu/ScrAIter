import React, { useState, useEffect } from 'react';
import { Modal, Input, message } from 'antd';
import { EditOutlined, ExclamationCircleOutlined } from '../../utils/icons';

const { TextArea } = Input;

// LocalStorage的key，用于缓存用户输入
const STORAGE_KEY = 'outline_generation_requirements';

/**
 * 大纲生成模态框组件
 * 
 * 功能：
 * 1. 收集用户对大纲生成的自定义要求
 * 2. 确认生成操作
 * 3. 调用后端API生成大纲
 * 4. 缓存用户输入的要求到LocalStorage
 * 
 * @param {boolean} visible - 是否显示模态框
 * @param {string} kbName - 知识库名称
 * @param {string} projectId - 项目ID
 * @param {string} knowledgeBaseId - 知识库ID
 * @param {function} onSuccess - 生成成功回调，参数为生成的结构数据
 * @param {function} onCancel - 取消回调
 */
function OutlineGenerationModal({ 
  visible, 
  kbName, 
  projectId,
  knowledgeBaseId,
  onSuccess, 
  onCancel 
}) {
  const [userRequirements, setUserRequirements] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);

  // 组件挂载时从LocalStorage加载缓存的用户要求
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        setUserRequirements(cached);
      }
    } catch (error) {
      console.error('加载缓存的用户要求失败:', error);
    }
  }, []);

  // 用户输入变化时自动保存到LocalStorage
  const handleRequirementsChange = (e) => {
    const value = e.target.value;
    setUserRequirements(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      console.error('保存用户要求到缓存失败:', error);
    }
  };

  // 处理第一步确认（输入要求）
  const handleFirstStepOk = () => {
    // 关闭输入框，打开确认框
    setConfirmVisible(true);
  };

  // 处理第一步取消
  const handleFirstStepCancel = () => {
    // 取消时不清空用户输入，保留缓存
    setConfirmVisible(false);
    onCancel();
  };

  // 处理第二步确认（执行生成）
  const handleSecondStepOk = async () => {
    try {
      message.loading({ 
        content: `正在为「${kbName}」生成大纲，请稍候...`, 
        key: 'outline-gen', 
        duration: 0 
      });
      
      // 调用后端API生成大纲
      const response = await fetch('http://localhost:8000/api/v1/generate/outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          kb_name: knowledgeBaseId,
          user_requirements: userRequirements || ''
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
      
      // 生成成功后清空缓存和状态
      setUserRequirements('');
      setConfirmVisible(false);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('清除缓存失败:', error);
      }
      
      // 调用成功回调，传递生成的结构数据
      if (onSuccess && result.structure) {
        onSuccess(result.structure);
      }
      
    } catch (error) {
      console.error('生成大纲失败:', error);
      message.error({ 
        content: error.message || '生成大纲失败', 
        key: 'outline-gen' 
      });
      
      // 失败时不关闭确认框，让用户可以重试或取消
      setConfirmVisible(false);
    }
  };

  // 处理第二步取消（返回第一步）
  const handleSecondStepCancel = () => {
    // 返回第一步，让用户继续编辑要求
    setConfirmVisible(false);
  };

  return (
    <>
      {/* 第一步：输入用户要求 */}
      <Modal
        title="请描述您对大纲的要求"
        open={visible}
        onOk={handleFirstStepOk}
        onCancel={handleFirstStepCancel}
        okText="下一步"
        cancelText="取消"
        width={600}
        maskClosable={false}
        keyboard={false}
      >
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 12, color: '#666' }}>
            您可以输入对大纲的特殊要求，例如：侧重某个主题、调整结构深度、增减某类内容等。
          </p>
          <TextArea
            rows={4}
            maxLength={500}
            showCount
            value={userRequirements}
            onChange={handleRequirementsChange}
            style={{ fontSize: 14 }}
          />
        </div>
      </Modal>

      {/* 第二步：确认生成 */}
      <Modal
        title="确认生成大纲"
        open={visible && confirmVisible}
        onOk={handleSecondStepOk}
        onCancel={handleSecondStepCancel}
        okText="确定生成"
        cancelText="返回修改"
        okType="primary"
        maskClosable={false}
        keyboard={false}
      >
        <div>
          <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
          <span>
            此操作将基于知识库「{kbName}」的知识图谱生成新的大纲，会覆盖现有的内容。确定要继续吗？
          </span>
        </div>
      </Modal>
    </>
  );
}

export default OutlineGenerationModal;

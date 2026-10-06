import { showcaseFetch as fetch } from '../../showcase/api.js';
/**
 * 知识库相关工具函数
 */

/**
 * 计算选中类目的文件统计
 * @param {Array} selectedCategories - 选中的类目
 * @param {Array} files - 文件列表
 * @returns {Object} 统计信息
 */
export const calculateSelectedStats = (selectedCategories, files) => {
  if (selectedCategories.length === 0) return { total: 0, withTags: 0, withoutTags: 0 };
  
  const selectedFiles = files.filter(file => selectedCategories.includes(file.category));
  const total = selectedFiles.length;
  const withTags = selectedFiles.filter(file => file.source_tag).length;
  const withoutTags = total - withTags;
  
  return { total, withTags, withoutTags };
};

/**
 * 检查是否可以构建知识库
 * @param {Array} selectedCategories - 选中的类目
 * @param {Object} selectedStats - 选中的统计信息
 * @returns {boolean} 是否可以构建
 */
export const canBuildKnowledgeBase = (selectedCategories, selectedStats) => {
  return selectedCategories.length > 0 && selectedStats.withoutTags === 0 && selectedStats.total > 0;
};

/**
 * 加载知识库列表
 * @returns {Promise<Array>} 知识库列表
 */
export const fetchKnowledgeBases = async () => {
  try {
    const response = await fetch('/api/v1/knowledge-base/list');
    if (response.ok) {
      const result = await response.json();
      return result.knowledge_bases || [];
    } else {
      console.error('获取知识库列表失败');
      return [];
    }
  } catch (error) {
    console.error('获取知识库列表失败:', error);
    return [];
  }
};

/**
 * 检查知识库名称是否已存在
 * @param {string} kbName - 知识库名称
 * @param {Array} existingKBs - 现有知识库列表
 * @returns {boolean} 是否已存在
 */
export const isKnowledgeBaseNameExists = (kbName, existingKBs) => {
  return existingKBs.some(kb => kb.name === kbName);
};

/**
 * 开始构建知识库
 * @param {string} kbName - 知识库名称
 * @param {Array} selectedCategories - 选中的类目
 * @param {Object} buildConfig - 构建配置
 * @returns {Promise<Object>} 构建结果
 */
export const startKnowledgeBaseBuild = async (kbName, selectedCategories, buildConfig) => {
  const response = await fetch('/api/v1/knowledge-base/build', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: kbName,
      categories: selectedCategories,
      ...buildConfig  // 展开所有构建参数
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '构建失败');
  }

  return await response.json();
};

/**
 * 获取构建进度
 * @param {string} taskId - 任务ID
 * @returns {Promise<Object>} 构建状态
 */
export const fetchBuildProgress = async (taskId) => {
  const response = await fetch(`/api/v1/knowledge-base/build-status/${taskId}`);
  
  if (!response.ok) {
    throw new Error('无法获取构建进度');
  }

  return await response.json();
};

/**
 * 删除知识库
 * @param {string} kbName - 知识库名称
 * @returns {Promise<Object>} 删除结果
 */
export const deleteKnowledgeBase = async (kbName) => {
  const response = await fetch(`/api/v1/knowledge-base/${kbName}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '删除失败');
  }

  return await response.json();
};

/**
 * 格式化日期
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期
 */
export const formatDate = (dateString) => {
  if (!dateString) return '未知';
  try {
    return new Date(dateString).toLocaleString('zh-CN');
  } catch (e) {
    return '未知';
  }
};

/**
 * 获取构建状态对应的颜色
 * @param {string} buildStatus - 构建状态
 * @returns {string} 颜色值
 */
export const getBuildStatusColor = (buildStatus) => {
  switch (buildStatus) {
    case 'building': return 'blue';
    case 'completed': return 'green';
    case 'error': return 'red';
    default: return 'default';
  }
};
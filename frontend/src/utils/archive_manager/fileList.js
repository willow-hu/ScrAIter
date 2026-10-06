import { showcaseFetch as fetch } from '../../showcase/api.js';
/**
 * 文件列表相关工具函数
 */

/**
 * 获取标签配置
 * @returns {Promise<Object>} 标签配置
 */
export const fetchSourceTags = async () => {
  try {
    const response = await fetch('/api/v1/source-tags');
    if (response.ok) {
      const config = await response.json();
      return config.tags || [];
    } else {
      console.warn('获取标签配置失败，API响应错误');
      return [];
    }
  } catch (error) {
    console.error('获取标签配置失败:', error);
    return [];
  }
};

/**
 * 获取标签配置信息
 * @param {string} value - 标签值
 * @param {Array} sourceTags - 标签配置数组
 * @returns {Object} 标签配置对象
 */
export const getSourceTagConfig = (value, sourceTags) => {
  return sourceTags.find(tag => tag.value === value) || { label: value, color: 'default' };
};

/**
 * 获取文件类型图标类型
 * @param {string} filename - 文件名
 * @param {string} fileType - 文件类型
 * @returns {string} 图标类型标识
 */
export const getFileIconType = (filename, fileType) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (fileType === 'structured' || ['xlsx', 'csv'].includes(ext)) {
    return 'excel';
  }
  return 'text';
};

/**
 * 按类目分组文件
 * @param {Array} files - 文件列表
 * @returns {Object} 分组后的文件对象
 */
export const groupFilesByCategory = (files) => {
  const groups = {};
  files.forEach(file => {
    const category = file.category || '未分类';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(file);
  });
  return groups;
};

/**
 * 计算文件统计信息
 * @param {Array} files - 文件列表
 * @param {Object} groupedFiles - 分组文件
 * @returns {Object} 统计信息
 */
export const calculateFileStats = (files, groupedFiles) => {
  const total = files.length;
  const withTags = files.filter(file => file.source_tag).length;
  const withoutTags = total - withTags;
  const categories = Object.keys(groupedFiles).length;
  
  return { total, withTags, withoutTags, categories };
};

/**
 * 删除文件
 * @param {Object} file - 文件对象
 * @returns {Promise<Object>} 删除结果
 */
export const deleteFileFromServer = async (file) => {
  const response = await fetch(`/api/v1/files/${file.relative_path}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '删除失败');
  }

  return await response.json();
};

/**
 * 更新文件标签
 * @param {Object} file - 文件对象
 * @param {string} newTag - 新标签
 * @returns {Promise<Object>} 更新结果
 */
export const updateFileTag = async (file, newTag) => {
  const response = await fetch(`/api/v1/files/${file.relative_path}/tags`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source_tag: newTag
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '更新标签失败');
  }

  return await response.json();
};
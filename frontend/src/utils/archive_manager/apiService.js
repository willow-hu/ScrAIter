import { showcaseFetch as fetch } from '../../showcase/api.js';
/**
 * 资料管理模块通用API服务
 */

/**
 * 获取文件列表
 * @returns {Promise<Object>} 文件列表响应
 */
export const fetchFiles = async () => {
  const response = await fetch('/api/v1/files');
  if (!response.ok) {
    throw new Error('获取文件列表失败');
  }
  return await response.json();
};

/**
 * 获取类目列表
 * @returns {Promise<Object>} 类目列表响应
 */
export const fetchCategories = async () => {
  const response = await fetch('/api/v1/categories');
  if (response.ok) {
    return await response.json();
  } else {
    // 如果接口不存在，返回空列表
    return { categories: [] };
  }
};

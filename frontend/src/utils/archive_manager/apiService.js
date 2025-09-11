/**
 * 资料管理模块通用API服务
 */

/**
 * 获取文件列表
 * @returns {Promise<Object>} 文件列表响应
 */
export const fetchFiles = async () => {
  const response = await fetch('http://localhost:8000/api/v1/files');
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
  const response = await fetch('http://localhost:8000/api/v1/categories');
  if (response.ok) {
    return await response.json();
  } else {
    // 如果接口不存在，返回空列表
    return { categories: [] };
  }
};

/**
 * 统一的错误处理函数
 * @param {Error} error - 错误对象
 * @param {string} operation - 操作名称
 */
export const handleApiError = (error, operation = '操作') => {
  console.error(`${operation}失败:`, error);
  return {
    success: false,
    message: `${operation}失败: ${error.message}`
  };
};

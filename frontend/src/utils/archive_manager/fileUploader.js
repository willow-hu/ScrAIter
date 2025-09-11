/**
 * 文件上传相关工具函数
 */

// 文件类型常量
export const FILE_TYPES = {
  STRUCTURED: 'structured',
  UNSTRUCTURED: 'unstructured'
};

// 支持的文件格式
export const SUPPORTED_FORMATS = {
  [FILE_TYPES.STRUCTURED]: ['.xlsx', '.csv'],
  [FILE_TYPES.UNSTRUCTURED]: ['.pdf', '.docx', '.txt']
};

/**
 * 检查文件格式是否支持
 * @param {File} file - 文件对象
 * @param {string} fileType - 文件类型
 * @returns {boolean} 是否支持
 */
export const isFileFormatSupported = (file, fileType) => {
  const allowedFormats = SUPPORTED_FORMATS[fileType];
  const fileExt = '.' + file.name.split('.').pop().toLowerCase();
  return allowedFormats.includes(fileExt);
};

/**
 * 检查是否存在重复的类目名称
 * @param {string} categoryName - 类目名称
 * @param {Array} existingCategories - 现有类目列表
 * @returns {boolean} 是否重复
 */
export const isCategoryDuplicate = (categoryName, existingCategories) => {
  return existingCategories.includes(categoryName.trim());
};

/**
 * 上传文件到服务器
 * @param {Array} fileList - 文件列表
 * @param {string} selectedCategory - 选择的类目
 * @param {string} fileType - 文件类型
 * @returns {Promise<Object>} 上传结果
 */
export const uploadFilesToServer = async (fileList, selectedCategory, fileType) => {
  const formData = new FormData();
  
  // 添加文件
  fileList.forEach(file => {
    formData.append('files', file.originFileObj);
  });
  
  // 添加元数据
  formData.append('category', selectedCategory);
  formData.append('file_type', fileType);

  const response = await fetch('http://localhost:8000/api/v1/files/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || '上传失败');
  }

  return await response.json();
};

/**
 * 验证上传前的条件
 * @param {string} selectedCategory - 选择的类目
 * @param {Array} fileList - 文件列表
 * @returns {Object} 验证结果
 */
export const validateUploadConditions = (selectedCategory, fileList) => {
  if (!selectedCategory) {
    return { valid: false, message: '请选择或创建类目' };
  }

  if (fileList.length === 0) {
    return { valid: false, message: '请选择要上传的文件' };
  }

  return { valid: true };
};
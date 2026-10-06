import { showcaseFetch as fetch } from '../../showcase/api.js';
/**
 * 项目管理相关工具函数
 */

/**
 * 获取项目列表
 */
export const fetchProjects = async () => {
  try {
    const response = await fetch('/api/v1/projects');
    
    if (!response.ok) {
      throw new Error('获取项目列表失败');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取项目列表失败:', error);
    throw error;
  }
};

/**
 * 获取知识库列表
 */
export const fetchKnowledgeBases = async () => {
  try {
    const response = await fetch('/api/v1/knowledge-bases');
    
    if (!response.ok) {
      throw new Error('获取知识库列表失败');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取知识库列表失败:', error);
    throw error;
  }
};

/**
 * 创建新项目
 */
export const createProject = async (projectData) => {
  try {
    const response = await fetch('/api/v1/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '创建项目失败');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('创建项目失败:', error);
    throw error;
  }
};

/**
 * 删除项目
 */
export const deleteProject = async (projectId) => {
  try {
    const response = await fetch(`/api/v1/projects/${projectId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '删除项目失败');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('删除项目失败:', error);
    throw error;
  }
};

/**
 * 更新项目信息
 */
export const updateProject = async (projectId, updateData) => {
  try {
    const response = await fetch(`/api/v1/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '更新项目失败');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('更新项目失败:', error);
    throw error;
  }
};

/**
 * 复制项目
 */
export const duplicateProject = async (projectId, newName) => {
  try {
    const response = await fetch(`/api/v1/projects/${projectId}/duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ new_name: newName }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '复制项目失败');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('复制项目失败:', error);
    throw error;
  }
};

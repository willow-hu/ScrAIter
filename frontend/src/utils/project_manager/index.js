/**
 * 项目管理相关工具函数
 */

/**
 * 获取项目列表
 */
export const fetchProjects = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/v1/projects');
    
    if (!response.ok) {
      throw new Error('获取项目列表失败');
    }
    
    const data = await response.json();
    
    // 为每个项目添加 kb_name 字段（从script数据中获取或使用项目名称）
    const projectsWithKB = await Promise.all(
      (data.projects || []).map(async (project) => {
        try {
          // 尝试获取项目的script数据以获取知识库名称
          const scriptResponse = await fetch(`http://localhost:8000/api/v1/projects/${project.name}/script`);
          if (scriptResponse.ok) {
            const scriptData = await scriptResponse.json();
            // 从global_context中获取knowledge_base_name，如果没有则使用项目名称
            const kbName = project.name;
            return { ...project, kb_name: kbName };
          }
        } catch (error) {
          console.warn(`获取项目 ${project.name} 的知识库信息失败:`, error);
        }
        // 如果无法获取，使用项目名称作为知识库名称
        return { ...project, kb_name: project.name };
      })
    );
    
    return { projects: projectsWithKB, total_count: projectsWithKB.length };
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
    const response = await fetch('http://localhost:8000/api/v1/knowledge-base/list');
    
    if (!response.ok) {
      throw new Error('获取知识库列表失败');
    }
    
    const data = await response.json();
    
    // 转换为数组格式
    const kbArray = (data.knowledge_bases || []).map(kb => ({
      name: kb.name,
      theme: kb.theme,
      categories: kb.categories,
      file_count: kb.file_count,
      has_graph: kb.has_graph,
    }));
    
    return { knowledge_bases: kbArray };
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
    const response = await fetch('http://localhost:8000/api/v1/projects', {
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
export const deleteProject = async (projectName) => {
  try {
    const response = await fetch(`http://localhost:8000/api/v1/projects/${projectName}`, {
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
 * 重命名项目
 */
export const renameProject = async (oldName, newName) => {
  try {
    // TODO: 实现重命名API
    throw new Error('重命名功能待实现');
  } catch (error) {
    console.error('重命名项目失败:', error);
    throw error;
  }
};

/**
 * 复制项目
 */
export const duplicateProject = async (projectName) => {
  try {
    // TODO: 实现复制API
    throw new Error('复制功能待实现');
  } catch (error) {
    console.error('复制项目失败:', error);
    throw error;
  }
};

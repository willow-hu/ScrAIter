/**
 * 脚本保存相关工具函数
 */

/**
 * 保存脚本数据到服务器
 * @param {string} knowledgeBaseName - 知识库名称
 * @param {Object} treeData - 树形数据
 * @param {boolean} showMessage - 是否显示成功消息
 * @returns {Promise<boolean>} 是否保存成功
 */
export async function saveScriptToServer(knowledgeBaseName, treeData, showMessage = false) {
  if (!knowledgeBaseName || !knowledgeBaseName.trim()) {
    if (showMessage) {
      const { message } = await import('antd');
      message.error('请先选择知识库');
    }
    return false;
  }

  if (!treeData) {
    if (showMessage) {
      const { message } = await import('antd');
      message.error('没有数据可以保存');
    }
    return false;
  }

  try {
    // 构建保存数据，确保包含global_context和structure，不包含knowledge_base_name
    const saveData = {
      global_context: {
        character_list: treeData.global_context?.character_list || [],
        site_name: treeData.global_context?.site_name || "",
        other_requirements: treeData.global_context?.other_requirements || ""
      },
      structure: treeData.structure || []
    };

    // 保存为script数据
    const response = await fetch(`http://localhost:8000/api/v1/projects/${knowledgeBaseName.trim()}/script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(saveData)
    });

    if (response.ok) {
      if (showMessage) {
        const { message } = await import('antd');
        message.success(`"${knowledgeBaseName}" 脚本已保存`);
      }
      return true;
    } else {
      const errorData = await response.json();
      if (showMessage) {
        const { message } = await import('antd');
        message.error(`保存失败: ${errorData.detail || '未知错误'}`);
      } else {
        console.error('保存失败:', errorData.detail || '未知错误');
      }
      return false;
    }
  } catch (error) {
    if (showMessage) {
      const { message } = await import('antd');
      message.error('保存失败: 网络错误或服务器不可用');
    } else {
      console.error('保存到服务器失败:', error);
    }
    return false;
  }
}

/**
 * 验证数据完整性
 * @param {Object} data - 待验证的数据
 * @returns {Object} 验证结果 {valid: boolean, message: string}
 */
export function validateDataIntegrity(data) {
  if (!data) {
    return { valid: false, message: '数据为空' };
  }
  
  if (!data.global_context) {
    return { valid: false, message: '缺少项目信息(global_context)' };
  }
  
  if (!data.structure) {
    return { valid: false, message: '缺少剧本结构(structure)' };
  }
  
  if (!Array.isArray(data.structure)) {
    return { valid: false, message: '剧本结构必须是数组格式' };
  }
  
  return { valid: true, message: '数据完整' };
}
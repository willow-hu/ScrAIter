# 前端集成说明

## 概述

后端已实现大纲生成功能，前端需要调用新的API端点来生成大纲。

## API端点变更

**旧端点**（已废弃）:
```
POST /api/v1/generate/structure
```

**新端点**（推荐使用）:
```
POST /api/v1/generate/outline
```

## 前端代码修改指南

### 位置
`frontend/src/components/workspace/ScriptEditor.jsx`

### 修改内容

在 `handleGenerateOutline` 函数中，将API调用从：

```javascript
// 旧代码 - 需要修改
const response = await fetch('http://localhost:8000/api/v1/generate/structure', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    kb_name: knowledgeBaseName.trim(),
    global_context: globalContext
  })
});
```

修改为：

```javascript
// 新代码
const response = await fetch('http://localhost:8000/api/v1/generate/outline', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    kb_name: knowledgeBaseName.trim()
  })
});
```

### 主要变化

1. **端点URL变更**: `/generate/structure` → `/generate/outline`
2. **请求体简化**: 只需要 `kb_name`，不再需要 `global_context`
3. **响应结构**: 新API返回更完整的信息，包括 `outline_path`

### 完整的修改后代码

```javascript
const handleGenerateOutline = async () => {
  // 检查知识库选择
  const knowledgeBaseName = getCurrentKnowledgeBaseName();
  if (!knowledgeBaseName || !knowledgeBaseName.trim()) {
    message.error('请先选择知识库');
    return;
  }

  // 显示确认对话框
  Modal.confirm({
    title: '操作确认',
    icon: <Icons.ExclamationCircleOutlined />,
    content: '此操作将基于知识图谱生成新的大纲，确定要继续吗？',
    okText: '确定生成',
    cancelText: '取消',
    okType: 'primary',
    onOk: async () => {
      try {
        message.info('正在生成大纲，请稍候...');
        
        // 调用后端API生成大纲
        const response = await fetch('http://localhost:8000/api/v1/generate/outline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kb_name: knowledgeBaseName.trim()
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
        
        message.success(result.message);
        
        // 更新当前树结构为生成的结构
        if (result.structure && result.structure.length > 0) {
          const newTreeData = {
            global_context: result.global_context || {
              character_list: [],
              site_name: "",
              other_requirements: ""
            },
            structure: result.structure
          };
          
          const newDataWithPositions = addAutoLayoutPositions(newTreeData);
          setTreeData(newDataWithPositions);
          treeManager.setData(newDataWithPositions);
          setSelectedNode(null);
          message.info('已加载生成的大纲结构');
        }
        
      } catch (error) {
        console.error('生成大纲失败:', error);
        message.error(error.message || '生成大纲失败');
      }
    }
  });
};
```

## 响应数据结构

### 成功响应
```typescript
{
  success: true,
  message: "大纲生成成功，共 25 个节点",
  outline_path: "E:/Study/.../shared/projects/twin_pagoda/script.json",
  structure: [
    {
      id: number,
      name: string,
      abstract: string,
      user: string,
      child_ids: number[]
    }
    // ...
  ],
  global_context: {
    character_list: any[],
    site_name: string,
    other_requirements: string
  }
}
```

### 失败响应
```typescript
{
  success: false,
  message: "错误信息",
  outline_path: null,
  structure: null,
  global_context: null
}
```

## 错误处理建议

在前端添加更详细的错误提示：

```javascript
try {
  // API调用代码
} catch (error) {
  console.error('生成大纲失败:', error);
  
  // 根据错误类型显示不同的提示
  if (error.message.includes('图数据不存在')) {
    message.error('请先为知识库构建知识图谱');
    // 可选：提示用户如何构建图谱
  } else if (error.message.includes('DASHSCOPE_API_KEY')) {
    message.error('API密钥未配置，请联系管理员');
  } else {
    message.error(error.message || '生成大纲失败');
  }
}
```

## 用户体验优化建议

1. **加载状态**: 添加loading状态，因为生成过程可能需要10-30秒
   ```javascript
   const [isGenerating, setIsGenerating] = useState(false);
   
   // 在调用前
   setIsGenerating(true);
   
   // 在完成后
   setIsGenerating(false);
   ```

2. **进度提示**: 可以添加更友好的进度提示
   ```javascript
   message.loading({
     content: '正在读取图数据...',
     key: 'outline-gen',
     duration: 0
   });
   
   // 稍后更新
   message.loading({
     content: '正在调用AI生成大纲...',
     key: 'outline-gen',
     duration: 0
   });
   
   // 完成时
   message.success({
     content: '大纲生成成功！',
     key: 'outline-gen'
   });
   ```

3. **前置检查**: 在调用API前检查知识库是否有图数据
   ```javascript
   // 检查知识库列表中的has_graph字段
   const selectedKB = knowledgeBases.find(kb => kb.name === knowledgeBaseName);
   if (!selectedKB?.has_graph) {
     Modal.confirm({
       title: '知识图谱未构建',
       content: '此知识库还没有构建知识图谱，需要先构建才能生成大纲。是否现在构建？',
       onOk: async () => {
         // 调用图谱构建API
         await fetch(`http://localhost:8000/api/v1/knowledge-base/${knowledgeBaseName}/build-graph`, {
           method: 'POST'
         });
       }
     });
     return;
   }
   ```

## 注意事项

1. **必须先构建知识图谱**: 使用前确保已调用 `/api/v1/knowledge-base/{kb_name}/build-graph`
2. **生成时间**: 大纲生成需要时间，不要重复点击
3. **覆盖提醒**: 生成会覆盖现有结构，需要提醒用户确认
4. **自动保存**: 生成后建议自动保存到服务器

## 测试步骤

1. 确保知识库已创建且有图数据
2. 在ScriptEditor中选择知识库
3. 点击"生成大纲"按钮
4. 确认操作
5. 等待生成完成
6. 检查生成的结构是否正确加载

## 调试技巧

如果遇到问题，可以：

1. 打开浏览器开发者工具查看网络请求
2. 检查后端日志 
3. 验证知识库的图数据是否存在：
   ```bash
   ls shared/knowledge_bases/GraphStore/{kb_name}/
   ```
4. 使用测试脚本单独测试后端：
   ```bash
   cd backend
   python test_outline_generation.py {kb_name}
   ```

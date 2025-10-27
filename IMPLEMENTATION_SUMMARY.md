# 大纲生成功能实现总结

## 实现日期
2025-10-28

## 功能概述
实现了基于GraphRAG的剧本大纲自动生成功能。系统读取知识库的实体（entities）、关系（relationships）和社区（communities）数据，通过精心设计的提示词引导大模型生成结构化的剧本大纲。

## 新增文件

### 1. 后端服务层
**文件**: `backend/app/services/outline_generation_service.py`
- **功能**: 大纲生成的核心服务
- **主要方法**:
  - `load_prompt_template()`: 加载提示词模板
  - `load_graph_data()`: 读取GraphStore中的CSV文件
  - `format_graph_data_for_prompt()`: 格式化图数据为文本
  - `call_llm_for_outline()`: 调用通义千问大模型
  - `parse_llm_response()`: 解析JSON响应
  - `save_outline()`: 保存大纲到项目目录
  - `generate_outline()`: 主流程orchestration

### 2. 数据模型
**文件**: `backend/app/models/generation_models.py`
- **OutlineGenerationRequest**: 请求模型（kb_name）
- **OutlineGenerationResponse**: 响应模型（success, message, outline_path, structure, global_context）

### 3. 测试脚本
**文件**: `backend/test_outline_generation.py`
- **功能**: 独立测试大纲生成功能
- **用法**: `python test_outline_generation.py <kb_name>`

### 4. 文档
- **OUTLINE_GENERATION.md**: 完整的功能说明和使用指南
- **FRONTEND_INTEGRATION.md**: 前端集成指南

## 修改的文件

### 1. API端点
**文件**: `backend/app/api/v1/rag.py`
- **新增**: `POST /api/v1/generate/outline` 端点
- **功能**: 接收知识库名称，调用生成服务，返回结果

## 技术实现

### 数据流程
```
用户请求(kb_name)
    ↓
验证知识库存在
    ↓
读取GraphStore数据
├── entities.csv      (实体列表)
└── relationships.csv (关系列表)
    ↓
加载提示词模板
(outline_generation.prompt.md)
    ↓
格式化图数据为CSV文本
    ↓
构建完整提示词
(模板 + 图数据)
    ↓
调用通义千问大模型
(qwen-max, temp=0.0, max_tokens=8000)
    ↓
解析JSON响应
    ↓
保存到项目目录
(shared/projects/{kb_name}/script.json)
    ↓
返回结果
```

### 关键技术点

1. **图数据读取**
   - 从 `shared/knowledge_bases/GraphStore/{kb_name}/` 读取CSV文件
   - 支持entities、relationships、communities三种数据
   - 使用pandas处理CSV数据

2. **提示词工程**
   - 使用已有的 `outline_generation.prompt.md` 模板
   - 将图数据格式化为CSV文本附加到提示词
   - 提供详细的输出格式说明和示例

3. **大模型调用**
   - 使用OpenAI兼容接口调用DashScope
   - 模型：qwen-max（最佳效果）
   - 温度：0.0（确保一致性）
   - 最大token：8000（支持较长大纲）

4. **JSON解析**
   - 自动移除markdown代码块标记
   - 验证必要字段（global_context, structure）
   - 详细的错误日志

5. **文件保存**
   - 保存到 `shared/projects/{kb_name}/script.json`
   - 自动创建目录
   - UTF-8编码，格式化输出

## API接口

### 请求
```http
POST /api/v1/generate/outline
Content-Type: application/json

{
  "kb_name": "twin_pagoda"
}
```

### 成功响应
```json
{
  "success": true,
  "message": "大纲生成成功，共 25 个节点",
  "outline_path": ".../shared/projects/twin_pagoda/script.json",
  "structure": [...],
  "global_context": {...}
}
```

### 失败响应
```json
{
  "success": false,
  "message": "知识库 'xxx' 的图数据不存在，请先构建知识图谱",
  "outline_path": null,
  "structure": null,
  "global_context": null
}
```

## 依赖要求

### 环境变量
- `DASHSCOPE_API_KEY`: 必需，用于调用通义千问

### Python包
- `openai`: 大模型调用
- `pandas`: CSV数据处理
- `fastapi`: API框架
- `pydantic`: 数据验证

### 前置条件
1. 知识库已创建
2. 知识图谱已构建（调用 `/api/v1/knowledge-base/{kb_name}/build-graph`）
3. GraphStore目录下存在 `entities.csv` 和 `relationships.csv`

## 测试方法

### 方法1: 使用测试脚本
```bash
cd backend
python test_outline_generation.py twin_pagoda
```

### 方法2: 使用API
```bash
curl -X POST "http://localhost:8000/api/v1/generate/outline" \
  -H "Content-Type: application/json" \
  -d '{"kb_name": "twin_pagoda"}'
```

### 方法3: Swagger UI
访问 http://localhost:8000/docs

## 输出格式

生成的大纲遵循以下结构：

```json
{
  "global_context": {
    "character_list": [],
    "site_name": "景点名称",
    "other_requirements": ""
  },
  "structure": [
    {
      "id": 1,
      "name": "景点简介",
      "abstract": "节点摘要",
      "user": "",
      "child_ids": [2, 3]
    }
    // ...更多节点
  ]
}
```

特点：
- 树状结构，根节点固定为"景点简介"
- 深度至少4层
- 一级节点固定3个
- 每个节点的子节点不超过4个
- 总节点数20-30个

## 错误处理

服务实现了完善的错误处理：

1. **文件不存在**
   - 提示词文件缺失
   - 图数据文件缺失
   - 知识库不存在

2. **数据验证**
   - JSON格式错误
   - 必要字段缺失
   - 数据类型错误

3. **API调用**
   - 网络错误
   - API密钥无效
   - 超时处理

4. **日志记录**
   - 所有关键步骤都有日志
   - 错误信息详细记录
   - 便于调试和监控

## 性能指标

- **预期耗时**: 10-30秒（取决于图数据规模）
- **大模型调用**: 1次
- **内存使用**: 取决于图数据大小
- **输出大小**: 通常10-50KB

## 后续集成

### 前端集成（待实现）
需要修改 `frontend/src/components/workspace/ScriptEditor.jsx`:
- 更改API端点从 `/generate/structure` 到 `/generate/outline`
- 简化请求参数，只传 `kb_name`
- 添加loading状态
- 增强错误提示

详见 `FRONTEND_INTEGRATION.md`

### 可能的优化
1. **缓存机制**: 缓存已生成的大纲
2. **流式输出**: 支持SSE实时返回生成进度
3. **多模型支持**: 支持选择不同的大模型
4. **自定义参数**: 支持调整节点数量、深度等参数
5. **增量更新**: 支持在现有大纲基础上更新

## 注意事项

1. **图数据质量**: 大纲质量直接依赖于GraphRAG提取的实体和关系质量
2. **提示词调优**: 可根据具体领域调整 `outline_generation.prompt.md`
3. **大模型选择**: qwen-max效果最佳，但成本较高
4. **执行时间**: 调用大模型需要时间，建议异步处理
5. **并发控制**: 应限制同时生成的任务数量

## 相关文档

- [OUTLINE_GENERATION.md](./OUTLINE_GENERATION.md) - 完整使用指南
- [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) - 前端集成说明
- [GRAPHRAG_IMPLEMENTATION.md](./GRAPHRAG_IMPLEMENTATION.md) - GraphRAG实现说明
- [outline_generation.prompt.md](backend/app/prompts/outline_generation.prompt.md) - 提示词模板

## 联系与支持

如有问题或建议，请查看相关文档或联系开发团队。

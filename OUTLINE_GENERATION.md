# 大纲生成功能说明

## 概述

大纲生成功能基于GraphRAG技术，读取知识库中的实体、关系和社区数据，通过大模型生成结构化的剧本大纲。

## 功能特点

1. **自动读取图数据**：从知识库的GraphStore中读取entities.csv和relationships.csv
2. **智能提示词**：使用精心设计的提示词模板（`outline_generation.prompt.md`）
3. **结构化输出**：生成符合规范的JSON格式大纲
4. **自动保存**：生成的大纲保存到`shared/projects/{kb_name}/script.json`

## 前置条件

在使用大纲生成功能之前，需要：

1. ✅ 已创建知识库（上传文件并构建向量索引）
2. ✅ 已为知识库构建知识图谱（调用GraphRAG构建接口）
3. ✅ 设置环境变量 `DASHSCOPE_API_KEY`

## API使用

### 端点信息

- **URL**: `POST /api/v1/generate/outline`
- **请求体**:
  ```json
  {
    "kb_name": "知识库名称"
  }
  ```

### 请求示例

```bash
curl -X POST "http://localhost:8000/api/v1/generate/outline" \
  -H "Content-Type: application/json" \
  -d '{"kb_name": "twin_pagoda"}'
```

### 响应示例

成功响应：
```json
{
  "success": true,
  "message": "大纲生成成功，共 25 个节点",
  "outline_path": "E:/Study/scraiter/Human-AI_Col/web-app/ScrAIter/shared/projects/twin_pagoda/script.json",
  "structure": [
    {
      "id": 1,
      "name": "景点简介",
      "abstract": "双塔寺位于太原市，始建于明代，为文峰塔和舍利塔",
      "user": "",
      "child_ids": [2, 7, 15]
    }
    // ...更多节点
  ],
  "global_context": {
    "character_list": [],
    "site_name": "双塔寺",
    "other_requirements": ""
  }
}
```

失败响应：
```json
{
  "success": false,
  "message": "知识库 'xxx' 的图数据不存在，请先构建知识图谱",
  "outline_path": null,
  "structure": null,
  "global_context": null
}
```

## 后端测试

### 方法1：使用测试脚本

```bash
cd backend
python test_outline_generation.py <知识库名称>
```

示例：
```bash
python test_outline_generation.py twin_pagoda
```

测试脚本会：
1. 调用大纲生成服务
2. 打印生成结果
3. 保存详细结果到 `test_outline_{kb_name}_result.json`

### 方法2：使用API

启动后端服务后，访问 http://localhost:8000/docs 使用Swagger UI测试。

## 工作流程

```
用户请求
    ↓
1. 验证知识库是否存在图数据
    ↓
2. 加载提示词模板
    ↓
3. 读取GraphStore中的CSV文件
   - entities.csv
   - relationships.csv
    ↓
4. 格式化图数据为文本
    ↓
5. 构建完整提示词 = 模板 + 图数据
    ↓
6. 调用通义千问大模型
    ↓
7. 解析JSON响应
    ↓
8. 保存到 shared/projects/{kb_name}/script.json
    ↓
返回结果
```

## 生成的大纲格式

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
      "name": "节点名称",
      "abstract": "节点摘要",
      "user": "",
      "child_ids": [2, 3]
    }
    // ...更多节点
  ]
}
```

## 输出文件位置

生成的大纲保存在：
```
shared/
└── projects/
    └── {kb_name}/
        └── script.json
```

## 常见错误及解决方案

### 错误1: "知识库的图数据不存在"

**原因**：未构建知识图谱

**解决方案**：
```bash
# 调用知识图谱构建API
curl -X POST "http://localhost:8000/api/v1/knowledge-base/{kb_name}/build-graph"
```

### 错误2: "实体文件不存在"

**原因**：GraphStore目录下缺少entities.csv

**解决方案**：重新构建知识图谱

### 错误3: "大模型返回的不是有效的JSON格式"

**原因**：大模型输出格式不正确

**解决方案**：
- 检查DASHSCOPE_API_KEY是否有效
- 检查提示词模板是否正确
- 查看日志中的原始响应

### 错误4: "DASHSCOPE_API_KEY未设置"

**解决方案**：
```bash
# Windows CMD
set DASHSCOPE_API_KEY=your_api_key

# Windows PowerShell
$env:DASHSCOPE_API_KEY="your_api_key"

# Linux/Mac
export DASHSCOPE_API_KEY=your_api_key
```

## 配置参数

在 `app/core/config.py` 中可以调整以下参数：

- `RAG_MODEL`: 大模型名称（默认: "qwen-max"）
- `RAG_TEMPERATURE`: 生成温度（大纲生成使用0.0以提高一致性）
- `RAG_MAX_TOKENS`: 最大token数（大纲生成使用8000）

## 日志查看

服务运行时会输出详细日志：

```
INFO - 开始为知识库 'twin_pagoda' 生成大纲
INFO - 成功加载大纲生成提示词模板
INFO - 加载实体数据: 150 条
INFO - 加载关系数据: 230 条
INFO - 加载社区数据: 15 条
INFO - 开始调用大模型生成大纲...
INFO - 大模型调用成功
INFO - 成功解析大模型返回的JSON
INFO - 大纲已保存到: .../shared/projects/twin_pagoda/script.json
INFO - 大纲生成成功: 25 个节点
```

## 后续集成

生成的大纲可以：
1. 在前端的ScriptEditor中加载和编辑
2. 用于后续的节点内容生成（RAG）
3. 导出为完整的剧本文件

## 注意事项

1. **图数据质量**：大纲质量取决于图数据的质量，建议先检查实体和关系是否准确
2. **提示词调优**：可根据具体需求修改 `outline_generation.prompt.md`
3. **大模型选择**：qwen-max提供最好的效果，也可以尝试其他模型
4. **节点数量**：提示词中限制了节点数量（20-30个），可根据需要调整
5. **执行时间**：生成过程需要调用大模型，可能需要10-30秒

# 大纲生成功能 - 快速开始

## 5分钟快速上手

### 前提条件检查

在开始之前，确认以下条件已满足：

- [x] 后端服务正在运行（`http://localhost:8000`）
- [x] 已设置环境变量 `DASHSCOPE_API_KEY`
- [x] 已创建知识库并上传文件
- [x] 已为知识库构建知识图谱

### 步骤1: 检查知识图谱是否已构建

```bash
# 检查GraphStore目录是否存在
dir shared\knowledge_bases\GraphStore\{你的知识库名称}

# 应该看到以下文件：
# - entities.csv
# - relationships.csv
```

如果没有这些文件，需要先构建知识图谱：

```bash
# 调用API构建知识图谱
curl -X POST "http://localhost:8000/api/v1/knowledge-base/{知识库名称}/build-graph"
```

### 步骤2: 生成大纲

#### 方法A: 使用测试脚本（推荐用于测试）

```bash
cd backend
python test_outline_generation.py {知识库名称}
```

示例：
```bash
python test_outline_generation.py twin_pagoda
```

#### 方法B: 使用API

```bash
curl -X POST "http://localhost:8000/api/v1/generate/outline" ^
  -H "Content-Type: application/json" ^
  -d "{\"kb_name\": \"twin_pagoda\"}"
```

#### 方法C: 使用Swagger UI

1. 访问 http://localhost:8000/docs
2. 找到 `/api/v1/generate/outline` 端点
3. 点击 "Try it out"
4. 输入知识库名称
5. 点击 "Execute"

### 步骤3: 查看生成结果

生成的大纲保存在：
```
shared/projects/{知识库名称}/script.json
```

用任何文本编辑器打开查看。

## 快速测试命令（Windows）

```cmd
:: 1. 设置API密钥（如果还没设置）
set DASHSCOPE_API_KEY=your_api_key_here

:: 2. 确保后端服务在运行
:: 在另一个终端运行: cd backend && python -m uvicorn app.main:app --reload

:: 3. 运行测试
cd backend
python test_outline_generation.py twin_pagoda

:: 4. 查看结果
type ..\shared\projects\twin_pagoda\script.json
```

## 快速测试命令（Linux/Mac）

```bash
# 1. 设置API密钥（如果还没设置）
export DASHSCOPE_API_KEY=your_api_key_here

# 2. 确保后端服务在运行
# 在另一个终端运行: cd backend && python -m uvicorn app.main:app --reload

# 3. 运行测试
cd backend
python test_outline_generation.py twin_pagoda

# 4. 查看结果
cat ../shared/projects/twin_pagoda/script.json
```

## 预期输出

### 控制台输出示例

```
============================================================
开始测试大纲生成功能
知识库: twin_pagoda
============================================================

✅ 生成结果:
成功: True
消息: 大纲生成成功，共 25 个节点
保存路径: E:/Study/.../shared/projects/twin_pagoda/script.json

生成的大纲结构:
节点数量: 25

前3个节点:

节点 1:
  ID: 1
  名称: 景点简介
  摘要: 双塔寺位于太原市，始建于明代，为文峰塔和舍利塔
  子节点: [2, 7, 15]

节点 2:
  ID: 2
  名称: 建造背景
  摘要: 明万历年间建造，佛教文化传承
  子节点: [3, 4]

节点 3:
  ID: 3
  名称: 历史渊源
  摘要: 佛教文化在太原的发展历程
  子节点: []

全局上下文:
  景点名称: 双塔寺
  角色列表数量: 0

详细结果已保存到: test_outline_twin_pagoda_result.json
```

### JSON输出示例

```json
{
  "success": true,
  "message": "大纲生成成功，共 25 个节点",
  "outline_path": ".../shared/projects/twin_pagoda/script.json",
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

## 常见问题快速解决

### 问题1: "知识库的图数据不存在"

**解决**:
```bash
# 先构建知识图谱
curl -X POST "http://localhost:8000/api/v1/knowledge-base/twin_pagoda/build-graph"

# 等待构建完成后再生成大纲
```

### 问题2: "DASHSCOPE_API_KEY未设置"

**解决**:
```bash
# Windows
set DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxx

# Linux/Mac
export DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxx
```

### 问题3: "实体文件不存在"

**检查文件**:
```bash
dir shared\knowledge_bases\GraphStore\twin_pagoda\
```

**如果文件缺失，重新构建**:
```bash
curl -X POST "http://localhost:8000/api/v1/knowledge-base/twin_pagoda/build-graph"
```

### 问题4: 生成时间过长

这是正常的！大纲生成需要：
- 读取和处理图数据：1-3秒
- 调用大模型生成：10-25秒
- 解析和保存：1-2秒

**总计约15-30秒**

请耐心等待，不要重复点击。

## 下一步

生成大纲后，你可以：

1. **在前端编辑器中查看**
   - 启动前端：`cd frontend && npm run dev`
   - 访问 http://localhost:5173
   - 在ScriptEditor中选择对应的知识库

2. **继续生成节点内容**
   - 使用RAG生成每个节点的详细内容

3. **导出完整剧本**
   - 导出为JSON文件
   - 导出为完整包（含图片）

## 完整工作流示例

```bash
# 1. 上传文件并构建知识库
curl -X POST "http://localhost:8000/api/v1/knowledge-base/build" \
  -H "Content-Type: application/json" \
  -d '{"name": "my_kb", "categories": ["category1"]}'

# 2. 构建知识图谱
curl -X POST "http://localhost:8000/api/v1/knowledge-base/my_kb/build-graph"

# 3. 等待图谱构建完成（查看进度）
curl "http://localhost:8000/api/v1/knowledge-base/my_kb/graph-status/{task_id}"

# 4. 生成大纲
curl -X POST "http://localhost:8000/api/v1/generate/outline" \
  -H "Content-Type: application/json" \
  -d '{"kb_name": "my_kb"}'

# 5. 查看结果
cat shared/projects/my_kb/script.json
```

## 需要帮助？

查看详细文档：
- [OUTLINE_GENERATION.md](./OUTLINE_GENERATION.md) - 完整功能说明
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - 实现总结
- [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) - 前端集成指南

或查看后端日志以获取更多调试信息。

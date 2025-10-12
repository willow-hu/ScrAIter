# GraphRAG功能说明

## 概述

本项目已完全集成GraphRAG功能，支持使用大语言模型（LLM）或基于规则的方法进行知识图谱构建。所有依赖的外部`graph_builder`包功能已重新实现为内置模块。

## 核心功能

### 1. 实体和关系提取
- **LLM方法**: 使用DashScope（阿里云通义千问）或OpenAI进行智能提取
- **规则方法**: 基于正则表达式模式的提取（作为备选方案）
- **混合模式**: 优先使用LLM，失败时自动回退到规则方法

### 2. 社区检测
- **Louvain算法**: 默认社区检测算法
- **Leiden算法**: 更高质量的社区检测（需要安装额外依赖）
- **标签传播**: 适用于大型图的快速算法
- **简单连通组件**: 作为备选的基础算法

### 3. 图数据存储
- **存储路径**: `shared/knowledge_bases/VectorStore/{kb_name}/graph_store/`
- **文件格式**: CSV格式存储实体、关系和社区数据
- **元数据**: JSON格式存储构建统计和配置信息

## 新增文件结构

```
backend/app/
├── core/
│   └── llm_client.py              # LLM客户端（DashScope、OpenAI、Mock）
├── prompts/
│   └── graph_extraction.py       # 图提取的系统prompt模板
├── services/
│   ├── llm_graph_extractor.py    # 基于LLM的图提取器
│   ├── community_detector.py     # 社区检测器
│   ├── graph_extractor_integration.py  # 图提取集成器（已更新）
│   ├── community_detector_integration.py  # 社区检测集成器（已更新）
│   └── graph_service.py          # 图服务主类（已更新）
```

## 配置说明

### 环境变量配置

在环境变量或`.env`文件中设置以下配置以启用LLM功能：

```bash
# 启用LLM图提取
GRAPHRAG_USE_LLM=true

# LLM提供商（dashscope、openai、mock）
GRAPHRAG_LLM_PROVIDER=dashscope

# 模型名称
GRAPHRAG_LLM_MODEL=qwen-turbo

# API密钥
GRAPHRAG_LLM_API_KEY=your_dashscope_api_key

# 其他LLM参数
GRAPHRAG_LLM_MAX_TOKENS=4000
GRAPHRAG_LLM_TEMPERATURE=0.0

# OpenAI专用（如果使用OpenAI）
GRAPHRAG_LLM_BASE_URL=https://api.openai.com/v1
```

### 代码配置

也可以在代码中直接配置：

```python
from app.services.graph_service import GraphService

# 使用LLM配置创建GraphService
llm_config = {
    "provider": "dashscope",
    "model": "qwen-turbo", 
    "api_key": "your_api_key",
    "max_tokens": 4000,
    "temperature": 0.0
}

graph_service = GraphService(llm_config=llm_config)
```

## 依赖包安装

### 基础依赖（必需）
```bash
pip install pandas networkx hashlib
```

### LLM依赖（可选）
```bash
# DashScope支持
pip install dashscope

# OpenAI支持  
pip install openai
```

### 高级社区检测依赖（可选）
```bash
# Leiden算法支持
pip install leidenalg python-igraph

# Louvain算法支持
pip install python-louvain
```

## 使用方式

### 1. 自动集成
GraphRAG功能已自动集成到知识库构建流程中。在知识库构建时会自动：
1. 提取文档中的实体和关系
2. 进行社区检测
3. 存储图数据到指定路径

### 2. API调用
可通过以下API端点查询图数据：

```
GET /api/v1/graph/{kb_name}/entities      # 获取实体列表
GET /api/v1/graph/{kb_name}/relationships # 获取关系列表  
GET /api/v1/graph/{kb_name}/communities   # 获取社区列表
GET /api/v1/graph/{kb_name}/statistics    # 获取图统计信息
```

### 3. 直接调用服务
```python
from app.services.graph_service import graph_service
import pandas as pd

# 准备文本单元数据
text_units = pd.DataFrame({
    'id': ['unit_1', 'unit_2'],
    'text': ['文本内容1', '文本内容2']
})

# 构建图索引
result = graph_service.build_graph_index(
    kb_name='test_kb',
    text_units=text_units,
    task_id='task_123'
)
```

## 实体提取Prompt模板

系统使用精心设计的中文prompt模板进行实体和关系提取，支持：
- 多种实体类型：组织、人物、地理位置、事件等
- 关系强度评分
- 结构化输出格式
- 多轮提取优化

## 错误处理

系统具有完善的错误处理机制：
1. **LLM失败**: 自动回退到规则方法
2. **依赖缺失**: 使用可用的算法替代
3. **数据异常**: 返回空结果而不是崩溃
4. **网络问题**: 重试机制和超时处理

## 性能优化

- **批处理**: 支持大批量文本单元处理
- **缓存**: LLM响应可选缓存机制
- **并行**: 支持多线程处理大型数据集
- **内存优化**: 流式处理避免内存溢出

## 监控和日志

所有操作都有详细的日志记录，包括：
- 提取进度和统计
- 错误信息和堆栈跟踪
- 性能指标（处理时间、成功率）
- 配置信息和参数

## 扩展性

系统设计具有良好的扩展性：
- **新LLM提供商**: 继承`BaseLLMClient`添加新的LLM支持
- **新提取算法**: 实现图提取器接口
- **新社区算法**: 扩展`CommunityDetector`类
- **自定义prompt**: 修改`graph_extraction.py`中的模板

通过以上实现，GraphRAG功能已完全独立于外部`graph_builder`包，可在生产环境中稳定运行。
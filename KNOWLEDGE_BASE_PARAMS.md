# 知识库构建参数系统

## 概述
我们在项目中实现了完整的知识库构建参数传递系统，从前端到后端支持多种构建配置。

## 参数结构

### 1. 文本处理参数
- `chunk_size`: 文本分块大小 (默认: 800, 适合博物馆文档)
- `chunk_overlap`: 分块重叠大小 (默认: 150)
- `chunking_method`: 分块方法 ("recursive", "sentence", "paragraph")

### 2. 嵌入参数
- `embedding_model`: 嵌入模型 ("dashscope", "local")
- `vector_dimension`: 向量维度 (null表示自动推断)

### 3. 索引参数
- `index_type`: 索引类型 ("faiss")
- `similarity_metric`: 相似度算法 ("cosine", "euclidean", "dot_product")

### 4. 元数据
- `description`: 知识库描述
- `tags`: 标签列表

### 5. 性能参数
- `batch_size`: 批处理大小 (默认: 32)
- `max_workers`: 最大工作线程数 (默认: 4)

## 代码架构

### 后端
1. **数据模型** (`app/models/file_models.py`)
   - `BuildKnowledgeBaseRequest`: 包含所有构建参数的请求模型

2. **API层** (`app/api/v1/knowledge_base.py`)
   - 接收并验证参数
   - 传递给服务层

3. **服务层** (`app/services/knowledge_base_service.py`)
   - 处理构建逻辑
   - 保存构建配置到元数据

### 前端
1. **配置文件** (`src/config/knowledgeBaseConfig.js`)
   - 预设配置: 小规模、中等规模、大规模
   - 博物馆特定配置 (MUSEUM_CONFIG)
   - 配置展平工具函数

2. **组件** (`src/components/archive_manager/KnowledgeBaseBuilder.jsx`)
   - 使用配置文件
   - 显示当前配置信息
   - 在知识库列表中显示构建配置

## 使用方式

### 开发者调整参数
1. 修改 `frontend/src/config/knowledgeBaseConfig.js` 中的配置
2. 可以选择使用预设配置或自定义配置

### 当前使用的配置
项目当前使用 `MUSEUM_CONFIG`，针对博物馆文档优化：
```javascript
{
  chunk_size: 800,           // 适合文物描述
  chunk_overlap: 150,        // 保持上下文连贯
  embedding_model: "dashscope", // 中文效果好
  similarity_metric: "cosine"   // 语义相似度
}
```

## 参数传递流程
1. 前端从配置文件获取参数
2. 通过API传递给后端
3. 后端验证参数
4. 服务层使用参数构建知识库
5. 配置信息保存到元数据
6. 前端显示配置信息

## 扩展说明
- 要添加新参数，需要同时修改前端配置和后端模型
- 构建配置会保存在知识库元数据中，可用于审计和重现
- 支持不同规模文档集合的预设配置

## 测试
- 后端测试脚本: `backend/test_kb_params.py`
- 前端会在构建时显示当前配置
- 知识库列表会显示每个知识库的构建配置

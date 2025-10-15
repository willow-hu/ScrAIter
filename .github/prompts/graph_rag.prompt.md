在'backend/graph_builder/'目录下实现了GraphRAG的索引阶段的部分功能（实体抽取、关系抽取、层次划分），具体可以参考Readme文件（backend\graph_builder\README.md）。

现在要求你把这几个功能加入本项目的后端。这一步是将GraphRAG整体集成到后端的一部分。整个计划是集成两大步骤——索引阶段和生成对话阶段。这一步的目标是完成索引阶段的功能集成。要求三个步骤都要有接口和输入输出流，系统前端可以分别调用并输出结果。

1. 实体和关系抽取
现有系统中已经实现了RAG功能，包括知识库构建、向量存储等功能。这些功能可以复用于GraphRAG，不需要额外再实现一遍。我计划在“知识库构建”功能中加入实体和关系识别，当用户点击“构建知识库”时，除了向量库的构建之外，还生成实体和关系的文件。这一步不需要用户选择，而是系统默认开启。

2. 层次（社区）划分
先follow GraphRAG的实现。

请注意，在本项目中不计划区分传统RAG和GraphRAG，因此实现时不要将两个部分分开，而是尽量融合在一起。

请先计划如何实现，列出步骤。仅考虑上述要求中的功能，本次生成不需修改代码。

---

# GraphRAG索引阶段功能集成计划

## 总体集成策略

### 核心原则
1. **融合而非分离**: 不区分传统RAG和GraphRAG，在现有知识库构建流程中无缝集成
2. **渐进式集成**: 保持现有RAG功能完全可用，GraphRAG作为增强功能
3. **用户透明**: 用户无需选择RAG类型，系统自动同时构建两种索引
4. **API一致性**: 保持现有API接口不变，扩展返回数据结构

## 具体实现步骤

### 第一步：后端核心服务扩展

#### 1.1 集成GraphRAG核心模块
- **位置**: `backend/app/services/graph_service.py` (新建)
- **功能**: 封装graph_builder的核心功能，提供统一的图索引构建接口
- **职责**: 
  - 文本块实体关系提取
  - 社区检测和层次划分
  - 图数据存储和管理

#### 1.2 扩展知识库服务
- **位置**: knowledge_base_service.py (修改)
- **增强功能**:
  - 在现有向量索引构建后，自动触发图索引构建
  - 统一管理向量存储和图存储
  - 提供图数据的查询接口

#### 1.3 数据模型扩展
- **位置**: `backend/app/models/graph_models.py` (新建)
- **新增模型**:
  - GraphEntity: 实体数据结构
  - GraphRelationship: 关系数据结构  
  - GraphCommunity: 社区数据结构
  - GraphBuildStatus: 图构建状态

### 第二步：API接口设计

#### 2.1 扩展现有知识库构建API
- **接口**: `POST /api/v1/knowledge-base/build`
- **增强功能**: 在原有向量库构建基础上，增加图索引构建
- **返回数据**: 包含图构建进度和统计信息

#### 2.2 新增图数据查询API
- **接口**: `GET /api/v1/knowledge-base/{kb_name}/graph/entities`
- **功能**: 查询知识库中的实体列表
- **参数**: 支持分页、筛选、搜索

- **接口**: `GET /api/v1/knowledge-base/{kb_name}/graph/relationships`  
- **功能**: 查询实体关系列表
- **参数**: 支持实体筛选、关系类型筛选

- **接口**: `GET /api/v1/knowledge-base/{kb_name}/graph/communities`
- **功能**: 查询社区层次结构
- **参数**: 支持层级筛选

#### 2.3 图构建进度API
- **接口**: `GET /api/v1/knowledge-base/build-status/{task_id}`
- **增强功能**: 返回图构建的当前步骤
- **进度阶段**:
  1. 文档预处理
  2. 向量索引构建
  3. 实体关系提取
  4. 社区检测

### 第三步：存储结构设计

#### 3.1 图数据存储路径
```
shared/knowledge_bases/VectorStore/{kb_name}/
├── vector_store/          # 现有向量存储
├── graph_store/           # 新增图存储
│   ├── entities.csv       # 实体数据
│   ├── relationships.csv  # 关系数据
│   ├── communities.csv    # 社区数据
│   └── graph_metadata.json # 图构建元数据
```

#### 3.2 数据格式标准化
- **实体格式**: 兼容GraphRAG标准，包含ID、名称、类型、描述、文本单元引用
- **关系格式**: 包含源实体、目标实体、关系描述、权重、置信度
- **社区格式**: 包含社区ID、层级、成员实体、父子关系

---

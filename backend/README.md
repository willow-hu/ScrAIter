# AI Script Co-creator - 知识库与文件管理API

这是AI剧本协作创作工具的后端API服务，主要负责文件管理和知识库构建功能。

## 项目结构

```
backend/
├── app/                    # 主应用代码
│   ├── api/               # API路由
│   │   └── v1/           
│   │       ├── files.py           # 文件管理API
│   │       ├── knowledge_base.py  # 知识库管理API
│   │       ├── rag.py             # RAG生成API
│   │       └── api.py            # 路由汇总
│   ├── core/              # 核心配置
│   │   └── config.py      # 应用配置
│   ├── models/            # 数据模型
│   │   ├── file_models.py # 文件相关模型
│   │   └── rag_models.py  # RAG相关模型
│   ├── services/          # 业务逻辑
│   │   ├── file_service.py        # 文件服务
│   │   ├── knowledge_base_service.py # 知识库服务
│   │   └── rag_service.py         # RAG生成服务
│   └── main.py           # 应用入口
├── qwen-local-rag/       # 原有RAG项目（备份）
├── requirements.txt      # 依赖列表
├── start_api.bat        # 启动脚本
└── test_api.py          # API测试脚本
```

## API接口

### 文件管理

1. **GET /api/v1/files** - 获取文件列表
2. **POST /api/v1/files/upload** - 上传文件
3. **DELETE /api/v1/files/{filename}** - 删除文件

### 知识库管理

4. **GET /api/v1/knowledge-base/status** - 获取知识库状态
5. **POST /api/v1/knowledge-base/build** - 构建知识库
6. **GET /api/v1/knowledge-base/build-status/{task_id}** - 获取构建进度

### RAG生成

7. **POST /api/v1/generate/structure** - 生成剧本结构
8. **POST /api/v1/generate/node-content** - 生成节点内容
9. **GET /api/v1/generate/history** - 获取生成历史
10. **GET /api/v1/rag/sources/{generation_id}** - 获取RAG检索片段

## 安装和运行

### 1. 安装依赖
```bash
cd backend
pip install -r requirements.txt
```

### 2. 启动服务

#### 方式一：使用批处理文件
```bash
start_api.bat
```

#### 方式二：直接运行
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. 访问API文档
启动后访问：http://localhost:8000/docs

## 配置说明

- **端口**: 8000
- **文件上传限制**: 50MB
- **支持格式**: .pdf, .docx, .txt, .xlsx, .csv
- **CORS**: 已配置支持前端开发服务器 (localhost:5173)

## 文件存储

- **上传文件**: `../shared/uploads/File/`
  - 非结构化文件: `Unstructured/{category}/`
  - 结构化文件: `Structured/{category}/`
- **知识库**: `../shared/knowledge_bases/`
- **配置文件**: `../shared/configs/`

## 环境变量

在使用RAG功能前，需要设置以下环境变量：

```bash
# 设置DashScope API Key（用于大模型调用）
set DASHSCOPE_API_KEY=your_api_key_here
```

## 测试API

提供了测试脚本来验证API功能：

```bash
# 确保后端服务正在运行后，运行测试
python test_api.py
```

## 开发说明

### RAG功能实现

- 集成了原有`qwen-local-rag`项目的核心功能
- 支持知识库检索和内容生成
- 使用DashScope API进行大模型调用
- 支持结构化和非结构化文件处理

当前实现了基础的文件管理、知识库管理和RAG生成功能。知识库构建功能目前是模拟实现，后续需要进一步集成原有的具体逻辑。

## 待完成功能

- [ ] 完善知识库构建的实际逻辑集成
- [ ] 添加更多的提示词模板支持
- [ ] 添加项目配置管理
- [ ] 完善错误处理和日志记录
- [ ] 添加用户认证和权限管理

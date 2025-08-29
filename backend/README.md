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
│   │       └── api.py            # 路由汇总
│   ├── core/              # 核心配置
│   │   └── config.py      # 应用配置
│   ├── models/            # 数据模型
│   │   └── file_models.py # 文件相关模型
│   ├── services/          # 业务逻辑
│   │   ├── file_service.py        # 文件服务
│   │   └── knowledge_base_service.py # 知识库服务
│   └── main.py           # 应用入口
├── qwen-local-rag/       # 原有RAG项目（备份）
├── requirements.txt      # 依赖列表
└── start_api.bat        # 启动脚本
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

## 开发说明

当前实现了基础的文件管理和知识库状态查询功能。知识库构建功能目前是模拟实现，后续需要集成原有的`qwen-local-rag`项目中的具体逻辑。

## 待完成功能

- [ ] 集成实际的知识库构建逻辑（从qwen-local-rag/create_kb.py）
- [ ] 添加RAG对话功能
- [ ] 添加内容生成功能
- [ ] 添加项目配置管理
- [ ] 完善错误处理和日志记录

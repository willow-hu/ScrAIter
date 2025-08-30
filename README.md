# AI Script Co-creator

一个基于AI的交互式剧本创作工具，支持树结构编辑和RAG内容生成。

## 快速启动

### 方式一：使用批处理文件（推荐）

1. **首次运行**：双击 `setup.bat` 安装依赖
2. **启动项目**：双击 `start.bat` 启动服务
3. **停止服务**：双击 `stop.bat` 停止所有服务

### 方式二：手动启动

#### 安装依赖

后端依赖：
```bash
cd backend
pip install -r requirements.txt
```

前端依赖：
```bash
cd frontend
npm install
```

#### 启动服务

启动后端：
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

启动前端：
```bash
cd frontend
npm run dev
```

## 访问地址

- 前端应用：http://localhost:5173
- 后端API：http://localhost:8000
- API文档：http://localhost:8000/docs

## 功能模块

1. **结构生成**：基于AI生成剧本树结构
2. **结构编辑**：可视化编辑树结构节点
3. **内容生成**：基于RAG技术生成节点内容
4. **内容校对**：审查和优化生成内容

## 环境要求

- Python 3.8+
- Node.js 16+
- npm 8+

## 项目结构

```
├── backend/           # FastAPI后端
├── frontend/          # React前端
├── shared/           # 共享资源（上传文件、知识库等）
├── start.bat         # 启动脚本
├── stop.bat          # 停止脚本
├── setup.bat         # 环境设置脚本
└── start-simple.bat  # 简化启动脚本
```
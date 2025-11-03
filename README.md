# ScrAIter - AI Script Co-creator

面向文化遗产负责人的AI辅助剧本创作工具。

## 项目简介

ScrAIter是一个智能剧本创作辅助系统，结合了知识图谱和检索增强生成（RAG）技术，帮助编剧进行剧本创作。系统支持文件上传、知识库构建和智能内容生成等功能。

## 环境要求

- Python 3.10+
- Node.js 16+
- npm

## 配置环境

### 1. 克隆项目

```bash
git clone https://github.com/willow-hu/ScrAIter.git
cd ScrAIter
```

### 2. 后端设置

```bash
# 创建conda环境
conda create -n scraiter python=3.10
conda activate scraiter

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
# 本项目使用通义千问（Qwen）API，在环境变量中设置密钥
export DASHSCOPE_API_KEY="your-api-key-here"
```

### 3. 前端设置

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install
```

### 4. 启动应用

```bash
# 启动后端服务
sh scripts/backend.sh
# 在新命令行窗口启动前端服务
sh scripts/frontend.sh
```

打开浏览器访问 http://localhost:5173

## 使用说明

请阅读详细[使用说明文档](./GUIDEBOOK.md)
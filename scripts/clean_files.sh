#!/bin/bash

# 清理系统使用记录，重置为未使用状态

# 1. 删除用户上传的资料文件，包括类目（子目录）
rm -rf shared/uploads/File/Structured/*
rm -rf shared/uploads/File/Unstructured/*

# 2. 删除所有中间文件
rm -rf backend/app/__pycache__
rm -rf backend/app/api/__pycache__
rm -rf backend/app/api/v1/__pycache__
rm -rf backend/app/core/__pycache__
rm -rf backend/app/models/__pycache__
rm -rf backend/app/services/__pycache__

# 3. 删除构建的知识库
rm -rf shared/knowledge_bases/VectorStore/*

# 4. 重置相关的metadata文件
echo '{"files": {}, "last_updated": ""}' > shared/uploads/metadata.json
echo '{"knowledge_bases": {}, "last_updated": ""}' > shared/knowledge_bases/kb_metadata.json

# 5. 删除项目文件
rm -rf shared/projects/*

# 6. 删除配置文件
rm -rf shared/configs/*
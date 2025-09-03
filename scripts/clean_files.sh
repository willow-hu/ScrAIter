#!/bin/bash

# 清理用户上传的资料文件
rm -r shared/uploads/File/Unstructured/*
rm -r shared/uploads/File/Structured/*

# 清理所有中间文件
rm -r shared/projects/*

# 清理构建的知识库
rm -r shared/knowledge_bases/VectorStore/*
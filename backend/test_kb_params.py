#!/usr/bin/env python3
"""
测试知识库构建参数传递
"""
import json
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models.file_models import BuildKnowledgeBaseRequest

def test_build_request():
    """测试构建请求参数"""
    test_data = {
        "name": "test_kb",
        "categories": ["test_category"],
        "file_type": "mixed",
        "chunk_size": 800,
        "chunk_overlap": 150,
        "chunking_method": "recursive",
        "embedding_model": "dashscope",
        "vector_dimension": None,
        "index_type": "faiss",
        "similarity_metric": "cosine",
        "description": "博物馆文物知识库",
        "tags": ["museum", "artifacts"],
        "batch_size": 32,
        "max_workers": 4
    }
    
    try:
        request = BuildKnowledgeBaseRequest(**test_data)
        print("✅ 参数验证成功")
        print(f"配置: {request.dict()}")
        return True
    except Exception as e:
        print(f"❌ 参数验证失败: {e}")
        return False

if __name__ == "__main__":
    print("测试知识库构建参数...")
    test_build_request()

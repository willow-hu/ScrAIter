"""
应用配置
"""
import os
from typing import List

class Settings:
    PROJECT_NAME: str = "AI Script Co-creator"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS设置
    ALLOWED_HOSTS: List[str] = [
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"  # 开发环境允许所有来源
    ]
    
    # 文件路径设置
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    SHARED_DIR = os.path.join(os.path.dirname(BASE_DIR), "shared")
    UPLOADS_DIR = os.path.join(SHARED_DIR, "uploads")
    KNOWLEDGE_BASES_DIR = os.path.join(SHARED_DIR, "knowledge_bases")
    CONFIGS_DIR = os.path.join(SHARED_DIR, "configs")
    PROJECTS_DIR = os.path.join(SHARED_DIR, "projects")
    
    # 确保目录存在
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    os.makedirs(KNOWLEDGE_BASES_DIR, exist_ok=True)
    os.makedirs(CONFIGS_DIR, exist_ok=True)
    os.makedirs(PROJECTS_DIR, exist_ok=True)
    
    # 文件上传设置
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx", ".txt", ".xlsx", ".csv"]
    
    # 大语言模型
    # RAG内容生成
    RAG_MODEL: str = "qwen-max"
    RAG_TEMPERATURE: float = 0.0
    RAG_MAX_TOKENS: int = 4000
    
    # 图构建
    GRAPH_EXTRACTION_MODEL: str = "qwen-max"
    GRAPH_EXTRACTION_TEMPERATURE: float = 0.0
    GRAPH_EXTRACTION_MAX_TOKENS: int = 4000
    GRAPH_LOOP_DECISION_MAX_TOKENS: int = 10  # 用于判断循环继续的token数
    GRAPH_MAX_GLEANINGS: int = 0  # 图谱提取最大额外收集轮数（0表示禁用

    # 嵌入模型配置
    EMBEDDING_MODEL: str = "text-embedding-v2"

settings = Settings()

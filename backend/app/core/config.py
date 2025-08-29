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
    ALLOWED_HOSTS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    # 文件路径设置
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    SHARED_DIR = os.path.join(os.path.dirname(BASE_DIR), "shared")
    UPLOADS_DIR = os.path.join(SHARED_DIR, "uploads")
    KNOWLEDGE_BASES_DIR = os.path.join(SHARED_DIR, "knowledge_bases")
    CONFIGS_DIR = os.path.join(SHARED_DIR, "configs")
    
    # 确保目录存在
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    os.makedirs(KNOWLEDGE_BASES_DIR, exist_ok=True)
    os.makedirs(CONFIGS_DIR, exist_ok=True)
    
    # 文件上传设置
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx", ".txt", ".xlsx", ".csv"]

settings = Settings()

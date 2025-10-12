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
    
    # GraphRAG LLM配置
    GRAPHRAG_USE_LLM: bool = os.getenv("GRAPHRAG_USE_LLM", "false").lower() == "true"
    GRAPHRAG_LLM_PROVIDER: str = os.getenv("GRAPHRAG_LLM_PROVIDER", "dashscope")
    GRAPHRAG_LLM_MODEL: str = os.getenv("GRAPHRAG_LLM_MODEL", "qwen-turbo")
    GRAPHRAG_LLM_API_KEY: str = os.getenv("GRAPHRAG_LLM_API_KEY", "")
    GRAPHRAG_LLM_BASE_URL: str = os.getenv("GRAPHRAG_LLM_BASE_URL", "")
    GRAPHRAG_LLM_MAX_TOKENS: int = int(os.getenv("GRAPHRAG_LLM_MAX_TOKENS", "4000"))
    GRAPHRAG_LLM_TEMPERATURE: float = float(os.getenv("GRAPHRAG_LLM_TEMPERATURE", "0.0"))
    
    @property
    def graphrag_llm_config(self) -> dict | None:
        """获取GraphRAG LLM配置"""
        if not self.GRAPHRAG_USE_LLM or not self.GRAPHRAG_LLM_API_KEY:
            return None
        
        return {
            "provider": self.GRAPHRAG_LLM_PROVIDER,
            "model": self.GRAPHRAG_LLM_MODEL,
            "api_key": self.GRAPHRAG_LLM_API_KEY,
            "base_url": self.GRAPHRAG_LLM_BASE_URL if self.GRAPHRAG_LLM_BASE_URL else None,
            "max_tokens": self.GRAPHRAG_LLM_MAX_TOKENS,
            "temperature": self.GRAPHRAG_LLM_TEMPERATURE
        }

settings = Settings()

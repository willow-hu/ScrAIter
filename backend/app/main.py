"""
FastAPI应用主入口
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging_config import setup_logging

# 初始化日志系统
setup_logging(settings.BASE_DIR, level="INFO")
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI Script Co-creator Backend API"
)

logger.info(f"启动 {settings.PROJECT_NAME} v{settings.VERSION}")

# 设置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("CORS中间件配置完成")

# 包含API路由
app.include_router(api_router, prefix=settings.API_V1_STR)

logger.info(f"API路由已加载: {settings.API_V1_STR}")

@app.get("/")
async def root():
    logger.debug("根路径访问")
    return {"message": "AI Script Co-creator Backend API", "version": settings.VERSION}

if __name__ == "__main__":
    import uvicorn
    logger.info("使用uvicorn启动应用在 0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)

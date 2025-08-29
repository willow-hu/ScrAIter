"""
API路由汇总
"""
from fastapi import APIRouter

from app.api.v1 import files, knowledge_base

api_router = APIRouter()

# 包含各个模块的路由
api_router.include_router(files.router, tags=["files"])
api_router.include_router(knowledge_base.router, tags=["knowledge-base"])

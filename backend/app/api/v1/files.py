"""
文件管理API端点
"""
import json
import os
import logging
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import JSONResponse

from app.models.file_models import (
    FileListResponse, UploadResponse, DeleteResponse, UpdateTagRequest, 
    UpdateTagResponse, CategoryListResponse
)
from app.services.file_service import file_service
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/source-tags")
async def get_source_tags():
    """
    获取来源标签配置
    """
    try:
        logger.debug("获取来源标签配置")
        config_path = os.path.join(settings.SHARED_DIR, "configs", "source_tags.json")
        
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                return config
        else:
            # 返回默认配置
            return {
                "tags": [
                    {"value": "literature", "label": "文献资料", "color": "blue"},
                    {"value": "encyclopedia", "label": "百科知识", "color": "green"},
                    {"value": "blog", "label": "网络文章", "color": "orange"},
                    {"value": "news", "label": "新闻报道", "color": "purple"},
                    {"value": "official", "label": "官方资料", "color": "red"},
                    {"value": "other", "label": "其他来源", "color": "default"}
                ]
            }
    except Exception as e:
        logger.error(f"获取标签配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取标签配置失败: {str(e)}")

@router.get("/files", response_model=FileListResponse)
async def get_files():
    """
    获取文件列表
    返回：文件名、大小、上传时间、处理状态、标签等
    """
    try:
        logger.info("获取文件列表")
        return file_service.get_file_list()
    except Exception as e:
        logger.error(f"获取文件列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取文件列表失败: {str(e)}")

@router.get("/categories", response_model=CategoryListResponse)
async def get_categories():
    """
    获取所有类目列表
    """
    try:
        return file_service.get_categories()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取类目列表失败: {str(e)}")

@router.post("/files/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    category: str = Form(..., description="文件分类名称"),
    file_type: str = Form(default="unstructured", description="文件类型: structured 或 unstructured")
):
    """
    上传文件
    支持：单个/批量文件上传，指定类目
    """
    try:
        if not files:
            raise HTTPException(status_code=400, detail="没有上传文件")
        
        if not category:
            raise HTTPException(status_code=400, detail="请提供文件分类名称")
        
        if file_type not in ["structured", "unstructured"]:
            raise HTTPException(status_code=400, detail="文件类型必须是 'structured' 或 'unstructured'")
        
        result = await file_service.upload_files(files, category, file_type)
        
        # 如果有失败的文件，返回部分成功状态
        if result["failed_files"]:
            return JSONResponse(
                status_code=207,  # Multi-Status
                content=result
            )
        
        return JSONResponse(
            status_code=200,
            content=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传文件失败: {str(e)}")

@router.put("/files/{filename:path}/tags", response_model=UpdateTagResponse)
async def update_file_tag(filename: str, request: UpdateTagRequest):
    """
    更新文件标签
    filename格式: category/filename
    """
    try:
        if not filename:
            raise HTTPException(status_code=400, detail="文件名不能为空")
        
        result = file_service.update_file_tag(filename, request.source_tag)
        
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result["message"])
        
        return UpdateTagResponse(
            message=result["message"],
            success=result["success"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新标签失败: {str(e)}")

@router.delete("/files/{filename:path}")
async def delete_file(filename: str):
    """
    删除文件
    filename格式: category/filename
    """
    try:
        if not filename:
            raise HTTPException(status_code=400, detail="文件名不能为空")
        
        result = file_service.delete_file(filename)
        
        if not result["success"]:
            raise HTTPException(status_code=404, detail=result["message"])
        
        return JSONResponse(
            status_code=200,
            content=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除文件失败: {str(e)}")

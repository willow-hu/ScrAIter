"""
导出API端点
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os

from app.models.export_models import ExportRequest, ExportResponse
from app.services.export_service import export_service

router = APIRouter()

@router.post("/projects/{kb_name}/export", response_model=ExportResponse)
async def export_project(kb_name: str, request: ExportRequest):
    """
    导出项目
    """
    try:
        if not kb_name or not kb_name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        result = export_service.create_export_package(
            kb_name=kb_name.strip(),
            export_format=request.format,
            include_images=request.include_images
        )
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")

@router.get("/projects/{kb_name}/download")
async def download_export_file(kb_name: str, file_path: str):
    """
    下载导出文件
    """
    try:
        if not kb_name or not kb_name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 安全检查：确保文件路径是合法的
        if not os.path.abspath(file_path).startswith(os.path.abspath("/tmp")):
            raise HTTPException(status_code=403, detail="文件路径不合法")
        
        filename = os.path.basename(file_path)
        
        return FileResponse(
            file_path,
            media_type='application/octet-stream',
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"下载失败: {str(e)}")

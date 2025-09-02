"""
项目管理API端点
处理剧本项目的文件管理
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services.script_file_service import script_file_service

router = APIRouter()

class ProjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    name: str
    has_tree: bool
    has_script: bool
    has_reviewed: bool
    created_time: Optional[str] = None
    last_modified: Optional[str] = None

class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total_count: int

@router.get("/projects", response_model=ProjectListResponse)
async def list_projects():
    """获取所有项目列表"""
    try:
        projects = script_file_service.list_projects()
        return ProjectListResponse(
            projects=[ProjectResponse(**project) for project in projects],
            total_count=len(projects)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取项目列表失败: {str(e)}")

@router.post("/projects")
async def create_project(request: ProjectCreateRequest):
    """创建新项目"""
    try:
        if not request.name or not request.name.strip():
            raise HTTPException(status_code=400, detail="项目名称不能为空")
        
        project_name = request.name.strip()
        
        # 检查项目是否已存在
        existing_projects = script_file_service.list_projects()
        if any(p["name"] == project_name for p in existing_projects):
            raise HTTPException(status_code=400, detail=f"项目 '{project_name}' 已存在")
        
        # 创建项目目录
        project_dir = script_file_service.ensure_project_dir(project_name)
        
        return JSONResponse(
            status_code=201,
            content={
                "message": f"项目 '{project_name}' 创建成功",
                "project_dir": project_dir,
                "success": True
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建项目失败: {str(e)}")

@router.get("/projects/{project_name}/tree")
async def get_project_tree(project_name: str):
    """获取项目的树结构文件"""
    try:
        tree_data = script_file_service.load_tree_structure(project_name)
        if not tree_data:
            raise HTTPException(status_code=404, detail=f"项目 '{project_name}' 的树结构文件不存在")
        
        return JSONResponse(
            status_code=200,
            content=tree_data
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取树结构失败: {str(e)}")

@router.post("/projects/{project_name}/tree")
async def save_project_tree(project_name: str, tree_data: dict):
    """保存项目的树结构文件"""
    try:
        success = script_file_service.save_tree_structure(project_name, tree_data)
        if not success:
            raise HTTPException(status_code=500, detail="保存树结构失败")
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"项目 '{project_name}' 的树结构保存成功",
                "success": True
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存树结构失败: {str(e)}")

@router.get("/projects/{project_name}/script")
async def get_project_script(project_name: str):
    """获取项目的脚本文件"""
    try:
        script_data = script_file_service.load_script_content(project_name)
        if not script_data:
            raise HTTPException(status_code=404, detail=f"项目 '{project_name}' 的脚本文件不存在")
        
        return JSONResponse(
            status_code=200,
            content=script_data
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取脚本文件失败: {str(e)}")

@router.post("/projects/{project_name}/script")
async def save_project_script(project_name: str, script_data: dict):
    """保存项目的脚本文件"""
    try:
        success = script_file_service.save_script_content(project_name, script_data)
        if not success:
            raise HTTPException(status_code=500, detail="保存脚本文件失败")
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"项目 '{project_name}' 的脚本文件保存成功",
                "success": True
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存脚本文件失败: {str(e)}")

@router.get("/projects/{project_name}/reviewed-script")
async def get_project_reviewed_script(project_name: str):
    """获取项目的校对后脚本文件"""
    try:
        script_data = script_file_service.load_reviewed_script(project_name)
        if not script_data:
            raise HTTPException(status_code=404, detail=f"项目 '{project_name}' 的校对后脚本文件不存在")
        
        return JSONResponse(
            status_code=200,
            content=script_data
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取校对后脚本文件失败: {str(e)}")

@router.post("/projects/{project_name}/reviewed-script")
async def save_project_reviewed_script(project_name: str, script_data: dict):
    """保存项目的校对后脚本文件"""
    try:
        success = script_file_service.save_reviewed_script(project_name, script_data)
        if not success:
            raise HTTPException(status_code=500, detail="保存校对后脚本文件失败")
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"项目 '{project_name}' 的校对后脚本文件保存成功",
                "success": True
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存校对后脚本文件失败: {str(e)}")

@router.delete("/projects/{project_name}")
async def delete_project(project_name: str):
    """删除项目"""
    try:
        success = script_file_service.delete_project(project_name)
        if not success:
            raise HTTPException(status_code=404, detail=f"项目 '{project_name}' 不存在")
        
        return JSONResponse(
            status_code=200,
            content={
                "message": f"项目 '{project_name}' 删除成功",
                "success": True
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除项目失败: {str(e)}")

@router.post("/migrate-legacy-files")
async def migrate_legacy_files():
    """迁移遗留文件到新的项目结构"""
    try:
        script_file_service.migrate_legacy_files()
        return JSONResponse(
            status_code=200,
            content={
                "message": "遗留文件迁移完成",
                "success": True
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"迁移文件失败: {str(e)}")

"""
导出服务
"""
import os
import json
import zipfile
import tempfile
import shutil
from typing import Set, List, Dict, Any, Optional
from datetime import datetime

from app.core.config import settings
from app.services.script_format_convert import fill_image_paths, convert_to_game_format
from app.services.project_service import project_service
from app.models.export_models import ExportFormat, ExportResponse

class ExportService:
    def __init__(self):
        self.projects_path = settings.PROJECTS_DIR
        self.temp_dir = tempfile.gettempdir()
    
    def create_game_script_file(self, project_id: str, game_script_data: Dict[str, Any]) -> str:
        """
        步骤3：生成game_script.json文件
        
        将转换后的游戏脚本保存到项目目录
        
        Args:
            project_id: 项目ID
            game_script_data: 游戏格式的脚本数据
            
        Returns:
            game_script.json文件的路径
        """
        project_dir = os.path.join(self.projects_path, project_id)
        game_script_path = os.path.join(project_dir, "game_script.json")
        
        with open(game_script_path, 'w', encoding='utf-8') as f:
            json.dump(game_script_data, f, ensure_ascii=False, indent=2)
        
        return game_script_path
    
    def create_export_zip(self, project_id: str, project_name: str) -> str:
        """
        步骤4：创建导出ZIP文件
        
        将game_script.json和assets/目录打包成ZIP
        
        Args:
            project_id: 项目ID
            project_name: 项目名称
            
        Returns:
            ZIP文件路径
        """
        project_dir = os.path.join(self.projects_path, project_id)
        game_script_path = os.path.join(project_dir, "game_script.json")
        assets_dir = os.path.join(project_dir, "assets")
        
        # 创建临时目录用于存放ZIP
        temp_export_dir = tempfile.mkdtemp(prefix=f"export_{project_id}_")
        zip_filename = f"{project_name}_game_resources.zip"
        zip_path = os.path.join(temp_export_dir, zip_filename)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 添加game_script.json
            if os.path.exists(game_script_path):
                zipf.write(game_script_path, "game_script.json")
            
            # 添加assets目录下的所有文件
            if os.path.exists(assets_dir):
                for root, dirs, files in os.walk(assets_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        # 计算相对路径
                        arcname = os.path.relpath(file_path, project_dir)
                        zipf.write(file_path, arcname)
        
        return zip_path
    
    def create_export_package(self, project_id: str, export_format: ExportFormat, include_images: bool = True) -> ExportResponse:
        """创建导出包"""
        try:
            # 获取项目信息
            project_info = project_service.get_project(project_id)
            if not project_info:
                return ExportResponse(
                    success=False,
                    message="项目不存在"
                )
            
            project_name = project_info.get("name", project_id)
            
            # 加载脚本数据
            script_data = project_service.load_script(project_id)
            if not script_data:
                return ExportResponse(
                    success=False,
                    message="脚本文件不存在"
                )
            
            # 步骤1：填写图像资源路径
            try:
                script_with_images = fill_image_paths(script_data, project_info)
            except ValueError as e:
                return ExportResponse(
                    success=False,
                    message=f"填写图像路径失败: {str(e)}"
                )
            
            # 步骤2：转换为游戏格式
            game_script_data = convert_to_game_format(script_with_images)
            
            # 步骤3：生成game_script.json文件
            game_script_path = self.create_game_script_file(project_id, game_script_data)
            
            # 步骤4：创建ZIP压缩包
            zip_path = self.create_export_zip(project_id, project_name)
            
            return ExportResponse(
                success=True,
                message="导出成功",
                download_url=zip_path,
                file_size=os.path.getsize(zip_path)
            )
                
        except Exception as e:
            return ExportResponse(
                success=False,
                message=f"导出失败: {str(e)}"
            )

# 创建全局实例
export_service = ExportService()

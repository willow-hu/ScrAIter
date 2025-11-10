"""
项目管理服务
处理项目的创建、查询、更新、删除等操作
"""
import os
import json
import shutil
import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path

from app.core.config import settings

class ProjectService:
    def __init__(self):
        self.projects_dir = settings.PROJECTS_DIR
        self.metadata_file = os.path.join(self.projects_dir, "projects_metadata.json")
        
        # 确保目录存在
        os.makedirs(self.projects_dir, exist_ok=True)
        
        # 初始化元数据文件
        self._init_metadata()
    
    def _init_metadata(self):
        """初始化项目元数据文件"""
        if not os.path.exists(self.metadata_file):
            metadata = {
                "projects": [],
                "last_updated": datetime.now().isoformat()
            }
            self._save_metadata(metadata)
    
    def _load_metadata(self) -> Dict[str, Any]:
        """加载项目元数据"""
        try:
            with open(self.metadata_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"加载元数据失败: {e}")
            self._init_metadata()
            return self._load_metadata()
    
    def _save_metadata(self, metadata: Dict[str, Any]):
        """保存项目元数据"""
        metadata["last_updated"] = datetime.now().isoformat()
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    def _generate_project_id(self) -> str:
        """生成唯一的项目ID"""
        timestamp = int(time.time() * 1000)
        random_suffix = str(uuid.uuid4())[:8]
        return f"proj_{timestamp}_{random_suffix}"
    
    def _get_project_dir(self, project_id: str) -> str:
        """获取项目目录路径"""
        return os.path.join(self.projects_dir, project_id)
    
    def _ensure_project_dir(self, project_id: str) -> str:
        """确保项目目录存在"""
        project_dir = self._get_project_dir(project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        # 创建assets子目录
        assets_dir = os.path.join(project_dir, "assets")
        os.makedirs(assets_dir, exist_ok=True)
        
        return project_dir
    
    def create_project(self, name: str, kb_id: str, description: str = "") -> Dict[str, Any]:
        """
        创建新项目
        
        Args:
            name: 项目名称
            kb_id: 关联的知识库ID
            description: 项目描述
            
        Returns:
            创建的项目信息
        """
        try:
            # 生成项目ID
            project_id = self._generate_project_id()
            
            # 创建项目目录
            project_dir = self._ensure_project_dir(project_id)
            
            # 创建项目信息
            project_info = {
                "id": project_id,
                "name": name,
                "knowledgeBaseId": kb_id,
                "description": description,
                "createdTime": datetime.now().isoformat(),
                "lastModified": datetime.now().isoformat(),
                "thumbnail": "",
                "version": 1
            }
            
            # 保存项目信息到 project_info.json
            info_file = os.path.join(project_dir, "project_info.json")
            with open(info_file, 'w', encoding='utf-8') as f:
                json.dump(project_info, f, ensure_ascii=False, indent=2)
            
            # 创建空的脚本文件
            script_data = {
                "global_context": {
                    "character_list": [],
                    "site_name": "",
                    "other_requirements": ""
                },
                "structure": []
            }
            script_file = os.path.join(project_dir, "script.json")
            with open(script_file, 'w', encoding='utf-8') as f:
                json.dump(script_data, f, ensure_ascii=False, indent=2)
            
            # 更新元数据
            metadata = self._load_metadata()
            metadata["projects"].append({
                "id": project_id,
                "name": name,
                "knowledgeBaseId": kb_id,
                "createdTime": project_info["createdTime"],
                "lastModified": project_info["lastModified"],
                "thumbnail": "",
                "description": description
            })
            self._save_metadata(metadata)
            
            return project_info
            
        except Exception as e:
            print(f"创建项目失败: {e}")
            raise
    
    def list_projects(self) -> List[Dict[str, Any]]:
        """
        列出所有项目
        
        Returns:
            项目列表
        """
        try:
            metadata = self._load_metadata()
            return metadata.get("projects", [])
        except Exception as e:
            print(f"列出项目失败: {e}")
            return []
    
    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """
        获取项目详情
        
        Args:
            project_id: 项目ID
            
        Returns:
            项目信息，如果不存在则返回None
        """
        try:
            project_dir = self._get_project_dir(project_id)
            info_file = os.path.join(project_dir, "project_info.json")
            
            if not os.path.exists(info_file):
                return None
            
            with open(info_file, 'r', encoding='utf-8') as f:
                return json.load(f)
                
        except Exception as e:
            print(f"获取项目详情失败: {e}")
            return None
    
    def update_project(self, project_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        更新项目信息
        
        Args:
            project_id: 项目ID
            data: 要更新的数据（可包含name, description, thumbnail等）
            
        Returns:
            更新后的项目信息，如果项目不存在则返回None
        """
        try:
            project_info = self.get_project(project_id)
            if not project_info:
                return None
            
            # 更新允许的字段
            updatable_fields = ["name", "description", "thumbnail"]
            for field in updatable_fields:
                if field in data:
                    project_info[field] = data[field]
            
            # 更新修改时间和版本
            project_info["lastModified"] = datetime.now().isoformat()
            project_info["version"] = project_info.get("version", 1) + 1
            
            # 保存到 project_info.json
            project_dir = self._get_project_dir(project_id)
            info_file = os.path.join(project_dir, "project_info.json")
            with open(info_file, 'w', encoding='utf-8') as f:
                json.dump(project_info, f, ensure_ascii=False, indent=2)
            
            # 更新元数据
            metadata = self._load_metadata()
            for i, proj in enumerate(metadata["projects"]):
                if proj["id"] == project_id:
                    metadata["projects"][i].update({
                        "name": project_info["name"],
                        "description": project_info["description"],
                        "thumbnail": project_info["thumbnail"],
                        "lastModified": project_info["lastModified"]
                    })
                    break
            self._save_metadata(metadata)
            
            return project_info
            
        except Exception as e:
            print(f"更新项目失败: {e}")
            return None
    
    def delete_project(self, project_id: str) -> bool:
        """
        删除项目
        
        Args:
            project_id: 项目ID
            
        Returns:
            是否删除成功
        """
        try:
            # 删除项目目录
            project_dir = self._get_project_dir(project_id)
            if os.path.exists(project_dir):
                shutil.rmtree(project_dir)
            
            # 更新元数据
            metadata = self._load_metadata()
            metadata["projects"] = [
                proj for proj in metadata["projects"] 
                if proj["id"] != project_id
            ]
            self._save_metadata(metadata)
            
            return True
            
        except Exception as e:
            print(f"删除项目失败: {e}")
            return False
    
    def duplicate_project(self, project_id: str, new_name: str) -> Optional[Dict[str, Any]]:
        """
        复制项目
        
        Args:
            project_id: 源项目ID
            new_name: 新项目名称
            
        Returns:
            新项目信息，如果源项目不存在则返回None
        """
        try:
            # 获取源项目信息
            source_project = self.get_project(project_id)
            if not source_project:
                return None
            
            # 创建新项目
            new_project_id = self._generate_project_id()
            new_project_dir = self._ensure_project_dir(new_project_id)
            
            # 复制项目信息
            new_project_info = {
                "id": new_project_id,
                "name": new_name,
                "knowledgeBaseId": source_project["knowledgeBaseId"],
                "description": source_project.get("description", ""),
                "createdTime": datetime.now().isoformat(),
                "lastModified": datetime.now().isoformat(),
                "thumbnail": "",
                "version": 1
            }
            
            # 保存新项目信息
            info_file = os.path.join(new_project_dir, "project_info.json")
            with open(info_file, 'w', encoding='utf-8') as f:
                json.dump(new_project_info, f, ensure_ascii=False, indent=2)
            
            # 复制脚本文件
            source_script = self.load_script(project_id)
            if source_script:
                self.save_script(new_project_id, source_script)
            
            # 复制assets目录
            source_assets = os.path.join(self._get_project_dir(project_id), "assets")
            new_assets = os.path.join(new_project_dir, "assets")
            if os.path.exists(source_assets):
                for item in os.listdir(source_assets):
                    source_item = os.path.join(source_assets, item)
                    new_item = os.path.join(new_assets, item)
                    if os.path.isfile(source_item):
                        shutil.copy2(source_item, new_item)
            
            # 更新元数据
            metadata = self._load_metadata()
            metadata["projects"].append({
                "id": new_project_id,
                "name": new_name,
                "knowledgeBaseId": new_project_info["knowledgeBaseId"],
                "createdTime": new_project_info["createdTime"],
                "lastModified": new_project_info["lastModified"],
                "thumbnail": "",
                "description": new_project_info["description"]
            })
            self._save_metadata(metadata)
            
            return new_project_info
            
        except Exception as e:
            print(f"复制项目失败: {e}")
            return None
    
    def load_script(self, project_id: str) -> Optional[Dict[str, Any]]:
        """
        加载项目的脚本内容
        
        Args:
            project_id: 项目ID
            
        Returns:
            脚本内容，如果不存在则返回None
        """
        try:
            project_dir = self._get_project_dir(project_id)
            script_file = os.path.join(project_dir, "script.json")
            
            if not os.path.exists(script_file):
                return None
            
            with open(script_file, 'r', encoding='utf-8') as f:
                return json.load(f)
                
        except Exception as e:
            print(f"加载脚本失败: {e}")
            return None
    
    def save_script(self, project_id: str, data: Dict[str, Any]) -> bool:
        """
        保存项目的脚本内容
        
        Args:
            project_id: 项目ID
            data: 脚本数据
            
        Returns:
            是否保存成功
        """
        try:
            project_dir = self._get_project_dir(project_id)
            script_file = os.path.join(project_dir, "script.json")
            
            with open(script_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            # 更新项目的lastModified时间
            project_info = self.get_project(project_id)
            if project_info:
                project_info["lastModified"] = datetime.now().isoformat()
                project_info["version"] = project_info.get("version", 1) + 1
                
                info_file = os.path.join(project_dir, "project_info.json")
                with open(info_file, 'w', encoding='utf-8') as f:
                    json.dump(project_info, f, ensure_ascii=False, indent=2)
                
                # 更新元数据
                metadata = self._load_metadata()
                for i, proj in enumerate(metadata["projects"]):
                    if proj["id"] == project_id:
                        metadata["projects"][i]["lastModified"] = project_info["lastModified"]
                        break
                self._save_metadata(metadata)
            
            return True
            
        except Exception as e:
            print(f"保存脚本失败: {e}")
            return False
    
    def get_projects_by_kb(self, kb_id: str) -> List[Dict[str, Any]]:
        """
        获取某知识库下的所有项目
        
        Args:
            kb_id: 知识库ID
            
        Returns:
            项目列表
        """
        try:
            metadata = self._load_metadata()
            return [
                proj for proj in metadata.get("projects", [])
                if proj.get("knowledgeBaseId") == kb_id
            ]
        except Exception as e:
            print(f"获取知识库项目失败: {e}")
            return []

# 创建全局实例
project_service = ProjectService()

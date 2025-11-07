"""
剧本文件管理服务
处理整个工作流中的中间文件IO操作
"""
import os
import json
import shutil
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path

from app.core.config import settings

class ScriptFileService:
    def __init__(self):
        self.projects_dir = os.path.join(settings.SHARED_DIR, "projects")
        # 确保项目目录存在
        os.makedirs(self.projects_dir, exist_ok=True)
    
    def get_project_dir(self, project_name: str) -> str:
        """获取项目目录路径"""
        return os.path.join(self.projects_dir, project_name)
    
    def ensure_project_dir(self, project_name: str) -> str:
        """确保项目目录存在，返回目录路径"""
        project_dir = self.get_project_dir(project_name)
        os.makedirs(project_dir, exist_ok=True)
        return project_dir
    
    def get_tree_file_path(self, project_name: str) -> str:
        """获取树结构文件路径（步骤2-3使用）"""
        project_dir = self.get_project_dir(project_name)
        return os.path.join(project_dir, "tree.json")
    
    def get_script_file_path(self, project_name: str) -> str:
        """获取脚本文件路径（步骤4使用）"""
        project_dir = self.get_project_dir(project_name)
        return os.path.join(project_dir, "script.json")
    
    def get_reviewed_script_file_path(self, project_name: str) -> str:
        """获取校对后脚本文件路径（步骤5使用）"""
        project_dir = self.get_project_dir(project_name)
        return os.path.join(project_dir, "reviewed_script.json")
    
    def save_tree_structure(self, project_name: str, tree_data: Dict[str, Any]) -> bool:
        """保存树结构数据（步骤2-3）"""
        try:
            self.ensure_project_dir(project_name)
            file_path = self.get_tree_file_path(project_name)
            
            # 添加元数据
            output_data = {
                "metadata": {
                    "project_name": project_name,
                    "created_time": datetime.now().isoformat(),
                    "last_modified": datetime.now().isoformat(),
                    "step": "structure_editing",
                    "version": "1.0"
                },
                **tree_data
            }
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception as e:
            print(f"保存树结构失败: {e}")
            return False
    
    def load_tree_structure(self, project_name: str) -> Optional[Dict[str, Any]]:
        """加载树结构数据（步骤3-4使用）"""
        try:
            file_path = self.get_tree_file_path(project_name)
            if not os.path.exists(file_path):
                return None
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 更新最后修改时间
            if "metadata" in data:
                data["metadata"]["last_accessed"] = datetime.now().isoformat()
            
            return data
        except Exception as e:
            print(f"加载树结构失败: {e}")
            return None
    
    def save_script_content(self, project_name: str, script_data: Dict[str, Any]) -> bool:
        """保存脚本内容（步骤4）"""
        try:
            self.ensure_project_dir(project_name)
            file_path = self.get_script_file_path(project_name)
            
            # 直接保存脚本数据，不添加metadata
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(script_data, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception as e:
            print(f"保存脚本内容失败: {e}")
            return False
    
    def load_script_content(self, project_name: str) -> Optional[Dict[str, Any]]:
        """加载脚本内容（步骤4-5使用）"""
        try:
            file_path = self.get_script_file_path(project_name)
            if not os.path.exists(file_path):
                return None
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            return data
        except Exception as e:
            print(f"加载脚本内容失败: {e}")
            return None
    
    def save_reviewed_script(self, project_name: str, script_data: Dict[str, Any]) -> bool:
        """保存校对后的脚本（步骤5）"""
        try:
            self.ensure_project_dir(project_name)
            file_path = self.get_reviewed_script_file_path(project_name)
            
            # 添加元数据
            output_data = {
                "metadata": {
                    "project_name": project_name,
                    "created_time": datetime.now().isoformat(),
                    "last_modified": datetime.now().isoformat(),
                    "step": "content_review",
                    "version": "1.0"
                },
                **script_data
            }
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception as e:
            print(f"保存校对后脚本失败: {e}")
            return False
    
    def load_reviewed_script(self, project_name: str) -> Optional[Dict[str, Any]]:
        """加载校对后的脚本"""
        try:
            file_path = self.get_reviewed_script_file_path(project_name)
            if not os.path.exists(file_path):
                return None
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            return data
        except Exception as e:
            print(f"加载校对后脚本失败: {e}")
            return None
    
    def list_projects(self) -> List[Dict[str, Any]]:
        """列出所有项目"""
        projects = []
        try:
            if not os.path.exists(self.projects_dir):
                return projects
            
            for project_name in os.listdir(self.projects_dir):
                project_path = os.path.join(self.projects_dir, project_name)
                if os.path.isdir(project_path):
                    project_info = {
                        "name": project_name,
                        "has_tree": os.path.exists(self.get_tree_file_path(project_name)),
                        "has_script": os.path.exists(self.get_script_file_path(project_name)),
                        "has_reviewed": os.path.exists(self.get_reviewed_script_file_path(project_name)),
                        "created_time": None,
                        "last_modified": None
                    }
                    
                    # 尝试从元数据获取时间信息
                    tree_data = self.load_tree_structure(project_name)
                    if tree_data and "metadata" in tree_data:
                        project_info["created_time"] = tree_data["metadata"].get("created_time")
                        project_info["last_modified"] = tree_data["metadata"].get("last_modified")
                    
                    projects.append(project_info)
            
            return projects
        except Exception as e:
            print(f"列出项目失败: {e}")
            return []
    
    def delete_project(self, project_name: str) -> bool:
        """删除项目及其所有文件"""
        try:
            project_dir = self.get_project_dir(project_name)
            if os.path.exists(project_dir):
                shutil.rmtree(project_dir)
                return True
            return False
        except Exception as e:
            print(f"删除项目失败: {e}")
            return False
    
    def migrate_legacy_files(self):
        """迁移遗留文件到新的结构中"""
        try:
            # 迁移twin_pagoda项目
            legacy_config_path = os.path.join(settings.SHARED_DIR, "configs", "structure", "twin_pagoda")
            if os.path.exists(legacy_config_path):
                print("开始迁移twin_pagoda项目文件...")
                
                # 创建新的项目目录
                new_project_dir = self.ensure_project_dir("twin_pagoda")
                
                # 检查并迁移anchor_tree.json -> twin_pagoda_tree.json
                anchor_tree_path = os.path.join(legacy_config_path, "anchor_tree.json")
                if os.path.exists(anchor_tree_path):
                    with open(anchor_tree_path, 'r', encoding='utf-8') as f:
                        tree_data = json.load(f)
                    
                    # 保存为新格式
                    self.save_tree_structure("twin_pagoda", tree_data)
                    print("已迁移anchor_tree.json -> twin_pagoda_tree.json")
                
                # 检查其他脚本文件
                script_files = ["generated_script.json", "game_script.json", "human_checked_script.json"]
                for script_file in script_files:
                    script_path = os.path.join(legacy_config_path, script_file)
                    if os.path.exists(script_path):
                        with open(script_path, 'r', encoding='utf-8') as f:
                            script_data = json.load(f)
                        
                        # 根据文件名判断应该保存为哪种类型
                        if script_file in ["generated_script.json", "game_script.json"]:
                            self.save_script_content("twin_pagoda", script_data)
                            print(f"已迁移{script_file} -> twin_pagoda_script.json")
                        elif script_file == "human_checked_script.json":
                            self.save_reviewed_script("twin_pagoda", script_data)
                            print(f"已迁移{script_file} -> twin_pagoda_reviewed_script.json")
            
            # 检查前端public目录中的flat_anchor_tree.json
            frontend_tree_path = os.path.join(settings.BASE_DIR, "..", "frontend", "public", "flat_anchor_tree.json")
            if os.path.exists(frontend_tree_path):
                print("发现前端flat_anchor_tree.json文件，也为twin_pagoda项目...")
                with open(frontend_tree_path, 'r', encoding='utf-8') as f:
                    tree_data = json.load(f)
                
                # 保存为新格式（如果还没有的话）
                if not os.path.exists(self.get_tree_file_path("twin_pagoda")):
                    self.save_tree_structure("twin_pagoda", tree_data)
                    print("已迁移前端flat_anchor_tree.json -> twin_pagoda_tree.json")
            
            print("文件迁移完成！")
            
        except Exception as e:
            print(f"迁移文件失败: {e}")

# 创建全局实例
script_file_service = ScriptFileService()

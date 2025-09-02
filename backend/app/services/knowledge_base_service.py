"""
知识库管理服务
"""
import os
import json
import uuid
import asyncio
import shutil
from datetime import datetime
from typing import Dict, Any, Optional, List

from app.core.config import settings
from app.models.file_models import KnowledgeBaseStatus, BuildStatus

class KnowledgeBaseService:
    def __init__(self):
        self.kb_path = settings.KNOWLEDGE_BASES_DIR
        self.uploads_path = settings.UPLOADS_DIR
        self.build_tasks: Dict[str, BuildStatus] = {}
        
        # 确保目录存在
        os.makedirs(self.kb_path, exist_ok=True)
        
        # 知识库元数据文件
        self.kb_metadata_path = os.path.join(self.kb_path, "kb_metadata.json")
        self._init_kb_metadata()
    
    def _init_kb_metadata(self):
        """初始化知识库元数据"""
        if not os.path.exists(self.kb_metadata_path):
            metadata = {
                "knowledge_bases": {},  # kb_name -> {categories, file_type, created_time, file_count}
                "last_updated": datetime.now().isoformat()
            }
            self._save_kb_metadata(metadata)
    
    def _load_kb_metadata(self) -> Dict:
        """加载知识库元数据"""
        try:
            with open(self.kb_metadata_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            self._init_kb_metadata()
            return self._load_kb_metadata()
    
    def _save_kb_metadata(self, metadata: Dict):
        """保存知识库元数据"""
        metadata["last_updated"] = datetime.now().isoformat()
        with open(self.kb_metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    def get_knowledge_base_status(self) -> KnowledgeBaseStatus:
        """获取知识库状态"""
        try:
            # 检查是否存在知识库
            kb_dirs = [d for d in os.listdir(self.kb_path) if os.path.isdir(os.path.join(self.kb_path, d))]
            
            if not kb_dirs:
                return KnowledgeBaseStatus(
                    is_built=False,
                    file_count=0,
                    status="idle"
                )
            
            # 统计文件数量
            file_count = self._count_source_files()
            
            # 获取最后更新时间
            metadata = self._load_kb_metadata()
            last_updated = None
            if metadata.get("last_updated"):
                try:
                    last_updated = datetime.fromisoformat(metadata["last_updated"])
                except:
                    pass
            
            # 检查是否有正在进行的构建任务
            active_tasks = [task for task in self.build_tasks.values() if task.status == "running"]
            
            if active_tasks:
                current_task = active_tasks[0]
                return KnowledgeBaseStatus(
                    is_built=True,
                    file_count=file_count,
                    last_updated=last_updated,
                    build_progress=current_task.progress,
                    status="building"
                )
            
            return KnowledgeBaseStatus(
                is_built=True,
                file_count=file_count,
                last_updated=last_updated,
                status="completed"
            )
            
        except Exception as e:
            return KnowledgeBaseStatus(
                is_built=False,
                file_count=0,
                status="error"
            )
    
    def _count_source_files(self) -> int:
        """统计源文件数量"""
        count = 0
        file_dir = os.path.join(self.uploads_path, "File")
        
        if os.path.exists(file_dir):
            for root, dirs, files in os.walk(file_dir):
                count += len([f for f in files if not f.startswith('.')])
        
        return count
    
    async def build_knowledge_base(self, name: str, categories: List[str], file_type: str = "mixed") -> Dict[str, str]:
        """构建知识库"""
        task_id = str(uuid.uuid4())
        
        # 检查知识库是否已存在
        kb_path = os.path.join(self.kb_path, "VectorStore", name)
        if os.path.exists(kb_path):
            # 如果存在，先删除
            shutil.rmtree(kb_path)
        
        # 创建构建任务
        build_status = BuildStatus(
            task_id=task_id,
            progress=0.0,
            status="running"
        )
        self.build_tasks[task_id] = build_status
        
        # 异步执行构建任务
        asyncio.create_task(self._build_knowledge_base_task(task_id, name, categories, file_type))
        
        return {
            "task_id": task_id,
            "message": f"知识库 '{name}' 构建任务已启动"
        }
    
    async def _build_knowledge_base_task(self, task_id: str, name: str, categories: List[str], file_type: str):
        """执行知识库构建任务"""
        try:
            build_status = self.build_tasks[task_id]
            
            # 模拟构建过程（后续需要集成真实的构建逻辑）
            await self._simulate_build_process(task_id, name, categories, file_type)
            
            # 更新知识库元数据
            metadata = self._load_kb_metadata()
            metadata["knowledge_bases"][name] = {
                "categories": categories,
                "file_type": file_type,
                "created_time": datetime.now().isoformat(),
                "file_count": self._count_files_in_categories(categories),
                "task_id": task_id
            }
            self._save_kb_metadata(metadata)
            
            # 完成构建
            build_status.status = "completed"
            build_status.progress = 100.0
            
        except Exception as e:
            build_status = self.build_tasks.get(task_id)
            if build_status:
                build_status.status = "error"
                build_status.error_message = str(e)
    
    def _count_files_in_categories(self, categories: List[str]) -> int:
        """统计指定类目中的文件数量"""
        count = 0
        
        for category in categories:
            # 检查非结构化文件
            unstructured_path = os.path.join(self.uploads_path, "File", "Unstructured", category)
            if os.path.exists(unstructured_path):
                count += len([f for f in os.listdir(unstructured_path) if os.path.isfile(os.path.join(unstructured_path, f))])
            
            # 检查结构化文件
            structured_path = os.path.join(self.uploads_path, "File", "Structured", category)
            if os.path.exists(structured_path):
                count += len([f for f in os.listdir(structured_path) if os.path.isfile(os.path.join(structured_path, f))])
        
        return count
    
    async def _simulate_build_process(self, task_id: str, name: str, categories: List[str], file_type: str):
        """模拟构建过程（待替换为实际的构建逻辑）"""
        build_status = self.build_tasks[task_id]
        
        # 这里应该替换为实际的知识库构建逻辑
        # 目前只是模拟进度更新
        steps = [
            (f"扫描类目 {', '.join(categories)}...", 10),
            ("处理文档...", 30),
            ("生成向量嵌入...", 60),
            ("构建索引...", 80),
            (f"保存知识库 '{name}'...", 90),
            ("完成", 100)
        ]
        
        for step_name, progress in steps:
            await asyncio.sleep(1)  # 模拟处理时间
            build_status.current_file = step_name
            build_status.progress = progress
            
            if progress < 100:
                build_status.estimated_completion = datetime.now()
    
    def get_build_status(self, task_id: str) -> Optional[BuildStatus]:
        """获取构建进度"""
        return self.build_tasks.get(task_id)
    
    def list_knowledge_bases(self) -> Dict[str, Any]:
        """获取已构建的知识库列表"""
        try:
            metadata = self._load_kb_metadata()
            kb_list = []
            
            for kb_name, kb_info in metadata.get("knowledge_bases", {}).items():
                # 检查知识库目录是否存在
                kb_path = os.path.join(self.kb_path, "VectorStore", kb_name)
                exists = os.path.exists(kb_path)
                
                kb_list.append({
                    "name": kb_name,
                    "categories": kb_info.get("categories", []),
                    "file_type": kb_info.get("file_type", "mixed"),
                    "created_time": kb_info.get("created_time"),
                    "file_count": kb_info.get("file_count", 0),
                    "exists": exists
                })
            
            return {
                "knowledge_bases": kb_list,
                "total_count": len(kb_list)
            }
            
        except Exception as e:
            return {
                "knowledge_bases": [],
                "total_count": 0,
                "error": str(e)
            }
    
    def delete_knowledge_base(self, kb_name: str) -> Dict[str, Any]:
        """删除知识库"""
        try:
            # 删除向量存储目录
            kb_path = os.path.join(self.kb_path, "VectorStore", kb_name)
            if os.path.exists(kb_path):
                shutil.rmtree(kb_path)
            
            # 更新元数据
            metadata = self._load_kb_metadata()
            if kb_name in metadata.get("knowledge_bases", {}):
                del metadata["knowledge_bases"][kb_name]
                self._save_kb_metadata(metadata)
            
            return {
                "message": f"知识库 '{kb_name}' 删除成功",
                "success": True
            }
            
        except Exception as e:
            return {
                "message": f"删除知识库失败: {str(e)}",
                "success": False
            }
    
    def _copy_original_kb_logic(self):
        """
        这里应该复制并适配原有的知识库构建逻辑
        从 qwen-local-rag/create_kb.py 中的相关函数
        """
        # TODO: 集成原有的create_kb.py逻辑
        pass

# 创建全局实例
knowledge_base_service = KnowledgeBaseService()

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

# 导入知识库构建相关模块
try:
    from llama_index.core import VectorStoreIndex, Settings, SimpleDirectoryReader
    from llama_index.embeddings.dashscope import (
        DashScopeEmbedding,
        DashScopeTextEmbeddingModels,
        DashScopeTextEmbeddingType,
    )
    from llama_index.core.schema import TextNode
    LLAMA_INDEX_AVAILABLE = True
except ImportError:
    print("Warning: llama_index not available, knowledge base building will be disabled")
    LLAMA_INDEX_AVAILABLE = False

# 设置嵌入模型
if LLAMA_INDEX_AVAILABLE:
    EMBED_MODEL = DashScopeEmbedding(
        model_name=DashScopeTextEmbeddingModels.TEXT_EMBEDDING_V2,
        text_type=DashScopeTextEmbeddingType.TEXT_TYPE_DOCUMENT,
    )
    Settings.embed_model = EMBED_MODEL

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
    
    async def build_knowledge_base(self, name: str, categories: List[str], file_type: str = "mixed", **build_params) -> Dict[str, Any]:
        """构建知识库"""
        task_id = str(uuid.uuid4())
        
        # 验证输入参数
        if not name or not name.strip():
            raise ValueError("知识库名称不能为空")
        
        if not categories:
            raise ValueError("请选择至少一个类目")
        
        # 检查知识库是否已存在
        metadata = self._load_kb_metadata()
        if name in metadata.get("knowledge_bases", {}):
            raise ValueError(f"知识库 '{name}' 已存在，请使用其他名称")
        
        # 提取构建参数并设置默认值
        build_config = {
            "chunk_size": build_params.get("chunk_size", 1000),
            "chunk_overlap": build_params.get("chunk_overlap", 200),
            "chunking_method": build_params.get("chunking_method", "recursive"),
            "embedding_model": build_params.get("embedding_model", "dashscope"),
            "vector_dimension": build_params.get("vector_dimension"),
            "index_type": build_params.get("index_type", "faiss"),
            "similarity_metric": build_params.get("similarity_metric", "cosine"),
            "description": build_params.get("description"),
            "tags": build_params.get("tags", []),
            "batch_size": build_params.get("batch_size", 32),
            "max_workers": build_params.get("max_workers", 4)
        }
        
        # 检查是否有文件可用
        available_files = 0
        for category in categories:
            if file_type in ["unstructured", "mixed"]:
                unstructured_path = os.path.join(self.uploads_path, "File", "Unstructured", category)
                if os.path.exists(unstructured_path):
                    available_files += len([f for f in os.listdir(unstructured_path) 
                                          if os.path.isfile(os.path.join(unstructured_path, f))])
            
            if file_type in ["structured", "mixed"]:
                structured_path = os.path.join(self.uploads_path, "File", "Structured", category)
                if os.path.exists(structured_path):
                    available_files += len([f for f in os.listdir(structured_path) 
                                          if os.path.isfile(os.path.join(structured_path, f))])
        
        if available_files == 0:
            raise ValueError(f"在选择的类目中没有找到可用文件")
        
        # 检查知识库是否已存在
        kb_path = os.path.join(self.kb_path, "VectorStore", name)
        if os.path.exists(kb_path):
            # 如果存在，先删除
            shutil.rmtree(kb_path)
        
        # 创建构建任务
        build_status = BuildStatus(
            task_id=task_id,
            progress=0.0,
            status="running",
            current_file="准备开始构建..."
        )
        self.build_tasks[task_id] = build_status
        
        # 异步执行构建任务，传递构建配置
        asyncio.create_task(self._build_knowledge_base_task(task_id, name, categories, file_type, build_config))
        
        return {
            "task_id": task_id,
            "message": f"知识库 '{name}' 构建任务已启动，预计处理 {available_files} 个文件",
            "build_config": build_config
        }
    
    async def _build_knowledge_base_task(self, task_id: str, name: str, categories: List[str], file_type: str, build_config: Dict[str, Any]):
        """执行知识库构建任务"""
        try:
            if not LLAMA_INDEX_AVAILABLE:
                raise Exception("llama_index 模块不可用，无法构建知识库")
            
            build_status = self.build_tasks[task_id]
            build_status.current_file = f"初始化构建环境... (chunk_size: {build_config['chunk_size']})"
            build_status.progress = 5.0
            
            # 创建知识库目录
            kb_vector_path = os.path.join(self.kb_path, "VectorStore", name)
            os.makedirs(kb_vector_path, exist_ok=True)
            
            # 收集指定类目的文件
            build_status.current_file = "收集文件..."
            build_status.progress = 10.0
            await asyncio.sleep(0.5)
            
            documents = []
            total_files = 0
            
            # 根据file_type决定处理哪些文件
            if file_type in ["unstructured", "mixed"]:
                for category in categories:
                    category_path = os.path.join(self.uploads_path, "File", "Unstructured", category)
                    if os.path.exists(category_path):
                        build_status.current_file = f"处理非结构化文件: {category}"
                        try:
                            category_docs = SimpleDirectoryReader(category_path).load_data()
                            documents.extend(category_docs)
                            total_files += len(category_docs)
                        except Exception as e:
                            print(f"读取类目 {category} 失败: {e}")
                        
                        build_status.progress = min(30.0, 10.0 + (len(documents) / max(1, total_files)) * 20)
                        await asyncio.sleep(0.2)
            
            if file_type in ["structured", "mixed"]:
                nodes = []
                for category in categories:
                    category_path = os.path.join(self.uploads_path, "File", "Structured", category)
                    if os.path.exists(category_path):
                        build_status.current_file = f"处理结构化文件: {category}"
                        try:
                            category_docs = SimpleDirectoryReader(category_path).load_data()
                            # 对结构化文件进行特殊处理
                            for doc in category_docs:
                                doc_content = doc.get_content().split('\n')
                                for chunk in doc_content:
                                    if chunk.strip():  # 跳过空行
                                        node = TextNode(text=chunk)
                                        node.metadata = {
                                            'source': doc.get_doc_id(),
                                            'file_name': doc.metadata.get('file_name', 'unknown'),
                                            'category': category,
                                            'file_type': 'structured'
                                        }
                                        nodes.append(node)
                            total_files += len(category_docs)
                        except Exception as e:
                            print(f"读取结构化类目 {category} 失败: {e}")
                        
                        build_status.progress = min(50.0, 30.0 + (len(nodes) / max(1, total_files * 10)) * 20)
                        await asyncio.sleep(0.2)
            
            if not documents and not nodes:
                raise Exception("没有找到可用的文件进行知识库构建")
            
            # 构建向量索引
            build_status.current_file = "生成向量嵌入..."
            build_status.progress = 60.0
            await asyncio.sleep(0.5)
            
            if file_type == "structured" and nodes:
                # 只有结构化数据
                index = VectorStoreIndex(nodes)
            elif documents:
                # 包含非结构化数据
                if nodes:
                    # 混合模式：将文档也转换为节点
                    for doc in documents:
                        node = TextNode(text=doc.get_content())
                        node.metadata = doc.metadata.copy()
                        node.metadata['file_type'] = 'unstructured'
                        nodes.append(node)
                    index = VectorStoreIndex(nodes)
                else:
                    # 纯非结构化模式
                    index = VectorStoreIndex.from_documents(documents)
            else:
                raise Exception("没有有效的文档或节点用于构建索引")
            
            build_status.current_file = "保存向量索引..."
            build_status.progress = 80.0
            await asyncio.sleep(0.5)
            
            # 持久化存储
            index.storage_context.persist(kb_vector_path)
            
            build_status.current_file = "更新元数据..."
            build_status.progress = 90.0
            await asyncio.sleep(0.2)
            
            # 更新知识库元数据
            metadata = self._load_kb_metadata()
            metadata["knowledge_bases"][name] = {
                "categories": categories,
                "file_type": file_type,
                "created_time": datetime.now().isoformat(),
                "file_count": self._count_files_in_categories(categories),
                "task_id": task_id,
                "vector_path": kb_vector_path,
                "document_count": len(documents) + len(nodes),
                "build_config": build_config  # 保存构建配置
            }
            self._save_kb_metadata(metadata)
            
            # 完成构建
            build_status.status = "completed"
            build_status.progress = 100.0
            build_status.current_file = "知识库构建完成"
            
        except Exception as e:
            print(f"知识库构建失败: {e}")
            build_status = self.build_tasks.get(task_id)
            if build_status:
                build_status.status = "error"
                build_status.error_message = str(e)
                build_status.current_file = f"构建失败: {str(e)}"
    
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
                    "document_count": kb_info.get("document_count", 0),
                    "build_config": kb_info.get("build_config", {}),
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
                deleted = True
            else:
                deleted = False
            
            # 更新元数据
            metadata = self._load_kb_metadata()
            metadata_deleted = False
            if kb_name in metadata.get("knowledge_bases", {}):
                del metadata["knowledge_bases"][kb_name]
                self._save_kb_metadata(metadata)
                metadata_deleted = True
            
            if deleted or metadata_deleted:
                return {
                    "message": f"知识库 '{kb_name}' 删除成功",
                    "success": True
                }
            else:
                return {
                    "message": f"知识库 '{kb_name}' 不存在",
                    "success": False
                }
            
        except Exception as e:
            return {
                "message": f"删除知识库失败: {str(e)}",
                "success": False
            }
    
    def check_files_have_tags(self, categories: List[str]) -> Dict[str, Any]:
        """检查指定类目中的文件是否都有标签"""
        try:
            # 加载文件元数据
            metadata_path = os.path.join(self.uploads_path, "metadata.json")
            if not os.path.exists(metadata_path):
                return {"all_tagged": False, "message": "文件元数据不存在"}
            
            with open(metadata_path, 'r', encoding='utf-8') as f:
                file_metadata = json.load(f)
            
            files_without_tags = []
            for category in categories:
                # 检查非结构化文件
                unstructured_path = os.path.join(self.uploads_path, "File", "Unstructured", category)
                if os.path.exists(unstructured_path):
                    for filename in os.listdir(unstructured_path):
                        if os.path.isfile(os.path.join(unstructured_path, filename)):
                            relative_path = f"{category}/{filename}"
                            file_info = file_metadata.get("files", {}).get(relative_path, {})
                            if not file_info.get("source_tag"):
                                files_without_tags.append(relative_path)
                
                # 检查结构化文件
                structured_path = os.path.join(self.uploads_path, "File", "Structured", category)
                if os.path.exists(structured_path):
                    for filename in os.listdir(structured_path):
                        if os.path.isfile(os.path.join(structured_path, filename)):
                            relative_path = f"{category}/{filename}"
                            file_info = file_metadata.get("files", {}).get(relative_path, {})
                            if not file_info.get("source_tag"):
                                files_without_tags.append(relative_path)
            
            all_tagged = len(files_without_tags) == 0
            return {
                "all_tagged": all_tagged,
                "files_without_tags": files_without_tags,
                "message": "所有文件都已标记" if all_tagged else f"还有 {len(files_without_tags)} 个文件未标记"
            }
            
        except Exception as e:
            return {
                "all_tagged": False,
                "message": f"检查文件标签失败: {str(e)}"
            }

# 创建全局实例
knowledge_base_service = KnowledgeBaseService()

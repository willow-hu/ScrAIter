"""
GraphRAG服务
提供统一的图索引构建接口，支持实体关系提取和社区检测
"""
import os
import json
import pandas as pd
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
import logging

from app.core.config import settings
from app.services.community_detector import community_detector
from app.services.graph_extractor import graph_extractor

logger = logging.getLogger(__name__)

class GraphService:
    """GraphRAG图索引构建和管理服务"""
    
    def __init__(self):
        """初始化图服务"""
        pass
        
    def build_graph_index(self, kb_name: str, text_units: pd.DataFrame, task_id: str) -> Dict[str, Any]:
        """
        构建图索引
        
        Args:
            kb_name: 知识库名称
            text_units: 文本单元DataFrame
            task_id: 构建任务ID
            
        Returns:
            图构建结果和统计信息
        """
        try:
            logger.info(f"开始构建知识库 '{kb_name}' 的图索引")
            
            # 1. 提取实体和关系
            entities_df, relationships_df = self.extract_entities_and_relationships(text_units)
            
            # 2. 社区检测
            communities_df = self.detect_communities(entities_df, relationships_df)
            
            # 3. 保存图数据
            save_success = self.save_graph_data(kb_name, entities_df, relationships_df, communities_df)
            
            if not save_success:
                return {
                    "success": False,
                    "entities_count": 0,
                    "relationships_count": 0,
                    "communities_count": 0,
                    "message": "图数据保存失败"
                }
            
            result = {
                "success": True,
                "entities_count": len(entities_df),
                "relationships_count": len(relationships_df),
                "communities_count": len(communities_df),
                "message": f"图索引构建完成: {len(entities_df)} 实体, {len(relationships_df)} 关系"
            }
            
            logger.info(f"图索引构建完成: {result['message']}")
            return result
            
        except Exception as e:
            logger.error(f"图索引构建失败: {e}")
            return {
                "success": False,
                "entities_count": 0,
                "relationships_count": 0,
                "communities_count": 0,
                "message": f"图索引构建失败: {str(e)}"
            }
    
    def extract_entities_and_relationships(self, text_units: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        从文本单元中提取实体和关系
        
        Args:
            text_units: 文本单元DataFrame
            
        Returns:
            (entities_df, relationships_df): 实体和关系DataFrame
        """
        try:
            # 使用图提取器
            if graph_extractor is not None:
                extractor = graph_extractor
            else:
                logger.error("GraphExtractor不可用")
                return self._empty_extraction_dataframes()
            
            logger.info(f"开始提取实体和关系，文本单元数量: {len(text_units)}")
            
            # 使用集成器进行实体关系提取
            entities_df, relationships_df = extractor.extract_entities_and_relationships(text_units)
            
            # 格式化数据以便存储
            entities_df = extractor.format_entities_for_storage(entities_df)
            relationships_df = extractor.format_relationships_for_storage(relationships_df)
            
            logger.info(f"实体关系提取完成: {len(entities_df)} 个实体, {len(relationships_df)} 个关系")
            
            return entities_df, relationships_df
            
        except Exception as e:
            logger.error(f"实体关系提取失败: {e}")
            return self._empty_extraction_dataframes()
    
    def _empty_extraction_dataframes(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """返回空的实体和关系DataFrame"""
        entities_df = pd.DataFrame(columns=['id', 'title', 'type', 'description', 'text_unit_ids'])
        relationships_df = pd.DataFrame(columns=['id', 'source', 'target', 'description', 'weight', 'text_unit_ids'])
        return entities_df, relationships_df
    
    def detect_communities(self, entities: pd.DataFrame, relationships: pd.DataFrame) -> pd.DataFrame:
        """
        执行社区检测
        
        Args:
            entities: 实体DataFrame
            relationships: 关系DataFrame
            
        Returns:
            communities_df: 社区DataFrame
        """
        try:
            if community_detector is None:
                logger.error("CommunityDetector不可用")
                return self._empty_communities_dataframe()
            
            logger.info(f"开始社区检测，实体数量: {len(entities)}, 关系数量: {len(relationships)}")
            
            # 使用集成器进行社区检测
            communities_df = community_detector.detect_communities(entities, relationships)
            
            logger.info(f"社区检测完成: {len(communities_df)} 个社区")
            
            return communities_df
            
        except Exception as e:
            logger.error(f"社区检测失败: {e}")
            return self._empty_communities_dataframe()
    
    def _empty_communities_dataframe(self) -> pd.DataFrame:
        """返回空的社区DataFrame"""
        return pd.DataFrame(columns=['id', 'title', 'level', 'community', 'parent', 'entity_ids', 'size'])
    
    def save_graph_data(self, kb_name: str, entities: pd.DataFrame, relationships: pd.DataFrame, communities: pd.DataFrame) -> bool:
        """
        保存图数据到存储
        
        Args:
            kb_name: 知识库名称
            entities: 实体数据
            relationships: 关系数据
            communities: 社区数据
            
        Returns:
            bool: 保存是否成功
        """
        try:
            graph_store_path = self.get_graph_store_path(kb_name)
            os.makedirs(graph_store_path, exist_ok=True)
            
            logger.info(f"保存图数据到: {graph_store_path}")
            
            # 保存实体数据
            entities_path = os.path.join(graph_store_path, "entities.csv")
            if not entities.empty:
                entities.to_csv(entities_path, index=False, encoding='utf-8')
                logger.info(f"保存 {len(entities)} 个实体到 entities.csv")
            else:
                # 创建空文件
                pd.DataFrame(columns=['id', 'title', 'type', 'description', 'text_unit_ids']).to_csv(
                    entities_path, index=False, encoding='utf-8'
                )
            
            # 保存关系数据
            relationships_path = os.path.join(graph_store_path, "relationships.csv")
            if not relationships.empty:
                relationships.to_csv(relationships_path, index=False, encoding='utf-8')
                logger.info(f"保存 {len(relationships)} 个关系到 relationships.csv")
            else:
                # 创建空文件
                pd.DataFrame(columns=['id', 'source', 'target', 'description', 'weight', 'text_unit_ids']).to_csv(
                    relationships_path, index=False, encoding='utf-8'
                )
            
            # 保存社区数据（目前为空，为社区检测功能预留）
            communities_path = os.path.join(graph_store_path, "communities.csv")
            if not communities.empty:
                communities.to_csv(communities_path, index=False, encoding='utf-8')
                logger.info(f"保存 {len(communities)} 个社区到 communities.csv")
            else:
                # 创建空文件
                pd.DataFrame(columns=['id', 'title', 'level', 'community', 'parent', 'entity_ids']).to_csv(
                    communities_path, index=False, encoding='utf-8'
                )
            
            # 生成图构建元数据
            metadata = {
                "kb_name": kb_name,
                "created_time": datetime.now().isoformat(),
                "entities_count": len(entities),
                "relationships_count": len(relationships),
                "communities_count": len(communities),
                "extraction_method": "rule_based",  # 当前使用规则提取
                "version": "1.0"
            }
            
            metadata_path = os.path.join(graph_store_path, "graph_metadata.json")
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            logger.info("图数据保存完成")
            return True
            
        except Exception as e:
            logger.error(f"保存图数据失败: {e}")
            return False
    
    def get_graph_store_path(self, kb_name: str) -> str:
        """获取图存储路径"""
        return os.path.join(settings.KNOWLEDGE_BASES_DIR, "VectorStore", kb_name, "graph_store")
    
    def load_graph_entities(self, kb_name: str, page: int = 1, page_size: int = 50, entity_type: Optional[str] = None) -> Dict[str, Any]:
        """
        加载图实体数据
        
        Args:
            kb_name: 知识库名称
            page: 页码
            page_size: 每页大小
            entity_type: 实体类型筛选
            
        Returns:
            分页的实体数据
        """
        try:
            entities_path = os.path.join(self.get_graph_store_path(kb_name), "entities.csv")
            
            if not os.path.exists(entities_path):
                return {
                    "entities": [],
                    "total": 0,
                    "page": page,
                    "page_size": page_size
                }
            
            # 读取实体数据
            entities_df = pd.read_csv(entities_path, encoding='utf-8')
            
            # 应用实体类型筛选
            if entity_type:
                entities_df = entities_df[entities_df['type'] == entity_type]
            
            total = len(entities_df)
            
            # 分页
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            paged_entities = entities_df.iloc[start_idx:end_idx]
            
            # 转换为字典列表
            entities_list = []
            for _, row in paged_entities.iterrows():
                entity = {
                    "id": row.get('id', ''),
                    "title": row.get('title', ''),
                    "type": row.get('type', ''),
                    "description": row.get('description', ''),
                    "text_unit_ids": eval(row.get('text_unit_ids', '[]')) if row.get('text_unit_ids') else [],
                    "degree": row.get('degree'),
                    "community": row.get('community')
                }
                entities_list.append(entity)
            
            return {
                "entities": entities_list,
                "total": total,
                "page": page,
                "page_size": page_size
            }
            
        except Exception as e:
            logger.error(f"加载实体数据失败: {e}")
            return {
                "entities": [],
                "total": 0,
                "page": page,
                "page_size": page_size
            }
    
    def load_graph_relationships(self, kb_name: str, source_entity: Optional[str] = None, target_entity: Optional[str] = None) -> Dict[str, Any]:
        """
        加载图关系数据
        
        Args:
            kb_name: 知识库名称
            source_entity: 源实体筛选
            target_entity: 目标实体筛选
            
        Returns:
            关系数据
        """
        try:
            relationships_path = os.path.join(self.get_graph_store_path(kb_name), "relationships.csv")
            
            if not os.path.exists(relationships_path):
                return {
                    "relationships": [],
                    "total": 0
                }
            
            # 读取关系数据
            relationships_df = pd.read_csv(relationships_path, encoding='utf-8')
            
            # 应用筛选条件
            if source_entity:
                relationships_df = relationships_df[relationships_df['source'] == source_entity]
            if target_entity:
                relationships_df = relationships_df[relationships_df['target'] == target_entity]
            
            total = len(relationships_df)
            
            # 转换为字典列表
            relationships_list = []
            for _, row in relationships_df.iterrows():
                relationship = {
                    "id": row.get('id', ''),
                    "source": row.get('source', ''),
                    "target": row.get('target', ''),
                    "description": row.get('description', ''),
                    "weight": float(row.get('weight', 1.0)),
                    "text_unit_ids": eval(row.get('text_unit_ids', '[]')) if row.get('text_unit_ids') else []
                }
                relationships_list.append(relationship)
            
            return {
                "relationships": relationships_list,
                "total": total
            }
            
        except Exception as e:
            logger.error(f"加载关系数据失败: {e}")
            return {
                "relationships": [],
                "total": 0
            }
    
    def load_graph_communities(self, kb_name: str, level: Optional[int] = None) -> Dict[str, Any]:
        """
        加载图社区数据
        
        Args:
            kb_name: 知识库名称  
            level: 层级筛选
            
        Returns:
            社区数据
        """
        try:
            communities_path = os.path.join(self.get_graph_store_path(kb_name), "communities.csv")
            
            if not os.path.exists(communities_path):
                return {
                    "communities": [],
                    "total": 0
                }
            
            # 读取社区数据
            communities_df = pd.read_csv(communities_path, encoding='utf-8')
            
            # 应用层级筛选
            if level is not None:
                communities_df = communities_df[communities_df['level'] == level]
            
            total = len(communities_df)
            
            # 转换为字典列表
            communities_list = []
            for _, row in communities_df.iterrows():
                community = {
                    "id": row.get('id', ''),
                    "title": row.get('title', ''),
                    "level": int(row.get('level', 0)),
                    "community": int(row.get('community', 0)),
                    "parent": int(row.get('parent', -1)),
                    "entity_ids": eval(row.get('entity_ids', '[]')) if row.get('entity_ids') else [],
                    "size": int(row.get('size', 0))
                }
                communities_list.append(community)
            
            return {
                "communities": communities_list,
                "total": total
            }
            
        except Exception as e:
            logger.error(f"加载社区数据失败: {e}")
            return {
                "communities": [],
                "total": 0
            }
    
    def get_graph_statistics(self, kb_name: str) -> Dict[str, Any]:
        """
        获取图统计信息
        
        Args:
            kb_name: 知识库名称
            
        Returns:
            图统计数据
        """
        try:
            graph_store_path = self.get_graph_store_path(kb_name)
            
            # 读取元数据
            metadata_path = os.path.join(graph_store_path, "graph_metadata.json")
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                
                # 尝试从社区数据获取更详细的统计信息
                community_stats = self._calculate_community_statistics(kb_name)
                
                return {
                    "entities_count": metadata.get("entities_count", 0),
                    "relationships_count": metadata.get("relationships_count", 0),
                    "communities_count": metadata.get("communities_count", 0),
                    "max_community_level": community_stats.get("max_level", 0),
                    "avg_entity_degree": 0.0,  # 需要基于实际数据计算
                    "graph_density": 0.0,  # 需要基于实际数据计算
                    "created_time": metadata.get("created_time"),
                    "last_updated": metadata.get("created_time")
                }
            else:
                return {
                    "entities_count": 0,
                    "relationships_count": 0,
                    "communities_count": 0,
                    "max_community_level": 0,
                    "avg_entity_degree": 0.0,
                    "graph_density": 0.0,
                    "created_time": None,
                    "last_updated": None
                }
                
        except Exception as e:
            logger.error(f"获取图统计信息失败: {e}")
            return {
                "entities_count": 0,
                "relationships_count": 0,
                "communities_count": 0,
                "max_community_level": 0,
                "avg_entity_degree": 0.0,
                "graph_density": 0.0,
                "created_time": None,
                "last_updated": None
            }
    
    def _calculate_community_statistics(self, kb_name: str) -> Dict[str, Any]:
        """
        计算社区统计信息
        
        Args:
            kb_name: 知识库名称
            
        Returns:
            社区统计数据
        """
        try:
            communities_path = os.path.join(self.get_graph_store_path(kb_name), "communities.csv")
            
            if not os.path.exists(communities_path):
                return {"max_level": 0}
            
            communities_df = pd.read_csv(communities_path, encoding='utf-8')
            
            if communities_df.empty:
                return {"max_level": 0}
            
            # 使用社区检测集成器计算统计信息
            if community_detector is not None:
                return community_detector.get_community_statistics(communities_df)
            else:
                # 简单统计
                max_level = int(communities_df['level'].max()) if 'level' in communities_df.columns else 0
                return {"max_level": max_level}
                
        except Exception as e:
            logger.error(f"计算社区统计信息失败: {e}")
            return {"max_level": 0}

# 创建全局实例
graph_service = GraphService()
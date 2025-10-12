"""
GraphRAG社区检测集成器
使用内置的社区检测功能
"""
import pandas as pd
from typing import Dict, Any, List
import logging

from .community_detector import CommunityDetector

logger = logging.getLogger(__name__)

class CommunityDetectorIntegration:
    """GraphRAG社区检测集成器"""
    
    def __init__(self, algorithm: str = "louvain", resolution: float = 1.0):
        """初始化社区检测器
        
        Args:
            algorithm: 社区检测算法 ("louvain", "leiden", "label_propagation")
            resolution: 分辨率参数，控制社区大小
        """        
        # 初始化社区检测器
        self.community_detector = CommunityDetector(
            algorithm=algorithm,
            resolution=resolution
        )
        
        logger.info("GraphRAG社区检测器初始化成功")
    
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
            if entities.empty:
                logger.warning("实体数据为空，跳过社区检测")
                return self._empty_communities_dataframe()
            
            if relationships.empty:
                logger.warning("关系数据为空，每个实体作为独立社区")
                return self._create_single_entity_communities(entities)
            
            logger.info(f"开始社区检测: {len(entities)} 个实体, {len(relationships)} 个关系")
            
            # 使用内置的社区检测器
            communities_df = self.community_detector.detect_communities(entities, relationships)
            
            logger.info(f"社区检测完成: 发现 {len(communities_df)} 个社区")
            
            # 格式化社区数据
            communities_df = self.format_communities_for_storage(communities_df)
            
            return communities_df
            
        except Exception as e:
            logger.error(f"社区检测失败: {e}")
            return self._empty_communities_dataframe()
    
    def _empty_communities_dataframe(self) -> pd.DataFrame:
        """返回空的社区DataFrame"""
        return pd.DataFrame(columns=[
            'id', 'title', 'level', 'community', 'parent', 'entity_ids', 'size'
        ])
    
    def _create_single_entity_communities(self, entities: pd.DataFrame) -> pd.DataFrame:
        """
        为每个实体创建独立社区（当没有关系数据时）
        
        Args:
            entities: 实体DataFrame
            
        Returns:
            社区DataFrame
        """
        communities = []
        
        for i, (_, entity) in enumerate(entities.iterrows()):
            community = {
                'id': f"community_{i}",
                'title': f"Community {i} ({entity.get('title', 'Unknown')})",
                'level': 0,
                'community': i,
                'parent': -1,
                'entity_ids': [entity.get('id', '')],
                'size': 1
            }
            communities.append(community)
        
        communities_df = pd.DataFrame(communities)
        logger.info(f"创建了 {len(communities_df)} 个单实体社区")
        
        return communities_df
    
    def format_communities_for_storage(self, communities_df: pd.DataFrame) -> pd.DataFrame:
        """
        格式化社区数据以便存储
        
        Args:
            communities_df: 原始社区DataFrame
            
        Returns:
            格式化后的社区DataFrame
        """
        if communities_df.empty:
            return communities_df
        
        # 确保必要的列存在
        required_columns = ['id', 'title', 'level', 'community', 'parent', 'entity_ids']
        for col in required_columns:
            if col not in communities_df.columns:
                if col == 'level':
                    communities_df[col] = 0
                elif col == 'parent':
                    communities_df[col] = -1
                else:
                    communities_df[col] = None
        
        # 转换entity_ids为JSON字符串格式以便CSV存储
        if 'entity_ids' in communities_df.columns:
            communities_df['entity_ids'] = communities_df['entity_ids'].apply(
                lambda x: str(x) if x is not None else "[]"
            )
        
        # 添加size列（实体数量）
        if 'size' not in communities_df.columns:
            communities_df['size'] = communities_df['entity_ids'].apply(
                lambda x: len(eval(x)) if x and x != "[]" else 0
            )
        
        # 生成更友好的标题
        communities_df['title'] = communities_df.apply(
            lambda row: f"Community {row['community']} (Level {row['level']}, {row['size']} entities)",
            axis=1
        )
        
        return communities_df
    
    def get_community_statistics(self, communities_df: pd.DataFrame) -> Dict[str, Any]:
        """
        获取社区统计信息
        
        Args:
            communities_df: 社区DataFrame
            
        Returns:
            社区统计数据
        """
        if communities_df.empty:
            return {
                "total_communities": 0,
                "max_level": 0,
                "avg_community_size": 0.0,
                "largest_community_size": 0,
                "smallest_community_size": 0
            }
        
        # 计算统计信息
        total_communities = len(communities_df)
        max_level = int(communities_df['level'].max()) if 'level' in communities_df.columns else 0
        
        # 计算社区大小统计
        if 'size' in communities_df.columns:
            sizes = communities_df['size']
            avg_size = float(sizes.mean())
            largest_size = int(sizes.max())
            smallest_size = int(sizes.min())
        else:
            avg_size = 0.0
            largest_size = 0
            smallest_size = 0
        
        return {
            "total_communities": total_communities,
            "max_level": max_level,
            "avg_community_size": avg_size,
            "largest_community_size": largest_size,
            "smallest_community_size": smallest_size
        }

# 创建全局实例
try:
    community_detector_integration = CommunityDetectorIntegration()
except Exception as e:
    community_detector_integration = None
    logger.warning(f"CommunityDetectorIntegration初始化失败: {e}")
import pandas as pd
import numpy as np
import networkx as nx
from typing import Tuple, Any


class GraphPruner:
    """基于图重要性的剪枝"""
    
    def __init__(
        self,
        alpha: float = 0.3,
        beta: float = 0.2,
        gamma: float = 0.5,
        top_percent: float = 0.3,
        min_edge_weight: float = 0.8
    ):
        """
        初始化图剪枝器
        
        Args:
            alpha: degree_centrality 权重
            beta: weighted_degree 权重
            gamma: theme_similarity 权重
            top_percent: 保留的核心实体百分比（0-1之间，例如0.3表示保留30%的实体）
            min_edge_weight: 最小边权重阈值（归一化后的值，原始值6对应0.6）
        """
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma
        self.top_percent = top_percent
        self.min_edge_weight = min_edge_weight
        
    def prune_graph(
        self, 
        entities_df: pd.DataFrame, 
        relationships_df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        执行图剪枝
        
        Args:
            entities_df: 实体DataFrame，包含列: id, title, theme_similarity等
            relationships_df: 关系DataFrame，包含列: id, source, target, weight等
        
        Returns:
            (entities_sub_df, relationships_sub_df): 剪枝后的实体和关系DataFrame
        """
        # 步骤 1.1: 构建知识图谱
        G = self._build_graph(entities_df, relationships_df)
        
        # 步骤 1.2: 计算节点重要性
        importance_scores = self._calculate_importance(G, entities_df)
        
        # 步骤 1.3: 筛选 Top-K 核心实体
        top_entities = self._select_top_entities(importance_scores)
        
        # 步骤 1.4 & 1.5: 提取子图并汇总为DataFrame
        entities_sub_df, relationships_sub_df = self._extract_subgraph(
            entities_df, relationships_df, top_entities
        )
        
        return entities_sub_df, relationships_sub_df
    
    def _build_graph(
        self, 
        entities_df: pd.DataFrame, 
        relationships_df: pd.DataFrame
    ) -> Any:
        """构建知识图谱"""
        G = nx.Graph()
        
        # 添加节点（使用title作为节点名，保留id作为属性）
        for _, row in entities_df.iterrows():
            G.add_node(row['title'], entity_id=row['id'])
        
        # 添加边（归一化权重：原始值1-10除以10）
        for _, row in relationships_df.iterrows():
            normalized_weight = row['weight'] / 10.0
            G.add_edge(
                row['source'], 
                row['target'], 
                weight=normalized_weight,
                relationship_id=row['id']
            )
        
        return G
    
    def _calculate_degree_centrality_normalized(self, G: Any, node: str) -> float:
        """
        计算对数归一化的度中心性
        
        使用公式: log(degree + 1) / log(max_degree + 1)
        范围在 [0, 1] 之间
        """
        degree_view = G.degree()
        degree = degree_view[node]
        max_degree = max([d for _, d in degree_view]) if G.number_of_nodes() > 0 else 1
        
        if max_degree == 0:
            return 0.0
        
        # 对数归一化
        normalized = np.log(degree + 1) / np.log(max_degree + 1)
        return float(normalized)
    
    def _calculate_weighted_degree(self, G: Any, node: str) -> float:
        """
        计算加权度（所有邻接边的weight的平均数）
        """
        edges = G.edges(node, data=True)
        weights = [data['weight'] for _, _, data in edges if 'weight' in data]
        
        if not weights:
            return 0.0
        
        return float(np.mean(weights))
    
    def _get_theme_similarity(self, entities_df: pd.DataFrame, node_title: str) -> float:
        """获取节点的主题相似度"""
        # 从entities_df中查找对应节点的theme_similarity
        entity_row = entities_df[entities_df['title'] == node_title]
        
        if entity_row.empty:
            return 0.0
        
        # 假设theme_similarity字段存在
        if 'theme_similarity' in entity_row.columns:
            return float(entity_row.iloc[0]['theme_similarity'])
        else:
            return 0.0
    
    def _calculate_importance(
        self, 
        G: Any, 
        entities_df: pd.DataFrame
    ) -> dict:
        """
        计算节点重要性得分
        
        importance(v) = α * degree_centrality(v) + β * weighted_degree(v) + γ * theme_similarity(v)
        """
        importance_scores = {}
        
        for node in G.nodes():
            degree_cent = self._calculate_degree_centrality_normalized(G, node)
            weighted_deg = self._calculate_weighted_degree(G, node)
            theme_sim = self._get_theme_similarity(entities_df, node)
            
            importance = (
                self.alpha * degree_cent +
                self.beta * weighted_deg +
                self.gamma * theme_sim
            )
            
            importance_scores[node] = importance
        
        return importance_scores
    
    def _select_top_entities(self, importance_scores: dict) -> set:
        """筛选核心实体（按百分比）"""
        # 按重要性得分排序
        sorted_entities = sorted(
            importance_scores.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        # 计算需要保留的实体数量（总数 × 百分比）
        total_entities = len(sorted_entities)
        top_k = max(1, int(total_entities * self.top_percent))  # 至少保留1个实体
        
        # 取前top_k个节点
        top_entities = set([title for title, _ in sorted_entities[:top_k]])
        
        return top_entities
    
    def _extract_subgraph(
        self,
        entities_df: pd.DataFrame,
        relationships_df: pd.DataFrame,
        top_entities: set
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        提取子图并生成新的DataFrame
        
        - 仅保留选中的节点及其之间的边
        - 边也需 weight ≥ min_edge_weight（归一化后）
        """
        # 筛选实体：保留在top_entities中的实体
        entities_sub_df = entities_df[entities_df['title'].isin(top_entities)].copy()
        
        # 筛选关系：
        # 1. source和target都在top_entities中
        # 2. weight >= min_edge_weight * 10（因为原始weight是1-10）
        min_weight_original = self.min_edge_weight * 10
        
        relationships_sub_df = relationships_df[
            (relationships_df['source'].isin(top_entities)) &
            (relationships_df['target'].isin(top_entities)) &
            (relationships_df['weight'] >= min_weight_original)
        ].copy()
        
        return entities_sub_df, relationships_sub_df

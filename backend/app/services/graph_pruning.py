import pandas as pd
import networkx as nx
from typing import Set, Tuple, Optional


class GraphPruning:
    def __init__(
        self,
        alpha: float = 0.3,
        beta: float = 0.5,
        gamma: float = 0.2,
        top_n: int = 50,
        min_edge_weight: float = 6.0,
        high_weight_threshold: float = 9.0,
        forced_types: Optional[Set[str]] = None,
        forced_time_periods: Optional[Set[str]] = None
    ):
        """
        初始化图剪枝器
        
        Args:
            alpha: 度中心性权重系数
            beta: 加权度权重系数
            gamma: 主题相似度权重系数
            top_n: 保留的核心节点数量
            min_edge_weight: 最小边权重阈值
            high_weight_threshold: 高权重边阈值（强制保留相关节点）
            forced_types: 强制保留的节点类型集合
            forced_time_periods: 强制保留的时间节点集合
        """
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma
        self.top_n = top_n
        self.min_edge_weight = min_edge_weight
        self.high_weight_threshold = high_weight_threshold
        self.forced_types = forced_types or {"heritage_site"}
        self.forced_time_periods = forced_time_periods or set()
        
    def prune_graph(
        self,
        entities_df: pd.DataFrame,
        relationships_df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        从原始图中提取高信息密度、低冗余的子图
        
        Args:
            entities_df: 实体DataFrame，包含列：title, type, normalized_date, description
            relationships_df: 关系DataFrame，包含列：source, target, weight
            
        Returns:
            (pruned_entities_df, pruned_relationships_df): 剪枝后的实体和关系DataFrame
        """
        # 数据清洗：删除没有 id 的实体行
        entities_df = self._clean_entities(entities_df)
        
        # 步骤 1.1：构建知识图谱
        G = self._build_graph(entities_df, relationships_df)
        
        # 步骤 1.2：计算节点重要性
        importance_scores = self._calculate_importance(G, entities_df)
        
        # 步骤 1.3：筛选 Top-K 核心实体
        selected_nodes = self._select_core_entities(
            G, entities_df, relationships_df, importance_scores
        )
        
        # 步骤 1.4：提取子图
        pruned_entities_df, pruned_relationships_df = self._extract_subgraph(
            entities_df, relationships_df, selected_nodes
        )
        
        return pruned_entities_df, pruned_relationships_df
    
    def _clean_entities(self, entities_df: pd.DataFrame) -> pd.DataFrame:
        """清洗实体数据，删除没有 id 的行"""
        if entities_df.empty:
            return entities_df
        
        # 检查是否有 id 列
        if 'id' not in entities_df.columns:
            return entities_df
        
        # 删除 id 为空的行
        cleaned_df = entities_df[entities_df['id'].notna()].copy()
        
        return cleaned_df
    
    def _build_graph(
        self,
        entities_df: pd.DataFrame,
        relationships_df: pd.DataFrame
    ) -> nx.Graph:
        """构建带权重的无向图"""
        G = nx.Graph()
        
        # 添加节点（使用 title 作为节点名）
        for _, row in entities_df.iterrows():
            G.add_node(
                row['title'],
                type=row.get('type', ''),
                normalized_date=row.get('normalized_date', ''),
                description=row.get('description', '')
            )
        
        # 添加边
        for _, row in relationships_df.iterrows():
            G.add_edge(
                row['source'],
                row['target'],
                weight=row.get('weight', 1.0)
            )
        
        return G
    
    def _calculate_importance(
        self,
        G: nx.Graph,
        entities_df: pd.DataFrame
    ) -> dict:
        """计算节点综合重要性得分"""
        importance = {}
        
        # 计算度中心性
        degree_centrality = nx.degree_centrality(G)
        
        # 计算加权度（所有邻接边的权重之和）
        weighted_degree = {}
        for node in G.nodes():
            weighted_degree[node] = sum(
                G[node][neighbor].get('weight', 1.0)
                for neighbor in G.neighbors(node)
            )
        
        # 归一化加权度
        max_weighted_degree = max(weighted_degree.values()) if weighted_degree else 1.0
        if max_weighted_degree > 0:
            weighted_degree = {
                k: v / max_weighted_degree 
                for k, v in weighted_degree.items()
            }
        
        # 获取主题相似度（从实体描述或属性中获取，这里假设为0.5）
        theme_similarity = {}
        entity_dict = entities_df.set_index('title').to_dict('index')
        for node in G.nodes():
            # 这里使用默认值，实际应用中可以根据实体属性计算
            theme_similarity[node] = 0.5
        
        # 计算综合重要性
        for node in G.nodes():
            importance[node] = (
                self.alpha * degree_centrality.get(node, 0) +
                self.beta * weighted_degree.get(node, 0) +
                self.gamma * theme_similarity.get(node, 0)
            )
        
        return importance
    
    def _select_core_entities(
        self,
        G: nx.Graph,
        entities_df: pd.DataFrame,
        relationships_df: pd.DataFrame,
        importance_scores: dict
    ) -> Set[str]:
        """筛选核心实体节点"""
        selected_nodes = set()
        
        # 1. 按重要性排序，取 Top-N
        sorted_nodes = sorted(
            importance_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        top_nodes = {node for node, _ in sorted_nodes[:self.top_n]}
        selected_nodes.update(top_nodes)
        
        # 2. 强制保留特定类型的节点
        entity_dict = entities_df.set_index('title').to_dict('index')
        for node in G.nodes():
            if node in entity_dict:
                node_type = entity_dict[node].get('type', '')
                normalized_date = entity_dict[node].get('normalized_date', '')
                
                # 强制保留的类型
                if node_type in self.forced_types:
                    selected_nodes.add(node)
                
                # 强制保留的时间节点
                if (node_type == 'time_period' and 
                    normalized_date in self.forced_time_periods):
                    selected_nodes.add(node)
        
        # 3. 强制保留高权重边的两端节点
        high_weight_edges = relationships_df[
            relationships_df['weight'] >= self.high_weight_threshold
        ]
        for _, row in high_weight_edges.iterrows():
            selected_nodes.add(row['source'])
            selected_nodes.add(row['target'])
        
        return selected_nodes
    
    def _extract_subgraph(
        self,
        entities_df: pd.DataFrame,
        relationships_df: pd.DataFrame,
        selected_nodes: Set[str]
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """提取子图的实体和关系"""
        # 筛选实体
        pruned_entities_df = entities_df[
            entities_df['title'].isin(selected_nodes)
        ].copy()
        
        # 筛选关系（仅保留选中节点之间的边，且权重 >= 阈值）
        pruned_relationships_df = relationships_df[
            (relationships_df['source'].isin(selected_nodes)) &
            (relationships_df['target'].isin(selected_nodes)) &
            (relationships_df['weight'] >= self.min_edge_weight)
        ].copy()
        
        return pruned_entities_df, pruned_relationships_df

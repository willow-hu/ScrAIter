"""
GraphRAG社区检测器
实现基于NetworkX和Leiden/Louvain算法的社区检测功能
集成了完整的业务逻辑和数据格式化
"""
import logging
import hashlib
from typing import Dict, Any, List, Tuple
import pandas as pd
import networkx as nx

logger = logging.getLogger(__name__)


class CommunityDetector:
    """社区检测器，支持多种算法"""
    
    def __init__(self, algorithm: str = "louvain", resolution: float = 1.0):
        """初始化社区检测器
        
        Args:
            algorithm: 社区检测算法 ("louvain", "leiden", "label_propagation")
            resolution: 分辨率参数，控制社区大小
        """
        self.algorithm = algorithm.lower()
        self.resolution = resolution
        
        # 检查算法可用性
        self._check_algorithm_availability()
    
    def _check_algorithm_availability(self):
        """检查算法库的可用性"""
        self.available_algorithms = []
        
        # 检查NetworkX内置算法
        try:
            from networkx.algorithms import community as nx_community
            self.available_algorithms.extend(["louvain", "label_propagation"])
        except ImportError:
            logger.warning("NetworkX社区检测算法不可用")
        
        # 检查python-louvain (community包)
        try:
            import community as community_louvain
            self.community_louvain = community_louvain
            if "louvain" not in self.available_algorithms:
                self.available_algorithms.append("louvain")
        except ImportError:
            self.community_louvain = None
            logger.warning("python-louvain包不可用，建议安装: pip install python-louvain")
        
        # 检查leidenalg
        try:
            import leidenalg
            import igraph as ig
            self.leidenalg = leidenalg
            self.igraph = ig
            self.available_algorithms.append("leiden")
        except ImportError:
            self.leidenalg = None
            self.igraph = None
            logger.warning("Leiden算法不可用，建议安装: pip install leidenalg python-igraph")
        
        if not self.available_algorithms:
            logger.error("没有可用的社区检测算法，请安装相关依赖")
            self.available_algorithms = ["simple"]  # 添加简单算法作为后备
        
        logger.info(f"可用的社区检测算法: {self.available_algorithms}")
        
        # 如果请求的算法不可用，使用第一个可用的
        if self.algorithm not in self.available_algorithms:
            original_algorithm = self.algorithm
            self.algorithm = self.available_algorithms[0]
            logger.warning(f"算法{original_algorithm}不可用，使用{self.algorithm}代替")
    
    def detect_communities(self, entities_df: pd.DataFrame, relationships_df: pd.DataFrame) -> pd.DataFrame:
        """检测社区并返回社区信息
        
        Args:
            entities_df: 实体DataFrame
            relationships_df: 关系DataFrame
            
        Returns:
            communities_df: 社区信息DataFrame
        """
        try:
            if entities_df.empty:
                logger.warning("实体数据为空，跳过社区检测")
                return self._empty_communities_dataframe()
            
            if relationships_df.empty:
                logger.warning("关系数据为空，每个实体作为独立社区")
                return self._create_single_entity_communities(entities_df)
            
            logger.info(f"开始社区检测: {len(entities_df)} 个实体, {len(relationships_df)} 个关系")
            
            # 构建图
            G = self._build_graph(entities_df, relationships_df)
            
            if G.number_of_nodes() == 0:
                logger.warning("图中没有节点，跳过社区检测")
                return self._empty_communities_dataframe()
            
            logger.info(f"图包含{G.number_of_nodes()}个节点，{G.number_of_edges()}条边")
            
            # 执行社区检测
            if self.algorithm == "leiden" and self.leidenalg:
                communities = self._detect_leiden(G)
            elif self.algorithm == "louvain" and ("louvain" in self.available_algorithms):
                communities = self._detect_louvain(G)
            elif self.algorithm == "label_propagation":
                communities = self._detect_label_propagation(G)
            else:
                # 简单的后备算法
                communities = self._detect_simple(G)
            
            # 格式化社区数据
            communities_df = self._format_communities(communities, entities_df)
            
            # 格式化社区数据以便存储
            communities_df = self.format_communities_for_storage(communities_df)
            
            logger.info(f"社区检测完成: 发现 {len(communities_df)} 个社区")
            
            return communities_df
            
        except Exception as e:
            logger.error(f"社区检测失败: {e}")
            return self._empty_communities_dataframe()
    
    def _build_graph(self, entities_df: pd.DataFrame, relationships_df: pd.DataFrame) -> nx.Graph:
        """从实体和关系构建NetworkX图"""
        G = nx.Graph()
        
        # 添加节点（实体）
        for _, entity in entities_df.iterrows():
            G.add_node(entity['title'], **{
                'id': entity['id'],
                'type': entity['type'],
                'description': entity.get('description', ''),
                'degree': entity.get('degree', 0)
            })
        
        # 添加边（关系）
        for _, relationship in relationships_df.iterrows():
            source = relationship['source']
            target = relationship['target']
            weight = relationship.get('weight', 1.0)
            
            # 只添加存在的节点之间的边
            if G.has_node(source) and G.has_node(target):
                G.add_edge(source, target, weight=weight, **{
                    'id': relationship['id'],
                    'description': relationship.get('description', '')
                })
        
        return G
    
    def _detect_leiden(self, G: nx.Graph) -> List[List[str]]:
        """使用Leiden算法检测社区"""
        try:
            # 转换为igraph格式
            g = self.igraph.Graph.from_networkx(G)
            
            # 执行Leiden算法
            partition = self.leidenalg.find_partition(
                g, 
                self.leidenalg.RBConfigurationVertexPartition,
                resolution_parameter=self.resolution
            )
            
            # 转换回节点名称
            communities = []
            for community in partition:
                community_nodes = [g.vs[node]['_nx_name'] for node in community]
                communities.append(community_nodes)
            
            return communities
            
        except Exception as e:
            logger.error(f"Leiden算法执行失败: {e}")
            return self._detect_simple(G)
    
    def _detect_louvain(self, G: nx.Graph) -> List[List[str]]:
        """使用Louvain算法检测社区"""
        try:
            if self.community_louvain:
                # 使用python-louvain包
                partition = self.community_louvain.best_partition(G, resolution=self.resolution)
            else:
                # 使用NetworkX内置的贪婪模块化算法
                from networkx.algorithms import community as nx_community
                communities_gen = nx_community.greedy_modularity_communities(G, resolution=self.resolution)
                
                # 转换为我们的格式
                communities = []
                for community_set in communities_gen:
                    communities.append(list(community_set))
                return communities
            
            # 将分区字典转换为社区列表
            communities_dict = {}
            for node, community_id in partition.items():
                if community_id not in communities_dict:
                    communities_dict[community_id] = []
                communities_dict[community_id].append(node)
            
            return list(communities_dict.values())
            
        except Exception as e:
            logger.error(f"Louvain算法执行失败: {e}")
            return self._detect_simple(G)
    
    def _detect_label_propagation(self, G: nx.Graph) -> List[List[str]]:
        """使用标签传播算法检测社区"""
        try:
            from networkx.algorithms import community as nx_community
            communities_gen = nx_community.label_propagation_communities(G)
            
            communities = []
            for community_set in communities_gen:
                communities.append(list(community_set))
            
            return communities
            
        except Exception as e:
            logger.error(f"标签传播算法执行失败: {e}")
            return self._detect_simple(G)
    
    def _detect_simple(self, G: nx.Graph) -> List[List[str]]:
        """简单的连通组件算法作为后备方案"""
        logger.info("使用简单连通组件算法")
        
        # 使用连通组件作为社区
        communities = []
        for component in nx.connected_components(G):
            if len(component) > 1:  # 只保留多于1个节点的组件
                communities.append(list(component))
        
        # 如果没有大的连通组件，为度数高的节点创建单独的社区
        if not communities:
            # 简单地为每个节点创建单独的社区
            for node in list(G.nodes())[:10]:  # 最多10个单节点社区
                communities.append([node])
        
        return communities
    
    def _format_communities(self, communities: List[List[str]], entities_df: pd.DataFrame) -> pd.DataFrame:
        """格式化社区数据为DataFrame"""
        formatted_communities = []
        
        for i, community_nodes in enumerate(communities):
            if not community_nodes:
                continue
            
            community_title = f"社区_{i}"
            community_id = self._generate_community_id(community_title, i)
            
            # 获取社区中实体的详细信息
            community_entities = entities_df[entities_df['title'].isin(community_nodes)]
            entity_ids = community_entities['id'].tolist()
            
            # 计算社区统计
            size = len(community_nodes)
            
            community_info = {
                'id': community_id,
                'title': community_title,
                'level': 0,  # 基础级别
                'community': i,
                'parent': None,  # 顶级社区没有父级
                'entity_ids': entity_ids,
                'size': size
            }
            
            formatted_communities.append(community_info)
        
        if not formatted_communities:
            return self._empty_communities_dataframe()
        
        communities_df = pd.DataFrame(formatted_communities)
        
        # 更新实体的社区信息
        self._update_entity_communities(entities_df, communities)
        
        return communities_df
    
    def _update_entity_communities(self, entities_df: pd.DataFrame, communities: List[List[str]]):
        """更新实体DataFrame中的社区信息"""
        # 创建节点到社区ID的映射
        node_to_community = {}
        for community_id, nodes in enumerate(communities):
            for node in nodes:
                node_to_community[node] = community_id
        
        # 更新实体的社区字段
        entities_df['community'] = entities_df['title'].map(node_to_community)
    
    def _generate_community_id(self, title: str, index: int) -> str:
        """为社区生成唯一ID"""
        content = f"{title}_{index}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def _empty_communities_dataframe(self) -> pd.DataFrame:
        """返回空的社区DataFrame"""
        return pd.DataFrame(columns=['id', 'title', 'level', 'community', 'parent', 'entity_ids', 'size'])
    
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
        """获取社区统计信息"""
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
            "smallest_community_size": smallest_size,
            'size_distribution': {
                'small': len([s for s in sizes if s <= 3]) if 'size' in communities_df.columns else 0,
                'medium': len([s for s in sizes if 4 <= s <= 10]) if 'size' in communities_df.columns else 0,
                'large': len([s for s in sizes if s > 10]) if 'size' in communities_df.columns else 0
            }
        }


# 创建全局实例，同时保持向后兼容
try:
    community_detector = CommunityDetector()
except Exception as e:
    community_detector = None
    logger.warning(f"CommunityDetector初始化失败: {e}")
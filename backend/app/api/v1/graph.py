"""
GraphRAG图数据查询API端点
提供实体、关系、社区等图数据的查询接口
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.models.graph_models import (
    GraphEntitiesResponse, GraphRelationshipsResponse, GraphCommunitiesResponse,
    GraphStatistics
)
from app.services.graph_service import graph_service

router = APIRouter()

@router.get("/knowledge-base/{kb_name}/graph/entities", response_model=GraphEntitiesResponse)
async def get_graph_entities(
    kb_name: str,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=200, description="每页大小"),
    entity_type: Optional[str] = Query(None, description="实体类型筛选")
):
    """
    查询知识库中的实体列表
    
    Args:
        kb_name: 知识库名称
        page: 页码
        page_size: 每页大小
        entity_type: 实体类型筛选
        
    Returns:
        分页的实体数据
    """
    try:
        if not kb_name or not kb_name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        result = graph_service.load_graph_entities(
            kb_name=kb_name.strip(),
            page=page,
            page_size=page_size,
            entity_type=entity_type
        )
        
        # 转换为GraphEntity模型
        from app.models.graph_models import GraphEntity
        entities = [GraphEntity(**entity) for entity in result["entities"]]
        
        return GraphEntitiesResponse(
            entities=entities,
            total=result["total"],
            page=result["page"],
            page_size=result["page_size"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询实体数据失败: {str(e)}")

@router.get("/knowledge-base/{kb_name}/graph/relationships", response_model=GraphRelationshipsResponse)
async def get_graph_relationships(
    kb_name: str,
    source_entity: Optional[str] = Query(None, description="源实体筛选"),
    target_entity: Optional[str] = Query(None, description="目标实体筛选")
):
    """
    查询实体关系列表
    
    Args:
        kb_name: 知识库名称
        source_entity: 源实体筛选
        target_entity: 目标实体筛选
        
    Returns:
        关系数据
    """
    try:
        if not kb_name or not kb_name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        result = graph_service.load_graph_relationships(
            kb_name=kb_name.strip(),
            source_entity=source_entity,
            target_entity=target_entity
        )
        
        # 转换为GraphRelationship模型
        from app.models.graph_models import GraphRelationship
        relationships = [GraphRelationship(**relationship) for relationship in result["relationships"]]
        
        return GraphRelationshipsResponse(
            relationships=relationships,
            total=result["total"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询关系数据失败: {str(e)}")

@router.get("/knowledge-base/{kb_name}/graph/communities", response_model=GraphCommunitiesResponse)
async def get_graph_communities(
    kb_name: str,
    level: Optional[int] = Query(None, ge=0, description="层级筛选")
):
    """
    查询社区层次结构
    
    Args:
        kb_name: 知识库名称
        level: 层级筛选
        
    Returns:
        社区数据
    """
    try:
        if not kb_name or not kb_name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        result = graph_service.load_graph_communities(
            kb_name=kb_name.strip(),
            level=level
        )
        
        # 转换为GraphCommunity模型
        from app.models.graph_models import GraphCommunity
        communities = [GraphCommunity(**community) for community in result["communities"]]
        
        return GraphCommunitiesResponse(
            communities=communities,
            total=result["total"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询社区数据失败: {str(e)}")

@router.get("/knowledge-base/{kb_name}/graph/statistics", response_model=GraphStatistics)
async def get_graph_statistics(kb_name: str):
    """
    获取图统计信息
    
    Args:
        kb_name: 知识库名称
        
    Returns:
        图统计数据
    """
    try:
        if not kb_name or not kb_name.strip():
            raise HTTPException(status_code=400, detail="知识库名称不能为空")
        
        stats = graph_service.get_graph_statistics(kb_name.strip())
        
        return GraphStatistics(**stats)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取图统计信息失败: {str(e)}")


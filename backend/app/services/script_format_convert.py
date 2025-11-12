"""
脚本格式转换服务
职责：在创作格式与游戏运行格式之间进行转换。
"""
from typing import Dict, Any, List


def fill_image_paths(script_data: Dict[str, Any], project_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    步骤1：填写图像资源路径
    
    为每个节点填充 npc_pic 和 bg 字段
    - npc_pic: 从 character_list 中根据 role 字段查找对应的 portrait
    - bg: 从 background_pool 中根据节点 id 查找对应的 filename，若无则使用 default_background
    
    Args:
        script_data: 脚本数据
        project_info: 项目信息
        
    Returns:
        填充后的脚本数据
        
    Raises:
        ValueError: 当角色或背景图未找到时抛出异常
    """
    import copy
    script_data = copy.deepcopy(script_data)
    
    # 获取角色列表和背景池
    character_list = project_info.get('character_list', [])
    background_pool = project_info.get('background_pool', [])
    default_background = project_info.get('default_background', '')
    
    # 构建角色名称到portrait的映射
    character_map = {char['name']: char.get('portrait', '') for char in character_list}
    
    # 构建节点ID到背景图filename的映射
    bg_map = {}
    for bg_item in background_pool:
        for node_id in bg_item.get('used_by', []):
            bg_map[node_id] = bg_item['filename']
    
    # 查找默认背景图的filename
    default_bg_filename = None
    if default_background:
        for bg_item in background_pool:
            if bg_item['id'] == default_background:
                default_bg_filename = bg_item['filename']
                break
    
    # 遍历所有节点
    structure = script_data.get('structure', [])
    for node in structure:
        node_id = node.get('id')
        role = node.get('role', '')
        
        # 填充 npc_pic
        if not role:
            raise ValueError(f"节点 {node_id} 的 role 字段为空")
        
        if role not in character_map:
            raise ValueError(f"节点 {node_id} 的角色 '{role}' 在 character_list 中未找到")
        
        npc_pic = character_map[role]
        if not npc_pic:
            raise ValueError(f"角色 '{role}' 的 portrait 字段为空")
        
        node['npc_pic'] = npc_pic
        
        # 填充 bg
        if node_id in bg_map:
            node['bg'] = bg_map[node_id]
        else:
            # 使用默认背景图
            if not default_background:
                raise ValueError(f"节点 {node_id} 没有指定背景图，且 default_background 字段为空")
            
            if not default_bg_filename:
                raise ValueError(f"默认背景图 ID '{default_background}' 在 background_pool 中未找到")
            
            node['bg'] = default_bg_filename
    
    return script_data


def convert_to_game_format(script_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    步骤2：转换为游戏特定格式
    
    将树状结构的脚本转换为游戏所需的扁平化场景格式
    - 键名: scene_{节点ID}
    - 保留字段: role, npc_pic, content, bg
    - 转换 child_ids 为 options 列表
    
    Args:
        script_data: 填充后的脚本数据
        
    Returns:
        游戏格式的脚本数据
    """
    game_script = {}
    structure = script_data.get('structure', [])
    
    # 构建节点ID到节点的映射，方便查找子节点
    node_map = {node['id']: node for node in structure}
    
    for node in structure:
        node_id = node.get('id')
        scene_key = f"scene_{node_id}"
        
        # 构建场景数据
        scene_data = {
            'role': node.get('role', ''),
            'npc_pic': node.get('npc_pic', ''),
            'bg': node.get('bg', ''),
            'content': node.get('content', '')
        }
        
        # 构建 options 列表
        options = []
        child_ids = node.get('child_ids', [])
        
        for child_id in child_ids:
            if child_id in node_map:
                child_node = node_map[child_id]
                option = {
                    'user': child_node.get('user', ''),
                    'next': f"scene_{child_id}"
                }
                options.append(option)
        
        scene_data['options'] = options
        game_script[scene_key] = scene_data
    
    return game_script


def authoring_to_game(script: Dict[str, Any]) -> Dict[str, Any]:
    """
    将创作格式脚本转换为游戏所需格式。
    
    注意：此函数不执行步骤1（填写图像路径），仅执行步骤2（格式转换）
    步骤1应在导出服务中单独调用
    
    Args:
        script: 创作格式脚本（已填充图像路径）
        
    Returns:
        游戏格式脚本
    """
    return convert_to_game_format(script)

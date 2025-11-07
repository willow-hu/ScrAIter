"""
脚本格式转换服务
职责：在创作格式与游戏运行格式之间进行转换。
注意：当前仅提供函数签名和占位实现（不改变数据），供后续填充具体转换逻辑。
"""
from typing import Dict, Any


def authoring_to_game(script: Dict[str, Any]) -> Dict[str, Any]:
    """将创作格式脚本转换为游戏所需格式。

    约定：占位实现，当前直接返回原始数据，不做转换。
    后续实现时，请保证：
    - 输入：创作格式脚本（Dict）
    - 输出：游戏格式脚本（Dict）
    - 如遇缺失字段或不兼容结构，应进行容错处理或抛出明确异常。
    """
    # TODO: 实现具体转换逻辑
    return script

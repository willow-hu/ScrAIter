"""
测试大纲生成功能
"""
import os
import sys
import json

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.outline_generation_service import outline_generation_service

def test_outline_generation(kb_name: str):
    """
    测试大纲生成
    
    Args:
        kb_name: 知识库名称
    """
    print(f"=" * 60)
    print(f"开始测试大纲生成功能")
    print(f"知识库: {kb_name}")
    print(f"=" * 60)
    
    try:
        # 调用大纲生成服务
        result = outline_generation_service.generate_outline(kb_name)
        
        # 打印结果
        print(f"\n✅ 生成结果:")
        print(f"成功: {result['success']}")
        print(f"消息: {result['message']}")
        
        if result['success']:
            print(f"保存路径: {result['outline_path']}")
            print(f"节点数量: {len(result['structure'])}")
            
            # 保存详细结果到文件
            output_file = f"test_outline_{kb_name}_result.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"\n详细结果已保存到: {output_file}")
            
        else:
            print(f"\n❌ 生成失败: {result['message']}")
            
    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # 从命令行获取知识库名称，或使用默认值
    if len(sys.argv) > 1:
        kb_name = sys.argv[1]
    else:
        # 默认使用twin_pagoda（如果存在）
        kb_name = "twin_pagoda"
        print(f"未指定知识库名称，使用默认值: {kb_name}")
        print(f"用法: python test_outline_generation.py <知识库名称>")
        print()
    
    test_outline_generation(kb_name)

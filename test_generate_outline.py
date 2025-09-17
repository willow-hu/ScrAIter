#!/usr/bin/env python
"""
测试生成大纲功能
"""
import os
import json
import requests

def test_generate_outline():
    """测试生成大纲API"""
    
    # 测试数据
    test_data = {
        "kb_name": "twin_pagoda",
        "global_context": {
            "site_name": "双塔寺",
            "narrator_role": "导游",
            "character_setting": "热情友好的专业导游",
            "knowledge_base_name": "twin_pagoda",
            "other_requirements": "请生成有趣的交互式剧本"
        }
    }
    
    # 发送请求
    try:
        print("正在测试生成大纲API...")
        response = requests.post(
            "http://localhost:8000/api/v1/generate/structure",
            json=test_data,
            timeout=30
        )
        
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("生成成功!")
            print(f"生成ID: {result.get('generation_id')}")
            print(f"消息: {result.get('message')}")
            print(f"文件路径: {result.get('file_path')}")
            
            # 验证文件是否创建
            file_path = result.get('file_path')
            if file_path and os.path.exists(file_path):
                print(f"✅ 文件已成功创建: {file_path}")
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                    print("文件内容:")
                    print(json.dumps(content, ensure_ascii=False, indent=2))
            else:
                print(f"❌ 文件创建失败: {file_path}")
        else:
            print("生成失败:")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到后端服务，请确保后端服务正在运行")
    except Exception as e:
        print(f"❌ 测试失败: {e}")

if __name__ == "__main__":
    test_generate_outline()
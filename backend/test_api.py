"""
API测试脚本
用于测试RAG相关的API功能
"""
import requests
import json
import os

BASE_URL = "http://localhost:8000/api/v1"

def test_api_endpoints():
    """测试所有API端点"""
    
    print("🚀 开始测试API端点...")
    
    # 1. 测试获取文件列表
    print("\n1. 测试获取文件列表")
    try:
        response = requests.get(f"{BASE_URL}/files")
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   文件数量: {data['total_count']}")
        else:
            print(f"   错误: {response.text}")
    except Exception as e:
        print(f"   异常: {e}")
    
    # 2. 测试获取知识库状态
    print("\n2. 测试获取知识库状态")
    try:
        response = requests.get(f"{BASE_URL}/knowledge-base/status")
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   知识库已构建: {data['is_built']}")
            print(f"   文件数量: {data['file_count']}")
        else:
            print(f"   错误: {response.text}")
    except Exception as e:
        print(f"   异常: {e}")
    
    # 3. 测试生成剧本结构
    print("\n3. 测试生成剧本结构")
    try:
        response = requests.post(f"{BASE_URL}/generate/structure")
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   生成ID: {data.get('generation_id', 'N/A')}")
            print(f"   消息: {data.get('message', 'N/A')}")
            if 'structure' in data:
                print(f"   结构根节点: {data['structure'].get('name', 'N/A')}")
        else:
            print(f"   错误: {response.text}")
    except Exception as e:
        print(f"   异常: {e}")
    
    # 4. 测试生成节点内容
    print("\n4. 测试生成节点内容")
    try:
        test_request = {
            "node_info": {
                "name": "景点简介",
                "abstract": "罗汉院双塔与正殿遗址的历史地位、建造背景与整体价值概述",
                "user": "这里是什么地方？能给我介绍一下吗？",
                "character": "慧远禅师"
            },
            "global_context": {
                "character_list": [
                    {
                        "name": "慧远禅师",
                        "description": "苏州罗汉院的住持，博学多才，了解双塔的历史文化",
                        "tone": "语气成熟、沧桑，而又亲切、吸引人",
                        "avatar": ""
                    }
                ],
                "site_name": "罗汉院双塔及正殿遗址",
                "other_requirements": ""
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/generate/node-content",
            json=test_request,
            headers={"Content-Type": "application/json"}
        )
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   生成ID: {data.get('generation_id', 'N/A')}")
            print(f"   节点名称: {data.get('node_name', 'N/A')}")
            print(f"   内容长度: {len(data.get('content', ''))}")
            # 保存generation_id用于后续测试
            global test_generation_id
            test_generation_id = data.get('generation_id')
        else:
            print(f"   错误: {response.text}")
    except Exception as e:
        print(f"   异常: {e}")
    
    # 4.5. 测试角色检索失败的情况
    print("\n4.5. 测试角色检索失败")
    try:
        test_request_invalid_character = {
            "node_info": {
                "name": "景点简介",
                "abstract": "罗汉院双塔与正殿遗址的历史地位、建造背景与整体价值概述",
                "user": "这里是什么地方？能给我介绍一下吗？",
                "character": "不存在的角色"  # 故意使用不存在的角色名
            },
            "global_context": {
                "character_list": [
                    {
                        "name": "慧远禅师",
                        "description": "苏州罗汉院的住持，博学多才，了解双塔的历史文化",
                        "tone": "语气成熟、沧桑，而又亲切、吸引人",
                        "avatar": ""
                    }
                ],
                "site_name": "罗汉院双塔及正殿遗址",
                "other_requirements": ""
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/generate/node-content",
            json=test_request_invalid_character,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   状态码: {response.status_code}")
        if response.status_code == 500:
            error_data = response.json()
            if "找不到指定的角色" in error_data.get("detail", ""):
                print("   ✅ 正确检测到角色不存在并返回错误")
            else:
                print(f"   ❌ 错误信息不符合预期: {error_data.get('detail', '')}")
        else:
            print(f"   ❌ 应该返回500错误，但返回了: {response.status_code}")
            print(f"   响应内容: {response.text}")
        
    except Exception as e:
        print(f"   异常: {e}")
    
    # 5. 测试获取生成历史
    print("\n5. 测试获取生成历史")
    try:
        response = requests.get(f"{BASE_URL}/generate/history")
        print(f"   状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   历史记录数: {data['total_count']}")
            if data['history']:
                latest = data['history'][0]
                print(f"   最新记录类型: {latest['generation_type']}")
                print(f"   最新记录状态: {'成功' if latest['success'] else '失败'}")
        else:
            print(f"   错误: {response.text}")
    except Exception as e:
        print(f"   异常: {e}")
    
    # 6. 测试获取RAG检索片段
    print("\n6. 测试获取RAG检索片段")
    try:
        if 'test_generation_id' in globals() and test_generation_id:
            response = requests.get(f"{BASE_URL}/rag/sources/{test_generation_id}")
            print(f"   状态码: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   检索片段数: {len(data['sources'])}")
                if data['sources']:
                    print(f"   最高分数: {max(s['score'] for s in data['sources'])}")
            else:
                print(f"   错误: {response.text}")
        else:
            print("   跳过: 没有可用的generation_id")
    except Exception as e:
        print(f"   异常: {e}")
    
    print("\n✅ API测试完成!")

if __name__ == "__main__":
    # 确保服务器正在运行
    try:
        response = requests.get("http://localhost:8000/")
        print("✅ 服务器正在运行")
        test_api_endpoints()
    except Exception as e:
        print(f"❌ 无法连接到服务器: {e}")
        print("请确保后端服务器正在运行 (python -m uvicorn app.main:app --reload)")

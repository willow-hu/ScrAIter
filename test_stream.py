#!/usr/bin/env python3
"""
测试流式输出功能的简单脚本
"""
import asyncio
import json
import requests

async def test_stream_generation():
    """测试流式生成功能"""
    url = "http://localhost:8000/api/v1/generate/node-content-stream"
    
    test_data = {
        "node_info": {
            "name": "测试节点",
            "abstract": "这是一个测试节点的摘要",
            "user": "用户测试选项",
            "id": "test_node_001"
        },
        "global_context": {
            "narrator_role": "博物馆讲解员",
            "site_name": "测试博物馆",
            "character_setting": "友好的导游"
        },
        "kb_name": "twin_pagoda"  # 如果有知识库的话
    }
    
    print("🚀 开始测试流式生成...")
    print(f"📤 请求数据: {json.dumps(test_data, ensure_ascii=False, indent=2)}")
    
    try:
        with requests.post(url, json=test_data, stream=True) as response:
            print(f"📡 响应状态: {response.status_code}")
            print(f"📋 响应头: {dict(response.headers)}")
            
            if response.status_code != 200:
                print(f"❌ 请求失败: {response.status_code} - {response.text}")
                return
            
            print("\n📥 流式输出内容:")
            print("-" * 50)
            
            buffer = ""
            for chunk in response.iter_content(chunk_size=1024, decode_unicode=True):
                if chunk:
                    buffer += chunk
                    
                    # 处理完整的事件
                    events = buffer.split('\n\n')
                    buffer = events.pop() or ''  # 保留不完整的事件
                    
                    for event in events:
                        if event.strip() == '':
                            continue
                            
                        lines = event.split('\n')
                        for line in lines:
                            if line.startswith('data: '):
                                try:
                                    data = json.loads(line[6:])
                                    event_type = data.get('type', 'unknown')
                                    
                                    if event_type == 'start':
                                        print(f"🎬 开始生成 - ID: {data['generation_id']}")
                                    elif event_type == 'rag_sources':
                                        print(f"📚 RAG检索到 {len(data['sources'])} 个相关片段")
                                    elif event_type == 'content':
                                        print(data['chunk'], end='', flush=True)
                                    elif event_type == 'complete':
                                        print(f"\n✅ 生成完成 - 总长度: {len(data['full_content'])} 字符")
                                    elif event_type == 'error':
                                        print(f"❌ 生成错误: {data['message']}")
                                    
                                except json.JSONDecodeError as e:
                                    print(f"⚠️ JSON解析错误: {e} - 数据: {line}")
            
            print("\n" + "-" * 50)
            print("🎉 测试完成!")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ 网络请求错误: {e}")
    except Exception as e:
        print(f"❌ 未知错误: {e}")

if __name__ == "__main__":
    print("🧪 流式生成测试工具")
    print("=" * 50)
    asyncio.run(test_stream_generation())
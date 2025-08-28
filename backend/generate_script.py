"""
generate_script.py 第二步的完整代码
1. 递归方式逐节点扩写
2. 编写结束语，两种结局
3. 删去结果文件中不需要的字段
"""
import os
import json
import argparse
from typing import Dict, List
from openai import OpenAI
from llama_index.core import StorageContext, load_index_from_storage, Settings
from llama_index.embeddings.dashscope import (
    DashScopeEmbedding,
    DashScopeTextEmbeddingModels,
    DashScopeTextEmbeddingType,
)
from llama_index.postprocessor.dashscope_rerank import DashScopeRerank

from node_expansion import load_prompt_template


Settings.embed_model = DashScopeEmbedding(
    model_name=DashScopeTextEmbeddingModels.TEXT_EMBEDDING_V2,
    text_type=DashScopeTextEmbeddingType.TEXT_TYPE_DOCUMENT,
)

client = OpenAI(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

def load_json_file(filepath: str) -> dict:
    """安全加载 JSON 文件"""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"配置文件未找到：{filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json_file(data: dict, filepath: str):
    """保存 JSON 文件"""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 已保存输出文件：{filepath}")


def load_prompt(prompt_file) -> str:
    """加载提示词"""
    if not os.path.exists(prompt_file):
        raise FileNotFoundError(f"提示词文件未找到：{prompt_file}")
    with open(prompt_file, 'r', encoding='utf-8') as f:
        return f.read().strip()

def clean_script(node):
    """递归清理节点，仅保留 name, user, content 字段"""
    cleaned = {
        "name": node.get("name", ""),
        "user": node.get("user", ""),
        "content": node.get("content", "")
    }
    if "child_nodes" in node and node["child_nodes"]:
        cleaned["child_nodes"] = [clean_script(child) for child in node["child_nodes"]]
    return cleaned

def retrieve_relevant_chunks(
    query: str,
    db_path: str,
    similarity_threshold: float = 0.5,
    chunk_cnt: int = 3
) -> str:
    """使用 llama_index 检索相关知识片段"""
    try:
        storage_context = StorageContext.from_defaults(persist_dir=db_path)
        index = load_index_from_storage(storage_context)
        retriever = index.as_retriever(similarity_top_k=20)
        retrieved_nodes = retriever.retrieve(query)

        reranker = DashScopeRerank(top_n=chunk_cnt, return_documents=True)
        ranked_nodes = reranker.postprocess_nodes(retrieved_nodes, query_str=query)

        context_str = ""
        for node in ranked_nodes:
            if node.score >= similarity_threshold:
                context_str += node.text + "\n\n"
        return context_str.strip()
    except Exception as e:
        print(f"[警告] RAG 检索失败：{e}")
        return ""


def generate_content_for_node(
    global_context: dict,
    node: dict,
    prompt_template: str,
    rag_db_path: str
) -> str:
    """为单个节点生成 content"""
    # 构造 node_info
    node_info = {
        "name": node.get("name", ""),
        "abstract": node.get("abstract", ""),
        "user": node.get("user", "请介绍一下这个部分。"),
        "parent_summary": node.get("parent_summary", ""),
        "child_nodes": [child.get("name", "") for child in node.get("children", [])]
    }

    # 填入 prompt
    try:
        filled_prompt = prompt_template.format(
            global_context=json.dumps(global_context, ensure_ascii=False, indent=2),
            node_info=json.dumps(node_info, ensure_ascii=False, indent=2)
        )
    except KeyError as e:
        raise ValueError(f"提示词模板占位符错误：{e}")

    # RAG 检索
    retrieval_query = f"{node_info['user']}"
    context_knowledge = retrieve_relevant_chunks(retrieval_query, rag_db_path)

    # 注入 context
    if "{context}" in filled_prompt:
        final_prompt = filled_prompt.format(context=context_knowledge)
    else:
        final_prompt = filled_prompt + "\n\n参考知识：\n" + context_knowledge

    # 调用 LLM
    try:
        completion = client.chat.completions.create(
            model="qwen-max",
            messages=[
                {"role": "system", "content": "你是一位经验丰富的交互剧情游戏设计师，严格按照要求生成对话脚本。"},
                {"role": "user", "content": final_prompt}
            ],
            temperature=0.7,
            max_tokens=512,
            stream=False
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"❌ 节点生成失败（{node_info['name']}）：{str(e)}")
        return "[内容生成失败]"


def dfs_enhance_tree(
    node: Dict,
    global_context: dict,
    prompt_template: str,
    rag_db_path: str,
    parent_summary: str = ""
):
    """
    深度优先遍历树，为每个节点生成 content，并更新 parent_summary 用于子节点
    """
    print(f"正在处理节点：{node['name']}")

    # 生成当前节点 content
    node['content'] = generate_content_for_node(global_context, node, prompt_template, rag_db_path)

    # 更新 parent_summary（用于子节点上下文）
    current_summary = f"{node['abstract']}"

    # 递归处理子节点
    for child in node.get("child_nodes", []):
        # child["parent_summary"] = parent_summary  # 可选：传递更长历史
        dfs_enhance_tree(child, global_context, prompt_template, rag_db_path, current_summary)


def main(args):
    theme = args.theme
    structure_dir = os.path.join(args.structure_dir, theme)
    kb_vector_path = os.path.join(args.kb_vector_path, theme)
    anchor_tree_file = os.path.join(structure_dir, args.anchor_tree_file)
    prompt_file = os.path.join(args.prompt_dir, args.prompt_file)
    output_file = os.path.join(structure_dir, args.output_file)

    print(f"🚀 开始生成主题：{theme}")

    # 检查必要文件
    for f in [anchor_tree_file, kb_vector_path]:
        if not os.path.exists(f):
            raise FileNotFoundError(f"缺失必要文件或目录：{f}")

    # 加载数据
    anchor_tree = load_json_file(anchor_tree_file)
    global_context = anchor_tree['global_context']
    story_tree = anchor_tree['structure']
    prompt_template = load_prompt(prompt_file)

    # DFS 遍历生成
    print("🌳 开始深度优先遍历并生成内容...")
    dfs_enhance_tree(
        node=story_tree,
        global_context=global_context,
        prompt_template=prompt_template,
        rag_db_path=kb_vector_path
    )

    story_tree = clean_script(story_tree)

    # 保存结果
    save_json_file(story_tree, output_file)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="批量生成交互游戏脚本")
    parser.add_argument("--theme", type=str, required=True, help="景点名称，如 twin_pagoda")
    parser.add_argument("--structure-dir", type=str, default="structure", help="结构文件目录")
    parser.add_argument("--kb-vector-path", type=str, default="VectorStore", help="知识库向量文件路径")
    parser.add_argument("--anchor-tree-file", type=str, default="anchor_tree.json", help="交互树文件路径")
    parser.add_argument("--prompt-dir", type=str, default="prompts", help="提示词文件目录")
    parser.add_argument("--prompt-file", type=str, default="generate_script.txt", help="提示词文件路径")
    parser.add_argument("--output-file", type=str, default="generated_script.json", help="输出文件路径")

    args = parser.parse_args()

    if not os.getenv("DASHSCOPE_API_KEY"):
        raise EnvironmentError("请设置环境变量 DASHSCOPE_API_KEY")

    main(args)
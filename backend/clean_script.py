import json

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

script_path = 'structure\\twin_pagoda\\twin_pagoda_script.json'
with open(script_path, 'r', encoding='utf-8') as f:
    script_data = json.load(f)

cleaned_script = clean_script(script_data)
with open(script_path, 'w', encoding='utf-8') as f:
    json.dump(cleaned_script, f, ensure_ascii=False, indent=2)
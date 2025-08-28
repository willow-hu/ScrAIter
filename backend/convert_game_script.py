import json
from collections import deque
import argparse
import os


def transform_intro(intro_list):
    if len(intro_list) % 2 != 0:
        intro_list.append("开始旅程")
    
    assert len(intro_list) % 2 == 0, "Intro list length should be even after appending."

    intro_scenes = {}

    for i in range(len(intro_list) // 2):
        node_id= f"scene_0_{i}"
        intro_scenes[node_id] = {
            "npc": intro_list[i * 2],
            "options": [
                {
                    "user": intro_list[i * 2 + 1],
                    "next": f"scene_0_{i + 1}"
                }
            ]
        }
    
    # Replace the last 'next' as starting the main game
    main_start_id = "scene_1_1"
    intro_scenes[f"scene_0_{len(intro_list) // 2 - 1}"]["options"][-1]["next"] = main_start_id

    return intro_scenes


def transform_ending(ending_json):
    ending_scenes = {}
    
    ending_scenes["ending_normal"] = {
        "npc": ending_json["ending_normal"],
        "achievement": False
    }

    ending_scenes["ending_complete"] = {
        "npc": ending_json["ending_complete"],
        "achievement": True
    }

    return ending_scenes


def transform_main_game(root):
    start_id = "scene_1_1"
    root["id"] = start_id
    queue = deque([root])

    main_game_scenes = {}
    depth = 1

    while queue:
        node = queue.popleft()
        scene_id = node.get("id", None)
        assert scene_id is not None, "Each node must have an 'id' field."
        main_game_scenes[scene_id] = {"npc": node.get("content", "")}
        # Options
        child_nodes = node.get("child_nodes", [])
        if child_nodes:
            depth += 1
            for j, child in enumerate(child_nodes):
                child_scene_id = f"scene_{depth}_{j + 1}"
                child["id"] = child_scene_id
                option = {
                    "user": child["user"],
                    "next": child_scene_id
                }
                main_game_scenes[scene_id].setdefault("options", []).append(option)
                # Add child to queue for further processing
                queue.append(child)
        else:
            main_game_scenes[scene_id].setdefault("options", [])

    return main_game_scenes


def transform_game_script(input_json):
    transformed = {
        "metadata": input_json["metadata"],
        "intro": transform_intro(input_json["intro"]),
        "main_game": transform_main_game(input_json["main_game"]),
        "ending": transform_ending(input_json["ending"])
    }

    return transformed


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert game script to standard format.")
    parser.add_argument("--site", type=str, default="twin_pagoda", help="Site name")
    parser.add_argument("--input", type=str, default="human_checked_script.json", help="Input JSON file path")
    parser.add_argument("--output", type=str, default="game_script.json", help="Output JSON file path")
    args = parser.parse_args()

    site = args.site
    input_path = os.path.join("structure", site, args.input)
    output_path = os.path.join("structure", site, args.output)

    with open(input_path, "r", encoding="utf-8") as f:
        input_data = json.load(f)

    output_data = transform_game_script(input_data)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"Transformation completed! Saved to: {output_path}")
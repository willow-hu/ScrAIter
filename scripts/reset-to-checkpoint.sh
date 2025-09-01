#!/bin/bash
# 用法: ./reset-to-checkpoint.sh <commit_id> <branch>
# 示例: ./reset-to-checkpoint.sh a1b2c3d main

set -e

if [ $# -ne 2 ]; then
  echo "❌ 用法: $0 <commit_id> <branch>"
  exit 1
fi

COMMIT_ID=$1
BRANCH=$2

echo "⚠️ 即将把分支 '$BRANCH' 重置到 commit '$COMMIT_ID'"
read -p "是否继续？(y/n): " confirm
if [[ "$confirm" != "y" ]]; then
  echo "取消操作。"
  exit 0
fi

# 1. 回到指定 commit
git reset --hard $COMMIT_ID

# 2. 清理未跟踪文件
git clean -fd

# 3. 强制推送到远程
git push origin $BRANCH --force

# 4. 删除 reflog 记录
git reflog expire --expire=now --all

# 5. 垃圾回收
git gc --prune=now --aggressive

echo "✅ 仓库已完全重置到 $COMMIT_ID，并同步远程。"

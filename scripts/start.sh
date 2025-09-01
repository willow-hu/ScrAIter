#!/bin/bash

echo "Starting AI Script Co-creator..."

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 启动后端服务
echo "Starting backend service..."
cd "$PROJECT_ROOT/backend"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 7890 &
BACKEND_PID=$!

# 等待3秒让后端启动
echo "Waiting for backend to start..."
sleep 3

# 启动前端服务
echo "Starting frontend service..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

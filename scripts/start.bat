@echo off
echo Starting AI Script Co-creator...

REM 启动后端
echo Starting backend service...
start "Backend" cmd /c "cd ..\backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

REM 等待3秒让后端启动
timeout /t 3 /nobreak >nul

REM 启动前端
echo Starting frontend service...
start "Frontend" cmd /c "cd ..\frontend && npm run dev"

echo Service startup complete!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
pause

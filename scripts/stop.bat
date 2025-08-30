@echo off
chcp 65001 >nul
echo ======================================
echo      Stop All Services
echo ======================================
echo.

echo Stopping all related services...
echo.

REM 停止占用8000端口的进程（后端）
echo Stopping backend service (Port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    taskkill /f /pid %%a >nul 2>&1
)

REM 停止占用5173端口的进程（前端）
echo Stopping frontend service (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /f /pid %%a >nul 2>&1
)

REM 停止uvicorn进程
echo Stopping uvicorn processes...
taskkill /f /im python.exe /fi "WINDOWTITLE eq *uvicorn*" >nul 2>&1

REM 停止npm dev进程
echo Stopping npm dev server...
taskkill /f /im node.exe /fi "WINDOWTITLE eq *npm*" >nul 2>&1

echo.
echo All services have been stopped
echo.
echo Checking port status:

REM 检查端口是否还在使用
netstat -an | findstr :8000 >nul
if errorlevel 1 (
    echo    [OK] Port 8000 released
) else (
    echo    [WARNING] Port 8000 still in use
)

netstat -an | findstr :5173 >nul
if errorlevel 1 (
    echo    [OK] Port 5173 released
) else (
    echo    [WARNING] Port 5173 still in use
)

echo.
pause

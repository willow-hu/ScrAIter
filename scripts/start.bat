@echo off
echo =======================================================
echo          AI Script Co-creator Project Launcher
echo =======================================================
echo.

echo Checking project environment...
echo.

REM 检查是否在正确的目录
if not exist "..\backend" (
    echo [ERROR] Backend directory not found, please run this script from the project root
    pause
    exit /b 1
)

if not exist "..\frontend" (
    echo [ERROR] Frontend directory not found, please run this script from the project root
    pause
    exit /b 1
)

REM 检查Python环境
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ and add it to system PATH
    pause
    exit /b 1
)

REM 检查Node.js环境
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js/npm is not installed or not in PATH
    echo Please install Node.js and add it to system PATH
    pause
    exit /b 1
)

echo [OK] Python environment check passed
echo [OK] Node.js environment check passed
echo.

REM 检查后端依赖
echo Checking backend dependencies...
cd ..\backend
if not exist "requirements.txt" (
    echo [WARNING] requirements.txt file not found
) else (
    echo [INFO] If this is your first run, make sure to install backend dependencies:
    echo          pip install -r requirements.txt
)
cd ..\scripts

REM 检查前端依赖
echo Checking frontend dependencies...
cd ..\frontend
if not exist "node_modules" (
    echo [WARNING] node_modules directory not found
    echo [INFO] Installing frontend dependencies...
    npm install
    if errorlevel 1 (
        echo [ERROR] Frontend dependencies installation failed
        cd ..\scripts
        pause
        exit /b 1
    )
    echo [OK] Frontend dependencies installation completed
) else (
    echo [OK] Frontend dependencies exist
)
cd ..\scripts

echo.
echo =======================================================
echo                   Starting Services
echo =======================================================
echo.

REM 创建日志目录
if not exist "..\logs" mkdir ..\logs

echo [1/2] Starting backend service (Port: 8000)...
echo.
start "AI Script Co-creator Backend" cmd /c "cd /d "%~dp0..\backend" && echo Starting backend service... && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 && pause"

REM 等待后端启动
echo Waiting for backend service to start (3 seconds)...
timeout /t 3 /nobreak >nul

echo [2/2] Starting frontend service (Default port: 5173)...
echo.
start "AI Script Co-creator Frontend" cmd /c "cd /d "%~dp0..\frontend" && echo Starting frontend service... && npm run dev && pause"

echo.
echo =======================================================
echo                   Startup Complete
echo =======================================================
echo.
echo * Backend Service: http://localhost:8000
echo * Frontend Service: http://localhost:5173 (or other port shown)
echo * API Documentation: http://localhost:8000/docs
echo.
echo Notes:
echo 1. Both services will run in new command line windows
echo 2. Close the corresponding command line window to stop the service
echo 3. If ports are occupied, services may use other ports
echo 4. First startup may require dependency installation, please wait patiently
echo.
echo Services are starting, please wait...
echo Press any key to close this window...
pause >nul

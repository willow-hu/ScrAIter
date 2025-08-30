@echo off
chcp 65001 >nul
echo =======================================================
echo          AI Script Co-creator Environment Setup
echo =======================================================
echo.

echo Setting up project environment...
echo.

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo         Please install Python 3.8+ and add it to system PATH
    pause
    exit /b 1
) else (
    echo [OK] Python environment is ready
)

REM 检查Node.js
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js/npm is not installed or not in PATH
    echo         Please install Node.js and add it to system PATH
    pause
    exit /b 1
) else (
    echo [OK] Node.js environment is ready
)

echo.
echo Installing project dependencies...
echo.

REM 安装后端依赖
echo Installing backend dependencies...
cd ..\backend
if exist "requirements.txt" (
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Backend dependencies installation failed
        cd ..\scripts
        pause
        exit /b 1
    )
    echo [OK] Backend dependencies installation completed
) else (
    echo [WARNING] requirements.txt file not found
)
cd ..\scripts

REM 安装前端依赖
echo Installing frontend dependencies...
cd ..\frontend
npm install
if errorlevel 1 (
    echo [ERROR] Frontend dependencies installation failed
    cd ..\scripts
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installation completed
cd ..\scripts

echo.
echo =======================================================
echo                  Environment Setup Complete
echo =======================================================
echo.
echo [OK] All dependencies have been installed
echo [INFO] You can now run start.bat to launch the project
echo.
pause

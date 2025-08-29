@echo off
echo Starting AI Script Co-creator Backend API...
cd /d "%~dp0"

call conda activate scraiter-dev
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

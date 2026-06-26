@echo off
cd /d %~dp0
echo ========================================
echo  QLVRS ? Production Startup
echo ========================================
echo.

echo [1/4] Building Next.js...
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed. Check errors above.
    pause
    exit /b 1
)
cd ..

echo [2/4] Stopping old servers...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo [3/4] Starting WebSocket server (port 3001)...
start "QLVRS-WS" cmd /c "cd /d %~dp0frontend && node server/ws.mjs"
timeout /t 2 /nobreak >nul

echo [4/4] Starting Next.js (port 3000)...
cd /d %~dp0frontend
npm start

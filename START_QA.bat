@echo off
title WorkNex AI - QA Environment
color 0A

echo.
echo ============================================
echo   WorkNex AI - QA Build (Network Access)
echo   IP: 192.168.100.7
echo ============================================
echo.

:: Start backend (listens on 0.0.0.0:5000)
start "WorkNex Backend (Port 5000)" cmd /k "cd worknex-backend && node src/app.js"

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend (listens on 0.0.0.0:3000)
start "WorkNex Frontend (Port 3000)" cmd /k "cd frontend && npm start -- -H 0.0.0.0"

echo.
echo ============================================
echo   QA Environment Started!
echo ============================================
echo.
echo   Access from ANY device on the network:
echo.
echo   Frontend:  http://192.168.100.7:3000
echo   Backend:   http://192.168.100.7:5000
echo   API:       http://192.168.100.7:5000/api/v1
echo   Health:    http://192.168.100.7:5000/health
echo.
echo   Test Accounts:
echo   Admin:    admin@worknex.com / admin123
echo   Manager:  manager1@worknex.com / manager123
echo   Employee: employee1@worknex.com / employee123
echo.
echo   Share the URL with QA team:
echo   http://192.168.100.7:3000
echo ============================================
echo.
pause

@echo off
title WorkNex AI - Stop QA
echo Stopping WorkNex QA services...
taskkill /FI "WINDOWTITLE eq WorkNex Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq WorkNex Frontend*" /F >nul 2>&1
echo Done. All services stopped.
pause

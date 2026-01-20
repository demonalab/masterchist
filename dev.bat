@echo off
title Masterchist Dev

echo Starting development environment...
echo.

:: Kill any existing node processes on dev ports
taskkill /F /IM node.exe >nul 2>&1

:: Start Postgres if not running
docker compose up postgres -d

:: Wait for Postgres
echo Waiting for Postgres...
timeout /t 3 /nobreak >nul

:: Generate Prisma Client
echo Generating Prisma Client...
call pnpm --filter @himchistka/db prisma generate
call pnpm --filter @himchistka/db build

:: Open terminals for API and Web
start "API Server" cmd /k "cd /d %~dp0 && pnpm --filter @himchistka/api dev"
timeout /t 3 /nobreak >nul
start "Web Server" cmd /k "cd /d %~dp0 && pnpm --filter @himchistka/web dev"

echo.
echo === Development servers starting ===
echo API: http://localhost:3001
echo Web: http://localhost:3002
echo.
echo Press any key to open web in browser...
pause >nul
start http://localhost:3002

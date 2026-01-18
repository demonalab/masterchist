@echo off
title Web Dev Server

echo Starting Web development server...
echo Using production API: http://85.235.205.125/api
echo.

cd /d %~dp0
pnpm --filter @himchistka/web dev

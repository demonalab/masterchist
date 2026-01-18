@echo off
echo Stopping development environment...

:: Kill node processes on dev ports
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do taskkill /F /PID %%a 2>nul

:: Stop Postgres container
docker compose stop postgres

echo Done!
pause

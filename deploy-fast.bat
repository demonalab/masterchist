@echo off
title Fast Deploy

set /p msg="Commit message: "

git add -A
git commit -m "%msg%"
git push

echo.
echo Updating server...
ssh root@85.235.205.125 "cd /opt/masterchist && git pull && pnpm --filter @himchistka/shared build && pnpm --filter @himchistka/db build && pnpm --filter @himchistka/bot build && pnpm --filter @himchistka/api build && pnpm --filter @himchistka/web build && pm2 restart all"

echo.
echo Done!
pause

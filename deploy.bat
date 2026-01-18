@echo off
title Deploy to Production

set /p message="Commit message: "

git add .
git commit -m "%message%"
git push

echo.
echo Pushed! GitHub Actions will deploy automatically.
echo Check: https://github.com/demonalab/masterchist/actions
echo.
pause

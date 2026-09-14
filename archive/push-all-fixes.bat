@echo off
echo Pushing all dashboard and booking fixes...

git add -A
git commit -m "Fix dashboard queries, date formatting, and add missing tables"
git push

echo Done! Fixes pushed to GitHub.
pause

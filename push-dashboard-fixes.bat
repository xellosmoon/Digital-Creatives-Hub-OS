@echo off
echo Pushing dashboard and booking fixes...

git add -A
git commit -m "Fix dashboard booking queries and add missing database tables"
git push

echo Done! Check the live site after deployment.
pause

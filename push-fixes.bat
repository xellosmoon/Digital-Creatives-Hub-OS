@echo off
echo Pushing build fixes to GitHub...

git add -A
git commit -m "Fix TypeScript build errors for deployment"
git push

echo Done! Check Netlify - it should auto-deploy.
pause

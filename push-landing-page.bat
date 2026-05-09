@echo off
echo Pushing landing page improvements...

git add -A
git commit -m "Improve landing page with modern design, animations, and better content"
git push

echo Done! Check Netlify for the updated landing page.
pause

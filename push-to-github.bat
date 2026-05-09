@echo off
echo Initializing Git repository...
git init

echo Adding all files...
git add .

echo Creating initial commit...
git commit -m "Initial commit - Digital Creatives Hub OS"

echo Adding GitHub remote...
git remote add origin https://github.com/xellosmoon/Digital-Creatives-Hub-OS.git

echo Setting main branch...
git branch -M main

echo Pushing to GitHub...
git push -u origin main

echo Done! Your code is now on GitHub.
pause

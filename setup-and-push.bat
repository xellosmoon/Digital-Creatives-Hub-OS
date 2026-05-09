@echo off
echo Setting up Git configuration...
echo.

set /p username="Enter your GitHub username: "
set /p email="Enter your GitHub email: "

echo.
echo Configuring Git...
git config --global user.name "%username%"
git config --global user.email "%email%"

echo.
echo Initializing Git repository...
git init

echo.
echo Adding all files...
git add .

echo.
echo Creating initial commit...
git commit -m "Initial commit - Digital Creatives Hub OS"

echo.
echo Adding GitHub remote...
git remote add origin https://github.com/xellosmoon/Digital-Creatives-Hub-OS.git

echo.
echo Setting main branch...
git branch -M main

echo.
echo Pushing to GitHub...
echo You may be prompted for your GitHub username and password/token
git push -u origin main

echo.
echo Done! Your code is now on GitHub.
pause

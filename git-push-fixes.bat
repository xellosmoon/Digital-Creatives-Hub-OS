@echo off
echo Checking for Git installation...

REM Try common Git locations
set GIT_PATH=
if exist "C:\Program Files\Git\bin\git.exe" (
    set GIT_PATH="C:\Program Files\Git\bin\git.exe"
) else if exist "C:\Program Files (x86)\Git\bin\git.exe" (
    set GIT_PATH="C:\Program Files (x86)\Git\bin\git.exe"
) else if exist "%LOCALAPPDATA%\Programs\Git\bin\git.exe" (
    set GIT_PATH="%LOCALAPPDATA%\Programs\Git\bin\git.exe"
) else (
    echo Git not found! Please install Git from https://git-scm.com/download/win
    echo Or use GitHub Desktop to commit and push your changes.
    pause
    exit /b 1
)

echo Found Git at %GIT_PATH%
echo.

echo Adding all changes...
%GIT_PATH% add -A

echo.
echo Committing fixes...
%GIT_PATH% commit -m "Fix TypeScript build errors for deployment"

echo.
echo Pushing to GitHub...
%GIT_PATH% push

echo.
echo Done! Netlify should auto-deploy the fixed version.
pause

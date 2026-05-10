@echo off
echo Pushing booking form timestamp fixes...

git add -A
git commit -m "Fix booking form to send proper timestamps instead of time-only values"
git push

echo Done! The booking form should now work properly.
pause

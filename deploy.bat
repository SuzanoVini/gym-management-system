@echo off
REM Quick deployment script for Vercel (Windows)

echo 🚀 Starting deployment process...

REM Check if we're in the right directory
if not exist "package.json" (
  echo ❌ Error: package.json not found. Run this from the project root.
  exit /b 1
)

REM Run quality checks
echo 🔍 Running quality checks...

echo   → Type checking...
call npm run typecheck
if %errorlevel% neq 0 (
  echo ❌ Type check failed. Fix errors before deploying.
  exit /b 1
)

echo   → Linting...
call npm run lint
if %errorlevel% neq 0 (
  echo ⚠️  Linting issues found. Consider fixing before deploying.
  set /p continue="Continue anyway? (y/N) "
  if /i not "%continue%"=="y" exit /b 1
)

echo   → Testing build...
call npm run build
if %errorlevel% neq 0 (
  echo ❌ Build failed. Fix errors before deploying.
  exit /b 1
)

echo ✅ All checks passed!
echo.

set /p production="Deploy to production? (y/N) "

if /i "%production%"=="y" (
  echo 🚀 Deploying to production...
  call vercel --prod
) else (
  echo 🚀 Deploying to preview...
  call vercel
)

echo ✅ Deployment complete!
pause

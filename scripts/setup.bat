@echo off
echo 🚀 Setting up IdeaForge Development Environment...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker first.
    exit /b 1
)

echo ✅ Prerequisites check passed

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Copy environment file if it doesn't exist
if not exist .env (
    echo 📝 Creating environment file...
    copy .env.example .env
    echo ✅ Created .env file. You can edit it to customize your configuration.
) else (
    echo ✅ Environment file already exists
)

REM Start Docker services
echo 🐳 Starting Docker services (PostgreSQL, Redis, MinIO, MailHog)...
docker-compose up -d

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 10 /nobreak >nul

echo ✅ Services started

echo.
echo 🎉 Setup complete! You can now start the development servers:
echo.
echo   npm run dev
echo.
echo This will start:
echo   - Frontend: http://localhost:3001
echo   - API Gateway: http://localhost:3000
echo   - PostgreSQL: localhost:5432
echo   - Redis: localhost:6379
echo   - MinIO: http://localhost:9001 (admin: ideaforge/ideaforge_minio_password)
echo   - MailHog: http://localhost:8025
echo.
echo Happy coding! 🚀
#!/bin/bash

echo "🚀 Setting up IdeaForge Development Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "✅ Created .env file. You can edit it to customize your configuration."
else
    echo "✅ Environment file already exists"
fi

# Start Docker services
echo "🐳 Starting Docker services (PostgreSQL, Redis, MinIO, MailHog)..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if PostgreSQL is ready
echo "🔍 Checking PostgreSQL connection..."
until docker exec ideaforge-postgres pg_isready -U ideaforge -d ideaforge; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL is ready"

# Check if Redis is ready
echo "🔍 Checking Redis connection..."
until docker exec ideaforge-redis redis-cli ping; do
    echo "Waiting for Redis..."
    sleep 2
done

echo "✅ Redis is ready"

echo ""
echo "🎉 Setup complete! You can now start the development servers:"
echo ""
echo "  npm run dev"
echo ""
echo "This will start:"
echo "  - Frontend: http://localhost:3001"
echo "  - API Gateway: http://localhost:3000"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - MinIO: http://localhost:9001 (admin: ideaforge/ideaforge_minio_password)"
echo "  - MailHog: http://localhost:8025"
echo ""
echo "Happy coding! 🚀"
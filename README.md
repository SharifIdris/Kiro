# IdeaForge Platform

A fully functional AI-powered ideation and collaboration platform that enables users to submit, vote on, and collaborate on ideas with real-time updates and gamification features.

## 🚀 Features Implemented

### ✅ **Core Platform Features**
- **User Authentication**: JWT-based auth with role-based access control
- **Idea Management**: Complete CRUD operations with advanced search and filtering
- **Real-time Voting**: Live voting system with WebSocket updates
- **Collaboration**: Multi-user idea collaboration and commenting
- **Gamification**: Points, levels, badges, and leaderboards
- **Advanced Search**: Full-text search with faceted filtering and suggestions

### ✅ **Backend Implementation**
- **Authentication System**: Secure JWT authentication with refresh tokens
- **Role-Based Access Control**: User, Team Lead, Admin, Super Admin roles
- **Real-time Features**: WebSocket integration for live updates
- **Database**: PostgreSQL with optimized queries and indexing
- **API Gateway**: Express.js with comprehensive middleware
- **Testing**: Unit and integration tests for critical components

### ✅ **Frontend Implementation**
- **Modern React UI**: TypeScript + Material-UI design system
- **Responsive Design**: Mobile-first responsive layout
- **Real-time Updates**: Live voting and collaboration features
- **Advanced Search**: Filtering, sorting, and search suggestions
- **User Dashboard**: Comprehensive user statistics and activity
- **Form Validation**: Client-side validation with error handling

## 🏗️ Architecture

This is a monorepo containing:

- **Frontend**: React.js with TypeScript and Material-UI
- **API Gateway**: Node.js with Express and WebSocket support
- **Database**: PostgreSQL with Redis for caching
- **Shared Packages**: Common types, utilities, and validation

## 📁 Project Structure

```
ideaforge-platform/
├── packages/
│   ├── types/              # Shared TypeScript interfaces
│   ├── shared/             # Utilities, validation, constants
│   └── frontend/           # React frontend application
├── services/
│   └── api-gateway/        # Main API service with all endpoints
├── database/
│   ├── init/               # Database initialization scripts
│   └── migrations/         # Database schema migrations
├── docker-compose.yml      # Local development environment
├── .env.example           # Environment variables template
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Quick Start

1. **Clone the repository:**
```bash
git clone https://github.com/SharifIdris/Kiro.git
cd Kiro
```

2. **Automated setup (recommended):**
```bash
# On Linux/Mac
chmod +x scripts/setup.sh
./scripts/setup.sh

# On Windows
scripts\setup.bat
```

3. **Manual setup:**
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start Docker services (PostgreSQL, Redis, etc.)
npm run docker:services

# Start development servers
npm run dev
```

4. **Access the application:**
- Frontend: http://localhost:3001
- API Gateway: http://localhost:3000
- Health Check: http://localhost:3000/health
- MinIO Console: http://localhost:9001 (ideaforge/ideaforge_minio_password)
- MailHog: http://localhost:8025

### Available Scripts

- `npm run dev` - Start frontend and API development servers
- `npm run build` - Build all packages and services
- `npm run test` - Run test suites
- `npm run lint` - Lint and format code
- `npm run docker:services` - Start Docker services (PostgreSQL, Redis, etc.)
- `npm run docker:down` - Stop Docker services
- `npm run setup` - Install dependencies and copy environment file
- `npm start` - Full setup: start Docker services and development servers

## 🗄️ Database Schema

The application uses PostgreSQL with the following main tables:

- **users** - User accounts and profiles
- **user_profiles** - Extended user information
- **gamification_stats** - Points, levels, achievements
- **ideas** - Core idea submissions
- **idea_voting_stats** - Aggregated voting statistics
- **votes** - Individual vote records
- **comments** - Idea comments and discussions
- **badges** & **achievements** - Gamification elements

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Ideas
- `GET /api/ideas/search` - Search and filter ideas
- `POST /api/ideas` - Create new idea
- `GET /api/ideas/:id` - Get idea details
- `PUT /api/ideas/:id` - Update idea
- `DELETE /api/ideas/:id` - Delete idea
- `GET /api/ideas/trending` - Get trending ideas
- `GET /api/ideas/categories` - Get idea categories

### Voting
- `POST /api/votes` - Cast vote
- `GET /api/votes/ideas/:id/stats` - Get voting statistics
- `GET /api/votes/leaderboard` - Get voting leaderboard
- `DELETE /api/votes/ideas/:id` - Remove vote

## 🎮 Gamification System

- **Points System**: Earn points for various activities
  - Idea submission: 10 points
  - Idea approved: 50 points
  - Idea deployed: 100 points
  - Vote cast: 1 point
  - Comment posted: 2 points

- **Levels**: Progress through 6 levels
  - Novice (0-99 points)
  - Contributor (100-499 points)
  - Innovator (500-1499 points)
  - Expert (1500-4999 points)
  - Master (5000-14999 points)
  - Legend (15000+ points)

## 🔄 Real-time Features

WebSocket events for live updates:
- `vote_updated` - Live voting updates
- `idea_created` - New idea notifications
- `comment_added` - New comment notifications
- `collaboration_started` - Collaboration invites

## 🧪 Testing

Run the test suite:
```bash
npm run test
```

Tests include:
- Unit tests for repositories and services
- Integration tests for API endpoints
- Authentication and authorization tests
- Voting system tests
- Search functionality tests

## 🚀 Deployment

The application is containerized and ready for deployment:

1. **Production Build:**
```bash
npm run build
```

2. **Docker Deployment:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. **Environment Variables:**
Set production environment variables for:
- Database connections
- JWT secrets
- API keys
- CORS origins

## 🛠️ Development

### Adding New Features

1. Update requirements in `.kiro/specs/idea-forge-platform/requirements.md`
2. Implement backend services and endpoints
3. Add frontend components and pages
4. Write tests for new functionality
5. Update documentation

### Code Style

- TypeScript for type safety
- ESLint + Prettier for code formatting
- Conventional commit messages
- Comprehensive error handling

## 📊 Current Implementation Status

✅ **Completed Features:**
- User authentication and authorization
- Idea CRUD operations with advanced search
- Real-time voting system
- Gamification with points and levels
- Responsive frontend interface
- Database schema and migrations
- WebSocket real-time updates
- Comprehensive testing suite

🚧 **Future Enhancements:**
- AI-powered idea refinement
- Code generation capabilities
- One-click deployment system
- Mobile applications
- Advanced analytics dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔧 Troubleshooting

### Common Issues

**Docker services not starting:**
```bash
# Check if ports are available
netstat -an | grep :5432  # PostgreSQL
netstat -an | grep :6379  # Redis

# Stop and restart services
npm run docker:down
npm run docker:services
```

**Database connection errors:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check database logs
docker logs ideaforge-postgres
```

**Frontend not connecting to API:**
- Ensure API Gateway is running on port 3000
- Check REACT_APP_API_URL in your .env file
- Verify CORS settings in the API Gateway

**Environment variables not loading:**
- Ensure .env file exists in the root directory
- Restart development servers after changing .env
- Check that all required variables are set

### Development Tips

- Use `docker logs <container-name>` to check service logs
- Run `npm run lint` before committing changes
- Use `npm run test` to run the test suite
- Check the browser console for frontend errors
- Use the API health check: `http://localhost:3000/health`

## 🆘 Support

For support and questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review the API endpoints at `http://localhost:3000/api`
- Join our community discussions

---

**IdeaForge** - Transform your ideas into reality through collaboration and innovation! 🚀
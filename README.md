# IdeaForge Platform

An AI-powered ideation and app-building platform that transforms user-submitted ideas into deployable web or mobile applications.

## Features

- **Idea Management**: Submit, vote on, and collaborate on ideas
- **AI-Powered Code Generation**: Transform ideas into functional applications
- **Real-time Collaboration**: Work together with team members
- **Gamification**: Points, badges, and leaderboards to encourage participation
- **One-Click Deployment**: Deploy generated applications to the cloud
- **Multi-Platform Support**: Generate web, iOS, and Android applications

## Architecture

This is a monorepo containing:

- **Frontend**: React.js with TypeScript and Material-UI
- **API Gateway**: Node.js with Express for routing and WebSocket support
- **AI Service**: Python FastAPI for AI-powered features
- **Shared Packages**: Common types and utilities

## Project Structure

```
ideaforge-platform/
├── packages/
│   ├── types/              # Shared TypeScript types
│   ├── shared/             # Shared utilities and constants
│   └── frontend/           # React frontend application
├── services/
│   ├── api-gateway/        # Main API gateway service
│   ├── ai-service/         # AI and code generation service
│   ├── auth-service/       # Authentication service
│   ├── idea-service/       # Idea management service
│   ├── voting-service/     # Voting and evaluation service
│   └── deployment-service/ # Deployment orchestration
├── database/
│   └── migrations/         # Database migration scripts
├── docker-compose.yml      # Local development environment
├── .env.example           # Environment variables template
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL (via Docker)
- Redis (via Docker)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ideaforge-platform
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Install dependencies:
```bash
npm install
```

4. Start the development environment:
```bash
npm run docker:up
```

5. Start the development servers:
```bash
npm run dev
```

### Available Scripts

- `npm run dev` - Start all development servers
- `npm run build` - Build all packages and services
- `npm run test` - Run tests across all packages
- `npm run lint` - Lint all code
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services

## Development

### Adding New Features

1. Create or update requirements in `.kiro/specs/idea-forge-platform/requirements.md`
2. Update the design document if needed
3. Add implementation tasks to the task list
4. Implement the feature following the task breakdown

### Database

The application uses PostgreSQL as the primary database. Database migrations are located in the `database/migrations/` directory.

### API Documentation

API documentation will be available at `http://localhost:3000/api/docs` when the server is running.

### WebSocket Events

Real-time features use WebSocket connections. See the constants file for available events.

## Deployment

The platform supports deployment to major cloud providers:

- AWS
- Google Cloud Platform
- Microsoft Azure

Deployment is handled through the deployment service with Terraform for infrastructure as code.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
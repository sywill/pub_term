# PubTerm

Remote AI Terminal Monitoring System - Run Claude CLI on your VPS and monitor/interact from anywhere.

## Features

- 🖥️ **Remote Terminal Access** - Run Claude CLI sessions on your Linux VPS
- 👥 **Multi-User Support** - Invite others to view or interact with sessions
- 🔐 **Role-Based Permissions** - Viewer, Operator, and Admin roles
- 📱 **PWA Support** - Install on mobile for native app-like experience
- 🔄 **Real-Time Streaming** - See terminal output as it happens
- 📁 **Context Sharing** - Upload files to provide context to AI sessions

## Quick Start

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/pub_term.git
cd pub_term

# Install dependencies
npm install

# Set up environment
cp backend/.env.example backend/.env
# Edit .env with your settings

# Run database migrations
cd backend && npx prisma migrate dev

# Start development servers
npm run dev
```

## Project Structure

```
pub_term/
├── backend/          # Node.js + Express API
│   ├── prisma/       # Database schema
│   └── src/          # Source code
├── frontend/         # React + Vite PWA
│   └── src/          # Source code
└── README.md
```

## Requirements

- Node.js 20+
- PostgreSQL (production) or SQLite (development)
- Claude CLI (installed and authenticated on VPS)

## Docker Deployment

```bash
# Copy and configure environment
cp .env.docker.example .env
# Edit .env with your settings (especially JWT_SECRET!)

# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

The app will be available at `http://localhost` (or your configured APP_PORT).

## License

MIT

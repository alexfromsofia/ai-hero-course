# AI Chat Application

A modern chat application built with Next.js, AI SDK, and real-time web search capabilities.

## Features

- 🤖 AI-powered chat with Google Gemini
- 🔍 Real-time web search integration
- 💾 Persistent chat history with PostgreSQL
- 🔐 Discord authentication
- 📱 Responsive design with Tailwind CSS
- ⚡ Real-time updates with React Query

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **AI**: Google Gemini via AI SDK
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js with Discord
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS
- **Search**: Serper API for web search

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- Redis instance
- Discord OAuth app
- Google AI API key
- Serper API key

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/your_database"

# Redis
REDIS_URL="redis://localhost:6379"

# Authentication
AUTH_SECRET="your-auth-secret"
AUTH_DISCORD_ID="your-discord-client-id"
AUTH_DISCORD_SECRET="your-discord-client-secret"

# AI
GOOGLE_GENERATIVE_AI_API_KEY="your-google-ai-key"

# Search
SERPER_API_KEY="your-serper-api-key"

# Environment
NODE_ENV="development"
```

## Setup

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Set up the database**:

   ```bash
   # Start PostgreSQL and Redis (if using Docker)
   ./start-database.sh
   ./start-redis.sh

   # Run database migrations
   pnpm db:push
   ```

3. **Start the development server**:

   ```bash
   pnpm dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:4567](http://localhost:4567)

## Database Schema

The application uses the following main tables:

- `users` - User accounts and authentication
- `chats` - Chat conversations
- `messages` - Individual messages within chats
- `requestLogs` - API request tracking for rate limiting

## API Endpoints

- `POST /api/chat` - AI chat endpoint with streaming
- `GET /api/chats` - Get user's chat list
- `POST /api/chats` - Create or update a chat
- `GET /api/chats/[chatId]` - Get specific chat with messages

## Development

- **Database Studio**: `pnpm db:studio` - View and edit database
- **Type Checking**: `pnpm typecheck` - Run TypeScript checks
- **Linting**: `pnpm lint` - Run ESLint
- **Formatting**: `pnpm format:write` - Format code with Prettier

## Architecture

The application follows a clean architecture pattern:

- **Frontend**: React components with hooks for data fetching
- **API Routes**: Next.js API routes for backend logic
- **Database**: Drizzle ORM with PostgreSQL
- **Authentication**: NextAuth.js with Discord provider
- **AI Integration**: AI SDK with Google Gemini
- **State Management**: TanStack Query for server state

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

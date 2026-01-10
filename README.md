# ORION Frontend

Real-Time Multi-Agent Voice AI System for Autonomous Task Execution - Frontend Control Plane

## Overview

ORION Frontend is a Next.js-based control plane for the ORION Voice AI System. It provides a modern web interface for managing sessions, interacting with the voice AI, and monitoring system activity.

## Features

- **Authentication**: User registration and login
- **Session Management**: Create, view, and manage voice sessions
- **Real-time Voice Interaction**: WebSocket-based real-time communication
- **Dashboard**: Overview of all sessions and system activity
- **API Key Management**: Create and manage API keys for programmatic access

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **WebSocket**: Socket.IO Client
- **HTTP Client**: Axios

## Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see backend README)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Setup environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

3. Run development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3001`

## Environment Variables

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# WebSocket URL
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   │   ├── login/         # Login page
│   │   └── register/      # Registration page
│   ├── dashboard/         # Dashboard page
│   ├── session/[id]/      # Session interaction page
│   └── layout.tsx         # Root layout
├── lib/                   # Utilities
│   ├── api.ts            # API client
│   └── websocket.ts      # WebSocket client
├── store/                 # State management
│   ├── authStore.ts      # Authentication state
│   └── sessionStore.ts   # Session state
└── public/               # Static assets
```

## Running the Application

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

## Features Overview

### Authentication
- User registration with email and password
- Secure login with JWT tokens
- Protected routes

### Dashboard
- View all active and past sessions
- Create new sessions
- Session statistics (memories, tools, events)

### Session Interaction
- Real-time text and voice communication
- WebSocket-based messaging
- Agent planning visualization
- Message history

## API Integration

The frontend integrates with the ORION backend API:
- Authentication endpoints
- Session management endpoints
- Agent planning endpoints
- WebSocket for real-time communication

## Development

```bash
# Run development server
npm run dev

# Run linter
npm run lint

# Build for production
npm run build
```

## License

ISC

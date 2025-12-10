# PrayForChange.org

## Overview

PrayForChange.org is a community-driven prayer platform inspired by petition sites like Change.org, but focused on spiritual prayer requests. Users can submit prayer requests, receive AI-generated prayer content, and join others in praying for shared causes. The platform tracks prayer counts and displays progress toward prayer goals, creating a sense of community around spiritual support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Typography**: Playfair Display (serif) for headings, Inter (sans-serif) for body text
- **Path Aliases**: `@/` maps to client/src, `@shared/` maps to shared directory

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints under `/api/` prefix
- **Authentication**: Replit Auth with OpenID Connect, using Passport.js
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **AI Integration**: OpenAI API for generating prayer summaries and recitable prayers

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Tables**:
  - `users`: Stores authenticated user profiles
  - `prayers`: Stores prayer requests with AI-generated content
  - `sessions`: Stores user sessions for authentication
- **Migrations**: Managed via drizzle-kit with `db:push` command

### Key Features
- Prayer request creation with AI-enhanced content generation
- Prayer counter that tracks community participation
- Goal-based progress tracking for each prayer
- Browse and search functionality for prayers
- User authentication via Replit Auth

## External Dependencies

### Third-Party Services
- **OpenAI API**: Generates AI summaries and recitable prayers from user submissions (requires `OPENAI_API_KEY`)
- **Replit Auth**: Handles user authentication via OpenID Connect (requires `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`)

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `openai`: OpenAI API client for AI content generation
- `passport` / `openid-client`: Authentication handling
- `@tanstack/react-query`: Server state management
- `shadcn/ui` components via Radix UI primitives
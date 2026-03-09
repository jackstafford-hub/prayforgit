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
- **Authentication**: Custom email/password authentication with bcrypt password hashing
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **AI Integration**: OpenAI API for generating prayer summaries and recitable prayers

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Tables**:
  - `users`: Stores authenticated user profiles (includes `emailOptIn` for GDPR-compliant email consent)
  - `prayers`: Stores prayer requests with AI-generated content
  - `sessions`: Stores user sessions for authentication
  - `daily_prayer_counts`: Tracks daily prayer counts per prayer for digest emails
- **Migrations**: Managed via drizzle-kit with `db:push` command

### Key Features
- Prayer request creation with AI-enhanced content generation
- Prayer tone check: AI-powered positivity analysis before generating prayer content, with constructive reframing suggestions for negatively-framed prayers. Prayers that proceed despite warnings are flagged for moderation (`flaggedForReview` column) and emailed to support@prayforchange.org for review before becoming publicly visible
- Admin Moderation Dashboard (`/admin`): Protected by `ADMIN_EMAILS` env var. Allows admins to view stats, approve/delete flagged prayers, and review/dismiss user reports. Admin link appears in navbar for authorized users only
- Prayer counter that tracks community participation
- Goal-based progress tracking for each prayer
- Browse and search functionality for prayers
- Custom user authentication with email/password registration and password reset flow
- Email notifications via SendGrid:
  - Welcome email on user registration
  - Prayer saved email with a copy of the prayer when submitted
  - Daily digest email with prayer count updates (runs at 8am UTC, only sent if someone prayed)

## To Do

### Medium Impact
1. **Prayer Categories & Filtering** — Add topic filters to the Browse page so users can find prayers by category
2. **Prayer Updates / Follow-ups** — Let prayer authors post updates to keep the community engaged
3. **Search** — Add keyword search to help users find specific prayers
4. **Notification Preferences** — Add a "follow this prayer" feature so supporters get notified on updates or milestones
5. **Social Proof on Home Page** — Show recent activity feed for momentum

### Nice-to-Have
6. **Shareable Prayer Cards** — Generate visual image cards for social media sharing
7. **Dark Mode Toggle** — Add a user-facing toggle to switch between light and dark themes

## External Dependencies

### Third-Party Services
- **OpenAI API**: Generates AI summaries and recitable prayers from user submissions (requires `OPENAI_API_KEY`)
- **SendGrid**: Transactional emails (welcome, prayer saved, daily digest) via Replit connector integration

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)

### Authentication
- Custom email/password authentication (requires `SESSION_SECRET` environment variable)
- Passwords hashed with bcrypt (12 rounds)
- Sessions stored in PostgreSQL via connect-pg-simple

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `openai`: OpenAI API client for AI content generation
- `bcrypt`: Secure password hashing
- `@tanstack/react-query`: Server state management
- `shadcn/ui` components via Radix UI primitives
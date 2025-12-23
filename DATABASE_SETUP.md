# Database Setup Guide

## Overview

The Content Automation Dashboard uses **Supabase** (PostgreSQL) with Prisma ORM for data persistence. Redis is containerized locally using Docker Compose for the BullMQ job queue.

## Prerequisites

- Supabase account and project
- Docker and Docker Compose installed (for Redis only)
- Node.js 18+ installed
- npm installed

## Supabase Setup

### 1. Get Your Database Connection String

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/ggrucwtukdpbvujxffbc/settings/database
2. Navigate to **Settings** → **Database**
3. Find the **Connection string** section
4. Copy the **URI** connection string (or use **Connection pooling** URI for better performance)
5. Replace `[YOUR-PASSWORD]` with your database password

**Connection String Formats:**

- **Direct Connection** (port 5432):
  ```
  postgresql://postgres:[YOUR-PASSWORD]@db.ggrucwtukdpbvujxffbc.supabase.co:5432/postgres
  ```

- **Pooled Connection** (recommended for serverless/production, port 6543):
  ```
  postgresql://postgres.ggrucwtukdpbvujxffbc:[YOUR-PASSWORD]@aws-0-us-east-2.pooler.supabase.com:6543/postgres
  ```

### 2. Configure Environment Variables

1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Update DATABASE_URL in .env**:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.ggrucwtukdpbvujxffbc.supabase.co:5432/postgres?schema=public"
   ```

## Quick Start

1. **Set up environment variables** (see above)

2. **Start Redis service** (for BullMQ job queue):
   ```bash
   npm run docker:up
   ```

3. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Test database connection**:
   ```bash
   node src/lib/db/test-connection.js
   ```

## Database Schema

The database includes the following tables:

- **site_profiles**: Configuration profiles for different sites/dealers
- **runs**: Job/run tracking with status and metadata
- **run_metrics**: Metrics collected during runs (success rates, counts, etc.)
- **log_entries**: Structured log entries with filtering capabilities
- **content_previews**: Preview storage for scraped and processed content

See `prisma/schema.prisma` for complete schema definition.

## Available Scripts

- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Create and apply a new migration
- `npm run db:migrate:deploy` - Apply pending migrations (production)
- `npm run db:migrate:reset` - Reset database (development only - **USE WITH CAUTION**)
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run docker:up` - Start Docker containers (Redis only)
- `npm run docker:down` - Stop Docker containers
- `npm run docker:logs` - View Docker container logs

## Docker Services

- **Redis**: Port 6379 (for BullMQ job queue)
- **PostgreSQL**: Hosted on Supabase (not containerized)

## Environment Variables

Key environment variables (see `.env.example` for complete list):

- `DATABASE_URL`: Supabase PostgreSQL connection string (**REQUIRED**)
- `SUPABASE_PROJECT_REF`: Supabase project reference (optional, for documentation)
- `SUPABASE_URL`: Supabase API URL (optional)
- `REDIS_URL`: Redis connection string (default: redis://localhost:6379)

## Supabase Project Details

- **Project Name**: vande012's Project
- **Project Ref**: ggrucwtukdpbvujxffbc
- **Region**: us-east-2
- **Database Host**: db.ggrucwtukdpbvujxffbc.supabase.co
- **PostgreSQL Version**: 17.6.1
- **Status**: ACTIVE_HEALTHY

## Troubleshooting

### Database connection fails

1. Verify DATABASE_URL is set correctly in .env
2. Check that your Supabase project is active
3. Verify password is correct (get it from Supabase dashboard)
4. Check if your IP needs to be whitelisted (Settings → Database → Connection pooling)

### Migration errors

1. Check database is accessible via Supabase dashboard
2. Verify schema.prisma is valid: `npx prisma validate`
3. Review migration files in `prisma/migrations/`
4. Check Supabase logs: https://supabase.com/dashboard/project/ggrucwtukdpbvujxffbc/logs/explorer

### Prisma Client not found

Run: `npm run db:generate`

### Connection pooling vs direct connection

- **Direct connection** (port 5432): Better for long-running connections, transactions
- **Pooled connection** (port 6543): Better for serverless, high concurrency, production

For development, either works. For production/web dashboard, prefer pooled connection.

## Security Notes

- Never commit your `.env` file with real passwords
- Use Supabase connection pooling for production deployments
- Consider using Supabase Row Level Security (RLS) for production
- Keep your database password secure and rotate it periodically
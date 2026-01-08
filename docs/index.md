# Project Documentation Index

## Project Overview

- **Type**: Hybrid CLI/Web Automation Ecosystem
- **Primary Language**: JavaScript (Node.js >=18.0.0, Next.js 16)
- **Architecture**: Hybrid Service-Oriented (CLI) + Management Dashboard (Web)
- **Project Name**: wp-content-automation (wp-content-automationr)

## Quick Reference

### Tech Stack Summary
- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui
- **Persistence**: Supabase (Postgres), Prisma ORM
- **Automation**: Playwright ^1.40.0
- **Jobs**: BullMQ, Redis

### Entry Points
- **Web Dashboard**: `npm run dev:web` (Access at localhost:3000)
- **Main CLI**: `src/cli/automation.js` (Run with `npm start`)
- **Database**: `prisma/schema.prisma`

## Generated Documentation

### Core Documentation Files

1. **[Project Overview](./project-overview.md)**
   - Executive summary and project purpose
   - Core technology stack
   - Quick reference and entry points

2. **[Architecture Documentation](./architecture.md)**
   - Detailed service-oriented architecture
   - Data flow and pipeline logic
   - Error handling and configuration strategy

3. **[Source Tree Analysis](./source-tree-analysis.md)**
   - Annotated directory structure
   - Component responsibilities
   - Critical folders and entry points

4. **[Development Guide](./development-guide.md)**
   - Prerequisites and installation
   - Local development and execution
   - Environment configuration

5. **[Technology Stack](./technology-stack.md)**
   - Detailed dependency analysis
   - Framework and library justification

## Existing Documentation

- **[README.md](../README.md)**: Original project README with usage instructions.

## Getting Started

1. **Install dependencies**: `npm install && npm run install-browsers`
2. **Setup environment**: Create a `.env` file based on `src/config/index.js` defaults.
3. **Add target URLs**: Populate `data/urls.txt`.
4. **Run automation**: `npm start`.

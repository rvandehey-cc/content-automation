# Prisma Setup & Connection Guide

## ✅ Your Setup is Complete!

Your Prisma is now correctly configured to use your **Supabase PostgreSQL database**.

## Understanding Prisma Tools

### Prisma Studio (What You Need)
- **Local database GUI tool** - runs on your machine
- Connects to your Supabase database via `DATABASE_URL` in `.env`
- Command: `npm run db:studio`
- Opens at: `http://localhost:5555`

### Prisma Cloud (What You Saw - NOT Needed)
- **Cloud-hosted database service** (prisma.io)
- Different from Supabase
- **You don't need this** - you're using Supabase

## Current Configuration

✅ **Database**: Supabase PostgreSQL  
✅ **Connection String**: Set in `.env` file  
✅ **Schema**: `prisma/schema.prisma`  
✅ **Connection**: Verified working  

Your `.env` file now has:
```env
DATABASE_URL="postgresql://postgres:Rw3slDAyvSO2YGiE@db.ggrucwtukdpbvujxffbc.supabase.co:5432/postgres?schema=public"
```

## Using Prisma Studio

1. **Start Prisma Studio**:
   ```bash
   npm run db:studio
   ```

2. **Access the GUI**:
   - Opens automatically at `http://localhost:5555`
   - You'll see all your tables: `site_profiles`, `runs`, `run_metrics`, `log_entries`, `content_previews`

3. **View/Edit Data**:
   - Browse tables and records
   - Edit data directly in the UI
   - Filter and search records

## Common Commands

```bash
# Generate Prisma Client (after schema changes)
npm run db:generate

# Test database connection
node src/lib/db/test-connection.js

# Open Prisma Studio (database GUI)
npm run db:studio

# Run migrations (create/apply database changes)
npm run db:migrate

# Validate schema
npx prisma validate
```

## Troubleshooting

### Prisma Studio won't connect
1. Verify `.env` file has correct `DATABASE_URL`
2. Check database password is correct
3. Ensure Supabase project is active
4. Try: `npm run db:generate` then `npm run db:studio`

### Connection errors
- Verify your Supabase database is running
- Check password hasn't changed
- Ensure IP isn't blocked (if using Supabase connection pooling)

### "Schema not found" errors
- Ensure `?schema=public` is in your DATABASE_URL
- Run migrations: `npm run db:migrate`

## Architecture Note

Your stack:
- **Database Hosting**: Supabase (PostgreSQL)
- **ORM/Query Layer**: Prisma
- **Authentication**: Supabase Auth
- **Application**: Next.js

This is a common and recommended pattern - Supabase for hosting + auth, Prisma for type-safe database access.


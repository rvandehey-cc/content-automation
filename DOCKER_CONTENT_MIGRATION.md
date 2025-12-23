# Content-Migration Folder Setup for Docker

## Overview

When running in Docker, the Content-Migration folder needs to be accessible from the host machine. By default, the application saves files to `~/Desktop/Content-Migration`, but in Docker this path won't be accessible.

## Solution

Set the `CONTENT_MIGRATION_PATH` environment variable to a path that's mounted as a volume in Docker.

### Example Docker Compose Configuration

```yaml
services:
  app:
    # ... other config ...
    environment:
      - CONTENT_MIGRATION_PATH=/app/content-migration
    volumes:
      - ./content-migration:/app/content-migration
```

### Example .env Configuration

```env
# For Docker: Use a mounted volume path
CONTENT_MIGRATION_PATH=/app/content-migration

# For local development: Leave unset to use ~/Desktop/Content-Migration
# CONTENT_MIGRATION_PATH=
```

## Folder Structure

The Content-Migration folder will be organized as:

```
Content-Migration/
├── images/
│   └── {run-id}/
│       └── (downloaded images)
└── csv/
    └── {run-id}/
        └── wordpress-import-YYYY-MM-DD.csv
```

Each run gets its own subfolder to avoid conflicts between runs.


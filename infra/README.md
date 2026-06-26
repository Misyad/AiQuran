## Docker

```bash
# Build & run all services
docker compose up -d

# Or run individually
docker compose up frontend -d
docker compose up backend -d
docker compose up db -d
```

## Services
| Service | Port | Description |
|---|---|---|
| Frontend | 3000 | Next.js app |
| Backend | 8000 | FastAPI + faster-whisper |
| PostgreSQL | 5432 | Quran data + sessions |
| Redis | 6379 | Cache + pub/sub |

## Database
- PostgreSQL with pgvector for verse embedding similarity
- Auto-migrated via `infra/init.sql` on first run
- Quran data seeded automatically by backend on startup

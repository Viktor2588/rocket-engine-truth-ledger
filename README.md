---
title: Rocket Engine Truth Ledger
emoji: 🚀
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# Rocket Engine Truth Ledger API

Read-only API serving verified aerospace facts from the Truth Ledger database.

## Architecture

- **This Space**: CPU-only API server (serves facts)
- **Local**: Ollama + granite3.3:8b for AI extraction
- **Database**: Shared Neon PostgreSQL

```
Local (Ollama + AI) ──writes──▶ Neon DB ◀──reads── This API
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health` | Health check |
| `GET /api/v1/entities` | List entities |
| `GET /api/v1/entities/:entityId/facts` | Get facts for entity |
| `GET /api/v1/entities/:type/:domainId/field/:fieldName` | Get specific field fact |
| `GET /api/v1/conflict-groups` | List conflicts |

## Usage

```bash
# Health check
curl https://YOUR-SPACE.hf.space/api/v1/health

# Get engine facts
curl "https://YOUR-SPACE.hf.space/api/v1/entities/engine/1/field/engines.thrust_n"
```

## Environment Variables

Set in Space Settings → Variables:
- `DATABASE_URL` - Neon PostgreSQL connection string (required)

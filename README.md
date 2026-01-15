---
title: Rocket Engine Truth Ledger
emoji: 🚀
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
license: mit
suggested_hardware: t4-small
---

# Rocket Engine Truth Ledger

A fact-verification service for aerospace data powered by local LLM (granite3.3:8b via Ollama).

## API Endpoints

Base URL: `https://YOUR-USERNAME-rocket-engine-truth-ledger.hf.space`

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health` | Health check |
| `GET /api/v1/entities` | List entities |
| `GET /api/v1/entities/:entityId/facts` | Get facts for entity |
| `GET /api/v1/facts/:claimKeyHash` | Resolve fact by hash |
| `GET /api/v1/conflict-groups` | List conflicts |

## Environment Variables

Set these in Space settings → Variables:
- `DATABASE_URL` - Neon PostgreSQL connection string (required)

## Architecture

```
┌─────────────────────────────────────┐
│  Hugging Face Space (T4 GPU)       │
│  ┌─────────────────────────────┐   │
│  │  Truth Ledger API           │   │
│  │  Port 7860                  │   │
│  └──────────────┬──────────────┘   │
│                 │                   │
│  ┌──────────────▼──────────────┐   │
│  │  Ollama + granite3.3:8b     │   │
│  │  Port 11434                 │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Usage

```bash
# Health check
curl https://YOUR-SPACE.hf.space/api/v1/health

# Get engine facts
curl https://YOUR-SPACE.hf.space/api/v1/entities/engine/1/facts
```

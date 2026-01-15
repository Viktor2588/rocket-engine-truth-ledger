---
title: Rocket Engine Truth Ledger
emoji: 🚀
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
license: mit
hardware: t4-small
---

# Rocket Engine Truth Ledger

A fact-verification service for aerospace data powered by local LLM (granite3.3:8b via Ollama).

## API Endpoints

- `GET /api/v1/health` - Health check
- `GET /api/v1/entities` - List entities
- `GET /api/v1/entities/:entityId/facts` - Get facts for entity
- `GET /api/v1/facts/:claimKeyHash` - Resolve fact by hash
- `GET /api/v1/conflict-groups` - List conflicts

## Environment Variables

Set these in Space settings:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `ANTHROPIC_API_KEY` - (optional) For fallback AI extraction

## Usage

This Space provides a REST API for the rocket-engine-backend to query verified facts.

```bash
curl https://YOUR-SPACE.hf.space/api/v1/health
```

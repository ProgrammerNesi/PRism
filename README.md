# Prism

Context-aware AI pull request reviewer built using GitHub Apps, BullMQ, Redis, PostgreSQL, vector embeddings, and Gemini.

PRism is an AI code review platform that goes beyond reading diffs — it indexes your entire codebase into a vector store, retrieves the existing patterns relevant to each pull request, and uses that context to generate inline review comments, a risk score, and a merge-impact analysis, all posted directly on GitHub. Built with Next.js, BullMQ, pgvector, and Gemini, it answers the question every other review bot ignores: not just what changed, but does this fit, and is it safe to merge.

See the full spectrum of every pull request.

## Features

- GitHub App integration
- Automated PR reviews
- Repository-aware code retrieval
- Embedding cache by base commit
- Inline GitHub review comments
- Real-time review status updates
- Review history dashboard
- Programmatic API via API keys

## Architecture

![PRism Architecture](docs/architecture.png)

## Stack

- Next.js
- TypeScript
- Prisma
- PostgreSQL
- Redis
- BullMQ
- pgvector
- Gemini

## API Key Authentication

PRism provides a programmatic API for integrating review capabilities into your own tools and workflows. Access is managed through API keys.

### Generating an API Key

1. Sign in to the [PRism dashboard](/dashboard).
2. Click **API Keys** in the dashboard header.
3. Click **Create API Key** and enter a name (e.g. "CI/CD Pipeline").
4. The raw key is displayed **exactly once** — copy it and store it securely.

```
prism_sk_abc123def456... (64 hex characters)
```

> ⚠️ The raw key is never stored by the server in plain text. Only a SHA-256 hash is saved. If you lose the key, you cannot retrieve it again — you must revoke it and generate a new one.

### Using an API Key

Include the key in the `Authorization` header of every request:

```
Authorization: Bearer <your_api_key>
```

### Managing API Keys

- **Revoke** — Keys can be revoked from the API Keys page at any time. Revoked keys are immediately rejected.
- **Regenerate** — Create a new key and update your configuration. Old keys remain valid until revoked.
- **View** — The API Keys page shows all active keys with their name, creation date, and last-used timestamp.

### MCP Integration

API keys are used to authenticate requests from the PRism MCP client. See the [PRism MCP](../PRism-mcp) project for setup instructions.

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

## Architecture

GitHub
→ Webhook
→ BullMQ Queue
→ Worker
→ Embeddings
→ Context Retrieval
→ Gemini
→ GitHub Review Comments

## Stack

- Next.js
- TypeScript
- Prisma
- PostgreSQL
- Redis
- BullMQ
- pgvector
- Gemini
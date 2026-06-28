FROM node:20-slim

# tree-sitter requires Python and build tools to compile native bindings.
# simple-git requires git to clone repositories.
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files first — Docker caches this layer.
# Dependencies only reinstall when package.json changes.
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies including dev deps (tsx is needed to run TypeScript)
RUN npm ci

# Generate Prisma client for the current platform
RUN npx prisma generate

# Copy source files
COPY lib ./lib
COPY worker ./worker
COPY tsconfig.json ./

# Set environment variable so @xenova/transformers caches the model
# inside the container at a known path
ENV TRANSFORMERS_CACHE=/app/.model-cache

# Pre-download the sentence transformer model into the image.
# This means the model is baked in — container starts instantly
# without a 30-60 second download delay.
# ~25MB added to the image, worth the trade-off.
RUN node --input-type=module << 'EOF'
import { pipeline } from '@xenova/transformers';

console.log('Downloading sentence transformer model...');
await pipeline(
  'feature-extraction',
  'Xenova/all-MiniLM-L6-v2',
  { quantized: true }
);
console.log('Model cached successfully.');
EOF

CMD ["npx", "tsx", "--tsconfig", "worker/tsconfig.json", "worker/index.ts"]
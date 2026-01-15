# Hugging Face Spaces Dockerfile
# Runs Ollama + truth-ledger together with GPU support

# Build stage
FROM node:20-slim AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM nvidia/cuda:12.1-runtime-ubuntu22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Create app directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /build/dist ./dist

# Copy startup script
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Create non-root user (required by HF Spaces)
RUN useradd -m -u 1000 user
RUN chown -R user:user /app

# Ollama needs to store models
RUN mkdir -p /home/user/.ollama && chown -R user:user /home/user/.ollama
ENV OLLAMA_MODELS=/home/user/.ollama/models

USER user

# Environment variables
ENV NODE_ENV=production
ENV PORT=7860
ENV OLLAMA_HOST=0.0.0.0:11434
ENV OLLAMA_URL=http://localhost:11434

# HF Spaces uses port 7860
EXPOSE 7860

# Start both services
CMD ["./start.sh"]

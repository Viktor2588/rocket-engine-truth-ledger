# Hugging Face Spaces Dockerfile
# CPU-only API server - serves verified facts from database
# AI extraction runs locally with Ollama, results sync to shared DB

# Build stage
FROM node:20-slim AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /build/dist ./dist

# Create non-root user (required by HF Spaces)
RUN useradd -m -u 1000 user
RUN chown -R user:user /app

USER user

# Environment variables
ENV NODE_ENV=production
ENV PORT=7860

# HF Spaces uses port 7860
EXPOSE 7860

# Start the API server
CMD ["node", "dist/index.js", "serve"]

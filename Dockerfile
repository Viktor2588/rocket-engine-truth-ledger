# Truth Ledger API Server
# Serves verified facts from database

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
RUN npm ci --omit=dev

# Copy built application from builder
COPY --from=builder /build/dist ./dist

# Environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Render uses port 10000 by default
EXPOSE 10000

# Start the API server
CMD ["node", "dist/index.js", "serve"]

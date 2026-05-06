# ==================== BUILD STAGE ====================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules (sharp, etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN npm ci --include=dev && npm cache clean --force

# Copy source code
COPY . .

# Use PostgreSQL schema for production (replace SQLite schema)
RUN cp prisma/schema.postgres.prisma prisma/schema.prisma

# Generate Prisma client for PostgreSQL
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Prune dev dependencies
RUN npm prune --production && npm cache clean --force

# ==================== PRODUCTION STAGE ====================
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies for native modules (sharp)
RUN apk add --no-cache \
    vips \
    dumb-init \
    wget

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy built artifacts from builder
COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nodejs:nodejs /app/docker/backend/entrypoint.sh ./entrypoint.sh

# Create directories for logs and uploads
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
RUN chmod +x ./entrypoint.sh ./scripts/wait-for-it.sh

CMD ["./entrypoint.sh", "node", "server.js"]

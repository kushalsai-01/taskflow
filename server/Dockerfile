# Production Node.js Dockerfile for Express Backend
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS dependencies
RUN npm ci --only=production

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy production node_modules and application code
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Set container non-root user for security
RUN chown -R node:node /app
USER node

EXPOSE 5000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health || exit 1

CMD ["node", "src/server.js"]

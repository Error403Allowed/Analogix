# Multi-stage Docker build for AnalogixGraphQL
# Optimized for Fly.io / Railway / Render.

FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Copy workspace root first
COPY package.json package-lock.json* ./
COPY packages/analogix-shared/package.json packages/analogix-shared/
COPY AnalogixGraphQL/package.json AnalogixGraphQL/

# Install all workspace deps
RUN npm install --workspaces=false \
    && npm install --workspace=packages/analogix-shared --workspace=AnalogixGraphQL

# Copy source
COPY packages/analogix-shared packages/analogix-shared
COPY AnalogixGraphQL AnalogixGraphQL

# Build shared package first
RUN npm run build:shared

# Build BFF
RUN npm run build:api

# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only what's needed at runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/analogix-shared/dist packages/analogix-shared/dist
COPY --from=builder /app/packages/analogix-shared/package.json packages/analogix-shared/
COPY --from=builder /app/AnalogixGraphQL/dist AnalogixGraphQL/dist
COPY --from=builder /app/AnalogixGraphQL/package.json AnalogixGraphQL/

WORKDIR /app/AnalogixGraphQL
EXPOSE 4000

# Secrets (SUPABASE_*, GROQ_*, REDIS_URL, etc.) are injected at runtime.
# On Fly.io: `fly secrets set KEY=value` for each.
CMD ["node", "dist/server.js"]

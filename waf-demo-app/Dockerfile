# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM node:22 AS builder
WORKDIR /build

# Install deps first for layer caching
COPY package*.json ./
# ci installs exact locked versions and compiles better-sqlite3 native addon
RUN npm ci

# Compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Prune devDependencies — prod node_modules only
RUN npm prune --omit=dev

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app

# Non-root for defence in depth
RUN chown -R node:node /app
USER node

# Copy compiled output, production modules, and demo data
COPY --from=builder --chown=node:node /build/dist         ./dist
COPY --from=builder --chown=node:node /build/node_modules ./node_modules
COPY --chown=node:node demo-files                          ./demo-files

EXPOSE 8080

CMD ["node", "dist/server.js"]

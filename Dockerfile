FROM node:20-alpine AS builder
WORKDIR /app

# Copy everything
COPY . .

# Install root (frontend) deps
RUN npm install --legacy-peer-deps

# Install backend deps and compile TypeScript to backend/dist
RUN cd backend && npm install --legacy-peer-deps && node_modules/.bin/tsc --skipLibCheck

# Build Next.js static export → out/
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy server bridge
COPY --from=builder /app/server.js ./

# Copy compiled backend (dist + node_modules for pg, anthropic, etc.)
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Copy static UI
COPY --from=builder /app/out ./public

EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "server.js"]

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Make NEXT_PUBLIC_API_URL available at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy source and build → produces ./out (static export)
COPY . .
RUN npm run build

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Only production deps needed by server.js (express)
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# server.js serves from ./public — copy the static export there
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/out ./public

# Railway injects PORT=8080; server.js reads process.env.PORT
EXPOSE 8080

CMD ["node", "server.js"]

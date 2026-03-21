FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps
# CRITICAL: Copy the server AND the backend logic AND the UI
COPY --from=builder /app/server.js ./
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/out ./public

EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "server.js"]

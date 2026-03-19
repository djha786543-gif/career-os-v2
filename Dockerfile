FROM node:18-alpine
WORKDIR /app

# 1. Copy everything
COPY . .

# 2. Install dependencies
RUN npm install

# 3. Build the Next.js site (output: 'export' produces out/)
RUN npm run build

# 4. Rename out/ → public/ for server.js
RUN mv out public || true

ENV PORT=3000
EXPOSE 3000

# 5. Start the server
CMD ["node", "server.js"]

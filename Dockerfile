FROM node:18-alpine
WORKDIR /app

# 1. Copy everything
COPY . .

# 2. Install dependencies
RUN npm install

# 3. Build the Next.js site (output: 'export' produces out/)
RUN npm run build

# 4. Rename out/ → public/ for server.js
# Remove source public/ (static assets already copied into out/ by Next.js export) then promote out/
RUN rm -rf public && mv out public

ENV PORT=3000
EXPOSE 3000

# 5. Start the server
CMD ["node", "server.js"]

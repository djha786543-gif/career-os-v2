FROM node:18-alpine
WORKDIR /app

# 1. Copy everything (Now including the updated package.json)
COPY . .

# 2. Install EVERYTHING at the root
RUN npm install

# 3. Build the Next.js site
RUN npm run build

# 4. Ensure the output is in the 'public' folder for server.js
# We use 'mv' to rename the 'out' folder created by 'npm run build'
RUN mv out public || true

ENV PORT=3000
EXPOSE 3000

# 5. Start the server directly
CMD ["node", "server.js"]

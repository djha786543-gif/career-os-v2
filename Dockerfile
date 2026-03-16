FROM node:18-alpine
WORKDIR /app

# Install root dependencies (express)
COPY package*.json ./
RUN npm install

# Install frontend dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy all files
COPY . .

# Build Next.js static export into frontend/out/
RUN cd frontend && npm run build

# Verify out/ was created
RUN ls -la frontend/out/

EXPOSE 3000
CMD ["node", "server.js"]

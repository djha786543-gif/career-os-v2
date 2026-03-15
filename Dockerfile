FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY . .
RUN cd frontend && npm run build
EXPOSE 3000
CMD ["node", "server.js"]

FROM node:20-alpine
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --omit=dev
COPY frontend/server/ ./server/
EXPOSE 3001
CMD ["node", "server/ws.mjs"]

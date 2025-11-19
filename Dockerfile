# Multi-stage build for Binance DB API MCP server

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY package.json package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY .env.example ./

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -G nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

CMD ["node", "dist/server.js"]


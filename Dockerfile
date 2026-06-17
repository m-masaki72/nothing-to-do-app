FROM node:20-slim AS builder
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/src ./src
COPY server/tsconfig.json ./
RUN npx tsc

FROM node:20-slim
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]

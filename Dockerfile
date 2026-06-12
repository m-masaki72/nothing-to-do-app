FROM node:20-slim

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/src ./src
COPY server/tsconfig.json ./

RUN npm install -g typescript && tsc

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]

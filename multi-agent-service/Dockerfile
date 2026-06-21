FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 agent && \
    chown -R agent:nodejs /app

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=agent:nodejs . .

USER agent
EXPOSE 8010
CMD ["node", "server.js"]

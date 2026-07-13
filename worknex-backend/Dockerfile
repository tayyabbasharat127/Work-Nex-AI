FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate
COPY src ./src

FROM build AS migration
ENV NODE_ENV=production
CMD ["npx", "prisma", "migrate", "deploy"]

FROM build AS production-dependencies
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --chown=node:node --from=production-dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/src ./src
COPY --chown=node:node --from=build /app/prisma ./prisma
COPY --chown=node:node package*.json ./
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "src/app.js"]

FROM runner AS worker
CMD ["node", "src/workers/scheduled.worker.js"]

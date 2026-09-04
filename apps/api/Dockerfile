FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci
COPY . .
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
RUN npm run build --workspace=@lorrycarry/shared
RUN npm run build --workspace=@lorrycarry/api

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/database/package.json ./packages/database/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
EXPOSE 3002
CMD ["node", "apps/api/dist/main.js"]

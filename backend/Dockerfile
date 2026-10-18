# Imagem de produção da API Rotulai (build a partir da raiz do repositório:
#   docker build -f backend/Dockerfile -t rotulai-api .)
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace backend --include-workspace-root=false
COPY backend backend
RUN npm run build --workspace backend

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace backend --include-workspace-root=false --omit=dev && npm cache clean --force
COPY --from=build /app/backend/dist backend/dist
COPY backend/prisma backend/prisma
COPY backend/prisma.config.ts backend/
WORKDIR /app/backend
USER node
EXPOSE 3333
# As migrações são aplicadas antes de iniciar (prisma migrate deploy).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

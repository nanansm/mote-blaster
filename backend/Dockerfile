FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL (Wajib untuk mesin Prisma)
RUN apt-get update && apt-get install -y openssl procps

COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim
WORKDIR /app

# Install OpenSSL di image production juga
RUN apt-get update && apt-get install -y openssl procps

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

RUN npm install prisma --save-dev

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]